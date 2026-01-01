'use client';

import { useState, useEffect } from 'react';
import { CompanyTable } from '@/components/admin/CompanyTable';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types/db-entities';
import { OperatorTable } from '@/components/admin/OperatorTable';
import { Separator } from '@/components/ui/separator';
import { OperatorStats } from '@/components/admin/OperatorStats';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';

const ADMIN_UID_KEY = 'fake_admin_uid';


export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies') : null, [firestore]);
  const { data: companies, isLoading: areCompaniesLoading } = useCollection<Company>(companiesRef);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.replace('/admin/login');
      return;
    }

    const adminUid = localStorage.getItem(ADMIN_UID_KEY);
    if (user.uid === adminUid) {
      setIsAdmin(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: 'No tienes permisos para acceder a esta página.',
      });
      router.replace('/admin/login');
    }
    setIsCheckingAdmin(false);

  }, [user, isUserLoading, router, toast]);


  const addCompany = async (newCompanyData: Omit<Company, 'id'>) => {
    if (!firestore) return;
    const companiesCollectionRef = collection(firestore, 'companies');
    try {
      await addDoc(companiesCollectionRef, newCompanyData);
    } catch (error) {
      console.error("Could not save to Firestore:", error);
       toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo crear la empresa.",
      });
    }
  };

  const deleteCompany = async (companyId: string, companyName: string) => {
    if (!firestore) return;
    const companyDocRef = doc(firestore, 'companies', companyId);
    try {
        // Note: Subcollections are NOT automatically deleted.
        // For a production app, a Cloud Function would be needed to recursively delete subcollections.
        await deleteDoc(companyDocRef);
        toast({
            title: "Empresa Eliminada",
            description: `La empresa "${companyName}" ha sido eliminada.`,
        });
    } catch (error) {
        console.error("Error deleting company:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo eliminar la empresa.",
        });
    }
  };


  const handleSignOut = async () => {
    if (auth) {
      await auth.signOut();
      router.push('/admin/login');
    }
  };
  
  if (isUserLoading || isCheckingAdmin || !isAdmin || areCompaniesLoading) {
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
        <CompanyTable companies={companies || []} onDeleteCompany={deleteCompany} />
        <Separator />
        <OperatorStats />
        <OperatorTable />
      </main>
    </div>
  );
}
