'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    // Redirect if user is logged in and is an admin
    if (!isUserLoading && !isProfileLoading && user && userProfile) {
      if (userProfile.role === 'admin') {
        router.replace('/admin');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  const handleFirstAdminLogin = async (loggedInUser: User) => {
      if (!firestore) return;
      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userProfile: Omit<UserProfile, 'id'> = {
          uid: loggedInUser.uid,
          displayName: loggedInUser.displayName || 'Admin',
          photoURL: loggedInUser.photoURL || '',
          email: loggedInUser.email || '',
          isAnonymous: loggedInUser.isAnonymous,
          createdAt: new Date().toISOString(),
          paymentStatus: 'paid', // Admins are always considered 'paid'
          role: 'admin',
      };
      await setDoc(userDocRef, userProfile);
      toast({
          title: '¡Administrador Registrado!',
          description: 'Te has convertido en el administrador principal.',
      });
      router.push('/admin');
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const loggedInUser = userCredential.user;

      const userDocRef = doc(firestore, 'users', loggedInUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        if (profile.role === 'admin') {
           toast({
            title: '¡Bienvenido de nuevo!',
            description: 'Has iniciado sesión correctamente.',
          });
          router.push('/admin');
        } else {
          // This user exists but is not an admin
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: 'Esta cuenta no tiene permisos de administrador.',
          });
        }
      } else {
        // This is a new user login. We need to check if they should be the first admin.
        // For this app, we'll assume the first person to log into this page becomes the admin.
        await handleFirstAdminLogin(loggedInUser);
      }

    } catch (error: any) {
       if (error.code !== 'auth/popup-closed-by-user') {
          console.error('Admin login error:', error);
       }
       toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: error.code === 'auth/popup-closed-by-user' 
          ? 'El proceso de inicio de sesión fue cancelado.' 
          : 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isProfileLoading || (user && userProfile && userProfile.role === 'admin')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Acceso de Administrador
            </CardTitle>
            <CardDescription>
              La primera cuenta en iniciar sesión se convertirá en el administrador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Button
                className="w-full"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || !auth}
              >
                {isSubmitting ? <LogoSpinner className="mr-2" /> : 
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.5 69.5c-24.3-23.6-58.3-38.3-99.8-38.3-87.3 0-157.8 70.5-157.8 157.8s70.5 157.8 157.8 157.8c105.8 0 138.8-78.4 142.8-108.3H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"
                  ></path>
                </svg>}
                Ingresar con Google
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}
