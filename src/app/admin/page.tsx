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
import { useAuth, useUser } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';

const INITIAL_COMPANIES: Company[] = [
    { id: '1', name: 'Constructora XYZ', isActive: true, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', themeColor: '#3b82f6' },
    { id: '2', name: 'Transportes Rápidos', isActive: true, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', themeColor: '#10b981' },
    { id: '3', name: 'Servicios Generales S.A.', isActive: false, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo', themeColor: '#8b5cf6' },
];

const COMPANIES_DB_KEY = 'fake_companies_db';
const ADMIN_UID_KEY = 'fake_admin_uid';

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  
  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.replace('/admin/login');
        return;
      }
      try {
        const adminUid = localStorage.getItem(ADMIN_UID_KEY);
        if (user.uid !== adminUid) {
          router.replace('/admin/login');
        }
      } catch (error) {
        console.error("Could not access localStorage:", error);
        router.replace('/admin/login');
      }
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    try {
        const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
        if (storedCompanies) {
            setCompanies(JSON.parse(storedCompanies));
        } else {
            localStorage.setItem(COMPANIES_DB_KEY, JSON.stringify(INITIAL_COMPANIES));
            setCompanies(INITIAL_COMPANIES);
        }
    } catch (error) {
        console.error("Could not access localStorage:", error);
        setCompanies(INITIAL_COMPANIES);
    }
  }, []);

  const addCompany = (newCompanyData: Omit<Company, 'id'>) => {
    const newCompany: Company = {
        ...newCompanyData,
        id: `comp_${Date.now()}`
    };
    
    setCompanies(prevCompanies => {
        const updatedCompanies = [...prevCompanies, newCompany];
        try {
            localStorage.setItem(COMPANIES_DB_KEY, JSON.stringify(updatedCompanies));
        } catch (error) {
            console.error("Could not save to localStorage:", error);
        }
        return updatedCompanies;
    });
  };

  const handleSignOut = async () => {
    if (auth) {
      await auth.signOut();
      router.push('/admin/login');
    }
  };
  
  if (isUserLoading || !user) {
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
        <CompanyTable companies={companies} />
        <Separator />
        <OperatorStats />
        <OperatorTable />
      </main>
    </div>
  );
}
