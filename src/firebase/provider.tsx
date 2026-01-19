'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, DependencyList } from 'react';
import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, getFirestore, doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';

// Interfaces for context and hooks
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}
export interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Context
const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Provider Component
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseState, setFirebaseState] = useState<FirebaseContextState>({
    firebaseApp: null,
    firestore: null,
    auth: null,
    storage: null,
    user: null,
    userProfile: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);

    // Set services once
    setFirebaseState(prevState => ({
      ...prevState,
      firebaseApp: app,
      auth: auth,
      firestore: firestore,
      storage: storage,
    }));

    let profileUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, 
      (user) => {
        // When auth state changes, cancel any previous profile subscription
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }

        if (user) {
          // User is signed in.
          const profileDocRef = doc(firestore, 'users', user.uid);
          
          profileUnsubscribe = onSnapshot(profileDocRef, 
            (docSnap) => {
              const profile = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserProfile : null;
              setFirebaseState({
                firebaseApp: app,
                auth: auth,
                firestore: firestore,
                storage: storage,
                user: user,
                userProfile: profile,
                isUserLoading: false,
                userError: null,
              });
            },
            (error) => {
              console.error("Firebase Profile Snapshot Error:", error);
              setFirebaseState(prevState => ({
                ...prevState,
                user: user,
                userProfile: null,
                isUserLoading: false,
                userError: error,
              }));
            }
          );
        } else {
          // User is signed out.
          setFirebaseState(prevState => ({
            ...prevState,
            user: null,
            userProfile: null,
            isUserLoading: false,
            userError: null,
          }));
        }
      },
      (error) => {
        console.error("Firebase Auth State Error:", error);
        setFirebaseState(prevState => ({
          ...prevState,
          user: null,
          userProfile: null,
          isUserLoading: false,
          userError: error,
        }));
      }
    );

    // Cleanup both subscriptions on component unmount
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []); // Empty dependency array means this runs once on mount.


  if (firebaseState.isUserLoading) {
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

// --- HOOKS ---

export const useFirebase = (): FirebaseServices => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  if (!context.firebaseApp || !context.firestore || !context.auth || !context.storage) throw new Error('Firebase core services not available.');
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
  };
};

export const useAuth = (): Auth | null => useContext(FirebaseContext)?.auth ?? null;
export const useFirestore = (): Firestore | null => useContext(FirebaseContext)?.firestore ?? null;
export const useStorage = (): FirebaseStorage | null => useContext(FirebaseContext)?.storage ?? null;
export const useFirebaseApp = (): FirebaseApp | null => useContext(FirebaseContext)?.firebaseApp ?? null;

export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  const { user, userProfile, isUserLoading, userError } = context;
  return { user, userProfile, isUserLoading, userError };
};


// Keep this utility for memoizing queries/refs to avoid infinite loops in useCollection/useDoc
type MemoFirebase <T> = T & {__memo?: boolean};
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}
