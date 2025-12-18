
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Trash2, Download } from 'lucide-react';
import type { Company, Shift, CompanySettings, PayrollSummary, Benefit, Deduction, UserProfile } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { TimeInput } from '@/components/TimeInput';
import { DeleteShiftDialog } from '@/components/operator/DeleteShiftDialog';
import { calculateShiftSummary, calculatePeriodSummary, getPeriodDateRange } from '@/lib/payroll-calculator';
import { PayrollBreakdown } from './operator/PayrollBreakdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth, useUser } from '@/firebase';
import { ThemeToggle } from './ui/theme-toggle';
import { PayrollVoucher } from './operator/PayrollVoucher';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// --- FAKE DATA & KEYS ---
const COMPANIES_DB_KEY = 'fake_companies_db';
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';
const SHIFTS_DB_KEY = 'fake_shifts_db';
const SETTINGS_DB_KEY = 'fake_company_settings_db';
const HOLIDAYS_DB_KEY = 'fake_holidays_db';
const BENEFITS_DB_KEY = 'fake_company_benefits_db';
const DEDUCTIONS_DB_KEY = 'fake_company_deductions_db';
const USER_PROFILES_DB_KEY = 'fake_user_profiles_db';


// --- HELPER FUNCTIONS ---
function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}


// --- COMPONENT ---
export function OperatorDashboard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const voucherRef = useRef<HTMLDivElement>(null);
  
  // Global state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Data from DB
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);


  // Shift state for the selected day
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  // Calculated Summaries
  const [dailySummary, setDailySummary] = useState<Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PayrollSummary | null>(null);


  // --- DERIVED STATE ---
  const shiftForSelectedDate = useMemo(() => {
    if (!date || !user) return null;
    return allShifts.find(s => 
        s.userId === user.uid && 
        s.companyId === companyId &&
        new Date(s.date).toDateString() === date.toDateString()
    );
  }, [date, allShifts, companyId, user?.uid]);
  
  const shiftDays = useMemo(() => {
    if (!user) return [];
    return allShifts
        .filter(s => s.userId === user.uid && s.companyId === companyId)
        .map(s => new Date(s.date));
  }, [allShifts, user?.uid, companyId]);


  // Effect 1: Load all initial data from localStorage ONCE
  useEffect(() => {
    setIsLoading(true);
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

      // Load all shifts for this user
      const storedShifts = localStorage.getItem(SHIFTS_DB_KEY);
      const parsedShifts: Shift[] = storedShifts ? JSON.parse(storedShifts) : [];
      setAllShifts(parsedShifts);
      
      // Load Company Settings
      const storedSettings = localStorage.getItem(SETTINGS_DB_KEY);
      if(storedSettings) {
        let allSettingsData = JSON.parse(storedSettings);
        if (!Array.isArray(allSettingsData)) { // Ensure it's an array for robustness
            allSettingsData = [allSettingsData];
        }
        const foundSettings = allSettingsData.find((s: CompanySettings) => s.id === companyId);
        setSettings(foundSettings || null);
      }
      
      // Load Holidays
      const storedHolidays = localStorage.getItem(HOLIDAYS_DB_KEY);
      if (storedHolidays) {
        const holidayStrings: string[] = JSON.parse(storedHolidays);
        setHolidays(holidayStrings.map(dateString => new Date(dateString)));
      }

      // Load Benefits
      const storedBenefits = localStorage.getItem(BENEFITS_DB_KEY);
      const allBenefits: Benefit[] = storedBenefits ? JSON.parse(storedBenefits) : [];
      setBenefits(allBenefits.filter(b => b.companyId === companyId));

      // Load Deductions
      const storedDeductions = localStorage.getItem(DEDUCTIONS_DB_KEY);
      const allDeductions: Deduction[] = storedDeductions ? JSON.parse(storedDeductions) : [];
      setDeductions(allDeductions.filter(d => d.companyId === companyId));

    } catch(e) {
      console.error("Failed to load initial data from localStorage", e);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos iniciales.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, router, toast]);

    // Effect 1.5: Save/update user profile in localStorage
    useEffect(() => {
        if (user && user.uid && !user.isAnonymous) {
            try {
                const storedProfiles = localStorage.getItem(USER_PROFILES_DB_KEY);
                const profiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];
                
                const userProfile: UserProfile = {
                    uid: user.uid,
                    displayName: user.displayName || 'Operador',
                    photoURL: user.photoURL || '',
                    email: user.email || ''
                };
                
                const existingProfileIndex = profiles.findIndex(p => p.uid === user.uid);

                if (existingProfileIndex > -1) {
                    // Update only if data has changed to avoid unnecessary writes
                    if (JSON.stringify(profiles[existingProfileIndex]) !== JSON.stringify(userProfile)) {
                         profiles[existingProfileIndex] = userProfile;
                         localStorage.setItem(USER_PROFILES_DB_KEY, JSON.stringify(profiles));
                    }
                } else {
                    profiles.push(userProfile);
                    localStorage.setItem(USER_PROFILES_DB_KEY, JSON.stringify(profiles));
                }
            } catch (error) {
                console.error("Could not save user profile to localStorage:", error);
            }
        }
    }, [user]);

  // Effect 2: Update inputs when date changes or shifts are updated
  useEffect(() => {
    if (shiftForSelectedDate) {
      setStartTime(shiftForSelectedDate.startTime || '');
      setEndTime(shiftForSelectedDate.endTime || '');
    } else {
      setStartTime('');
      setEndTime('');
    }
  }, [shiftForSelectedDate, date]);

  // Effect 3: Calculate daily summary for the selected day
  useEffect(() => {
    if (shiftForSelectedDate && settings) {
        const summary = calculateShiftSummary(shiftForSelectedDate, settings, holidays);
        setDailySummary(summary);
    } else {
        setDailySummary(null);
    }
  }, [shiftForSelectedDate, settings, holidays]);


  // Effect 4: Calculate accumulated hours for the current period (month/fortnight)
  useEffect(() => {
    if (!date || !settings || !user) return;

    const summary = calculatePeriodSummary(allShifts, settings, holidays, benefits, deductions, user.uid, companyId, date);
    setPeriodSummary(summary);

  }, [allShifts, user, companyId, settings, date, holidays, benefits, deductions]);

  const handleSave = async () => {
    if (!date || !user || (!startTime && !endTime)) {
        toast({ title: "Atención", description: "Debes ingresar al menos una hora para guardar.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save

    let updatedShifts = [...allShifts];
    const shiftIndex = updatedShifts.findIndex(s => 
        s.userId === user.uid && 
        s.companyId === companyId &&
        new Date(s.date).toDateString() === date.toDateString()
    );

    const shiftData = { startTime, endTime };

    if (shiftIndex > -1) {
        // Update existing shift
        updatedShifts[shiftIndex] = { ...updatedShifts[shiftIndex], ...shiftData };
    } else {
        // Create new shift
        const newShift: Shift = {
            id: `shift_${Date.now()}`,
            userId: user.uid,
            companyId: companyId,
            date: date.toISOString(),
            ...shiftData,
        };
        updatedShifts.push(newShift);
    }
    
    try {
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));
        setAllShifts(updatedShifts);
        toast({ title: "¡Guardado!", description: "Tu turno se ha guardado correctamente." });
    } catch(e) {
        console.error("Error saving shifts to localStorage", e);
        toast({ title: "Error", description: "No se pudo guardar tu turno.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!date || !user || !shiftForSelectedDate) return;

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const updatedShifts = allShifts.filter(s => s.id !== shiftForSelectedDate.id);

    try {
        localStorage.setItem(SHIFTS_DB_KEY, JSON.stringify(updatedShifts));
        setAllShifts(updatedShifts);
        toast({ title: "¡Eliminado!", description: "El turno ha sido eliminado." });
    } catch (e) {
        console.error("Error deleting shift from localStorage", e);
        toast({ title: "Error", description: "No se pudo eliminar el turno.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  

  const handleSignOut = async () => {
    try {
        if(auth) await auth.signOut();
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
    } catch (e) {
        console.error("Failed to sign out or clear localStorage", e);
    }
    router.push('/login'); 
  };
  
    const handleDownload = async () => {
        if (!voucherRef.current || !user) return;
        setIsDownloading(true);

        try {
            const canvas = await html2canvas(voucherRef.current, {
                scale: 2, // Higher scale for better quality
                backgroundColor: '#ffffff', // Force white background
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const fileName = `comprobante-de-pago-${user.displayName?.replace(/\s/g, '-').toLowerCase() || 'operador'}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo generar el comprobante PDF.',
            });
        } finally {
            setIsDownloading(false);
        }
    };


  if (isLoading || !company || !user || !settings) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      
       {/* Hidden element for PDF generation */}
       <div className="absolute left-[-9999px] top-[-9999px]">
            <div ref={voucherRef} className="bg-white text-black p-8">
                {company && user && date && periodSummary && settings && (
                    <PayrollVoucher 
                        operatorName={user.displayName || 'Operador'}
                        companyName={company.name}
                        period={getPeriodDateRange(date, settings.payrollCycle)}
                        summary={periodSummary}
                    />
                )}
            </div>
        </div>
      
      <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'}/>
                <AvatarFallback>
                    {user?.isAnonymous ? 'OP' : (user?.displayName ? getInitials(user.displayName) : 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="text-left sm:hidden">
                  <p className="font-semibold">{user?.isAnonymous ? 'Operador' : user?.displayName || 'Usuario'}</p>
                  <p className="text-sm text-muted-foreground">Operador</p>
              </div>
            </div>

            {company && (
              <div className="flex items-center gap-3 text-right">
                  <div className="text-right sm:hidden">
                        <p className="font-semibold">{company.name}</p>
                        <p className="text-sm text-muted-foreground">Empresa</p>
                    </div>
                  {company.logoUrl ? (
                      <Image src={company.logoUrl} alt={company.name} width={48} height={48} className="rounded-md object-contain h-12 w-12 sm:h-16 sm:w-16" />
                  ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                          Logo
                      </div>
                  )}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
             <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Bienvenido
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Panel de Operador
                </p>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="icon" onClick={handleDownload} disabled={isDownloading || !periodSummary}>
                    {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
                    <span className="sr-only">Descargar Comprobante</span>
                </Button>
                <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                    <LogOut className="mr-2 h-5 w-5" />
                    <span className="hidden sm:inline">Salir</span>
                </Button>
            </div>
          </div>
        </header>

        <main className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Actividad</CardTitle>
                    <CardDescription>
                        Selecciona una fecha y registra tus horas de trabajo. Los días con turnos guardados aparecen marcados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <DatePicker date={date} setDate={setDate} highlightedDays={shiftDays} />
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                           <TimeInput 
                                label="Hora de Entrada"
                                value={startTime}
                                onChange={setStartTime}
                            />
                           <TimeInput 
                                label="Hora de Salida"
                                value={endTime}
                                onChange={setEndTime}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div>
                        {shiftForSelectedDate && (
                            <DeleteShiftDialog onConfirm={handleDelete}>
                                <Button variant="destructive" size="icon" disabled={isSaving}>
                                    <Trash2 className="h-4 w-4"/>
                                    <span className="sr-only">Eliminar Turno</span>
                                </Button>
                            </DeleteShiftDialog>
                        )}
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || !date}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : null}
                        Guardar Turno
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resumen del Turno</CardTitle>
                    <CardDescription>
                        Cálculo para el día seleccionado. Los subsidios y deducciones se aplican en el resumen del período.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-around items-center text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Horas</p>
                            <p className="text-2xl font-bold">
                                {dailySummary ? `${dailySummary.totalHours.toFixed(2)}h` : '--:--'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pago Bruto del Turno</p>
                            <p className="text-2xl font-bold text-green-600">
                                {dailySummary ? formatCurrency(dailySummary.grossPay) : '$0'}
                            </p>
                        </div>
                    </div>
                    {dailySummary && dailySummary.grossPay > 0 && (
                        <Accordion type="single" collapsible className="w-full mt-4">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Ver desglose del turno</AccordionTrigger>
                                <AccordionContent>
                                    <PayrollBreakdown summary={dailySummary} />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {settings?.payrollCycle === 'bi-weekly' ? 'Acumulado Quincenal' : 'Acumulado Mensual'}
                    </CardTitle>
                    <CardDescription>
                        Total de horas trabajadas y pago en el período consultado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Horas</p>
                            <p className="text-2xl font-bold">
                                {periodSummary ? `${periodSummary.totalHours.toFixed(2)}h` : '0h'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pago Bruto</p>
                            <p className="text-2xl font-bold">
                                {periodSummary ? formatCurrency(periodSummary.grossPay) : '$0'}
                            </p>
                        </div>
                         <div>
                            <p className="text-sm text-muted-foreground">Pago Neto</p>
                            <p className="text-2xl font-bold text-green-600">
                                {periodSummary ? formatCurrency(periodSummary.netPay) : '$0'}
                            </p>
                        </div>
                    </div>
                     {periodSummary && periodSummary.grossPay > 0 && (
                        <Accordion type="single" collapsible className="w-full mt-4">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Ver desglose del período</AccordionTrigger>
                                <AccordionContent>
                                    <PayrollBreakdown summary={periodSummary} />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </main>
      </div>
    </div>
  );
}
