import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { embed, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 300; // Allow up to 5 minutes for this cron job on Vercel Pro (or just standard 10s on hobby)

export async function GET(req: Request) {
  // 1. Verify authorization (e.g. cron secret for security)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Perform Web Search using Google Custom Search API
    const searchQuery = '九州 サウナ 最新 おすすめ';
    const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const GOOGLE_CUSTOM_SEARCH_CX = process.env.GOOGLE_CUSTOM_SEARCH_CX;

    let searchResults: Record<string, unknown>[] = [];
    
    if (GOOGLE_CUSTOM_SEARCH_API_KEY && GOOGLE_CUSTOM_SEARCH_CX) {
       console.log('Fetching search results from Google Custom Search...');
       const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_CX}&q=${encodeURIComponent(searchQuery)}`);
       const data = await res.json();
       searchResults = data.items || [];
    } else {
       console.log('No Google Custom Search API keys found. Using mock search results.');
       // Mock data if no API key is provided
       searchResults = [
         { 
           title: '九州のおすすめサウナ', 
           snippet: '福岡のウェルビー福岡（強冷水風呂）、熊本の湯らっくす（MAD MAXボタン）、佐賀のらかんの湯（大自然の外気浴）などが九州で圧倒的な人気を誇っています。', 
           link: 'https://example.com/kyushu-sauna' 
         }
       ];
    }

    // 3. Scrape pages and Extract Sauna info using Gemini
    const newSaunas: Record<string, unknown>[] = [];

    // For demonstration, we process the top 3 results to keep execution fast.
    for (const result of searchResults.slice(0, 3)) { 
       const pageContent = result.snippet as string;
       
       console.log(`Extracting sauna info from snippet: ${result.title}`);
       const { object: extracted } = await generateObject({
         model: google('gemini-2.5-pro'),
         schema: z.object({
           saunas: z.array(z.object({
             name: z.string().describe('サウナ施設の名前'),
             address: z.string().describe('県名から始まる住所（不明な場合は県名のみでも可）'),
             description: z.string().describe('特徴や口コミの要約'),
             rating: z.number().min(1).max(5).describe('推測される評価、不明なら4.0'),
             water_temp: z.number().describe('水風呂の温度（不明な場合は16）'),
             features: z.array(z.string()).describe('サウナの特徴（外気浴、ロウリュ等）'),
             lat: z.number().optional().describe('緯度（推測できれば）'),
             lng: z.number().optional().describe('経度（推測できれば）')
           }))
         }),
         prompt: `以下のWeb検索結果（テキスト）から、九州のサウナ情報を抽出してください。複数ある場合は配列に含めてください。\n\nテキスト: ${pageContent}`
       });
       
       newSaunas.push(...extracted.saunas);
    }

    console.log(`Extracted ${newSaunas.length} saunas. Creating embeddings and storing in Firestore...`);

    // 4. Create Embeddings and Store in Firestore
    const batch = db.batch();
    const saunasCollection = db.collection('saunas');

    for (const sauna of newSaunas) {
      // Create embedding string
      const textToEmbed = `サウナ名: ${sauna.name}\n場所: ${sauna.address}\n特徴: ${sauna.description}\n設備: ${(sauna.features as string[]).join(',')}`;
      
      const { embedding } = await embed({
        model: google.textEmbeddingModel('text-embedding-004'),
        value: textToEmbed,
      });

      // Prepare Firestore document
      // In production, we'd check if doc exists by name to update it instead of creating duplicates
      const docRef = saunasCollection.doc(); 
      batch.set(docRef, {
        name: sauna.name,
        address: sauna.address,
        description: sauna.description,
        rating: sauna.rating,
        water_temp: sauna.water_temp,
        features: sauna.features,
        location: { 
            lat: sauna.lat || 33.5902, // fallback to Fukuoka lat
            lng: sauna.lng || 130.4075 // fallback to Fukuoka lng
        }, 
        embedding: FieldValue.vector(embedding),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    if (newSaunas.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, count: newSaunas.length, saunas: newSaunas });

  } catch (error: unknown) {
    console.error('Batch job failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
