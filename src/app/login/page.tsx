'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  AuthError,
  signInAnonymously,
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
import { LogOut, User as UserIcon, Hexagon } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isAdminLogin = searchParams.get('mode') === 'admin';

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // After any sign-in, always go to the root page.
      // The root page will then decide where to redirect the user.
      router.push('/');
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
    if (isAdminLogin) return;
    try {
      await signInAnonymously(auth);
      router.push('/');
    } catch (error) {
      const authError = error as AuthError;
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
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto my-4">
            {isAdminLogin ? (
                <Hexagon className="h-12 w-12 text-primary" />
            ) : (
                <UserIcon className="h-12 w-12 text-primary" />
            )}
            </div>
          <CardTitle className="text-2xl">
            {isAdminLogin ? 'Acceso Administrador' : 'Iniciar Sesión'}
          </CardTitle>
          <CardDescription>
            {isAdminLogin
              ? 'Inicia sesión con tu cuenta de Google autorizada.'
              : 'Elige un método para continuar.'}
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
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    O continúa como
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleAnonymousSignIn}
              >
                Operador Anónimo
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          {user && (
            <div className="text-center text-sm text-muted-foreground w-full">
              Has iniciado sesión como {user.isAnonymous ? 'Anónimo' : user.displayName || user.email}.
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
