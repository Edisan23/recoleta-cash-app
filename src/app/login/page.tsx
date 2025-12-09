'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  AuthError,
  User,
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

  const handleSignOut = async () => {
    await signOut(auth);
    // Stay on login page after sign out
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
            disabled={isUserLoading || !!user}
          >
            Continuar con Google
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleAnonymousSignIn}
            disabled={isUserLoading || !!user}
          >
            Continuar en Modo Anónimo
          </Button>
        </CardContent>
        {user && (
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              Ya has iniciado sesión como {user.displayName || user.email || 'Anónimo'}.
            </div>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2" />
                Cerrar Sesión
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
