import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  // 1. ローカル環境（localhost）からのアクセス制限
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Forbidden: This API can only be executed in local development environment.' },
      { status: 403 }
    );
  }

  // IPアドレスによる追加のチェック（オプション）
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  console.log(`[Batch API] Accessed by IP: ${forwardedFor || realIp || 'localhost'}`);

  try {
    // 2. Google Places API (New) を利用してサウナを取得
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is missing.');
    }

    const query = '九州 サウナ';
    const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    // API Route (バックエンド) からの実行のため、Refererをlocalhostに設定（APIキーの制限を通過するため）
    const placesResponse = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.formattedAddress',
        'Referer': 'http://localhost:3000'
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'ja'
      })
    });
    
    const placesData = await placesResponse.json();

    // エラーハンドリング（APIが無効化されている場合など）
    if (placesData.error) {
      throw new Error(`Google Places API Error: ${placesData.error.message}`);
    }

    if (!placesData.places || placesData.places.length === 0) {
      return NextResponse.json({ success: false, message: 'Google Places API からサウナ情報が取得できませんでした。' });
    }

    const saunasCollection = db.collection('saunas');
    const batch = db.batch();
    
    let addedCount = 0;

    for (const place of placesData.places) {
      // 必要なデータの抽出
      const id = place.id;
      const name = place.displayName?.text || '名称不明';
      const location = { 
        lat: place.location?.latitude || 0, 
        lng: place.location?.longitude || 0 
      };
      const rating = place.rating || null;
      
      // 特徴（Google Mapsのフォーマット済み住所から都道府県を抽出など）
      const features = [];
      if (place.formattedAddress) {
        const match = place.formattedAddress.match(/([^都道府県]+[都道府県])/);
        if (match) features.push(match[0]);
      }
      features.push('サウナ');

      // 水風呂温度はGoogleAPIからは取れないため、今回はダミーとして 15度 をセット
      const water_temp = 15;

      // 3. AI SDKを使ったベクトル化 (Embedding) 処理
      const descriptionForEmbedding = `施設名: ${name}\n住所: ${place.formattedAddress || ''}\n評価: ${rating || 'なし'}\n特徴: ${features.join(', ')}\n水風呂: ${water_temp}度`;

      const { embedding } = await embed({
        model: google.textEmbeddingModel('gemini-embedding-2'),
        value: descriptionForEmbedding,
      });

      // 4. Firestoreへの保存データ作成
      const saunaData = {
        id,
        name,
        location,
        rating,
        water_temp,
        features,
        embedding: FieldValue.vector(embedding.slice(0, 768)) // Firestoreの2048次元制限を回避するため768次元にスライス
      };

      const docRef = saunasCollection.doc(id);
      batch.set(docRef, saunaData, { merge: true });
      addedCount++;
    }

    // Firestoreに一括コミット
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `バッチ処理完了: ${addedCount}件のサウナ情報をGoogle Places APIから取得し、AI検索用にベクトル化してデータベースに登録しました！`
    });

  } catch (error: any) {
    console.error('[Batch API Error]', error);
    return NextResponse.json(
      { error: `バッチ処理エラー: ${error.message || 'サーバーログを確認してください。'}` },
      { status: 500 }
    );
  }
}
