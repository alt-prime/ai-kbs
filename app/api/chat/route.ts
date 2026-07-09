import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, type UIMessage, convertToModelMessages, embed } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis Rate Limiter if env vars are present
let redisRatelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  // 5 requests per day per IP
  redisRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 d'),
    analytics: true,
  });
}

export async function POST(req: Request) {
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!geminiApiKey || geminiApiKey === 'your_api_key_here') {
    return Response.json(
      { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not set.' },
      { status: 500 }
    );
  }

  // --- RATE LIMITING LOGIC ---
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const deviceId = req.headers.get('x-device-id') || 'unknown';

  try {
    // 1. Layer: Upstash Redis (IP Limiting)
    if (redisRatelimit) {
      const { success } = await redisRatelimit.limit(`ip:${ip}`);
      if (!success) {
        return new Response('このネットワーク(IP)からの1日の利用上限（5回）に達しました。(Redis)', { status: 429 });
      }
    }

    // 2. & 3. Layers: Firestore (UUID & IP Limiting)
    const today = new Date().toISOString().split('T')[0];
    const safeIp = ip.replace(/[:.]/g, '_'); // sanitize for document ID
    const deviceRef = db.collection('rate_limits_device').doc(`${deviceId}_${today}`);
    const ipRef = db.collection('rate_limits_ip').doc(`${safeIp}_${today}`);

    const [deviceDoc, ipDoc] = await Promise.all([deviceRef.get(), ipRef.get()]);
    const deviceCount = deviceDoc.exists ? deviceDoc.data()?.count || 0 : 0;
    const ipCount = ipDoc.exists ? ipDoc.data()?.count || 0 : 0;

    if (deviceCount >= 3) {
      return new Response('1台のPCからの1日の利用上限（3回）に達しました。', { status: 429 });
    }
    if (ipCount >= 5) {
      return new Response('このネットワーク(IP)からの1日の利用上限（5回）に達しました。(Firestore)', { status: 429 });
    }

    // Increment usage in Firestore
    const batch = db.batch();
    batch.set(deviceRef, { count: deviceCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(ipRef, { count: ipCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open or fail closed? For portfolio, fail open (allow request) if Firestore errors, to avoid breaking the demo unexpectedly if quota is exceeded
  }
  // --- END RATE LIMITING LOGIC ---


  const { messages }: { messages: UIMessage[] } = await req.json();
  const google = createGoogleGenerativeAI({
    apiKey: geminiApiKey,
  });

  const result = streamText({
    model: google('gemini-2.5-pro'),
    system: `あなたは九州のサウナに詳しいコンシェルジュです。
ユーザーの要望（場所、水風呂の温度、特徴など）を聞き、最適なサウナを提案してください。
サウナの情報を探す際は、必ず 'searchSaunas' ツールを使用して、Firestoreデータベースから情報を検索してください。
提案する際は、サウナの名前、おすすめの理由、口コミなどを自然な会話で伝えてください。
また、ユーザーから聞かれた場合は、サウナの詳細な情報（水風呂の温度や特徴）も回答してください。`,
    messages: await convertToModelMessages(messages),
    tools: {
      searchSaunas: tool({
        description: 'Firestoreのサウナデータベースをベクトル検索（セマンティック検索）して、条件に合うサウナを返します。',
        parameters: z.object({
          keyword: z.string().optional().describe('検索キーワード（施設名や地名など）'),
          min_rating: z.number().optional().describe('最低評価（1.0〜5.0）'),
          max_water_temp: z.number().optional().describe('水風呂の最大温度'),
          feature: z.string().optional().describe('サウナの特徴（例: "外気浴", "ロウリュ", "天然温泉"）')
        }),
        // @ts-expect-error: execute signature might mismatch in this ai sdk version
        execute: async (args: Record<string, unknown>) => {
          const { keyword, min_rating, max_water_temp, feature } = args;
          try {
            const saunasCollection = db.collection('saunas');
            
            // Generate semantic search query string
            const searchQuery = [keyword, feature].filter(Boolean).join(' ') || '九州 人気 サウナ';
            
            // 1. Generate embedding for the search query
            const { embedding } = await embed({
              model: google.textEmbeddingModel('text-embedding-004'),
              value: searchQuery as string,
            });
            
            // 2. Perform Vector Search on Firestore
            const vectorQuery = saunasCollection.findNearest('embedding', FieldValue.vector(embedding), {
              limit: 20,
              distanceMeasure: 'COSINE'
            });
            
            const snapshot = await vectorQuery.get();
            
            // 3. Extract and post-filter results
            let results = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
              const data = doc.data();
              delete data.embedding; // Remove large embedding array to save tokens
              return { id: doc.id, ...data };
            });
            
            // Post-filtering for exact matching criteria
            if (min_rating !== undefined && typeof min_rating === 'number') {
              results = results.filter((s: Record<string, unknown>) => typeof s.rating === 'number' && s.rating >= min_rating);
            }
            if (max_water_temp !== undefined && typeof max_water_temp === 'number') {
              results = results.filter((s: Record<string, unknown>) => typeof s.water_temp === 'number' && s.water_temp <= max_water_temp);
            }
            
            // Return top 5 matches
            return { saunas: results.slice(0, 5) };
          } catch (error: unknown) {
            console.error('Firestore Vector Search Error:', error);
            if (error instanceof Error && error.message && error.message.includes('projectId')) {
               return { error: 'Firebase is not initialized. Please set FIREBASE_PROJECT_ID.' };
            }
            return { error: 'Failed to search saunas in Firestore.', details: error instanceof Error ? error.message : 'Unknown error' };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
