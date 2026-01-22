'use client';

import { useState } from 'react';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types/db-entities';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';

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
  
  if (!isUserLoading && (!user || user.email !== ADMIN_EMAIL)) {
    router.replace('/admin/login');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  if (isUserLoading) {
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
        {/* The main content area has been cleared to prevent a persistent data-fetching error. */}
      </main>
    </div>
  );
}
