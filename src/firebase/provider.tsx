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

// State for the context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean; // A single loading flag for auth + profile
  error: Error | null;
}

// Simplified return type for core services hook
export interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Return type for the useUser hook
export interface UserHookResult {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean; // Aliased for consistency with existing components
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<FirebaseContextState>({
        firebaseApp: null,
        firestore: null,
        auth: null,
        storage: null,
        user: null,
        userProfile: null,
        isLoading: true, // Start in loading state
        error: null,
    });

    useEffect(() => {
        // Initialize Firebase services
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        const storage = getStorage(app);
        
        setState(prevState => ({ ...prevState, firebaseApp: app, auth, firestore, storage }));

        // Listen for auth state changes
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in, now create a profile listener.
                const userDocRef = doc(firestore, 'users', user.uid);
                
                // This onSnapshot listener will be cleaned up by the returned function.
                const unsubscribeProfile = onSnapshot(userDocRef, 
                    (docSnap) => {
                        const profile = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as UserProfile : null;
                        setState(prevState => ({
                            ...prevState,
                            user,
                            userProfile: profile,
                            isLoading: false, // Loading is complete
                            error: null,
                        }));
                    },
                    (error) => {
                        console.error("FirebaseProvider: Profile snapshot error:", error);
                        setState(prevState => ({
                            ...prevState,
                            user,
                            userProfile: null,
                            isLoading: false, // Still complete, but with an error
                            error,
                        }));
                    }
                );
                // When the auth state changes (e.g. user signs out),
                // onAuthStateChanged cleans up by calling this returned function.
                return unsubscribeProfile;
            } else {
                // User is signed out, clear user data and finish loading.
                setState(prevState => ({
                    ...prevState,
                    user: null,
                    userProfile: null,
                    isLoading: false,
                    error: null,
                }));
            }
        }, (error) => {
            console.error("FirebaseProvider: Auth state error:", error);
            setState(prevState => ({
                ...prevState,
                user: null,
                userProfile: null,
                isLoading: false,
                error,
            }));
        });

        // Cleanup the auth listener on component unmount
        return () => unsubscribeAuth();
    }, []); // This effect runs only once

    // Show a global spinner while auth and profile are loading
    if (state.isLoading) {
         return (
            <div className="flex h-screen w-full items-center justify-center">
                <LogoSpinner />
            </div>
        );
    }

    return (
      <FirebaseContext.Provider value={state}>
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
  const { user, userProfile, isLoading, error } = context;
  // Rename isLoading to isUserLoading for consistency with the rest of the app
  return { user, userProfile, isUserLoading: isLoading, userError: error };
};


// Keep this utility for memoizing queries/refs to avoid infinite loops in useCollection/useDoc
type MemoFirebase <T> = T & {__memo?: boolean};
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}