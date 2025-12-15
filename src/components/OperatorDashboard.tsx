

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LogOut, Loader2, PlusCircle, Trash2, Settings, History } from 'lucide-react';
import type { User, Company, CompanySettings, Shift, OperatorDeductions, CompanyItem } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { calculatePayrollForPeriod, getPeriodKey, getPeriodDescription, PayrollSummary } from '@/lib/payroll-calculator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


// --- FAKE DATA & KEYS ---
const FAKE_OPERATOR_USER = {
  uid: 'fake-operator-uid-12345',
  isAnonymous: false,
  displayName: 'Juan Operador',
  photoURL: '',
};

const COMPANIES_DB_KEY = 'fake_companies_db';
const SETTINGS_DB_KEY = 'fake_company_settings_db';
const ITEMS_DB_KEY_PREFIX = 'fake_company_items_db_'; // Assuming items are stored per company
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';
const SHIFTS_DB_KEY_PREFIX = 'fake_shifts_db_';
const DEDUCTIONS_DB_KEY_PREFIX = 'fake_deductions_db_';

type EnabledDeductionFields = {
    [K in keyof Omit<OperatorDeductions, 'userId'>]?: boolean;
};

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
  const [companyItems, setCompanyItems] = useState<CompanyItem[]>([]);
  const [operatorDeductions, setOperatorDeductions] = useState<Partial<OperatorDeductions>>({});
  const [enabledDeductions, setEnabledDeductions] = useState<EnabledDeductionFields>({});
  
  const date = new Date();
  
  // Production model state
  const [quantity, setQuantity] = useState<number | ''>('');

  
  const [shiftForSelectedDay, setShiftForSelectedDay] = useState<Shift | null>(null);
  
  const [historicalPayroll, setHistoricalPayroll] = useState<HistoricalPayroll>({});


  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDeductions, setIsSavingDeductions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeductionsDialog, setShowDeductionsDialog] = useState(false);
  
  const SHIFTS_DB_KEY = useMemo(() => `${SHIFTS_DB_KEY_PREFIX}${companyId}_${user.uid}`, [companyId, user.uid]);
  const DEDUCTIONS_DB_KEY = useMemo(() => `${DEDUCTIONS_DB_KEY_PREFIX}${companyId}_${user.uid}`, [companyId, user.uid]);
  const ITEMS_DB_KEY = useMemo(() => `${ITEMS_DB_KEY_PREFIX}${companyId}`, [companyId]);
  
  const paymentModel = settings.paymentModel || 'hourly';

  const refreshAllData = useCallback((currentDate: Date) => {
    if (!currentDate) return;
    try {
        const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
        const allSettings: { [key: string]: CompanySettings } = storedSettings ? JSON.parse(storedSettings) : {};
        const currentSettings = allSettings[companyId] || {};
        setSettings(currentSettings); // Update settings in state

        if (!currentSettings.payrollCycle) {
            console.log("No payroll cycle set for company");
            return;
        }

        const allShifts: Shift[] = JSON.parse(localStorage.getItem(SHIFTS_DB_KEY) || '[]');
        const currentDeductions: Partial<OperatorDeductions> = JSON.parse(localStorage.getItem(DEDUCTIONS_DB_KEY) || '{}');
        const allItems: CompanyItem[] = JSON.parse(localStorage.getItem(ITEMS_DB_KEY) || '[]');

        // --- Daily Summary ---
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');
        const dayShift = allShifts.find(s => s.date.substring(0, 10) === currentDateStr) || null;
        
        setShiftForSelectedDay(dayShift);
        
        if (dayShift) {
            setQuantity(dayShift.quantity || '');
        } else {
            setQuantity('');
        }

        // --- Current Period & History ---
        const currentPeriodKey = getPeriodKey(currentDate, currentSettings.payrollCycle);
        
        const groupedByPeriod = allShifts.reduce((acc, shift) => {
            const periodKey = getPeriodKey(new Date(shift.date), currentSettings.payrollCycle);
            if (!acc[periodKey]) {
                acc[periodKey] = [];
            }
            acc[periodKey].push(shift);
            return acc;
        }, {} as { [key: string]: Shift[] });

        const newHistory: HistoricalPayroll = {};

        for (const periodKey in groupedByPeriod) {
            const summary = calculatePayrollForPeriod({
                shifts: groupedByPeriod[periodKey],
                periodSettings: currentSettings,
                periodDeductions: currentDeductions,
                items: allItems,
            });
            if (periodKey !== currentPeriodKey) {
                 newHistory[periodKey] = summary;
            }
        }
        
        setHistoricalPayroll(newHistory);

    } catch (e) {
        console.error("Error refreshing data:", e);
    }
  }, [SHIFTS_DB_KEY, DEDUCTIONS_DB_KEY, ITEMS_DB_KEY, companyId]);

  // Initial load and on date change
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
        
        const storedItems = localStorage.getItem(ITEMS_DB_KEY);
        const companyItemsData : CompanyItem[] = storedItems ? JSON.parse(storedItems) : [];
        setCompanyItems(companyItemsData);

        const storedDeductions = localStorage.getItem(DEDUCTIONS_DB_KEY);
        const operatorDeductionsData : OperatorDeductions = storedDeductions ? JSON.parse(storedDeductions) : { userId: user.uid };
        setOperatorDeductions(operatorDeductionsData);

        const initialEnabled: EnabledDeductionFields = {};
        for (const key in deductionLabels) {
            const deductionKey = key as keyof EnabledDeductionFields;
            initialEnabled[deductionKey] = operatorDeductionsData[deductionKey] != null;
        }
        setEnabledDeductions(initialEnabled);

        refreshAllData(date);

    } catch(e) {
        console.error("Failed to load data from localStorage", e);
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router, user.uid, DEDUCTIONS_DB_KEY, ITEMS_DB_KEY, date, refreshAllData]);


  const handleSave = () => {
    if (!company || !settings || !date) return;

    let shiftData: Partial<Shift> = {};
    const selectedItemId = companyItems[0]?.id;

    if (paymentModel === 'production') {
        if (!selectedItemId || !quantity || quantity <= 0) {
            toast({
                variant: 'destructive',
                title: 'Datos incompletos',
                description: 'Por favor, introduce una cantidad mayor a cero. Si no hay ítems configurados, contacta al administrador.',
            });
            return;
        }
        shiftData = { itemId: selectedItemId, quantity };
    } else {
         toast({
            variant: 'destructive',
            title: 'Modelo de pago no configurado',
            description: 'La empresa no tiene un modelo de pago por producción activo.',
        });
        return;
    }


    setIsSaving(true);
    
    try {
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        let allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        
        const currentDateStr = format(date, 'yyyy-MM-dd');
        const existingShiftIndex = allShifts.findIndex(s => s.date.substring(0, 10) === currentDateStr);

        const baseShiftData = {
            userId: user.uid,
            companyId: company.id,
            date: date.toISOString(),
        };

        if (existingShiftIndex > -1) {
            const existingShift = allShifts[existingShiftIndex];
            allShifts[existingShiftIndex] = { ...existingShift, ...shiftData };
        } else {
            const newShift: Shift = {
                id: `shift_${Date.now()}`,
                ...baseShiftData,
                ...shiftData,
            } as Shift;
            allShifts.push(newShift);
        }
        
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(allShifts));
        
        refreshAllData(date);

        toast({
            title: existingShiftIndex > -1 ? 'Registro Actualizado' : 'Registro Guardado',
            description: `Registro del ${format(date, 'PPP', { locale: es })} guardado.`,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Guardar',
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
        const currentDateStr = format(date, 'yyyy-MM-dd');
        const updatedShifts = allShifts.filter(s => s.date.substring(0, 10) !== currentDateStr);
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));

        refreshAllData(date);
        
        setShowDeleteConfirm(false);

        toast({
            title: 'Registro Eliminado',
            description: `El registro para el ${format(date, 'PPP', { locale: es })} ha sido eliminado.`,
        });
    } catch (error) {
        console.error('Failed to delete shift', error);
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo eliminar el registro.',
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
        
        if(date) {
            refreshAllData(date);
        }
        
        toast({
            title: 'Deducciones Guardadas',
            description: 'Tus deducciones voluntarias han sido actualizadas.',
        });
        setShowDeductionsDialog(false);
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

    const renderFullBreakdown = (summary: PayrollSummary) => (
        <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-sm mb-1">Ingresos</h4>
            {renderSummaryRow("Pago base (producción)", summary.totalBasePayment)}
             <div className="flex justify-between font-bold text-lg mt-4">
                <span>Neto a Pagar</span>
                <span>{formatCurrency(summary.netPay)}</span>
            </div>
        </div>
    );

    const renderSummaryRow = (label: string, value: number, isPositive: boolean = true) => {
        if (value === 0) return null;
        return (
            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-mono ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '' : '- '} {formatCurrency(Math.abs(value))}
                </span>
            </div>
        );
    };


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
                    Panel de Registro
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
           <Tabs defaultValue="registro" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="registro">Registro de Producción</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>
              <TabsContent value="registro" className="space-y-8 mt-8">
                 <Card className="relative">
                    <CardHeader>
                    <CardDescription>Completa los datos de producción. El registro se guardará con la fecha de hoy, {format(new Date(), 'PPP', { locale: es })}.</CardDescription>
                        {shiftForSelectedDay && (
                            <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} disabled={isSaving} aria-label="Eliminar registro" className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 pt-6">
                        <div className="grid w-full max-w-xs gap-2">
                            <Label htmlFor="quantity">Cantidad</Label>
                            <Input 
                                id="quantity" 
                                type="number" 
                                placeholder="0" 
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            {shiftForSelectedDay ? 'Actualizar Registro' : 'Guardar Registro'}
                        </Button>
                    </CardFooter>
                </Card>

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
                                .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
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
              Esta acción eliminará permanentemente el registro del día {date ? format(date, 'PPP', { locale: es }) : ''}. No se puede deshacer.
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
