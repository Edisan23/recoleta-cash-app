

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Save, Trash2, CalendarClock, Coins } from 'lucide-react';
import type { User, Company, CompanySettings, Shift, CompanyItem } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeInput } from '@/components/TimeInput';
import { format, isWithinInterval, startOfDay, endOfDay, isSameDay, getMonth, getYear, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { calculateShiftDetails, getPayPeriod, type ShiftCalculationResult } from '@/lib/payroll-calculator';
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

  // Global state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data from DB
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<Partial<CompanySettings>>({});
  const [companyItems, setCompanyItems] = useState<CompanyItem[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  // UI State
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Input fields state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');

  // Derived state (from inputs and DB data)
  const [todaysShiftId, setTodaysShiftId] = useState<string | null>(null);
  const [shiftCalculation, setShiftCalculation] = useState<ShiftCalculationResult | null>(null);
  const [periodSummary, setPeriodSummary] = useState<{ totalHours: number; totalPayment: number; title: string } | null>(null);
  
  const paymentModel = settings.paymentModel;


  // Load all initial data from localStorage
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
      
      let items: CompanyItem[] = [];
      if (companySettings.paymentModel === 'production') {
        const storedItems = localStorage.getItem(ITEMS_DB_KEY);
        const allItems: {[key: string]: CompanyItem[]} = storedItems ? JSON.parse(storedItems) : {};
        items = allItems[companyId] || [];
      }
      setCompanyItems(items);

      const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
      const allShiftsData: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
      const userShifts = allShiftsData.filter(s => s.userId === user.uid && s.companyId === companyId);
      setAllShifts(userShifts);

    } catch(e) {
      console.error("Failed to load initial data from localStorage", e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos iniciales.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user.uid, router, toast]);

  // This effect runs whenever the selected date or the core data changes.
  // It updates the UI and calculations for the selected day and pay period.
  useEffect(() => {
    if (!date || isLoading) return;

    // 1. Find shift for the selected day and update form fields
    const shiftForDay = allShifts.find(s => isSameDay(new Date(s.date), startOfDay(date)));
    
    setTodaysShiftId(shiftForDay?.id || null);
    if (shiftForDay) {
      if (settings.paymentModel === 'hourly') {
        setStartTime(shiftForDay.startTime || '');
        setEndTime(shiftForDay.endTime || '');
      } else {
        setSelectedItemId(shiftForDay.itemId || '');
        setQuantity(String(shiftForDay.quantity || ''));
      }
    } else {
      // Reset fields if no shift for the selected day
      setStartTime('');
      setEndTime('');
      setQuantity('');
      setSelectedItemId(companyItems.length > 0 ? companyItems[0].id : '');
    }

    // 2. Calculate pay period summary
    const payPeriod = getPayPeriod(date, settings);
    const shiftsInPeriod = allShifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return isWithinInterval(shiftDate, { start: startOfDay(payPeriod.start), end: endOfDay(payPeriod.end) });
    });

    let totalHours = 0;
    let totalPayment = 0;
    for (const shift of shiftsInPeriod) {
      const details = calculateShiftDetails({
        shift: shift,
        rates: settings,
        items: companyItems,
      });
      totalHours += details.totalHours;
      totalPayment += details.totalPayment;
    }

    let summaryTitle = `Resumen del Periodo`;
    if (settings.payrollCycle === 'monthly') {
        summaryTitle = `Resumen del Mes (${format(payPeriod.start, 'd MMM', { locale: es })} - ${format(payPeriod.end, 'd MMM', { locale: es })})`;
    } else if (settings.payrollCycle === 'bi-weekly') {
        summaryTitle = `Resumen de la Quincena (${format(payPeriod.start, 'd MMM', { locale: es })} - ${format(payPeriod.end, 'd MMM', { locale: es })})`;
    }

    setPeriodSummary({ totalHours, totalPayment, title: summaryTitle });

  }, [date, allShifts, settings, companyItems, isLoading]);


  // Recalculate shift details for the *current day* when inputs change
  useEffect(() => {
    if (!date) {
      setShiftCalculation(null);
      return;
    }

    let tempShift: Shift | null = null;
    if (paymentModel === 'hourly' && startTime && endTime) {
      tempShift = {
        id: todaysShiftId || 'temp',
        userId: user.uid,
        companyId: companyId,
        date: format(date, 'yyyy-MM-dd'),
        startTime: startTime,
        endTime: endTime,
      };
    } else if (paymentModel === 'production' && selectedItemId && quantity) {
      const numQuantity = parseFloat(quantity);
      if (!isNaN(numQuantity) && numQuantity > 0) {
        tempShift = {
          id: todaysShiftId || 'temp',
          userId: user.uid,
          companyId: companyId,
          date: format(date, 'yyyy-MM-dd'),
          itemId: selectedItemId,
          quantity: numQuantity
        };
      }
    }
    
    if (tempShift) {
      const result = calculateShiftDetails({
        shift: tempShift,
        rates: settings,
        items: companyItems,
      });
      setShiftCalculation(result);
    } else {
      setShiftCalculation(null);
    }
  }, [startTime, endTime, date, settings, todaysShiftId, user.uid, companyId, paymentModel, selectedItemId, quantity, companyItems]);


 const handleSave = async () => {
    if (!date) {
      toast({ title: 'Error', description: 'Por favor, selecciona una fecha.', variant: 'destructive' });
      return;
    }
  
    setIsSaving(true);
  
    // --- Validate inputs based on payment model ---
    if (paymentModel === 'hourly' && (!startTime || !endTime)) {
      toast({ title: 'Datos incompletos', description: 'Por favor, introduce la hora de entrada y salida.', variant: 'destructive' });
      setIsSaving(false);
      return;
    }
    if (paymentModel === 'production') {
      const numQuantity = parseFloat(quantity);
      if (!selectedItemId || isNaN(numQuantity) || numQuantity <= 0) {
        toast({ title: 'Datos incompletos', description: 'Por favor, selecciona un ítem y una cantidad válida.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
    }

    const shiftData: Partial<Shift> = paymentModel === 'hourly'
        ? { startTime, endTime }
        : { itemId: selectedItemId, quantity: parseFloat(quantity) };

    const shiftIndex = allShifts.findIndex(s => isSameDay(new Date(s.date), date));
    
    let updatedShifts: Shift[];

    if (shiftIndex > -1) {
        // Update existing shift
        updatedShifts = allShifts.map((shift, index) => 
            index === shiftIndex ? { ...shift, ...shiftData } : shift
        );
    } else {
        // Create new shift
        const newShift: Shift = {
          id: `shift_${Date.now()}`,
          userId: user.uid,
          companyId: companyId,
          date: format(date, 'yyyy-MM-dd'),
          ...shiftData,
        };
        updatedShifts = [...allShifts, newShift];
    }
  
    try {
        // Update state first
        setAllShifts(updatedShifts);
        
        // Then persist to localStorage
        const allShiftsFromStorage = JSON.parse(localStorage.getItem(SHIFTS_DB_KEY) || '[]');
        // Remove old shifts for this user/company to avoid duplicates
        const otherUsersShifts = allShiftsFromStorage.filter((s: Shift) => s.userId !== user.uid || s.companyId !== companyId);
        const finalShiftsToStore = [...otherUsersShifts, ...updatedShifts];

        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(finalShiftsToStore));
        toast({ title: '¡Guardado!', description: 'Tu registro ha sido actualizado.' });

    } catch (e) {
      console.error("Failed to save shift to localStorage", e);
      toast({ title: 'Error', description: 'No se pudo guardar el registro.', variant: 'destructive' });
      // Optional: Revert state if save fails
      setAllShifts(allShifts);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!todaysShiftId || !date) return;

    setIsSaving(true);
    
    const updatedShifts = allShifts.filter(s => s.id !== todaysShiftId);

    try {
        // Update state
        setAllShifts(updatedShifts);
        
        // Persist to localStorage
        const allShiftsFromStorage = JSON.parse(localStorage.getItem(SHIFTS_DB_KEY) || '[]');
        const otherUsersShifts = allShiftsFromStorage.filter((s: Shift) => s.userId !== user.uid || s.companyId !== companyId);
        const finalShiftsToStore = [...otherUsersShifts, ...updatedShifts];
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(finalShiftsToStore));
        
        // Clear the form state
        setTodaysShiftId(null);
        setStartTime('');
        setEndTime('');
        setQuantity('');
        setShiftCalculation(null);
        toast({ title: "¡Eliminado!", description: "El registro del turno ha sido eliminado." });

    } catch (e) {
      console.error("Failed to delete shift from localStorage", e);
      toast({ title: 'Error', description: 'No se pudo eliminar el registro.', variant: 'destructive' });
      // Revert state
      setAllShifts(allShifts);
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
                    {paymentModel === 'production' && (
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

           {shiftCalculation && (shiftCalculation.totalHours > 0 || shiftCalculation.totalPayment > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen del Turno</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="hover:no-underline font-normal">
                                    <div className="flex justify-between items-center w-full pr-4">
                                        {isHourly && (
                                            <div className="text-left">
                                                <p className="text-sm text-muted-foreground">Total Horas Turno</p>
                                                <p className="font-bold text-2xl">{shiftCalculation.totalHours.toFixed(2)}</p>
                                            </div>
                                        )}
                                        <div className={`text-right ${!isHourly && 'w-full'}`}>
                                            <p className="text-sm text-muted-foreground">Pago Total Turno</p>
                                            <p className="font-bold text-2xl text-green-600">{formatCurrency(shiftCalculation.totalPayment)}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                {isHourly && (
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
                                                {shiftCalculation.dayHours > 0 && (
                                                    <TableRow>
                                                        <TableCell>{shiftCalculation.isHoliday ? 'Diurnas Festivas' : 'Diurnas'}</TableCell>
                                                        <TableCell className="text-right font-mono">{shiftCalculation.dayHours.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayDayRate || 0) : (settings.dayRate || 0))}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.dayPayment)}</TableCell>
                                                    </TableRow>
                                                )}
                                                {shiftCalculation.nightHours > 0 && (
                                                    <TableRow>
                                                        <TableCell>{shiftCalculation.isHoliday ? 'Nocturnas Festivas' : 'Nocturnas'}</TableCell>
                                                        <TableCell className="text-right font-mono">{shiftCalculation.nightHours.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayNightRate || 0) : (settings.nightRate || 0))}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.nightPayment)}</TableCell>
                                                    </TableRow>
                                                )}
                                                {shiftCalculation.dayOvertimeHours > 0 && (
                                                    <TableRow>
                                                        <TableCell>{shiftCalculation.isHoliday ? 'Diurnas Extra Festivas' : 'Diurnas Extra'}</TableCell>
                                                        <TableCell className="text-right font-mono">{shiftCalculation.dayOvertimeHours.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayDayOvertimeRate || 0) : (settings.dayOvertimeRate || 0))}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.dayOvertimePayment)}</TableCell>
                                                    </TableRow>
                                                )}
                                                {shiftCalculation.nightOvertimeHours > 0 && (
                                                    <TableRow>
                                                        <TableCell>{shiftCalculation.isHoliday ? 'Nocturnas Extra Festivas' : 'Nocturnas Extra'}</TableCell>
                                                        <TableCell className="text-right font-mono">{shiftCalculation.nightOvertimeHours.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.isHoliday ? (settings.holidayNightOvertimeRate || 0) : (settings.nightOvertimeRate || 0))}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(shiftCalculation.nightOvertimePayment)}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                                )}
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}

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
                            <div className={`text-center sm:text-left ${!isHourly && 'col-span-1 sm:col-span-2 sm:text-center'}`}>
                                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2"><Coins/> Pago Total</p>
                                <p className="font-bold text-3xl text-green-600">{formatCurrency(periodSummary.totalPayment)}</p>
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

    