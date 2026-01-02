// IMPORTANT: This file should only be imported by server-side code (e.g., API routes).
// It uses the Firebase Admin SDK.

import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ServiceAccount, credential } from 'firebase-admin';

function getServiceAccount(): ServiceAccount | undefined {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    // Return undefined if the service account is not set.
    // This allows initialization to proceed with Application Default Credentials.
    return undefined;
  }
  try {
    return JSON.parse(serviceAccount);
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON", e);
    return undefined;
  }
}

let adminApp: App;
let firestore: Firestore;

if (!getApps().length) {
  const serviceAccount = getServiceAccount();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const appOptions = serviceAccount 
    ? { credential: credential.cert(serviceAccount), projectId }
    : { projectId };

  try {
    adminApp = initializeApp(appOptions);
    console.log(`Firebase Admin SDK initialized (using ${serviceAccount ? 'Service Account' : 'Default Credentials'}).`);
  } catch (e: any) {
    console.error("CRITICAL: Firebase Admin SDK initialization failed.", e);
    throw new Error("Could not initialize Firebase Admin SDK. Check your environment variables (FIREBASE_SERVICE_ACCOUNT or Google Application Credentials).");
  }
} else {
  adminApp = getApp();
  console.log("Using existing Firebase Admin App instance.");
}

firestore = getFirestore(adminApp);

export function initializeFirebase() {
  return { adminApp, firestore };
}
