'use client';

import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/types/db-entities';
import { updateDocumentNonBlocking } from '@/firebase';

export function CompanySelection() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const companiesQuery = useMemoFirebase(
    () => collection(firestore, 'companies'),
    [firestore]
  );
  
  const { data: companies, isLoading } = useCollection<Company>(companiesQuery);

  const handleSelectCompany = async (companyId: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para seleccionar una empresa.',
      });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
      // Non-blocking update
      updateDocumentNonBlocking(userDocRef, { companyId: companyId });
      
      toast({
        title: '¡Empresa seleccionada!',
        description: 'Ahora verás el panel de tu empresa.',
      });
      // The main page will automatically redirect to the dashboard.
    } catch (error) {
       // Error will be caught by the global handler via non-blocking update
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando empresas...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl">
        <h1 className="mb-2 text-center text-3xl font-bold">Selecciona tu Empresa</h1>
        <p className="mb-8 text-center text-muted-foreground">Elige la empresa en la que trabajas para continuar.</p>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {companies && companies.map((company) => (
            <Card key={company.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={company.logoUrl} alt={company.name} />
                  <AvatarFallback>{company.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0">
                <Button className="w-full" onClick={() => handleSelectCompany(company.id)}>
                  Seleccionar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

         {(!companies || companies.length === 0) && !isLoading && (
            <div className="col-span-full text-center text-muted-foreground">
                <p>No hay empresas disponibles en este momento.</p>
                <p>Por favor, contacta al administrador.</p>
            </div>
         )}
      </div>
    </div>
  );
}