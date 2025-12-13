
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TimeInput } from './TimeInput';
import { DatePicker } from './DatePicker';
import { LogOut, CalendarCheck, Wallet, Loader2, PlusCircle, Trash2, Settings, History } from 'lucide-react';
import type { User, Company, CompanySettings, Shift, OperatorDeductions } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculateShiftDetails, ShiftCalculationResult, getPeriodKey, getPeriodDescription } from '@/lib/payroll-calculator';
import { format, isSameDay, lastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
const SHIFTS_DB_KEY_PREFIX = 'fake_shifts_db_';
const DEDUCTIONS_DB_KEY_PREFIX = 'fake_deductions_db_';

type EnabledDeductionFields = {
    [K in keyof Omit<OperatorDeductions, 'userId'>]?: boolean;
};

interface PayrollSummary {
    grossPay: number;
    netPay: number;
    totalHours: number;
    legalDeductions: {
        health: number;
        pension: number;
        arl: number;
        familyCompensation: number;
        solidarityFund: number;
        taxWithholding: number;
    },
    voluntaryDeductions: {
        union: number;
        cooperative: number;
        loan: number;
    },
    subsidies: {
        transport: number;
    },
    totalPaymentFromHours: number;
}

interface HistoricalPayroll {
    [periodKey: string]: PayrollSummary;
}


const deductionLabels: { [key in keyof EnabledDeductionFields]: string } = {
    unionFeeDeduction: 'Cuota Sindical',
    cooperativeDeduction: 'Aporte a Cooperativa',
    loanDeduction: 'Cuota de Préstamo',
};


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
  const [operatorDeductions, setOperatorDeductions] = useState<Partial<OperatorDeductions>>({});
  const [enabledDeductions, setEnabledDeductions] = useState<EnabledDeductionFields>({});
  
  const initialDate = useMemo(() => new Date(), []);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [shiftForSelectedDay, setShiftForSelectedDay] = useState<Shift | null>(null);
  const [dailySummary, setDailySummary] = useState<ShiftCalculationResult | null>(null);
  
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    grossPay: 0, netPay: 0, totalHours: 0,
    legalDeductions: { health: 0, pension: 0, arl: 0, familyCompensation: 0, solidarityFund: 0, taxWithholding: 0 },
    voluntaryDeductions: { union: 0, cooperative: 0, loan: 0 },
    subsidies: { transport: 0 },
    totalPaymentFromHours: 0,
  });
  const [historicalPayroll, setHistoricalPayroll] = useState<HistoricalPayroll>({});
  const [showNetPay, setShowNetPay] = useState(false);


  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDeductions, setIsSavingDeductions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeductionsDialog, setShowDeductionsDialog] = useState(false);
  
  const SHIFTS_DB_KEY = useMemo(() => `${SHIFTS_DB_KEY_PREFIX}${companyId}_${user.uid}`, [companyId, user.uid]);
  const DEDUCTIONS_DB_KEY = useMemo(() => `${DEDUCTIONS_DB_KEY_PREFIX}${companyId}_${user.uid}`, [companyId, user.uid]);
  
  const calculatePayrollForPeriod = useCallback((shifts: Shift[], periodSettings: Partial<CompanySettings>, periodDeductions: Partial<OperatorDeductions>): PayrollSummary => {
        let totalHoursInPeriod = 0;
        let totalPaymentForHours = 0;
        let daysWithShifts = new Set();

        for (const shift of shifts) {
            const details = calculateShiftDetails({
                date: new Date(shift.date),
                startTime: shift.startTime,
                endTime: shift.endTime,
                rates: periodSettings
            });
            totalHoursInPeriod += details.totalHours;
            totalPaymentForHours += details.totalPayment;
            daysWithShifts.add(format(new Date(shift.date), 'yyyy-MM-dd'));
        }
        
        const numberOfDaysWithShifts = daysWithShifts.size;
        const totalTransportSubsidyForPeriod = periodSettings.transportSubsidy ? (periodSettings.transportSubsidy / (periodSettings.payrollCycle === 'monthly' ? 30 : 15)) * numberOfDaysWithShifts : 0;

        const grossPay = totalPaymentForHours + totalTransportSubsidyForPeriod;

        const healthDeductionAmount = grossPay * ((periodSettings.healthDeduction || 0) / 100);
        const pensionDeductionAmount = grossPay * ((periodSettings.pensionDeduction || 0) / 100);
        const arlDeductionAmount = grossPay * ((periodSettings.arlDeduction || 0) / 100);
        const familyCompensationAmount = grossPay * ((periodSettings.familyCompensationDeduction || 0) / 100);
        const solidarityFundAmount = grossPay * ((periodSettings.solidarityFundDeduction || 0) / 100);
        const taxWithholdingAmount = grossPay * ((periodSettings.taxWithholding || 0) / 100);
        const totalLegalDeductions = healthDeductionAmount + pensionDeductionAmount + arlDeductionAmount + familyCompensationAmount + solidarityFundAmount + taxWithholdingAmount;

        const unionFee = periodDeductions.unionFeeDeduction || 0;
        const cooperativeFee = periodDeductions.cooperativeDeduction || 0;
        const loanFee = periodDeductions.loanDeduction || 0;
        const totalVoluntaryDeductions = unionFee + cooperativeFee + loanFee;

        const netPay = grossPay - totalLegalDeductions - totalVoluntaryDeductions;
        
        return {
            grossPay,
            netPay,
            totalHours: totalHoursInPeriod,
            legalDeductions: {
                health: healthDeductionAmount,
                pension: pensionDeductionAmount,
                arl: arlDeductionAmount,
                familyCompensation: familyCompensationAmount,
                solidarityFund: solidarityFundAmount,
                taxWithholding: taxWithholdingAmount,
            },
            voluntaryDeductions: {
                union: unionFee,
                cooperative: cooperativeFee,
                loan: loanFee,
            },
            subsidies: {
                transport: totalTransportSubsidyForPeriod,
            },
            totalPaymentFromHours: totalPaymentForHours,
        };
  }, []);

  const refreshAllData = useCallback((currentDate: Date, currentSettings: Partial<CompanySettings>) => {
    if (!currentSettings.payrollCycle) return;
  
    // 1. Read fresh data from localStorage
    const allShifts: Shift[] = JSON.parse(localStorage.getItem(SHIFTS_DB_KEY) || '[]');
    const currentDeductions: Partial<OperatorDeductions> = JSON.parse(localStorage.getItem(DEDUCTIONS_DB_KEY) || '{}');
  
    // 2. Update daily shift information
    const dayShift = allShifts.find(s => isSameDay(new Date(s.date), currentDate)) || null;
    setShiftForSelectedDay(dayShift);
    if (dayShift) {
      setStartTime(dayShift.startTime);
      setEndTime(dayShift.endTime);
      setDailySummary(calculateShiftDetails({
        date: new Date(dayShift.date),
        startTime: dayShift.startTime,
        endTime: dayShift.endTime,
        rates: currentSettings,
      }));
    } else {
      setStartTime('');
      setEndTime('');
      setDailySummary(null);
    }
  
    // 3. Calculate current period summary
    const currentPeriodKey = getPeriodKey(currentDate, currentSettings.payrollCycle);
    const periodShifts = allShifts.filter(s => getPeriodKey(new Date(s.date), currentSettings.payrollCycle) === currentPeriodKey);
    const summary = calculatePayrollForPeriod(periodShifts, currentSettings, currentDeductions);
    setPayrollSummary(summary);
  
    // 4. Calculate historical payroll
    const groupedByPeriod: { [key: string]: Shift[] } = allShifts.reduce((acc, shift) => {
      const periodKey = getPeriodKey(new Date(shift.date), currentSettings.payrollCycle);
      if (!acc[periodKey]) {
        acc[periodKey] = [];
      }
      acc[periodKey].push(shift);
      return acc;
    }, {} as { [key: string]: Shift[] });
  
    const history: HistoricalPayroll = {};
    for (const periodKey in groupedByPeriod) {
      if (periodKey !== currentPeriodKey) {
        history[periodKey] = calculatePayrollForPeriod(groupedByPeriod[periodKey], currentSettings, currentDeductions);
      }
    }
    setHistoricalPayroll(history);
  
  }, [SHIFTS_DB_KEY, DEDUCTIONS_DB_KEY, calculatePayrollForPeriod]);

  
  // Effect to load initial company/settings data on mount
  useEffect(() => {
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
        const companySettings = allSettings[companyId] || {};
        setSettings(companySettings);

        const storedDeductions = localStorage.getItem(DEDUCTIONS_DB_KEY);
        const operatorDeductionsData : OperatorDeductions = storedDeductions ? JSON.parse(storedDeductions) : { userId: user.uid };
        setOperatorDeductions(operatorDeductionsData);

        const initialEnabled: EnabledDeductionFields = {};
        for (const key in deductionLabels) {
            const deductionKey = key as keyof EnabledDeductionFields;
            initialEnabled[deductionKey] = operatorDeductionsData[deductionKey] != null;
        }
        setEnabledDeductions(initialEnabled);

        // Initial data load and calculation
        if (date && companySettings.payrollCycle) {
            refreshAllData(date, companySettings);
        }

    } catch(e) {
        console.error("Failed to load data from localStorage", e);
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router, user.uid, DEDUCTIONS_DB_KEY, date, refreshAllData]);
  
  // Effect to update UI based on selected date
  useEffect(() => {
    if (!date || isLoading) return;
    refreshAllData(date, settings);
  }, [date, settings, isLoading, refreshAllData]);


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
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        let allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        
        const existingShiftIndex = allShifts.findIndex(s => isSameDay(new Date(s.date), date));

        const shiftData: Shift = {
            id: existingShiftIndex > -1 ? allShifts[existingShiftIndex].id : `shift_${Date.now()}`,
            userId: user.uid,
            companyId: company.id,
            date: date.toISOString(),
            startTime: startTime,
            endTime: endTime,
        };

        if (existingShiftIndex > -1) {
            allShifts[existingShiftIndex] = shiftData;
        } else {
            allShifts.push(shiftData);
        }
        
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(allShifts));
        
        refreshAllData(date, settings);

        toast({
            title: existingShiftIndex > -1 ? 'Turno Actualizado' : 'Turno Guardado',
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

  const handleDelete = () => {
    if (!date) return;

    setIsSaving(true);
    try {
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        let allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        const updatedShifts = allShifts.filter(s => !isSameDay(new Date(s.date), date));
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));

        refreshAllData(date, settings);
        
        setShowDeleteConfirm(false);

        toast({
            title: 'Turno Eliminado',
            description: `El turno para el ${format(date, 'PPP', { locale: es })} ha sido eliminado.`,
        });
    } catch (error) {
        console.error('Failed to delete shift', error);
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo eliminar el turno.',
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

  const handleDeductionSwitchChange = (field: keyof EnabledDeductionFields, checked: boolean) => {
    setEnabledDeductions(prev => ({ ...prev, [field]: checked }));
    if (!checked) {
      setOperatorDeductions(prev => {
        const newDeductions = { ...prev };
        newDeductions[field] = null; 
        return newDeductions;
      });
    }
  };

  const handleDeductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOperatorDeductions(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
  }

  const handleSaveDeductions = () => {
    setIsSavingDeductions(true);
    try {
        const activeDeductions: Partial<OperatorDeductions> = { userId: user.uid };
        for (const key in enabledDeductions) {
            const deductionKey = key as keyof EnabledDeductionFields;
            if (enabledDeductions[deductionKey]) {
                 if (operatorDeductions[deductionKey] !== undefined) {
                    (activeDeductions as any)[deductionKey] = operatorDeductions[deductionKey];
                }
            } else {
                 (activeDeductions as any)[deductionKey] = null;
            }
        }
        localStorage.setItem(DEDUCTIONS_DB_KEY, JSON.stringify(activeDeductions));
        
        if(date && settings) {
            refreshAllData(date, settings);
        }
        
        toast({
            title: 'Deducciones Guardadas',
            description: 'Tus deducciones voluntarias han sido actualizadas.',
        });
        setShowDeductionsDialog(false); // Close dialog on save
    } catch (e) {
        console.error("Failed to save deductions", e);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron guardar tus deducciones.',
        });
    } finally {
        setIsSavingDeductions(false);
    }
  }

    const renderDeductionInput = (key: keyof EnabledDeductionFields) => {
        const label = deductionLabels[key];
        return (
        <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={key} className={!enabledDeductions[key] ? 'text-muted-foreground' : ''}>
                    {label}
                </Label>
                <Switch
                    id={`switch-${key}`}
                    checked={enabledDeductions[key] || false}
                    onCheckedChange={(checked) => handleDeductionSwitchChange(key, checked)}
                />
            </div>
            <Input
            id={key}
            name={key}
            type="number"
            placeholder="0.00"
            value={operatorDeductions[key] || ''}
            onChange={handleDeductionChange}
            disabled={!enabledDeductions[key]}
            className="transition-opacity"
            />
        </div>
        );
    };

  
  if (isLoading || !company) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const payrollCycleText = settings.payrollCycle === 'monthly' ? 'Mensual' : 'Quincenal';

  const renderBreakdownRow = (label: string, hours: number, rate: number = 0, payment: number) => {
    if (hours === 0 && payment === 0) return null;
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{label} ({hours.toFixed(2)}h)</span>
            <span className="font-mono">{formatCurrency(payment)}</span>
        </div>
    );
  };
  
    const renderSummaryRow = (label: string, value: number, isPositive: boolean = true) => {
        if (value === 0) return null;
        return (
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-mono ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : '-'} {formatCurrency(value)}
                </span>
            </div>
        );
    };
    
    const renderFullBreakdown = (summary: PayrollSummary) => (
        <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-sm mb-1">Ingresos</h4>
            {renderSummaryRow("Salario por horas", summary.totalPaymentFromHours)}
            {renderSummaryRow("Subsidio de transporte", summary.subsidies.transport)}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
                <span>Salario Bruto Total</span>
                <span>{formatCurrency(summary.grossPay)}</span>
            </div>
            <Separator className="my-2" />


            <h4 className="font-semibold text-sm mb-1">Deducciones Legales</h4>
            {renderSummaryRow("Salud", summary.legalDeductions.health, false)}
            {renderSummaryRow("Pensión", summary.legalDeductions.pension, false)}
            {renderSummaryRow("ARL", summary.legalDeductions.arl, false)}
            {renderSummaryRow("Caja de Compensación", summary.legalDeductions.familyCompensation, false)}
            {renderSummaryRow("Fondo de Solidaridad", summary.legalDeductions.solidarityFund, false)}
            {renderSummaryRow("Retención en la Fuente", summary.legalDeductions.taxWithholding, false)}
            <Separator className="my-2" />

            <h4 className="font-semibold text-sm mb-1">Deducciones Voluntarias</h4>
            {renderSummaryRow("Cuota Sindical", summary.voluntaryDeductions.union, false)}
            {renderSummaryRow("Aporte Cooperativa", summary.voluntaryDeductions.cooperative, false)}
            {renderSummaryRow("Créditos", summary.voluntaryDeductions.loan, false)}
             <Separator className="my-2" />
             <div className="flex justify-between font-bold text-lg">
                <span>Neto a Pagar</span>
                <span>{formatCurrency(summary.netPay)}</span>
            </div>
        </div>
    );



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
                <div className="flex items-center gap-2">
                    <Dialog open={showDeductionsDialog} onOpenChange={setShowDeductionsDialog}>
                        <DialogTrigger asChild>
                             <Button variant="ghost" size="icon" aria-label="Configurar deducciones">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Mis Deducciones Voluntarias</DialogTitle>
                                <DialogDescription>
                                    Activa y define los montos fijos para tus aportes y pagos personales. Se descontarán en cada periodo de pago.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 gap-6 py-4">
                                {renderDeductionInput('unionFeeDeduction')}
                                {renderDeductionInput('cooperativeDeduction')}
                                {renderDeductionInput('loanDeduction')}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDeductionsDialog(false)}>Cancelar</Button>
                                <Button onClick={handleSaveDeductions} disabled={isSavingDeductions}>
                                    {isSavingDeductions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Guardar Deducciones
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                        <LogOut className="mr-2 h-5 w-5" />
                        Salir
                    </Button>
                </div>
            </div>
        </header>


        <main>
           <Tabs defaultValue="pagos" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pagos">Pagos</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>
              <TabsContent value="pagos" className="space-y-8 mt-8">
                 <Card className="relative">
                    <CardHeader>
                    <CardTitle>Registrar o Editar Turno</CardTitle>
                    <CardDescription>Selecciona la fecha y las horas. Si ya existe un turno para ese día, se actualizará.</CardDescription>
                        {shiftForSelectedDay && (
                            <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} disabled={isSaving} aria-label="Eliminar turno" className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
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
                    <CardFooter className="flex justify-center gap-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            {shiftForSelectedDay ? 'Actualizar Turno' : 'Guardar Turno'}
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
                        {!shiftForSelectedDay ? (
                            <p className="text-sm text-muted-foreground pt-4">
                                No hay turnos registrados para este día.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-4">
                            <div className="flex justify-between pt-2">
                                <span className="font-bold">Total del día:</span> 
                                <strong className="text-xl">{formatCurrency(dailySummary?.totalPayment)}</strong>
                                </div>
                                <div className="flex justify-between text-muted-foreground text-sm">
                                    <span>Horas totales del día:</span>
                                    <strong>{dailySummary?.totalHours.toFixed(2)}</strong>
                                </div>

                                <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger className="text-sm py-2">Ver desglose</AccordionTrigger>
                                    <AccordionContent className="space-y-2 pt-2">
                                    {renderBreakdownRow("Horas Diurnas", dailySummary?.dayHours || 0, settings.dayRate, (dailySummary?.dayHours || 0) * (settings.dayRate || 0))}
                                    {renderBreakdownRow("Horas Nocturnas", dailySummary?.nightHours || 0, settings.nightRate, (dailySummary?.nightHours || 0) * (settings.nightRate || 0))}
                                    {renderBreakdownRow("Extras Diurnas", dailySummary?.dayOvertimeHours || 0, settings.dayOvertimeRate, (dailySummary?.dayOvertimeHours || 0) * (settings.dayOvertimeRate || 0))}
                                    {renderBreakdownRow("Extras Nocturnas", dailySummary?.nightOvertimeHours || 0, settings.nightOvertimeRate, (dailySummary?.nightOvertimeHours || 0) * (settings.nightOvertimeRate || 0))}
                                    
                                    {(dailySummary?.isHoliday) && <Separator className="my-2" />}

                                    {renderBreakdownRow("Festivas Diurnas", dailySummary?.holidayDayHours || 0, settings.holidayDayRate, (dailySummary?.holidayDayHours || 0) * (settings.holidayDayRate || 0))}
                                    {renderBreakdownRow("Festivas Nocturnas", dailySummary?.holidayNightHours || 0, settings.holidayNightRate, (dailySummary?.holidayNightHours || 0) * (settings.holidayNightRate || 0))}
                                    {renderBreakdownRow("Extras Festivas Diurnas", dailySummary?.holidayDayOvertimeHours || 0, settings.holidayDayOvertimeRate, (dailySummary?.holidayDayOvertimeHours || 0) * (settings.holidayDayOvertimeRate || 0))}
                                    {renderBreakdownRow("Extras Festivas Nocturnas", dailySummary?.holidayNightOvertimeHours || 0, settings.holidayNightOvertimeRate, (dailySummary?.holidayNightOvertimeHours || 0) * (settings.holidayNightOvertimeRate || 0))}
                                    </AccordionContent>
                                </AccordionItem>
                                </Accordion>
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
                            <div className="space-y-4 mt-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show-net-pay" className="text-sm flex-grow text-muted-foreground">
                                        Calcular Neto (con deducciones y subsidios)
                                    </Label>
                                    <Switch
                                        id="show-net-pay"
                                        checked={showNetPay}
                                        onCheckedChange={setShowNetPay}
                                        aria-label="Mostrar pago neto"
                                    />
                                </div>
                                <Separator />
                                {showNetPay ? (
                                    <>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground">Neto a pagar:</span>
                                            <strong className="text-2xl font-bold">{formatCurrency(payrollSummary.netPay)}</strong>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground">Salario bruto:</span>
                                            <strong className="text-lg">{formatCurrency(payrollSummary.grossPay)}</strong>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-sm text-muted-foreground">Salario por horas:</span>
                                        <strong className="text-2xl font-bold">{formatCurrency(payrollSummary.totalPaymentFromHours)}</strong>
                                    </div>
                                )}
                                
                                <p className="text-xs text-muted-foreground pt-1">
                                    Acumulado del periodo de pago actual ({payrollSummary.totalHours.toFixed(2)} horas).
                                </p>

                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="details">
                                        <AccordionTrigger className="text-sm py-2">Ver Detalles</AccordionTrigger>
                                        <AccordionContent>
                                            {renderFullBreakdown(payrollSummary)}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        </CardContent>
                    </Card>
                </div>
              </TabsContent>
              <TabsContent value="historial" className="space-y-8 mt-8">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-medium">
                            Historial de Pagos
                        </CardTitle>
                        <History className="h-6 w-6 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {Object.keys(historicalPayroll).length > 0 ? (
                                Object.entries(historicalPayroll)
                                .sort(([keyA], [keyB]) => keyB.localeCompare(keyA)) // Sort by most recent period
                                .map(([periodKey, summary]) => (
                                    <AccordionItem value={periodKey} key={periodKey}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between w-full pr-4">
                                                <span>{getPeriodDescription(periodKey, settings.payrollCycle)}</span>
                                                <span className="font-bold">{formatCurrency(summary.netPay)}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            {renderFullBreakdown(summary)}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground pt-4">No hay periodos de pago anteriores.</p>
                            )}
                        </Accordion>
                    </CardContent>
                </Card>
              </TabsContent>
           </Tabs>
        </main>
      </div>

       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el turno del día {date ? format(date, 'PPP', { locale: es }) : ''}. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    