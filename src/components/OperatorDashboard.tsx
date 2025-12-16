

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Save, Trash2, ChevronDown, CalendarClock, Coins } from 'lucide-react';
import type { User, Company, CompanySettings, Shift, CompanyItem, PayrollSummary } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeInput } from '@/components/TimeInput';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { calculateShiftDetails, type ShiftCalculationResult, getPeriodKey, getPeriodDescription, calculatePayrollForPeriod } from '@/lib/payroll-calculator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/DatePicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"


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

  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Hourly state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Production state
  const [companyItems, setCompanyItems] = useState<CompanyItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');


  const [todaysShiftId, setTodaysShiftId] = useState<string | null>(null);
  const [shiftCalculation, setShiftCalculation] = useState<ShiftCalculationResult | null>(null);
  
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [currentPeriodDescription, setCurrentPeriodDescription] = useState<string>('');

  const { paymentModel, payrollCycle } = settings;

  const updatePayrollSummary = useCallback((currentDate: Date, currentSettings: Partial<CompanySettings>, currentItems: CompanyItem[]) => {
    const cycle = currentSettings.payrollCycle;
    if (!cycle) return;

    try {
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        const allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        const userShifts = allShifts.filter(s => s.userId === user.uid && s.companyId === companyId);
        
        const periodKey = getPeriodKey(currentDate, cycle);
        setCurrentPeriodDescription(getPeriodDescription(periodKey, cycle));

        const shiftsInPeriod = userShifts.filter(s => {
            const shiftDate = new Date(s.date);
            return getPeriodKey(shiftDate, cycle) === periodKey;
        });

        const summary = calculatePayrollForPeriod({
            shifts: shiftsInPeriod,
            periodSettings: currentSettings,
            items: currentItems
        });
        setPayrollSummary(summary);

    } catch (e) {
        console.error("Failed to calculate payroll summary", e);
    }
  }, [companyId, user.uid]);

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
        const companySettings = allSettings[companyId] || {};
        setSettings(companySettings);
        
        let items: CompanyItem[] = [];
        if (companySettings.paymentModel === 'production') {
            const storedItems = localStorage.getItem(ITEMS_DB_KEY);
            const allItems: {[key: string]: CompanyItem[]} = storedItems ? JSON.parse(storedItems) : {};
            items = allItems[companyId] || [];
            setCompanyItems(items);
        }

        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        const allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];

        const todayString = format(currentDate, 'yyyy-MM-dd');
        const shiftForDay = allShifts.find(s => s.userId === user.uid && s.companyId === companyId && s.date.startsWith(todayString));

        if (shiftForDay) {
            setTodaysShiftId(shiftForDay.id);
            if (companySettings.paymentModel === 'hourly') {
                setStartTime(shiftForDay.startTime || '');
                setEndTime(shiftForDay.endTime || '');
            } else {
                setSelectedItemId(shiftForDay.itemId || '');
                setQuantity(String(shiftForDay.quantity || ''));
            }
        } else {
            setTodaysShiftId(null);
            setStartTime('');
            setEndTime('');
            setQuantity('');
            setSelectedItemId(items.length > 0 ? items[0].id : '');
            setShiftCalculation(null); // Clear previous calculation
        }

        updatePayrollSummary(currentDate, companySettings, items);

    } catch(e) {
        console.error("Failed to load data from localStorage", e);
        toast({ title: 'Error', description: 'No se pudieron cargar los datos.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [companyId, router, user.uid, toast, updatePayrollSummary]);


  useEffect(() => {
    if (date) {
        loadDataForDay(date);
    }
  }, [date, loadDataForDay]);

    // Recalculate shift details when times change
  useEffect(() => {
    if (settings.paymentModel === 'hourly' && startTime && endTime && date) {
      const shift: Shift = {
        id: todaysShiftId || '',
        userId: user.uid,
        companyId: companyId,
        date: format(date, 'yyyy-MM-dd'),
        startTime: startTime,
        endTime: endTime,
      };

      const result = calculateShiftDetails({
        shift: shift,
        rates: settings,
        items: [],
      });
      setShiftCalculation(result);
    } else {
      setShiftCalculation(null);
    }
  }, [startTime, endTime, date, settings, todaysShiftId, user.uid, companyId]);


  const handleSave = async () => {
    if (!date) {
        toast({ title: 'Error', description: 'Por favor, selecciona una fecha.', variant: 'destructive' });
        return;
    }
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save

    try {
        const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
        let allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
        
        const dateString = format(date, 'yyyy-MM-dd');
        
        const shiftIndex = allShifts.findIndex(s => s.id === todaysShiftId);

        let shiftData: Partial<Shift> = {};

        if (settings.paymentModel === 'hourly') {
            shiftData = { startTime, endTime };
        } else {
            const numQuantity = parseFloat(quantity);
            const firstItem = companyItems.length > 0 ? companyItems[0] : null;
            const currentItemId = selectedItemId || (firstItem ? firstItem.id : '');

             if (!currentItemId || isNaN(numQuantity) || numQuantity <= 0) {
                toast({ title: 'Datos incompletos', description: 'Por favor, selecciona un ítem y una cantidad válida.', variant: 'destructive' });
                setIsSaving(false);
                return;
            }
            shiftData = { itemId: currentItemId, quantity: numQuantity };
        }


        if (shiftIndex > -1) {
            allShifts[shiftIndex] = {
                ...allShifts[shiftIndex],
                ...shiftData,
            };
        } else {
            const newShift: Shift = {
                id: `shift_${Date.now()}`,
                userId: user.uid,
                companyId: companyId,
                date: dateString,
                ...shiftData,
            };
            allShifts.push(newShift);
            setTodaysShiftId(newShift.id);
        }

        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(allShifts));
        toast({ title: '¡Guardado!', description: 'Tu registro ha sido actualizado.' });

        // After saving, update the summary
        if (date) {
          updatePayrollSummary(date, settings, companyItems);
        }

    } catch (e) {
        console.error("Failed to save shift to localStorage", e);
        toast({ title: 'Error', description: 'No se pudo guardar el registro.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!todaysShiftId || !date) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delete

    try {
      const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
      let allShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
      
      const updatedShifts = allShifts.filter(s => s.id !== todaysShiftId);

      localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));
      
      setTodaysShiftId(null);
      setStartTime('');
      setEndTime('');
      setQuantity('');
      setShiftCalculation(null);

      toast({ title: "¡Eliminado!", description: "El registro del turno ha sido eliminado." });
      
      if(date) {
        updatePayrollSummary(date, settings, companyItems);
      }

    } catch (e) {
      console.error("Failed to delete shift from localStorage", e);
      toast({ title: 'Error', description: 'No se pudo eliminar el registro.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }


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
  const isProduction = paymentModel === 'production';
  const payrollCycleTitle = payrollCycle === 'monthly' ? 'Acumulado Mensual' : 'Acumulado Quincenal';

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

           <Card>
                <CardHeader>
                    <CardTitle>Registrar Actividad</CardTitle>
                    <CardDescription>
                       Selecciona un día y registra tu actividad.
                    </CardDescription>
                    <div className="pt-4">
                        <DatePicker date={date} setDate={setDate} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isHourly && (
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
                    )}
                    {isProduction && (
                         <div className="flex flex-col sm:flex-row gap-8 items-end justify-around">
                            <div className="grid gap-2 text-left w-full sm:w-auto">
                                <Label htmlFor="item-select">Ítem de Producción</Label>
                                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                                    <SelectTrigger id="item-select" className="w-full sm:w-[280px]">
                                        <SelectValue placeholder="Selecciona un ítem" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyItems.length > 0 ? (
                                            companyItems.map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-items" disabled>No hay ítems configurados</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 text-left w-full sm:w-auto">
                                <Label htmlFor="quantity-input">Cantidad</Label>
                                <Input
                                    id="quantity-input"
                                    type="number"
                                    placeholder="Ej: 100"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full sm:w-24 text-center text-lg"
                                />
                            </div>
                         </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    {todaysShiftId && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isSaving || isLoading}>
                                    <Trash2 className="mr-2" />
                                    Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente el registro de este turno.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                        Guardar Registro
                    </Button>
                </CardFooter>
           </Card>

           {isHourly && shiftCalculation && shiftCalculation.totalHours > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen del Turno</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="hover:no-underline font-normal">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="text-left">
                                            <p className="text-sm text-muted-foreground">Total Horas Turno</p>
                                            <p className="font-bold text-2xl">{shiftCalculation.totalHours.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Pago Total Turno</p>
                                            <p className="font-bold text-2xl text-green-600">{formatCurrency(shiftCalculation.totalPayment)}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="border rounded-lg mt-4">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tipo de Hora</TableHead>
                                                    <TableHead className="text-right">Horas</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {shiftCalculation.dayHours > 0 && <TableRow><TableCell>{shiftCalculation.isHoliday ? 'Diurnas Festivas' : 'Diurnas'}</TableCell><TableCell className="text-right font-mono">{shiftCalculation.dayHours.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayDayRate || 0) : (settings.dayRate || 0))}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.dayPayment)}</TableCell></TableRow>}
                                                
                                                {shiftCalculation.nightHours > 0 && <TableRow><TableCell>{shiftCalculation.isHoliday ? 'Nocturnas Festivas' : 'Nocturnas'}</TableCell><TableCell className="text-right font-mono">{shiftCalculation.nightHours.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayNightRate || 0) : (settings.nightRate || 0))}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.nightPayment)}</TableCell></TableRow>}
                                                
                                                {shiftCalculation.dayOvertimeHours > 0 && <TableRow><TableCell>{shiftCalculation.isHoliday ? 'Diurnas Extra Festivas' : 'Diurnas Extra'}</TableCell><TableCell className="text-right font-mono">{shiftCalculation.dayOvertimeHours.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayDayOvertimeRate || 0) : (settings.dayOvertimeRate || 0))}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.dayOvertimePayment)}</TableCell></TableRow>}
                                                
                                                {shiftCalculation.nightOvertimeHours > 0 && <TableRow><TableCell>{shiftCalculation.isHoliday ? 'Nocturnas Extra Festivas' : 'Nocturnas Extra'}</TableCell><TableCell className="text-right font-mono">{shiftCalculation.nightOvertimeHours.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayNightOvertimeRate || 0) : (settings.nightOvertimeRate || 0))}</TableCell><TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.nightOvertimePayment)}</TableCell></TableRow>}
                                                
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            {payrollCycle && payrollSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle>{payrollCycleTitle}</CardTitle>
                        <CardDescription>{currentPeriodDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className='grid grid-cols-2 gap-4'>
                         <div className="flex items-center gap-4">
                            <CalendarClock className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Horas</p>
                                <p className="text-2xl font-bold">{isHourly ? payrollSummary.totalHours.toFixed(2) : '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Coins className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Pago Bruto</p>
                                <p className="text-2xl font-bold">{formatCurrency(payrollSummary.grossPay)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
           )}

        </main>
      </div>
    </div>
  );
}
