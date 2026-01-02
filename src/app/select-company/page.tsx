'use client';

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
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { collection } from 'firebase/firestore';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function SelectCompanyPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companiesRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'companies') : null, [firestore, user]);
  const { data: companies, isLoading: areCompaniesLoading } = useCollection<Company>(companiesRef);


  useEffect(() => {
    if(!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSelectCompany = (companyId: string) => {
    setIsSubmitting(true);
    try {
        localStorage.setItem(OPERATOR_COMPANY_KEY, companyId);
        toast({
            title: '¡Listo!',
            description: 'Has seleccionado la empresa.',
        });
        router.push('/operator/dashboard'); // Redirect to dashboard
    } catch(e) {
        console.error('Error saving company selection:', e);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo seleccionar la empresa. Inténtalo de nuevo.',
        });
        setIsSubmitting(false);
    }
  };

  if (isUserLoading || !user || areCompaniesLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <Button variant="ghost" onClick={() => router.push('/login')} className="mb-4 justify-start p-0 h-auto self-start">
            <ArrowLeft className="mr-2" />
            Volver
          </Button>
          <CardTitle className="text-2xl">Selecciona tu Empresa</CardTitle>
          <CardDescription>
            Elige la empresa para la que trabajas para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areCompaniesLoading ? (
            <div className="flex justify-center items-center h-40">
              <LogoSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {companies?.filter(c => c.isActive).map((company) => (
                <button
                  key={company.id}
                  disabled={isSubmitting}
                  onClick={() => handleSelectCompany(company.id)}
                  className="p-4 border rounded-lg text-center hover:bg-accent hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-between gap-3 aspect-square"
                >
                  <div className="flex-grow flex items-center justify-center">
                    {company.logoUrl ? (
                      <Image
                        src={company.logoUrl}
                        alt={`${company.name} logo`}
                        width={80}
                        height={80}
                        className="rounded-md object-contain h-full w-full max-h-20 max-w-20"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground p-2">
                        Sin logo
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-sm block h-10 w-full overflow-hidden text-ellipsis">{company.name}</span>
                </button>
              ))}
            </div>
          )}
           {companies && companies.filter(c => c.isActive).length === 0 && !areCompaniesLoading && (
               <p className="text-center text-muted-foreground col-span-full py-10">No hay empresas activas disponibles. Contacta a un administrador.</p>
           )}
        </CardContent>
         <CardFooter>
            {/* Optional: Add a sign-out or back button here if needed */}
         </CardFooter>
      </Card>
    </div>
  );
}
