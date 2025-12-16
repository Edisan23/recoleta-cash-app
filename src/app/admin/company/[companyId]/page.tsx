
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { Company } from '@/types/db-entities';

const LOCAL_STORAGE_KEY_COMPANIES = 'fake_companies_db';

export default function CompanySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { toast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANIES);
        if (storedCompanies) {
            const allCompanies: Company[] = JSON.parse(storedCompanies);
            const foundCompany = allCompanies.find(c => c.id === companyId);
            if (foundCompany) {
                setCompany(foundCompany);
            }
        }
    } catch (error) {
        console.error("Could not access localStorage:", error);
    } finally {
        setIsLoading(false);
    }
  }, [companyId]);


  const handleSave = async () => {
    if (!company) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save

    try {
        const storedCompanies = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANIES);
        let allCompanies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
        const companyIndex = allCompanies.findIndex(c => c.id === companyId);

        if (companyIndex > -1) {
            allCompanies[companyIndex] = {
                ...allCompanies[companyIndex],
                name: company.name,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY_COMPANIES, JSON.stringify(allCompanies));
        }
        
        toast({
            title: '¡Guardado!',
            description: `La configuración de ${company?.name} ha sido actualizada.`,
        });
    } catch (error) {
        console.error("Error saving to localStorage:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron guardar los cambios.',
        });
    } finally {
        setIsSaving(false);
        router.push('/admin');
    }
  };


  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!company) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <p className="text-xl text-muted-foreground mb-4">Empresa no encontrada.</p>
            <Button onClick={() => router.push('/admin')}>
                <ArrowLeft className="mr-2" />
                Volver al Panel
            </Button>
        </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4">
            <ArrowLeft className="mr-2" />
            Volver al listado
          </Button>
          <h1 className="text-3xl font-bold">Configuración de la Empresa</h1>
        </div>
      </header>

      <main className="space-y-8">
         <Card>
            <CardHeader>
                <CardTitle>Nombre de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
                <Input 
                    className="text-lg font-semibold leading-none tracking-tight"
                    value={company.name}
                    onChange={(e) => setCompany({...company, name: e.target.value})}
                />
            </CardContent>
        </Card>
        
        <Separator />

        <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} size="lg">
                {isSaving && <Loader2 className="mr-2 animate-spin" />}
                Guardar Cambios
            </Button>
        </div>
      </main>
    </div>
  );
}
