import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    // Only attempt to initialize with cert if the required env vars exist.
    // This prevents build-time crashes (e.g., during npm run build or Vercel deployments)
    // when env vars might not be fully injected yet.
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
  } catch (error) {
    console.error('Firebase initialization error', error);
  }
}

let db: FirebaseFirestore.Firestore;
try {
  db = getFirestore();
} catch (error) {
  // Provide a dummy object during build time so that Next.js static analysis doesn't crash.
  // At runtime, if this is hit, actual DB calls will fail, which is expected if Firebase wasn't configured.
  db = {} as FirebaseFirestore.Firestore;
}

export { db };
