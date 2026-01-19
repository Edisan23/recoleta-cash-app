'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, DependencyList } from 'react';
import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, getFirestore, doc, onSnapshot } from 'firebase/firestore';
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
  // Services
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [firestore, setFirestore] = useState<Firestore | null>(null);
  const [storage, setStorage] = useState<FirebaseStorage | null>(null);
  
  // User State
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  // Effect 1: Initialize Firebase services once.
  useEffect(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    setFirebaseApp(app);
    setAuth(getAuth(app));
    setFirestore(getFirestore(app));
    setStorage(getStorage(app));
  }, []);

  // Effect 2: Listen to authentication state changes.
  useEffect(() => {
    if (!auth) return; // Only run when auth service is ready.

    const unsubscribe = onAuthStateChanged(auth, user => {
        setUser(user); // Set user to the new user object or null.
        setIsUserLoading(true); // Start loading profile whenever auth state changes.
    }, error => {
        console.error("Firebase Auth State Error:", error);
        setUserError(error);
        setUser(null);
        setUserProfile(null);
        setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Effect 3: Listen to user profile changes based on user's auth state.
  useEffect(() => {
    if (!firestore) return; // Need firestore to listen.
    
    if (user) {
      // User is signed in, listen for their profile document.
      const profileDocRef = doc(firestore, 'users', user.uid);
      const unsubscribe = onSnapshot(profileDocRef, 
        (docSnap) => {
            const profile = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserProfile : null;
            setUserProfile(profile);
            setIsUserLoading(false); // Done loading.
        },
        (error) => {
            console.error("Firebase Profile Snapshot Error:", error);
            setUserProfile(null);
            setUserError(error);
            setIsUserLoading(false); // Done loading, but with an error.
        }
      );
      return () => unsubscribe();
    } else {
      // User is signed out, or auth state is not yet determined.
      setUserProfile(null);
      setIsUserLoading(false); // No user, so we are done loading.
    }
  }, [user, firestore]);

  const value = {
    firebaseApp,
    firestore,
    auth,
    storage,
    user,
    userProfile,
    isUserLoading,
    userError,
  };

  // The global loading spinner is now controlled by `isUserLoading` which reflects both auth and profile state.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
          <LogoSpinner />
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={value}>
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
