'use client';

import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types/db-entities';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ADMIN_EMAIL = 'tjedisan@gmail.com';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // The collection hook that was causing the permission error has been removed to prevent app crashes.
  
  const addCompany = async (newCompanyData: Omit<Company, 'id'>) => {
    if (!firestore) return;
    const companiesCollectionRef = collection(firestore, 'companies');
    try {
      await addDoc(companiesCollectionRef, newCompanyData);
      toast({
          title: "Empresa Creada",
          description: `La empresa "${newCompanyData.name}" ha sido creada.`,
      });
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
          <p className="text-muted-foreground">Gestión de empresas, operadores y configuración general.</p>
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
        <Card className="border-amber-500 dark:border-amber-400">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle />
                    Atención: Listado de Empresas Deshabilitado
                </CardTitle>
                <CardDescription>
                    Se ha detectado un problema persistente con los permisos de la base de datos que impide mostrar la lista de empresas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Para evitar que la aplicación se bloquee, esta sección ha sido deshabilitada temporalmente.
                    <br/>
                    Aún puedes <strong>crear nuevas empresas</strong> usando el botón correspondiente. Para gestionarlas, necesitarás acceder a ellas directamente a través de la URL de configuración (p. ej. `/admin/company/ID_DE_LA_EMPRESA`).
                </p>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
