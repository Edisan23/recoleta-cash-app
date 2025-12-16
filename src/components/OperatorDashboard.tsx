

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, CalendarClock, Coins } from 'lucide-react';
import type { User, Company, CompanySettings, Shift, CompanyItem } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateShiftDetails, getPayPeriod, type ShiftCalculationResult } from '@/lib/payroll-calculator';


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
const ITEMS_DB_KEY = 'fake_company_items_db';


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

  // Global state
  const [isLoading, setIsLoading] = useState(true);
  
  // Data from DB
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  // Derived state
  const [periodSummary, setPeriodSummary] = useState<{ totalHours: number; totalPayment: number; title: string } | null>(null);
  
  const paymentModel = settings.paymentModel;

  // Effect 1: Load all initial data from localStorage ONCE
  useEffect(() => {
    setIsLoading(true);
    let companyItems: CompanyItem[] = [];
    try {
      // Load Company
      const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
      const allCompanies: Company[] = storedCompanies ? JSON.parse(storedCompanies) : [];
      const foundCompany = allCompanies.find(c => c.id === companyId);
      
      if (!foundCompany) {
        toast({ title: 'Error', description: 'Empresa no encontrada.', variant: 'destructive' });
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
        router.replace('/select-company');
        return;
      }
      setCompany(foundCompany);

      // Load Settings
      const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
      const allSettings: {[key: string]: CompanySettings} = storedSettings ? JSON.parse(storedSettings) : {};
      const companySettings = allSettings[companyId] || {};
      setSettings(companySettings);
      
      // Load Items
      if (companySettings.paymentModel === 'production') {
        const storedItems = localStorage.getItem(ITEMS_DB_KEY);
        const allItems: {[key: string]: CompanyItem[]} = storedItems ? JSON.parse(storedItems) : {};
        companyItems = allItems[companyId] || [];
      }

      // Load Shifts for the current user and company
      const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
      const allShiftsData: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
      const userShifts = allShiftsData.filter(s => s.userId === user.uid && s.companyId === companyId);
      setAllShifts(userShifts);

      // Calculate pay period summary for the current date
      const currentDate = new Date();
      const payPeriod = getPayPeriod(currentDate, companySettings);
      const shiftsInPeriod = userShifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return isWithinInterval(shiftDate, { start: startOfDay(payPeriod.start), end: endOfDay(payPeriod.end) });
      });

      let totalHours = 0;
      let totalPayment = 0;
      for (const shift of shiftsInPeriod) {
        const details = calculateShiftDetails({
          shift: shift,
          rates: companySettings,
          items: companyItems,
        });
        totalHours += details.totalHours;
        totalPayment += details.totalPayment;
      }

      let summaryTitle = `Resumen del Periodo`;
      if (companySettings.payrollCycle === 'monthly') {
          summaryTitle = `Resumen del Mes (${format(payPeriod.start, 'd MMM', { locale: es })} - ${format(payPeriod.end, 'd MMM', { locale: es })})`;
      } else if (companySettings.payrollCycle === 'bi-weekly') {
          summaryTitle = `Resumen de la Quincena (${format(payPeriod.start, 'd MMM', { locale: es })} - ${format(payPeriod.end, 'd MMM', { locale: es })})`;
      }

      setPeriodSummary({ totalHours, totalPayment, title: summaryTitle });


    } catch(e) {
      console.error("Failed to load initial data from localStorage", e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos iniciales.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user.uid, router, toast]);


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

  const isHourly = paymentModel === 'hourly';
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }

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

        <main className="space-y-8">
            {periodSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle>{periodSummary.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {isHourly && (
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2"><CalendarClock/> Total Horas</p>
                                <p className="font-bold text-3xl">{periodSummary.totalHours.toFixed(2)}</p>
                            </div>
                            )}
                            <div className={`text-center sm:text-left ${!isHourly ? 'col-span-1 sm:col-span-2 sm:text-center' : ''}`}>
                                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2"><Coins/> Pago Total</p>
                                <p className="font-bold text-3xl text-green-600">{formatCurrency(periodSummary.totalPayment)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

             {allShifts.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Turnos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* A future feature could be a table of shifts */}
                        <p className="text-muted-foreground">Aquí se mostrará el historial de tus turnos registrados.</p>
                    </CardContent>
                </Card>
            ) : (
                 <Card>
                    <CardHeader>
                        <CardTitle>Sin Actividad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">No tienes turnos registrados para esta empresa todavía.</p>
                    </CardContent>
                </Card>
            )}

        </main>
      </div>
    </div>
  );
}
