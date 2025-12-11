'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from './TimeInput';
import { DatePicker } from './DatePicker';
import { LogOut, CalendarCheck, Wallet, Loader2 } from 'lucide-react';
import type { User, Company, CompanySettings } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

// --- FAKE DATA ---
const FAKE_OPERATOR_USER = {
  uid: 'fake-operator-uid-12345',
  isAnonymous: false,
  displayName: 'Juan Operador',
  photoURL: '',
};

const FAKE_USER_PROFILE: User = {
    id: 'fake-operator-uid-12345',
    name: 'Juan Operador',
    email: 'operator@example.com',
    role: 'operator',
    createdAt: new Date().toISOString(),
    paymentStatus: 'paid'
};

const COMPANIES_DB_KEY = 'fake_companies_db';
const SETTINGS_DB_KEY = 'fake_company_settings_db';
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';


function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


export function OperatorDashboard({ companyId }: { companyId: string }) {
  const router = useRouter();
  
  const user = FAKE_OPERATOR_USER;
  const userProfile = FAKE_USER_PROFILE;

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setDate(new Date());
    try {
        // Load company details
        const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
        if (storedCompanies) {
            const allCompanies: Company[] = JSON.parse(storedCompanies);
            const foundCompany = allCompanies.find(c => c.id === companyId);
            if (foundCompany) {
                setCompany(foundCompany);
            } else {
                console.error("Selected company not found in DB");
                localStorage.removeItem(OPERATOR_COMPANY_KEY);
                router.replace('/select-company');
                return;
            }
        }
        
        // Load company settings
        const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
        if (storedSettings) {
            const allSettings: {[key: string]: CompanySettings} = JSON.parse(storedSettings);
            if (allSettings[companyId]) {
                setSettings(allSettings[companyId]);
            }
        }

    } catch(e) {
        console.error("Failed to load company data from localStorage", e);
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router]);

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving shift:', {
      userId: user?.uid,
      companyId: company?.id,
      date,
      startTime,
      endTime,
    });
  };

  const handleSignOut = () => {
    try {
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
    } catch (e) {
        console.error("Failed to clear localStorage", e);
    }
    router.push('/'); 
  };
  
  if (isLoading || !company) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const payrollCycleText = settings.payrollCycle === 'monthly' ? 'Mensual' : 'Quincenal';

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
                    <AvatarFallback>
                        {user?.isAnonymous ? 'OP' : (user?.displayName ? getInitials(user.displayName) : 'U')}
                    </AvatarFallback>
                </Avatar>
                <div className="text-left">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Bienvenido, {user?.isAnonymous ? 'Operador' : user?.displayName || ''}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                    Registra tu turno
                    </p>
                </div>
            </div>
             <div className="flex flex-col items-end gap-2">
                 {company && (
                    <div className="flex items-center gap-3 text-right">
                        <div>
                            <p className="font-semibold text-lg">{company.name}</p>
                            <p className="text-sm text-muted-foreground">Empresa</p>
                        </div>
                        {company.logoUrl ? (
                            <Image src={company.logoUrl} alt={company.name} width={48} height={48} className="rounded-md object-contain" />
                        ) : (
                             <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                Logo
                            </div>
                        )}
                    </div>
                )}
                <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                    <LogOut className="mr-2 h-5 w-5" />
                    Cerrar sesión
                </Button>
            </div>
        </header>


        <main className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Turno(s)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <DatePicker date={date} setDate={setDate} />
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <TimeInput
                  label="Hora de Entrada"
                  value={startTime}
                  onChange={setStartTime}
                />
                <span className="text-muted-foreground">a</span>
                <TimeInput
                  label="Hora de Salida"
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleSave}>Calcular y Guardar Turno</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  Resumen del Día
                </CardTitle>
                <CalendarCheck className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {/* Placeholder content. Logic to be implemented */}
                <p className="text-sm text-muted-foreground">
                  Aquí se mostrará el desglose del turno una vez guardado.
                </p>
                <div className="mt-4 space-y-2">
                   <div className="flex justify-between"><span>Horas diurnas:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Horas nocturnas:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Total Turno:</span> <strong className="text-xl">-</strong></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  Acumulado {payrollCycleText}
                </CardTitle>
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {/* Placeholder content. Logic to be implemented */}
                <p className="text-sm text-muted-foreground">
                  Aquí se mostrará el acumulado del periodo de pago actual.
                </p>
                <div className="mt-4 space-y-2">
                   <div className="flex justify-between"><span>Total horas:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Salario bruto:</span> <strong>-</strong></div>
                   <div className="flex justify-between"><span>Neto a pagar:</span> <strong className="text-xl">-</strong></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

    