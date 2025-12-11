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
import { Loader2 } from 'lucide-react';

const COMPANIES_DB_KEY = 'fake_companies_db';
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function SelectCompanyPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
        const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
        if (storedCompanies) {
            setCompanies(JSON.parse(storedCompanies));
        }
    } catch(e) {
        console.error("Failed to load companies from localStorage", e);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron cargar las empresas.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);


  const handleSelectCompany = (companyId: string) => {
    setIsSubmitting(true);
    try {
        localStorage.setItem(OPERATOR_COMPANY_KEY, companyId);
        toast({
            title: '¡Listo!',
            description: 'Has seleccionado la empresa.',
        });
        router.push('/'); // Redirect to dashboard
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
         <CardFooter>
            {/* Optional: Add a sign-out or back button here if needed */}
         </CardFooter>
      </Card>
    </div>
  );
}
