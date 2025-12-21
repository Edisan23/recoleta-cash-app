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
import { useAuth, useUser } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { LogoSpinner } from '@/components/LogoSpinner';

export default function OperatorLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If user is logged in, redirect to company selection
    if (!isUserLoading && user) {
      router.replace('/select-company');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // On successful sign-in, the useEffect will trigger the redirection.
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description:
          error.code === 'auth/popup-closed-by-user'
            ? 'El proceso de inicio de sesión fue cancelado.'
            : 'Ocurrió un error al intentar iniciar sesión con Google.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isUserLoading || user) {
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
          <CardTitle className="text-2xl">Acceso de Operador</CardTitle>
          <CardDescription>
            Inicia sesión para registrar tus turnos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          <Button
            className="w-full max-w-xs"
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
