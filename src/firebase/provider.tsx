'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, DependencyList } from 'react';
import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth and profile state
export interface UserHookResult {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
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
        userProfile: null,
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
        
        let unsubscribeProfile: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, 
            (user) => {
                if (unsubscribeProfile) {
                    unsubscribeProfile();
                }

                if (user) {
                    setFirebaseState(prevState => ({
                        ...prevState,
                        user: user,
                        isUserLoading: true,
                        userError: null,
                    }));
                    
                    const profileDocRef = doc(firestore, 'users', user.uid);
                    unsubscribeProfile = onSnapshot(profileDocRef, 
                        (docSnapshot) => {
                            const userProfile = docSnapshot.exists() ? { id: docSnapshot.id, ...docSnapshot.data() } as UserProfile : null;
                            setFirebaseState(prevState => ({
                                ...prevState,
                                userProfile: userProfile,
                                isUserLoading: false,
                            }));
                        },
                        (error) => {
                            console.error("FirebaseProvider: Profile snapshot error:", error);
                            setFirebaseState(prevState => ({
                                ...prevState,
                                userProfile: null,
                                isUserLoading: false,
                                userError: error,
                            }));
                        }
                    );
                } else {
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
                console.error("FirebaseProvider: Auth state error:", error);
                setFirebaseState(prevState => ({
                    ...prevState,
                    user: null,
                    userProfile: null,
                    isUserLoading: false,
                    userError: error,
                }));
            }
        );

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
    }, []);

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
    userProfile: context.userProfile,
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
  const { user, userProfile, isUserLoading, userError } = context;
  return { user, userProfile, isUserLoading, userError };
};