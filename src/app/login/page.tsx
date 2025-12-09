'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  AuthError,
  User,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleUserDoc = async (user: User) => {
    const userRef = doc(firestore, 'users', user.uid);
    const isAdmin = user.uid === '15sJqL2prSVL2adSXRyqsefg26v1';
    
    if (isAdmin) {
        // If the user is the admin, redirect directly to the admin panel.
        // We can ensure their document exists or update it if needed.
        await setDoc(userRef, {
            id: user.uid,
            name: user.displayName || 'Admin',
            email: user.email,
            role: 'admin',
            createdAt: serverTimestamp(),
            paymentStatus: 'paid',
        }, { merge: true });
        router.push('/admin');
        return;
    }

    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create user document for operators if it doesn't exist
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

     // Redirect operators to the main page, which will handle the company selection flow
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
            variant="secondary"
            className="w-full"
            onClick={handleAnonymousSignIn}
          >
            Continuar en Modo Anónimo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
