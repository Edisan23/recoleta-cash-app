// IMPORTANT: This file should only be imported by server-side code.
// It uses the Firebase Admin SDK.
import { initializeApp, getApps, getApp, App, credential } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ServiceAccount } from 'firebase-admin';

let adminApp: App;
let firestore: Firestore;

// This function ensures that the admin app is initialized only once.
function initializeAdminApp() {
  if (getApps().some(app => app.name === 'admin')) {
    return getApp('admin');
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountEnv) {
    // In a production environment (like App Hosting), rely on Application Default Credentials
    if (process.env.NODE_ENV === 'production') {
        return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }, 'admin');
    }
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set. This is required for local server-side development.");
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountEnv);
    return initializeApp({
      credential: credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }, 'admin');
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON", e);
    throw new Error("Could not initialize Firebase Admin SDK. The FIREBASE_SERVICE_ACCOUNT environment variable is malformed.");
  }
}

adminApp = initializeAdminApp();
firestore = getFirestore(adminApp);

export { adminApp, firestore };
