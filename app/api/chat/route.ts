import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, type UIMessage, convertToModelMessages, embed } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!geminiApiKey || geminiApiKey === 'your_api_key_here') {
    return Response.json(
      {
        error:
          'GOOGLE_GENERATIVE_AI_API_KEY is not set. Add a valid Gemini API key to your environment variables.',
      },
      { status: 500 },
    );
  }

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
