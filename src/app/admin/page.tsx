'use client';

import { useState, useEffect } from 'react';
import { CompanyTable } from '@/components/admin/CompanyTable';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types/db-entities';


const FAKE_ADMIN_USER = {
  uid: '15sJqL2prSVL2adSXRyqsefg26v1',
  displayName: 'Admin (Desarrollo)',
};

const INITIAL_COMPANIES: Company[] = [
    { id: '1', name: 'Constructora XYZ', isActive: true, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo' },
    { id: '2', name: 'Transportes Rápidos', isActive: true, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo' },
    { id: '3', name: 'Servicios Generales S.A.', isActive: false, logoUrl: 'https://placehold.co/100x100/e2e8f0/64748b?text=Logo' },
];

const LOCAL_STORAGE_KEY = 'fake_companies_db';


export default function AdminPage() {
  const router = useRouter();
  const user = FAKE_ADMIN_USER;
  const [companies, setCompanies] = useState<Company[]>([]);

  // Load companies from localStorage on initial render
  useEffect(() => {
    try {
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedCompanies) {
            setCompanies(JSON.parse(storedCompanies));
        } else {
            // If nothing in localStorage, initialize with default data
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_COMPANIES));
            setCompanies(INITIAL_COMPANIES);
        }
    } catch (error) {
        console.error("Could not access localStorage:", error);
        setCompanies(INITIAL_COMPANIES); // Fallback to initial data
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
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCompanies));
        } catch (error) {
            console.error("Could not save to localStorage:", error);
        }
        return updatedCompanies;
    });
  };

  const handleSignOut = async () => {
    router.push('/');
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Bienvenido, {user.displayName || 'Admin'}.</p>
        </div>
        <div className="flex items-center gap-4">
          <CreateCompanyDialog onCompanyCreated={addCompany} />
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2" />
            Volver al Inicio
          </Button>
        </div>
      </header>

      <main>
        <CompanyTable companies={companies} />
      </main>
    </div>
  );
}
