'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, DependencyList } from 'react';
import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';

// Simplified state - no more userProfile
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Simplified return type
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Simplified user hook result - no more userProfile
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  // We keep userProfile here but as undefined to avoid breaking destructuring in other components.
  // Those components should handle the undefined case gracefully.
  userProfile?: UserProfile | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [firebaseState, setFirebaseState] = useState<FirebaseContextState>({
        areServicesAvailable: false,
        firebaseApp: null,
        firestore: null,
        auth: null,
        storage: null,
        user: null,
        isUserLoading: true,
        userError: null,
    });

    useEffect(() => {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        const storage = getStorage(app);

        setFirebaseState(prevState => ({
            ...prevState,
            areServicesAvailable: true,
            firebaseApp: app,
            auth: auth,
            firestore: firestore,
            storage: storage,
        }));
        
        const unsubscribeAuth = onAuthStateChanged(auth, 
            (user) => {
                // Simplified logic: Just set the user and stop loading.
                setFirebaseState(prevState => ({
                    ...prevState,
                    user: user,
                    isUserLoading: false,
                    userError: null,
                }));
            }, 
            (error) => {
                console.error("FirebaseProvider: Auth state error:", error);
                setFirebaseState(prevState => ({
                    ...prevState,
                    user: null,
                    isUserLoading: false,
                    userError: error,
                }));
            }
        );

        return () => {
            unsubscribeAuth();
        };
    }, []);

    // The loading guard remains critical.
    if (!firebaseState.areServicesAvailable || firebaseState.isUserLoading) {
         return (
            <div className="flex h-screen w-full items-center justify-center">
                <LogoSpinner />
            </div>
        );
    }

    return (
      <FirebaseContext.Provider value={firebaseState}>
        <FirebaseErrorListener />
        {children}
      </FirebaseContext.Provider>
    );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. This should not happen if the provider is rendered correctly.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth | null => useContext(FirebaseContext)?.auth ?? null;

export const useFirestore = (): Firestore | null => useContext(FirebaseContext)?.firestore ?? null;

export const useStorage = (): FirebaseStorage | null => useContext(FirebaseContext)?.storage ?? null;

export const useFirebaseApp = (): FirebaseApp | null => useContext(FirebaseContext)?.firebaseApp ?? null;

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    return { user: null, userProfile: null, isUserLoading: true, userError: new Error('useUser must be used within a FirebaseProvider.') };
  }
  // The context no longer provides userProfile directly. We return undefined.
  const { user, isUserLoading, userError } = context;
  return { user, isUserLoading, userError, userProfile: undefined };
};
