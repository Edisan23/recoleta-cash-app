'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
  signOut,
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
import { LogOut, Hexagon } from 'lucide-react';
import Link from 'next/link';

const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function LoginPage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.uid === ADMIN_UID) {
        router.push('/admin');
      } else {
        await signOut(auth); // Sign out the unauthorized user
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: 'Esta cuenta no tiene permisos de administrador.',
        });
      }
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error con Google',
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
          <Hexagon className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl">Acceso Administrador</CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta de Google autorizada.
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
        </CardContent>
        <CardContent className="flex flex-col gap-4 text-center">
            {user && user.uid !== ADMIN_UID && (
              <div className="text-center text-sm text-muted-foreground w-full">
                  Has iniciado sesión como {user.displayName || user.email}.
                  <Button variant="outline" className="w-full mt-4" onClick={handleSignOut}>
                      <LogOut className="mr-2" />
                      Cerrar Sesión
                  </Button>
              </div>
            )}
             <Link href="/" className="text-sm text-center text-muted-foreground hover:underline">
                Volver al inicio
            </Link>
        </CardContent>
      </Card>
    </div>
  );
}
