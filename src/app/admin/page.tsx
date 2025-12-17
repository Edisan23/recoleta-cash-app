'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useAuth, useUser } from '@/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, ingresa un correo válido.' }),
  password: z
    .string()
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1'; // IMPORTANT: Replace with the actual Admin UID

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      if (user.uid === ADMIN_UID) {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // After sign-in, the useEffect will handle redirection if the user is the admin.
      if (result.user.uid !== ADMIN_UID) {
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: 'Esta cuenta no tiene permisos de administrador.',
        });
        await auth.signOut();
      } else {
         toast({
          title: '¡Bienvenido!',
          description: 'Has iniciado sesión como administrador.',
        });
      }
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description:
          error.code === 'auth/popup-closed-by-user'
            ? 'El proceso de inicio de sesión fue cancelado.'
            : 'Ocurrió un error al intentar iniciar sesión con Google.',
      });
    }
  };
  
  const handleEmailSignIn = async (values: z.infer<typeof formSchema>) => {
    if (!auth) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user.uid !== ADMIN_UID) {
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: 'Las credenciales no corresponden a un administrador.',
          });
      } else {
         toast({
          title: '¡Bienvenido!',
          description: 'Has iniciado sesión como administrador.',
        });
      }
    } catch (error: any) {
       console.error('Error during email sign-in:', error);
        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: 'Correo o contraseña incorrectos.',
        });
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acceso de Administrador</CardTitle>
          <CardDescription>
            Inicia sesión para gestionar Turno Pro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={form.formState.isSubmitting}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.5 69.5c-24.3-23.6-58.3-38.3-99.8-38.3-87.3 0-157.8 70.5-157.8 157.8s70.5 157.8 157.8 157.8c105.8 0 138.8-78.4 142.8-108.3H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"
              ></path>
            </svg>
            Ingresar con Google
          </Button>
          <div className="my-4 flex items-center">
            <Separator className="flex-1" />
            <span className="mx-4 text-xs text-muted-foreground">O</span>
            <Separator className="flex-1" />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEmailSignIn)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tjedisan@gmail.com"
                        {...field}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingresar
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter>
            <Button variant="link" className="w-full" onClick={() => router.push('/')}>
                Volver al inicio
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
