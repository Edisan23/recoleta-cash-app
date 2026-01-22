'use client';

import { useState, useEffect } from 'react';
import { CompanyTable } from '@/components/admin/CompanyTable';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types/db-entities';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';

const ADMIN_EMAIL = 'tjedisan@gmail.com';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  // const companiesRef = useMemoFirebase(() => firestore && user ? collection(firestore, 'companies') : null, [firestore, user]);
  // const { data: companies, isLoading: areCompaniesLoading } = useCollection<Company>(companiesRef);
  const companies: Company[] = [];
  const areCompaniesLoading = false;


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
  
  // This is the primary gatekeeper for the admin dashboard.
  // If the user state is resolved and there is no user, or the user is not the admin, redirect.
  if (!isUserLoading && (!user || user.email !== ADMIN_EMAIL)) {
    router.replace('/admin/login');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  // Show a spinner while the user state is loading, but only if we haven't already decided to redirect
  if (isUserLoading || areCompaniesLoading) {
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
      </main>
    </div>
  );
}
