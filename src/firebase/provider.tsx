'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';

import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';
import { firebaseConfig } from '@/firebase/config';

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

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [services, setServices] = useState<{
        firebaseApp: FirebaseApp | null;
        firestore: Firestore | null;
        auth: Auth | null;
        storage: FirebaseStorage | null;
    }>({
        firebaseApp: null,
        firestore: null,
        auth: null,
        storage: null,
    });

    const [authState, setAuthState] = useState<{
        user: User | null;
        isAuthLoading: boolean;
        authError: Error | null;
    }>({
        user: null,
        isAuthLoading: true,
        authError: null,
    });

    const [profileState, setProfileState] = useState<{
        userProfile: UserProfile | null;
        isProfileLoading: boolean;
        profileError: Error | null;
    }>({
        userProfile: null,
        isProfileLoading: false,
        profileError: null,
    });

    // Initialize Firebase on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
            setServices({
                firebaseApp: app,
                auth: getAuth(app),
                firestore: getFirestore(app),
                storage: getStorage(app)
            });
        }
    }, []);

    // Effect for AUTHENTICATION state
    useEffect(() => {
        if (!services.auth) {
            if (services.firebaseApp) {
                setAuthState({ user: null, isAuthLoading: false, authError: new Error("Auth service not available.") });
            }
            return;
        }

        const unsubscribe = onAuthStateChanged(services.auth,
            (user) => {
                setAuthState({ user, isAuthLoading: false, authError: null });
            },
            (error) => {
                setAuthState({ user: null, isAuthLoading: false, authError: error });
            }
        );
        return () => unsubscribe();
    }, [services.auth, services.firebaseApp]);

    // Effect for PROFILE data
    useEffect(() => {
        if (!services.firestore || !authState.user) {
            setProfileState({ userProfile: null, isProfileLoading: false, profileError: null });
            return;
        }

        setProfileState({ userProfile: null, isProfileLoading: true, profileError: null });
        const profileDocRef = doc(services.firestore, 'users', authState.user.uid);
        const unsubscribe = onSnapshot(profileDocRef,
            (doc) => {
                const profileData = doc.exists() ? { id: doc.id, ...doc.data() } as UserProfile : null;
                setProfileState({ userProfile: profileData, isProfileLoading: false, profileError: null });
            },
            (error) => {
                console.error("FirebaseProvider: Profile onSnapshot error:", error);
                setProfileState({ userProfile: null, isProfileLoading: false, profileError: error });
            }
        );
        return () => unsubscribe();
    }, [services.firestore, authState.user]);

    const contextValue = useMemo((): FirebaseContextState => {
        const areServicesAvailable = !!(services.firebaseApp && services.firestore && services.auth && services.storage);
        return {
            areServicesAvailable,
            ...services,
            user: authState.user,
            userProfile: profileState.userProfile,
            isUserLoading: authState.isAuthLoading || profileState.isProfileLoading,
            userError: authState.authError || profileState.profileError,
        };
    }, [services, authState, profileState]);

    if (!contextValue.areServicesAvailable) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LogoSpinner />
            </div>
        );
    }
  
    return (
      <FirebaseContext.Provider value={contextValue}>
        <FirebaseErrorListener />
        {children}
      </FirebaseContext.Provider>
    );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
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

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    return null;
  }
  return context.auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    return null;
  }
  return context.firestore;
};

/** Hook to access Firebase Storage instance. */
export const useStorage = (): FirebaseStorage | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    return null;
  }
  return context.storage;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    return null;
  }
  return context.firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, userProfile, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  const { user, userProfile, isUserLoading, userError } = context;
  return { user, userProfile, isUserLoading, userError };
};