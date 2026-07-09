import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, type UIMessage, convertToModelMessages, embed, generateObject } from 'ai';
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



  try {
    // Read request body once
    const body = await req.json();
    const messages: (UIMessage & { content?: string })[] = body.messages || [];
    const language = body.language === 'en' ? 'en' : 'ja';

    // --- PROFANITY FILTER LOGIC ---
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      const text = lastUserMessage.content || lastUserMessage.parts?.map(p => p.type === 'text' ? p.text : '').join('') || '';
      if (text) {
        const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
        const segments = Array.from(segmenter.segment(text)).map(s => s.segment);
        const blocklist = ['死ね', '殺す', 'バカ', 'アホ', 'カス', 'クソ', 'ばか', 'あほ', '死'];
        
        const hasInappropriateWord = segments.some(word => blocklist.includes(word));
        if (hasInappropriateWord) {
          const msg = language === 'en'
            ? 'Please refrain from using inappropriate language.'
            : '不適切な表現が含まれる内容はお控えください';
          return new Response(msg, { status: 400 });
        }
      }
    }
    // --- END PROFANITY FILTER LOGIC ---
    
    // --- RATE LIMITING LOGIC ---
    // Bypass rate limiting entirely in local development
    if (process.env.NODE_ENV !== 'development') {
      const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const deviceId = req.headers.get('x-device-id') || 'unknown';

      try {
        // 1. Layer: Upstash Redis (IP Limiting)
        if (redisRatelimit) {
          const { success } = await redisRatelimit.limit(`ip:${ip}`);
          if (!success) {
            const msg = language === 'en' 
              ? 'Daily usage limit (5 times) reached for this network (IP).' 
              : 'このネットワーク(IP)からの1日の利用上限（5回）に達しました。(Redis)';
            return new Response(msg, { status: 429 });
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
          const msg = language === 'en' 
            ? 'Daily usage limit (3 times) reached for this device.' 
            : '1台のPCからの1日の利用上限（3回）に達しました。';
          return new Response(msg, { status: 429 });
        }
        if (ipCount >= 5) {
          const msg = language === 'en' 
            ? 'Daily usage limit (5 times) reached for this network (IP).' 
            : 'このネットワーク(IP)からの1日の利用上限（5回）に達しました。(Firestore)';
          return new Response(msg, { status: 429 });
        }

        // Increment usage in Firestore
        const batch = db.batch();
        batch.set(deviceRef, { count: deviceCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        batch.set(ipRef, { count: ipCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await batch.commit();

      } catch (error) {
        console.error('Rate limiting error:', error);
      }
    }
    // --- END RATE LIMITING LOGIC ---

    const google = createGoogleGenerativeAI({
      apiKey: geminiApiKey,
    });

    // --- TOPIC ENFORCEMENT (1st Layer AI) ---
    const lastUserMessageForTopic = messages.slice().reverse().find(m => m.role === 'user');
    if (lastUserMessageForTopic) {
      const text = lastUserMessageForTopic.content || lastUserMessageForTopic.parts?.map(p => p.type === 'text' ? p.text : '').join('') || '';
      if (text) {
        const { object } = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: z.object({
            isRelatedToKyushuSauna: z.boolean().describe('ユーザーの質問が、九州のサウナに関連する内容かどうか。一般的な挨拶などは許容してtrueを返し、全く無関係な質問（例: 料理のレシピ、プログラミングの質問、他の地域の観光など）であればfalseを返すこと。'),
          }),
          prompt: `Evaluate if the following user message is related to saunas in Kyushu, Japan or saunas in general.\nUser message: "${text}"`,
        });

        if (!object.isRelatedToKyushuSauna) {
          const msg = language === 'en'
            ? 'Please ask questions related to saunas in Kyushu.'
            : '九州のサウナに関連する内容を回答してください';
          return new Response(msg, { status: 400 });
        }
      }
    }
    // --- END TOPIC ENFORCEMENT ---

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: language === 'en'
        ? `You are a concierge familiar with saunas in Kyushu, Japan.
Listen to the user's requests (location, water temperature, features, etc.) and suggest the best saunas.
When searching for sauna information, you MUST use the 'searchSaunas' tool to query the Firestore database.
When suggesting, convey the sauna's name, reasons for recommendation, and reviews in a natural conversation in English.
If asked by the user, also provide detailed information about the sauna (water temperature and features).`
        : `あなたは九州のサウナに詳しいコンシェルジュです。
ユーザーの要望（場所、水風呂の温度、特徴など）を聞き、最適なサウナを提案してください。
サウナの情報を探す際は、必ず 'searchSaunas' ツールを使用して、Firestoreデータベースから情報を検索してください。
提案する際は、サウナの名前、おすすめの理由、口コミなどを自然な会話で伝えてください。
また、ユーザーから聞かれた場合は、サウナの詳細な情報（水風呂の温度や特徴）も回答してください。`,
      messages: await convertToModelMessages(
        messages.map((m) => ({
          ...m,
          parts: m.parts || [{ type: 'text', text: m.content || '' }],
        }))
      ),
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
                model: google.textEmbeddingModel('gemini-embedding-2'),
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

    return result.toUIMessageStreamResponse({
      onError: (err) => {
        console.error('Stream Error:', err);
        return err instanceof Error ? err.message : String(err);
      }
    });
  } catch (globalError: unknown) {
    console.error('API Route Error:', globalError);
    return Response.json(
      { error: globalError instanceof Error ? globalError.stack : String(globalError) },
      { status: 500 }
    );
  }
}
