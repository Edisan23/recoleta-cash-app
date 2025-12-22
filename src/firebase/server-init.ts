// IMPORTANT: This file should only be imported by server-side code (e.g., API routes).
// It uses the Firebase Admin SDK.

import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { ServiceAccount, credential } from 'firebase-admin';

function getServiceAccount(): ServiceAccount {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. This is required for server-side Firebase Admin SDK initialization.');
  }
  return JSON.parse(serviceAccount);
}

let adminApp: App;
let firestore: Firestore;

if (!getApps().length) {
  try {
    // Attempt initialization using Application Default Credentials (ADC)
    // This is the preferred way in Google Cloud environments (like Cloud Run)
    adminApp = initializeApp();
    console.log("Firebase Admin SDK initialized with Application Default Credentials.");
  } catch (e: any) {
    console.warn("Admin SDK ADC initialization failed, falling back to service account key. Error:", e.message);
    try {
      // Fallback to service account key from environment variable
      // This is common for local development or non-GCP environments
       adminApp = initializeApp({
          credential: credential.cert(getServiceAccount()),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
       });
       console.log("Firebase Admin SDK initialized with Service Account Key.");
    } catch (fallbackError: any) {
        console.error("CRITICAL: Firebase Admin SDK initialization failed completely.", fallbackError);
        throw new Error("Could not initialize Firebase Admin SDK. Check your environment variables (FIREBASE_SERVICE_ACCOUNT or Google Application Credentials).");
    }
  }
} else {
  adminApp = getApp();
  console.log("Using existing Firebase Admin App instance.");
}

firestore = getFirestore(adminApp);

export function initializeFirebase() {
  return { adminApp, firestore };
}
