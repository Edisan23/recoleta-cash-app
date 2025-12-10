'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  AuthError,
  type User as FirebaseAuthUser,
  signOut,
} from 'firebase/auth';
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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { LogOut } from 'lucide-react';
import { Hexagon } from 'lucide-react';

const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const isAdminLogin = searchParams.get('mode') === 'admin';

  const handleUserDoc = async (firebaseUser: FirebaseAuthUser) => {
    // If the user is the admin, redirect to the admin panel immediately.
    if (firebaseUser.uid === ADMIN_UID) {
      router.push('/admin');
      return;
    }

    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Anónimo',
        email: firebaseUser.email,
        role: 'operator',
        companyId: null,
        createdAt: serverTimestamp(),
        paymentStatus: 'trial',
      });
    }

     router.push('/');
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleUserDoc(result.user);
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error con Google',
        description: authError.message,
      });
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      const result = await signInAnonymously(auth);
      await handleUserDoc(result.user);
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error en modo anónimo',
        description: authError.message,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            {isAdminLogin && <Hexagon className="mx-auto h-12 w-12 text-primary" />}
          <CardTitle className="text-2xl">{isAdminLogin ? 'Acceso Administrador' : 'Iniciar Sesión'}</CardTitle>
          <CardDescription>
            {isAdminLogin ? 'Inicia sesión con tu cuenta de Google.' : 'Elige un método para acceder a tu cuenta.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
          >
            Continuar con Google
          </Button>
          {!isAdminLogin && (
            <Button
                variant="outline"
                className="w-full"
                onClick={handleAnonymousSignIn}
            >
                Continuar en Modo Anónimo
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            {user && (
            <div className="text-center text-sm text-muted-foreground w-full">
                Ya has iniciado sesión como {user.displayName || user.email || 'Anónimo'}.
                <Button variant="outline" className="w-full mt-4" onClick={handleSignOut}>
                    <LogOut className="mr-2" />
                    Cerrar Sesión
                </Button>
            </div>
            )}
             <Link href="/" className="text-sm text-center text-muted-foreground hover:underline">
                Volver al inicio
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
