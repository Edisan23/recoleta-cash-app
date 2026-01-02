import * as admin from 'firebase-admin';
import { getApps, initializeApp, getApp } from 'firebase-admin/app';

export const getAdminApp = () => {
  if (getApps().length <= 0) {
    return initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
  return getApp();
};

export const adminDb = admin.firestore();
