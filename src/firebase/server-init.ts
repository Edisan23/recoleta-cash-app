import * as admin from 'firebase-admin';
import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lazy initialization for the admin app
const getAdminApp = () => {
  if (getApps().length === 0) {
    // This will initialize the app using Application Default Credentials
    // which is the standard practice for Cloud Functions, Cloud Run, etc.
    return initializeApp();
  }
  return getApp();
};

// Lazy getter for the admin firestore instance
export const getAdminDb = () => {
  const app = getAdminApp();
  return getFirestore(app);
};
