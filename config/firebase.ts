import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' with { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any)
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
