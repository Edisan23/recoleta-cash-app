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
import { useAuth, useUser } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { LogoSpinner } from '@/components/LogoSpinner';

const ADMIN_UID_KEY = 'fake_admin_uid';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    try {
      const storedAdminUid = localStorage.getItem(ADMIN_UID_KEY);
      setAdminUid(storedAdminUid);
    } catch (error) {
      console.error("Could not access localStorage:", error);
    } finally {
        setIsCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && user && adminUid && user.uid === adminUid) {
      router.replace('/admin');
    }
  }, [user, isUserLoading, router, adminUid]);
  

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const storedAdminUid = localStorage.getItem(ADMIN_UID_KEY);
      
      if (storedAdminUid) {
        // If an admin already exists, only that user can log in
        if (user.uid === storedAdminUid) {
          toast({
            title: '¡Bienvenido de nuevo!',
            description: 'Has iniciado sesión correctamente.',
          });
          router.push('/admin');
        } else {
          // If a different user tries to log in, deny access
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: 'Esta cuenta no tiene permisos de administrador.',
          });
        }
      } else {
        // If no admin exists, the first user to log in becomes the admin
        localStorage.setItem(ADMIN_UID_KEY, user.uid);
        setAdminUid(user.uid);
        toast({
          title: '¡Administrador Registrado!',
          description: 'Te has convertido en el administrador principal.',
        });
        router.push('/admin');
      }

    } catch (error: any) {
       if (error.code !== 'auth/popup-closed-by-user') {
          console.error('Admin login error:', error);
       }
       let description = 'Ocurrió un error inesperado.';
       if (error.code === 'auth/popup-closed-by-user') {
        description = 'El proceso de inicio de sesión fue cancelado.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isUserLoading || isCheckingAdmin || (user && user.uid === adminUid)) {
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
              {adminUid ? 'Acceso de Administrador' : 'Configurar Administrador Principal'}
            </CardTitle>
            <CardDescription>
              {adminUid 
                ? 'Inicia sesión para gestionar el sistema.' 
                : 'La primera cuenta que inicie sesión con Google se convertirá en el administrador.'}
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
