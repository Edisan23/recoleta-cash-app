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
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const ADMIN_UID_KEY = 'fake_admin_uid';

export default function AdminRegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminRegistered, setIsAdminRegistered] = useState(true); // Assume yes until checked

  useEffect(() => {
    try {
      const adminUid = localStorage.getItem(ADMIN_UID_KEY);
      if (adminUid) {
        setIsAdminRegistered(true);
      } else {
        setIsAdminRegistered(false);
      }
    } catch (error) {
       console.error("Could not access localStorage:", error);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (password.length < 6) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'La contraseña debe tener al menos 6 caracteres.',
        });
        return;
    }
    
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const adminUid = userCredential.user.uid;
      
      localStorage.setItem(ADMIN_UID_KEY, adminUid);
      
      toast({
        title: '¡Administrador Registrado!',
        description: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
      });
      
      // Sign out the newly created user so they have to log in manually
      await auth.signOut();

      router.push('/admin/login');

    } catch (error: any) {
      console.error('Admin registration error:', error);
      let description = 'No se pudo crear la cuenta.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'El correo electrónico ya está en uso. Intenta con otro.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAdminRegistered) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Registro Deshabilitado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Ya existe una cuenta de administrador para este sistema.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/admin/login">Ir a Iniciar Sesión</Link>
                        </Button>
                    </CardFooter>
                </Card>
           </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <form onSubmit={handleRegister}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Registro de Administrador</CardTitle>
            <CardDescription>
              Crea la cuenta de administrador principal. Esta acción solo se puede realizar una vez.
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
              <Label htmlFor="password">Contraseña (mín. 6 caracteres)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Administrador
            </Button>
            <p className="text-sm text-muted-foreground">
                ¿Ya tienes una cuenta? <Link href="/admin/login" className="underline">Inicia sesión</Link>.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
