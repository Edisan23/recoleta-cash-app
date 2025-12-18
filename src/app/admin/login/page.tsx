'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const ADMIN_UID_KEY = 'fake_admin_uid';

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminUid, setAdminUid] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAdminUid(localStorage.getItem(ADMIN_UID_KEY));
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && user && adminUid && user.uid === adminUid) {
      router.replace('/admin');
    }
  }, [user, isUserLoading, router, adminUid]);
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, ingresa tu correo y contraseña.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const storedAdminUid = localStorage.getItem(ADMIN_UID_KEY);
      if (userCredential.user.uid === storedAdminUid) {
        toast({
          title: '¡Bienvenido Administrador!',
          description: 'Has iniciado sesión correctamente.',
        });
        router.push('/admin');
      } else {
        await auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: 'Esta cuenta no tiene permisos de administrador.',
        });
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: 'Las credenciales son incorrectas.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || (user && user.uid === adminUid)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Acceso de Administrador</CardTitle>
            <CardDescription>
              Inicia sesión para gestionar el sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ingresar
            </Button>
             {!adminUid && (
                 <p className="text-sm text-muted-foreground">
                    No hay administrador registrado. <Link href="/admin/register" className="underline">Regístrate aquí</Link>.
                </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
