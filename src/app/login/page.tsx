'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Info } from 'lucide-react';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function OperatorLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setIsMounted(true);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (isMounted && !isUserLoading && user) {
      // User is logged in, check where to redirect.
      const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
      if (storedCompanyId) {
        router.replace('/operator/dashboard');
      } else {
        router.replace('/select-company');
      }
    }
    // If user is not logged in (!user), do nothing and show the login page.
  }, [user, isUserLoading, router, isMounted]);

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Error de configuración',
            description: 'El servicio de autenticación no está disponible.',
        });
        return;
    }

    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(auth, provider);
        const loggedInUser = userCredential.user;

        // Ensure user profile exists in Firestore.
        const userDocRef = doc(firestore, 'users', loggedInUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            const newUserProfile: Omit<UserProfile, 'id'> = {
                uid: loggedInUser.uid,
                displayName: loggedInUser.displayName || 'Operador Anónimo',
                photoURL: loggedInUser.photoURL || '',
                email: loggedInUser.email || '',
                isAnonymous: loggedInUser.isAnonymous,
                createdAt: new Date().toISOString(),
                role: 'operator',
            };
            await setDoc(userDocRef, newUserProfile);
        }
        
        // On successful sign-in, the useEffect will trigger the redirection.
        toast({
            title: '¡Bienvenido!',
            description: 'Has iniciado sesión correctamente.',
        });

    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            setIsSubmitting(false);
            return; // User closed the popup, do nothing.
        }
    
        console.error('Error during Google sign-in:', error);

        let description = 'Ocurrió un error al intentar iniciar sesión con Google.';
        if (error.code === 'auth/operation-not-allowed') {
            description = 'El inicio de sesión con Google no está habilitado. Por favor, contacta al administrador.';
        } else if (error.code === 'auth/unauthorized-domain') {
            description = 'Este dominio no está autorizado para iniciar sesión. Por favor, contacta al administrador.';
        } else if (error.code === 'auth/popup-blocked-by-browser') {
            description = 'La ventana de inicio de sesión fue bloqueada. Por favor, deshabilita tu bloqueador de pop-ups.';
        }

        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: description,
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isUserLoading || (isMounted && user)) {
     // Show a spinner while loading auth state OR if the user is already logged in and we are about to redirect.
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  // This will only render if not loading, the component is mounted, and there is no user.
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acceso de Operador</CardTitle>
          <CardDescription>
            Inicia sesión para registrar tus turnos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          {origin && (
              <Alert className="mb-2 text-left w-full">
                <Info className="h-4 w-4" />
                <AlertTitle>Dominio de la App</AlertTitle>
                <AlertDescription>
                  Para iniciar sesión, asegúrate de que este dominio esté en la lista de "Dominios autorizados" en la configuración de Authentication de Firebase:{" "}
                  <code className="font-semibold bg-muted px-1 py-0.5 rounded">{origin}</code>
                </AlertDescription>
              </Alert>
            )}
          <Button
            className="w-full max-w-xs"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || !auth}
          >
            {isSubmitting ? <LogoSpinner className="mr-2 h-4 w-4" /> : 
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
         <CardFooter>
            <Button variant="link" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2" />
                Volver al inicio
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
