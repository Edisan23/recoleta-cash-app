'use client';

import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types/db-entities';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const ADMIN_EMAIL = 'tjedisan@gmail.com';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const addCompany = async (newCompanyData: Omit<Company, 'id'>) => {
    if (!firestore) return;
    const companiesCollectionRef = collection(firestore, 'companies');
    try {
      const docRef = await addDoc(companiesCollectionRef, newCompanyData);
      toast({
          title: "Empresa Creada",
          description: `La empresa "${newCompanyData.name}" ha sido creada.`,
      });
      // Redirect to the new company's settings page
      router.push(`/admin/company/${docRef.id}`);
    } catch (error) {
      console.error("Could not save to Firestore:", error);
       toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear la empresa.",
      });
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await auth.signOut();
      router.push('/admin/login');
    }
  };
  
  if (isUserLoading) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  if (!isUserLoading && (!user || user.email !== ADMIN_EMAIL)) {
    router.replace('/admin/login');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestión de empresas y configuración general.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/holidays')}>
            <CalendarDays className="mr-2" />
            Gestionar Feriados
          </Button>
          <CreateCompanyDialog onCompanyCreated={addCompany} />
           <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="space-y-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Funcionalidad de Listado Deshabilitada</AlertTitle>
          <AlertDescription>
            Las tablas de empresas y operadores han sido deshabilitadas temporalmente para evitar un error persistente de permisos de base de datos. Este error parece estar relacionado con la configuración de tu proyecto de Firebase y no con el código de la aplicación.
            <br /><br />
            Puedes seguir creando nuevas empresas. Después de crear una, serás redirigido a su página de configuración. Puedes acceder a las empresas existentes si conoces su ID y lo colocas en la URL (ej: `/admin/company/ID_DE_LA_EMPRESA`).
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
