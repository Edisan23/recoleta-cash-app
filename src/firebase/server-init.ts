import * as admin from 'firebase-admin';
import { getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const getAdminApp = () => {
  if (getApps().length <= 0) {
    return initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
  return getApp();
};

getAdminApp(); // Initialize on module load
export const adminDb = getFirestore();
