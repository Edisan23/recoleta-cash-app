'use server';
import * as admin from 'firebase-admin';
import {getFirestore} from 'firebase-admin/firestore';
import {firebaseConfig} from '@/firebase/config';

// Important: This code is only intended to be used on the server.
//
// By default, this will use the GOOGLE_APPLICATION_CREDENTIALS environment
// variable to authenticate.
//
// This is not the same as the client-side SDK.

// This is a lazy-loaded, singleton pattern to ensure that the admin app
// is only initialized once.
let adminApp: admin.app.App | null = null;
function getAdminApp() {
  if (!adminApp) {
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0] as admin.app.App;
    } else {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
    }
  }
  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
