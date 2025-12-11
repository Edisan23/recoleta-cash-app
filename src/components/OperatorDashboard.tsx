'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from './TimeInput';
import { DatePicker } from './DatePicker';
import { LogOut, CalendarCheck, Wallet, Loader2, PlusCircle } from 'lucide-react';
import type { User, Company, CompanySettings, Shift } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculateShiftDetails, ShiftCalculationResult } from '@/lib/payroll-calculator';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

// --- FAKE DATA & KEYS ---
const FAKE_OPERATOR_USER = {
  uid: 'fake-operator-uid-12345',
  isAnonymous: false,
  displayName: 'Juan Operador',
  photoURL: '',
};

const COMPANIES_DB_KEY = 'fake_companies_db';
const SETTINGS_DB_KEY = 'fake_company_settings_db';
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

// Keys for shift and payroll data
const SHIFTS_DB_KEY_PREFIX = 'fake_shifts_db_'; 
const PAYROLL_DB_KEY_PREFIX = 'fake_payroll_db_';


// --- HELPER FUNCTIONS ---
function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const formatCurrency = (value: number = 0) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

// --- COMPONENT ---
export function OperatorDashboard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const user = FAKE_OPERATOR_USER;

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [shiftsForSelectedDay, setShiftsForSelectedDay] = useState<Shift[]>([]);
  const [dailySummary, setDailySummary] = useState({ totalHours: 0, totalPayment: 0 });
  
  const [payrollSummary, setPayrollSummary] = useState({ totalHours: 0, grossPay: 0, netPay: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const getPeriodKey = useCallback((date: Date, cycle: 'monthly' | 'fortnightly' = 'fortnightly') => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (cycle === 'monthly') {
      return `${year}-${month}`;
    }
    const dayOfMonth = date.getDate();
    const fortnight = dayOfMonth <= 15 ? 1 : 2;
    return `${year}-${month}-${fortnight}`;
  }, []);

  const SHIFTS_DB_KEY = useMemo(() => `${SHIFTS_DB_KEY_PREFIX}${companyId}_${user.uid}`, [companyId, user.uid]);
  const PAYROLL_DB_KEY = useMemo(() => `${PAYROLL_DB_KEY_PREFIX}${companyId}_${user.uid}`, [companyId, user.uid]);

  // Effect to load company data and initial payroll info
  useEffect(() => {
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
        const companySettings = allSettings[companyId];

        if (companySettings) {
          setSettings(companySettings);
          // Load payroll for the current period
          const today = new Date();
          const periodKey = getPeriodKey(today, companySettings.payrollCycle);
          const storedPayroll = localStorage.getItem(PAYROLL_DB_KEY);
          if (storedPayroll) {
              const allPayroll = JSON.parse(storedPayroll);
              if (allPayroll[periodKey]) {
                  setPayrollSummary(allPayroll[periodKey]);
              }
          }
        }
    } catch(e) {
        console.error("Failed to load data from localStorage", e);
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router, user.uid, getPeriodKey, PAYROLL_DB_KEY]);

  // Effect to load shifts and summary whenever the date changes
  useEffect(() => {
    if (!date) return;

    try {
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        const allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        
        const dayShifts = allShifts.filter(shift => isSameDay(new Date(shift.date), date));
        setShiftsForSelectedDay(dayShifts);

        const summary = dayShifts.reduce((acc, shift) => {
            const shiftDetails = calculateShiftDetails({ 
                date: new Date(shift.date),
                startTime: shift.startTime,
                endTime: shift.endTime,
                rates: settings
            });
            acc.totalHours += shiftDetails.totalHours;
            acc.totalPayment += shiftDetails.totalPayment;
            return acc;
        }, { totalHours: 0, totalPayment: 0 });

        setDailySummary(summary);

    } catch (e) {
        console.error("Failed to load shifts for the selected date", e);
    }
  }, [date, SHIFTS_DB_KEY, settings]);


  const handleSave = () => {
    if (!date || !startTime || !endTime || !company || !settings) {
        toast({
            variant: 'destructive',
            title: 'Datos incompletos',
            description: 'Por favor, completa la fecha y las horas de entrada y salida.',
        });
        return;
    }

    setIsSaving(true);
    
    try {
        const result = calculateShiftDetails({ date, startTime, endTime, rates: settings });

        // --- Update Payroll ---
        const periodKey = getPeriodKey(date, settings.payrollCycle);
        const storedPayroll = localStorage.getItem(PAYROLL_DB_KEY);
        const allPayroll = storedPayroll ? JSON.parse(storedPayroll) : {};
        const currentPeriod = allPayroll[periodKey] || { totalHours: 0, grossPay: 0, netPay: 0 };
        const updatedPeriod = {
            totalHours: currentPeriod.totalHours + result.totalHours,
            grossPay: currentPeriod.grossPay + result.totalPayment,
            netPay: currentPeriod.netPay + result.totalPayment // TODO: Implement net pay
        };
        allPayroll[periodKey] = updatedPeriod;
        localStorage.setItem(PAYROLL_DB_KEY, JSON.stringify(allPayroll));
        setPayrollSummary(updatedPeriod);
        
        // --- Save Shift ---
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        const allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        const newShift: Shift = {
            id: `shift_${Date.now()}`,
            userId: user.uid,
            companyId: company.id,
            date: date.toISOString(),
            startTime: startTime,
            endTime: endTime,
            totalPaid: result.totalPayment,
        };
        allShifts.push(newShift);
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(allShifts));
        
        // --- Update UI State ---
        setShiftsForSelectedDay(prev => [...prev, newShift]);
        setDailySummary(prev => ({
            totalHours: prev.totalHours + result.totalHours,
            totalPayment: prev.totalPayment + result.totalPayment
        }));
        setStartTime('');
        setEndTime('');

        toast({
            title: 'Turno Guardado',
            description: `Turno del ${format(date, 'PPP', { locale: es })} guardado.`,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Calcular',
            description: error.message,
        });
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
                    Panel de Turnos
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
              <CardTitle>Registrar Nuevo Turno</CardTitle>
              <CardDescription>Selecciona la fecha y las horas para añadir un nuevo turno al resumen del día.</CardDescription>
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
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Añadir y Guardar Turno
                </Button>
            </CardFooter>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  Resumen del Día ({date ? format(date, 'PPP', { locale: es }) : 'N/A'})
                </CardTitle>
                <CalendarCheck className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {shiftsForSelectedDay.length === 0 ? (
                    <p className="text-sm text-muted-foreground pt-4">
                        No hay turnos registrados para este día.
                    </p>
                ) : (
                    <div className="mt-4 space-y-4 text-sm">
                       {shiftsForSelectedDay.map(shift => (
                           <div key={shift.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                               <div>
                                   <span className="font-mono">{shift.startTime} - {shift.endTime}</span>
                               </div>
                               <span className="font-semibold">{formatCurrency(shift.totalPaid)}</span>
                           </div>
                       ))}
                       <Separator />
                       <div className="flex justify-between pt-2">
                           <span className="font-bold">Total del día:</span> 
                           <strong className="text-xl">{formatCurrency(dailySummary.totalPayment)}</strong>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Horas totales del día:</span>
                            <strong>{dailySummary.totalHours.toFixed(2)}</strong>
                        </div>
                    </div>
                )}
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
                 <p className="text-sm text-muted-foreground">
                  Resumen del periodo de pago actual.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                   <div className="flex justify-between"><span>Total horas acumuladas:</span> <strong>{payrollSummary.totalHours.toFixed(2)}</strong></div>
                   <div className="flex justify-between"><span>Salario bruto:</span> <strong>{formatCurrency(payrollSummary.grossPay)}</strong></div>
                   <div className="flex justify-between mt-2 pt-2 border-t">
                       <span className="font-bold">Neto a pagar (aprox):</span> 
                       <strong className="text-xl">{formatCurrency(payrollSummary.netPay)}</strong>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

    