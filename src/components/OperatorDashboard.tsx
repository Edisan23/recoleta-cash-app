'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimeInput } from './TimeInput';
import { DatePicker } from './DatePicker';
import { LogOut, CalendarCheck, Wallet, Loader2 } from 'lucide-react';
import type { User, Company, CompanySettings, Shift } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculateShiftDetails, ShiftCalculationResult } from '@/lib/payroll-calculator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- FAKE DATA & KEYS ---
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
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [shiftSummary, setShiftSummary] = useState<ShiftCalculationResult | null>(null);
  const [payrollSummary, setPayrollSummary] = useState({ totalHours: 0, grossPay: 0, netPay: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const getPeriodKey = useCallback((date: Date, cycle: 'monthly' | 'fortnightly' = 'fortnightly') => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (cycle === 'monthly') {
      return `${year}-${month}`;
    }
    const day = date.getDate();
    const fortnight = day <= 15 ? 1 : 2;
    return `${year}-${month}-${fortnight}`;
  }, []);

  useEffect(() => {
    try {
        const storedCompanies = localStorage.getItem(COMPANIES_DB_KEY);
        if (storedCompanies) {
            const allCompanies: Company[] = JSON.parse(storedCompanies);
            const foundCompany = allCompanies.find(c => c.id === companyId);
            setCompany(foundCompany || null);
            if (!foundCompany) {
              console.error("Selected company not found in DB");
              localStorage.removeItem(OPERATOR_COMPANY_KEY);
              router.replace('/select-company');
              return;
            }
        }
        
        const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
        if (storedSettings) {
            const allSettings: {[key: string]: CompanySettings} = JSON.parse(storedSettings);
            const companySettings = allSettings[companyId];
            if (companySettings) {
              setSettings(companySettings);
              
              const today = new Date();
              setDate(today);

              // Load payroll for the current period
              const periodKey = getPeriodKey(today, companySettings.payrollCycle);
              const PAYROLL_DB_KEY = `${PAYROLL_DB_KEY_PREFIX}${companyId}_${user.uid}`;
              const storedPayroll = localStorage.getItem(PAYROLL_DB_KEY);
              if (storedPayroll) {
                  const allPayroll = JSON.parse(storedPayroll);
                  if (allPayroll[periodKey]) {
                      setPayrollSummary(allPayroll[periodKey]);
                  }
              }
            }
        }
    } catch(e) {
        console.error("Failed to load data from localStorage", e);
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router, user.uid, getPeriodKey]);


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
    setShiftSummary(null); // Clear previous summary

    try {
        const result = calculateShiftDetails({ date, startTime, endTime, rates: settings });
        setShiftSummary(result);

        // --- Update Payroll ---
        const periodKey = getPeriodKey(date, settings.payrollCycle);
        const PAYROLL_DB_KEY = `${PAYROLL_DB_KEY_PREFIX}${companyId}_${user.uid}`;
        
        const storedPayroll = localStorage.getItem(PAYROLL_DB_KEY);
        const allPayroll = storedPayroll ? JSON.parse(storedPayroll) : {};
        
        const currentPeriod = allPayroll[periodKey] || { totalHours: 0, grossPay: 0, netPay: 0 };

        const updatedPeriod = {
            totalHours: currentPeriod.totalHours + result.totalHours,
            grossPay: currentPeriod.grossPay + result.totalPayment,
            // TODO: Implement net pay calculation with deductions
            netPay: currentPeriod.netPay + result.totalPayment 
        };
        
        allPayroll[periodKey] = updatedPeriod;
        localStorage.setItem(PAYROLL_DB_KEY, JSON.stringify(allPayroll));
        setPayrollSummary(updatedPeriod);
        
        // --- Save Shift ---
        const SHIFTS_DB_KEY = `${SHIFTS_DB_KEY_PREFIX}${companyId}_${user.uid}`;
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
        
        toast({
            title: 'Turno Guardado',
            description: `Turno del ${format(date, 'PPP', { locale: es })} guardado con éxito.`,
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
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Calcular y Guardar Turno
                </Button>
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
                { !shiftSummary ? (
                    <p className="text-sm text-muted-foreground">
                        Aquí se mostrará el desglose del turno una vez guardado.
                    </p>
                ) : (
                    <div className="mt-4 space-y-2 text-sm">
                       <div className="flex justify-between"><span>Total Horas:</span> <strong>{shiftSummary.totalHours.toFixed(2)}</strong></div>
                       <div className="flex justify-between text-muted-foreground"><span>Horas Diurnas:</span> <strong>{shiftSummary.dayHours.toFixed(2)}</strong></div>
                       <div className="flex justify-between text-muted-foreground"><span>Horas Nocturnas:</span> <strong>{shiftSummary.nightHours.toFixed(2)}</strong></div>
                       <div className="flex justify-between text-muted-foreground"><span>Horas Ext. Diurnas:</span> <strong>{shiftSummary.dayOvertimeHours.toFixed(2)}</strong></div>
                       <div className="flex justify-between text-muted-foreground"><span>Horas Ext. Nocturnas:</span> <strong>{shiftSummary.nightOvertimeHours.toFixed(2)}</strong></div>
                       {shiftSummary.isHoliday && <div className="font-semibold text-primary pt-2">Detalle Festivo:</div>}
                       {shiftSummary.isHoliday && <div className="flex justify-between text-muted-foreground"><span>Horas Diurnas Festivas:</span> <strong>{shiftSummary.holidayDayHours.toFixed(2)}</strong></div>}
                       {shiftSummary.isHoliday && <div className="flex justify-between text-muted-foreground"><span>Horas Nocturnas Festivas:</span> <strong>{shiftSummary.holidayNightHours.toFixed(2)}</strong></div>}
                       {shiftSummary.isHoliday && <div className="flex justify-between text-muted-foreground"><span>Ext. Diurnas Festivas:</span> <strong>{shiftSummary.holidayDayOvertimeHours.toFixed(2)}</strong></div>}
                       {shiftSummary.isHoliday && <div className="flex justify-between text-muted-foreground"><span>Ext. Nocturnas Festivas:</span> <strong>{shiftSummary.holidayNightOvertimeHours.toFixed(2)}</strong></div>}
                       <div className="flex justify-between pt-2 border-t mt-2">
                           <span className="font-bold">Total Turno:</span> 
                           <strong className="text-xl">{formatCurrency(shiftSummary.totalPayment)}</strong>
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
                  Acumulado del periodo de pago actual.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                   <div className="flex justify-between"><span>Total horas:</span> <strong>{payrollSummary.totalHours.toFixed(2)}</strong></div>
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
