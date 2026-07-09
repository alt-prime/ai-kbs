const { db } = require('./lib/firebase');
const { FieldValue } = require('firebase-admin/firestore');

async function testQuery() {
  try {
    // 768次元のダミーベクトル
    const dummyVector = Array(768).fill(0.1);
    
    const saunasCollection = db.collection('saunas');
    const snapshot = await saunasCollection.findNearest('embedding', FieldValue.vector(dummyVector), {
      limit: 3,
      distanceMeasure: 'COSINE'
    }).get();
    
    console.log("Success! Found:", snapshot.docs.length);
  } catch (error) {
    console.error("EXPECTED ERROR:", error.message);
  }
}

testQuery();
