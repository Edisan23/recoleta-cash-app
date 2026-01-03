'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseProviderWrapperProps {
  children: ReactNode;
}

export function FirebaseProviderWrapper({ children }: FirebaseProviderWrapperProps) {
  // Memoize the initialization of Firebase services. This function now runs only on the client
  // and only once per component lifecycle, thanks to the empty dependency array.
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  // Pass the memoized services down to the core FirebaseProvider.
  // This separates the *initialization* of Firebase from the *providing* of the context.
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
