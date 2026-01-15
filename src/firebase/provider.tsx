
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';

// --- THEME APPLICATION LOGIC ---
const hexToHslString = (hex: string): { hsl: string; hue: string } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  const hue = (h * 360).toFixed(0);
  const hsl = `${hue} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
  return { hsl, hue };
};

function applyThemeColor(color: string | null | undefined) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const colorToApply = color || '#6d28d9'; // Fallback to default deep purple
  const { hsl, hue } = hexToHslString(colorToApply);
  root.style.setProperty('--user-primary-color', hsl);
  root.style.setProperty('--user-primary-hue', hue);
}


interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp?: FirebaseApp;
  firestore?: Firestore;
  auth?: Auth;
  storage?: FirebaseStorage;
}

// Internal state for user authentication and profile
interface UserState {
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  storage: FirebaseStorage | null;
  // User authentication and profile state
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean; // True during initial auth/profile check
  userError: Error | null; // Error from auth/profile listener
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

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [userState, setUserState] = useState<UserState>({
    user: null,
    userProfile: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes and fetch profile
  useEffect(() => {
    if (!auth || !firestore) {
      setUserState({ user: null, userProfile: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    let profileUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (profileUnsubscribe) {
          profileUnsubscribe(); // Unsubscribe from previous user's profile listener
        }
        
        if (firebaseUser) {
          // User is signed in, set auth state and listen for profile changes
          setUserState(prevState => ({ ...prevState, user: firebaseUser, isUserLoading: true, userError: null }));
          
          const profileDocRef = doc(firestore, 'users', firebaseUser.uid);
          profileUnsubscribe = onSnapshot(profileDocRef, 
            (doc) => {
              const profileData = doc.exists() ? { id: doc.id, ...doc.data() } as UserProfile : null;
              setUserState({ user: firebaseUser, userProfile: profileData, isUserLoading: false, userError: null });
              // Apply theme as soon as profile is loaded/updated
              applyThemeColor(profileData?.themeColor);
            },
            (error) => {
              console.error("FirebaseProvider: Profile onSnapshot error:", error);
              setUserState({ user: firebaseUser, userProfile: null, isUserLoading: false, userError: error });
            }
          );
        } else {
          // User is signed out, reset theme to default
          setUserState({ user: null, userProfile: null, isUserLoading: false, userError: null });
          applyThemeColor(null);
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        if (profileUnsubscribe) profileUnsubscribe();
        setUserState({ user: null, userProfile: null, isUserLoading: false, userError: error });
      }
    );

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [auth, firestore]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user: userState.user,
      userProfile: userState.userProfile,
      isUserLoading: userState.isUserLoading,
      userError: userState.userError,
    };
  }, [firebaseApp, firestore, auth, storage, userState]);
  
  // Apply theme based on the userProfile in the context.
  // This effect runs on the client after hydration and whenever the user profile changes.
  useEffect(() => {
    applyThemeColor(contextValue.userProfile?.themeColor);
  }, [contextValue.userProfile]);
  
  // If services are not yet available (e.g., during initial client-side init), show a loader.
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
