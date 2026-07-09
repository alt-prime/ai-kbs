import { db } from './lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

async function testQuery() {
  try {
    const dummyVector = Array(768).fill(0.1);
    
    const saunasCollection = db.collection('saunas');
    const snapshot = await saunasCollection.findNearest('embedding', FieldValue.vector(dummyVector), {
      limit: 3,
      distanceMeasure: 'COSINE'
    }).get();
    
    console.log("Success! Found:", snapshot.docs.length);
  } catch (error: any) {
    console.error("EXPECTED ERROR:", error.message);
  }
}

testQuery();
