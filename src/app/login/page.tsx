'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  AuthError,
  type User,
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


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const handleUserDoc = async (user: User) => {
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        name: user.displayName || 'Anónimo',
        email: user.email,
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
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Elige un método para acceder a tu cuenta.
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
          <Button
              variant="outline"
              className="w-full"
              onClick={handleAnonymousSignIn}
          >
              Continuar en Modo Anónimo
          </Button>
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
        </CardFooter>
      </Card>
    </div>
  );
}
