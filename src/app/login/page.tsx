'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User as UserIcon, Hexagon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// The specific UID for the admin user
const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isAdminLogin = searchParams.get('mode') === 'admin';

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const signedInUser = result.user;

      // Ensure that only the designated admin can proceed.
      if (signedInUser.uid !== ADMIN_UID) {
        await auth.signOut(); // Sign out the unauthorized user.
        toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: 'Esta cuenta no tiene permisos de administrador.',
        });
        return;
      }
      
      // Create/update the admin user document in Firestore.
      const userDocRef = doc(firestore, 'users', signedInUser.uid);
      await setDoc(userDocRef, {
          id: signedInUser.uid,
          name: signedInUser.displayName || 'Admin',
          email: signedInUser.email,
          role: 'admin',
          createdAt: new Date().toISOString(),
          paymentStatus: 'paid' 
      }, { merge: true });
      
      // Redirect to the admin panel upon successful admin login.
      router.push('/admin');

    } catch (error) {
      const authError = error as AuthError;
      // Handle specific cancellation error gracefully
      if (authError.code === 'auth/popup-closed-by-user') {
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: authError.message,
      });
    }
  };

  const handleSignOut = async () => {
    if(auth) {
      await auth.signOut();
      // After signing out, redirect to the main landing page.
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <Hexagon className="h-12 w-12 text-primary" />
            </div>
          <CardTitle className="text-2xl">
            Acceso Administrador
          </CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta de Google autorizada para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            className="w-full"
            onClick={handleGoogleSignIn}
          >
            Continuar con Google
          </Button>

        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          {user && (
            <div className="text-center text-sm text-muted-foreground w-full">
              Has iniciado sesión como {user.displayName || user.email}.
              <Button variant="outline" className="w-full mt-4" onClick={handleSignOut}>
                <LogOut className="mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          )}
           {!user && (
             <Button variant="link" size="sm" className="text-muted-foreground" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al inicio
                </Link>
             </Button>
           )}
        </CardFooter>
      </Card>
    </div>
  );
}
