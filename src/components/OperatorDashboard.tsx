'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Save } from 'lucide-react';
import type { User, Company, CompanySettings, Shift, CompanyItem } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeInput } from '@/components/TimeInput';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


// --- FAKE DATA & KEYS ---
const FAKE_OPERATOR_USER = {
  uid: 'fake-operator-uid-12345',
  isAnonymous: false,
  displayName: 'Juan Operador',
  photoURL: '',
};

const COMPANIES_DB_KEY = 'fake_companies_db';
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';
const SHIFTS_DB_KEY = 'fake_shifts_db';
const SETTINGS_DB_KEY = 'fake_company_settings_db';


// --- HELPER FUNCTIONS ---
function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


// --- COMPONENT ---
export function OperatorDashboard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const user = FAKE_OPERATOR_USER;

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [todaysShiftId, setTodaysShiftId] = useState<string | null>(null);


  const loadDataForDay = useCallback((currentDate: Date) => {
    setIsLoading(true);
    try {
        const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
        const allCompanies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
        const foundCompany = allCompanies.find(c => c.id === companyId);
        
        if (!foundCompany) {
          console.error("Selected company not found in DB");
          localStorage.removeItem(OPERATOR_COMPANY_KEY);
          router.replace('/select-company');
          return;
        }
        setCompany(foundCompany);

        const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
        const allSettings: {[key: string]: CompanySettings} = storedSettings ? JSON.parse(storedSettings) : {};
        setSettings(allSettings[companyId] || {});

        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        const allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];

        const todayString = format(currentDate, 'yyyy-MM-dd');
        const shiftForDay = allShifts.find(s => s.userId === user.uid && s.companyId === companyId && s.date.startsWith(todayString));

        if (shiftForDay) {
            setStartTime(shiftForDay.startTime || '');
            setEndTime(shiftForDay.endTime || '');
            setTodaysShiftId(shiftForDay.id);
        } else {
            setStartTime('');
            setEndTime('');
            setTodaysShiftId(null);
        }

    } catch(e) {
        console.error("Failed to load data from localStorage", e);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router, user.uid, toast]);

  // Initial load
  useEffect(() => {
    loadDataForDay(date);
  }, [date, loadDataForDay]);

  const handleSave = async () => {
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save

    try {
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        let allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        
        const todayString = format(date, 'yyyy-MM-dd');
        
        const shiftIndex = allShifts.findIndex(s => s.id === todaysShiftId);

        if (shiftIndex > -1) {
            // Update existing shift
            allShifts[shiftIndex] = {
                ...allShifts[shiftIndex],
                startTime,
                endTime,
            };
        } else {
            // Create new shift
            const newShift: Shift = {
                id: `shift_${Date.now()}`,
                userId: user.uid,
                companyId: companyId,
                date: todayString,
                startTime,
                endTime,
            };
            allShifts.push(newShift);
            setTodaysShiftId(newShift.id);
        }

        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(allShifts));
        toast({ title: '¡Guardado!', description: 'Tu turno ha sido actualizado.' });

    } catch (e) {
        console.error("Failed to save shift to localStorage", e);
        toast({ title: 'Error', description: 'No se pudo guardar el turno.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
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

  const isHourly = settings.paymentModel === 'hourly';


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
                    Panel de Operador
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
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                        <LogOut className="mr-2 h-5 w-5" />
                        Salir
                    </Button>
                </div>
            </div>
        </header>

        <main>
           <Card>
                <CardHeader>
                    <CardTitle>Registrar Turno de Hoy</CardTitle>
                    <CardDescription>
                        Ingresa tus horas de entrada y salida para el día {format(date, 'PPP', { locale: es })}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-8 items-center justify-around">
                        <div className="grid gap-2 text-center">
                            <h3 className="font-semibold">Hora de Entrada</h3>
                            <TimeInput label="Hora de entrada" value={startTime} onChange={setStartTime} />
                        </div>

                         <div className="grid gap-2 text-center">
                            <h3 className="font-semibold">Hora de Salida</h3>
                            <TimeInput label="Hora de salida" value={endTime} onChange={setEndTime} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                        Guardar Turno
                    </Button>
                </CardFooter>
           </Card>
        </main>
      </div>
    </div>
  );
}
