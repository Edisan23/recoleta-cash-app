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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { UserProfile } from '@/types/db-entities';


const ADMIN_EMAIL = 'tjedisan@gmail.com';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isUserLoading) {
      return;
    }

    if (user) {
      if (user.email === ADMIN_EMAIL) {
        router.replace('/admin');
      } else {
        if (auth) {
            auth.signOut();
        }
      }
    }
    
  }, [user, isUserLoading, router, isMounted, auth]);


  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor, ingresa correo y contraseña.',
      });
      return;
    }
    setIsSubmitting(true);
    
    try {
      if (email !== ADMIN_EMAIL) {
        throw new Error('invalid-admin-email');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      toast({
        title: '¡Bienvenido Administrador!',
        description: 'Has iniciado sesión correctamente.',
      });
      router.push('/admin');

    } catch (error: any) {
       console.error('Admin login error:', error);
       let title = 'Error de Autenticación';
       let description = 'Ocurrió un error inesperado al intentar iniciar sesión.';
       if (error.message === 'invalid-admin-email' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          title = 'Acceso Denegado';
          description = 'Esta cuenta no tiene permisos de administrador o la contraseña es incorrecta.';
       }
        toast({
          variant: 'destructive',
          title: title,
          description: description,
        });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isUserLoading || !isMounted || (user && user.email === ADMIN_EMAIL)) {
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
              Acceso de Administrador
            </CardTitle>
            <CardDescription>
              Ingresa tus credenciales para gestionar la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !auth}
              >
                {isSubmitting ? <LogoSpinner className="mr-2" /> : null}
                Ingresar
              </Button>
            </form>
          </CardContent>
      </Card>
    </div>
  );
}
