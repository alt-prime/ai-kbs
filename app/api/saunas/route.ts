import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const saunasCollection = db.collection('saunas');
    // とりあえず最新の20件などを取得（今回は全部取得でもOKですが、パフォーマンスを考慮して上限を設けます）
    const snapshot = await saunasCollection.limit(50).get();

    if (snapshot.empty) {
      return NextResponse.json({ saunas: [] });
    }

    const saunas = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        location: data.location,
        rating: data.rating,
        water_temp: data.water_temp,
        features: data.features,
      };
    });

    return NextResponse.json({ saunas });
  } catch (error) {
    console.error('Error fetching initial saunas:', error);
    return NextResponse.json({ error: 'Failed to fetch saunas' }, { status: 500 });
  }
}
