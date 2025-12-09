'use client';

import { useCollection, useFirestore, useUser, useAuth } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { Company } from '@/types/db-entities';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMemoFirebase } from '@/firebase/provider';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function SelectCompanyPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companiesRef = useMemoFirebase(
    () => (user ? collection(firestore, 'companies') : null),
    [firestore, user]
  );
  const { data: companies, isLoading: areCompaniesLoading } =
    useCollection<Company>(companiesRef);

  // Redirect admin away from this page or unauthenticated users to login
  useEffect(() => {
    if (!isUserLoading) {
        if (user?.uid === '15sJqL2prSVL2adSXRyqsefg26v1') {
            router.push('/admin');
        } else if (!user) {
            router.push('/login');
        }
    }
  },[user, isUserLoading, router]);

  const handleSelectCompany = async (companyId: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para seleccionar una empresa.',
      });
      return;
    }

    setIsSubmitting(true);
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
      await updateDoc(userDocRef, { companyId: companyId });
      toast({
        title: '¡Listo!',
        description: 'Te has unido a la empresa.',
      });
      router.push('/'); // Redirect to dashboard
    } catch (error) {
      console.error('Error updating user company:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo seleccionar la empresa. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // The primary loading state now depends on both user and company data loading states.
  const isLoading = isUserLoading || areCompaniesLoading;

  // Show a generic loading screen while the user's auth state is being determined.
  if (isUserLoading || !user) {
      return (
           <div className="flex min-h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Selecciona tu Empresa</CardTitle>
          <CardDescription>
            Elige la empresa para la que trabajas para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies?.filter(c => c.isActive).map((company) => (
                <button
                  key={company.id}
                  disabled={isSubmitting}
                  onClick={() => handleSelectCompany(company.id)}
                  className="p-4 border rounded-lg text-center hover:bg-accent hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center gap-3">
                    {company.logoUrl ? (
                      <Image
                        src={company.logoUrl}
                        alt={`${company.name} logo`}
                        width={64}
                        height={64}
                        className="rounded-md object-contain h-16 w-16"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                        Sin logo
                      </div>
                    )}
                    <span className="font-medium">{company.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
           {companies && companies.filter(c => c.isActive).length === 0 && !isLoading && (
               <p className="text-center text-muted-foreground col-span-full">No hay empresas activas disponibles. Contacta a un administrador.</p>
           )}
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="mr-2" />
                Cerrar Sesión
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
