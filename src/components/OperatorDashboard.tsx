'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Download, Repeat } from 'lucide-react';
import type { Company, Shift, CompanySettings, PayrollSummary, Benefit, Deduction, UserProfile, CompanyItem, DailyShiftEntry } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { calculateShiftSummary, calculatePeriodSummary, getPeriodDateRange } from '@/lib/payroll-calculator';
import { PayrollBreakdown } from './operator/PayrollBreakdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth, useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { ThemeToggle } from './ui/theme-toggle';
import { PayrollVoucher } from './operator/PayrollVoucher';
import { useReactToPrint } from 'react-to-print';
import { LogoSpinner } from './LogoSpinner';
import { InstallPwaPrompt } from './operator/InstallPwaPrompt';
import { collection, doc, query, where, writeBatch, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { ShiftForm } from './operator/ShiftForm';


// --- FAKE DATA & KEYS ---
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';


// --- HELPER FUNCTIONS ---
function getInitials(name: string) {
    if (!name) return 'U';
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
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const voucherRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Calculated Summaries
  const [dailySummary, setDailySummary] = useState<Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PayrollSummary | null>(null);
  const [localUserProfile, setLocalUserProfile] = useState<UserProfile | null>(null);


  // --- Firestore Data ---
  const companyRef = useMemoFirebase(() => firestore ? doc(firestore, 'companies', companyId) : null, [firestore, companyId]);
  const { data: company, isLoading: companyLoading, error: companyError } = useDoc<Company>(companyRef);

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'companies', companyId, 'settings', 'main') : null, [firestore, companyId]);
  const { data: settings, isLoading: settingsLoading } = useDoc<CompanySettings>(settingsRef);
  
  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'companies', companyId, 'shifts'), where('userId', '==', user.uid));
  }, [firestore, companyId, user?.uid]);
  const { data: allShifts, isLoading: shiftsLoading, error: shiftsError } = useCollection<Shift>(shiftsQuery);

  const holidaysRef = useMemoFirebase(() => firestore ? collection(firestore, 'holidays') : null, [firestore]);
  const { data: holidaysData, isLoading: holidaysLoading } = useCollection<{ date: string }>(holidaysRef);
  const holidays = useMemo(() => holidaysData?.map(h => new Date(h.date)) || [], [holidaysData]);

  const benefitsRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies', companyId, 'benefits') : null, [firestore, companyId]);
  const { data: benefits, isLoading: benefitsLoading } = useCollection<Benefit>(benefitsRef);

  const deductionsRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies', companyId, 'deductions') : null, [firestore, companyId]);
  const { data: deductions, isLoading: deductionsLoading } = useCollection<Deduction>(deductionsRef);

  const userProfileRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: userProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserAuthLoading || companyLoading || settingsLoading || shiftsLoading || holidaysLoading || benefitsLoading || deductionsLoading || userProfileLoading;

  const shiftDays = useMemo(() => {
    return allShifts?.map(s => new Date(s.date)) || [];
  }, [allShifts]);

  // Effect to save/update user profile in firestore for subscription management
  useEffect(() => {
      if (user && !userProfileLoading && firestore) {
          const profileRef = doc(firestore, "users", user.uid);
          
          if (!userProfile) { // If profile doesn't exist, create it.
                const creationTime = new Date().toISOString();
                const newUserProfile: Omit<UserProfile, 'id'> = {
                    uid: user.uid,
                    displayName: user.displayName || 'Operador Anónimo',
                    photoURL: user.photoURL || '',
                    email: user.email || '',
                    isAnonymous: user.isAnonymous,
                    createdAt: creationTime,
                    role: 'operator',
                };
                writeBatch(firestore).set(profileRef, newUserProfile).commit().catch(err => {
                    console.error("Error saving user profile:", err);
                });
                setLocalUserProfile({ ...newUserProfile, id: user.uid });
          } else {
             // To ensure the local state has the correct ISO string format from the start
             const profileWithISOStringDate = {
                 ...userProfile,
                 createdAt: (userProfile.createdAt && typeof (userProfile.createdAt as any).toDate === 'function')
                    ? (userProfile.createdAt as any).toDate().toISOString()
                    : userProfile.createdAt
             }
             setLocalUserProfile(profileWithISOStringDate);
          }
      }
  }, [user, userProfile, userProfileLoading, firestore]);


  // Effect to calculate daily summary for the selected day
  useEffect(() => {
    if (!date || !allShifts || !settings) {
      setDailySummary(null);
      return;
    }

    const shiftsForDate = allShifts.filter(s => new Date(s.date).toDateString() === date.toDateString());
    
    let hoursAlreadyWorkedOnDay = 0;
    const summaryList = shiftsForDate.map(shift => {
        const shiftSummary = calculateShiftSummary(shift, settings, holidays, hoursAlreadyWorkedOnDay);
        hoursAlreadyWorkedOnDay += shiftSummary.totalHours; // Accumulate hours for the next shift in the same day
        return shiftSummary;
    });

    if (summaryList.length > 0) {
      const totalSummary = summaryList.reduce((acc, summary) => {
        Object.keys(summary).forEach(key => {
          const typedKey = key as keyof typeof summary;
          (acc as any)[typedKey] = (acc[typedKey] || 0) + summary[typedKey];
        });
        return acc;
      });
      setDailySummary(totalSummary);
    } else {
      setDailySummary(null);
    }
  }, [date, allShifts, settings, holidays]);


  // Effect to calculate accumulated hours for the current period (month/fortnight)
  useEffect(() => {
    if (!date || !settings || !user || !allShifts || !benefits || !deductions) return;
    const summary = calculatePeriodSummary(allShifts, settings, holidays, benefits, deductions, user.uid, companyId, date);
    setPeriodSummary(summary);
  }, [allShifts, user, companyId, settings, date, holidays, benefits, deductions]);
  
  const handleSignOut = async () => {
    try {
        if(auth) await auth.signOut();
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
    } catch (e) {
        console.error("Failed to sign out or clear localStorage", e);
    }
    router.push('/login'); 
  };
  
  const handlePrint = useReactToPrint({
      content: () => voucherRef.current,
      documentTitle: `comprobante-de-pago-${user?.displayName?.replace(/\s/g, '-').toLowerCase() || 'operador'}`,
      onAfterPrint: () => toast({ title: "Comprobante generado", description: "Tu comprobante se ha descargado."}),
      onPrintError: () => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el comprobante.'}),
  });
    
    const handleChangeCompany = () => {
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
        router.replace('/select-company');
    };


    if (isLoading || !user) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <LogoSpinner />
          </div>
      );
    }
    
    if (!company && !companyLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center p-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Empresa no encontrada</h2>
              <p className="text-lg text-muted-foreground mb-6">La empresa que seleccionaste ya no está disponible. Por favor, vuelve y elige otra.</p>
              <Button onClick={handleChangeCompany}>
                  <ArrowLeft className="mr-2" />
                  Volver a la selección
              </Button>
          </div>
      )
    }
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      
       {/* Hidden element for PDF generation */}
       <div className="hidden">
            {company && user && date && periodSummary && settings && allShifts && (
                <div ref={voucherRef} className="bg-white text-black p-8">
                    <PayrollVoucher 
                        operatorName={user.displayName || 'Operador'}
                        companyName={company.name}
                        period={getPeriodDateRange(date, settings.payrollCycle)}
                        summary={periodSummary}
                        shifts={allShifts.filter(s => new Date(s.date).toDateString() === date?.toDateString())}
                    />
                </div>
            )}
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
                  <p className="font-semibold">{user?.isAnonymous ? 'Operador Anónimo' : user?.displayName || 'Usuario'}</p>
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
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="icon" onClick={handleChangeCompany} title="Cambiar Empresa">
                    <Repeat />
                    <span className="sr-only">Cambiar Empresa</span>
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrint} disabled={!periodSummary}>
                    <Download />
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
            <div className="flex justify-center mb-8">
                <DatePicker date={date} setDate={setDate} highlightedDays={shiftDays} />
            </div>

            {date && user && !shiftsError && (
                 <ShiftForm 
                    key={date.toISOString()} // Force re-mount on date change
                    selectedDate={date}
                    userId={user.uid}
                    companyId={companyId}
                    shiftsForDay={allShifts?.filter(s => new Date(s.date).toDateString() === date.toDateString()) || []}
                 />
            )}

            {shiftsError && (
                <Card className='border-destructive'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-destructive'><AlertCircle /> Error de Permisos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Tu cuenta no tiene los permisos necesarios para leer o escribir turnos en esta empresa.</p>
                        <p className='text-sm text-muted-foreground mt-2'>Por favor, contacta al administrador para que verifique tu acceso.</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Resumen del Día</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-around items-center text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Horas</p>
                            <p className="text-2xl font-bold">
                                {dailySummary ? `${dailySummary.totalHours}h` : '--:--'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Valor del Turno</p>
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
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Horas</p>
                            <p className="text-2xl font-bold">
                                {periodSummary ? `${periodSummary.totalHours}h` : '0h'}
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
      <InstallPwaPrompt />
    </div>
  );
}
