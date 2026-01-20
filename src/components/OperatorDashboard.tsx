'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Repeat, History, ShieldAlert, X, Zap } from 'lucide-react';
import type { Company, Shift, CompanySettings, PayrollSummary, Benefit, Deduction, UserProfile, CompanyItem } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { calculateShiftSummary, calculatePeriodSummary } from '@/lib/payroll-calculator';
import { PayrollBreakdown } from './operator/PayrollBreakdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth, useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { ThemeToggle } from './ui/theme-toggle';
import { LogoSpinner } from './LogoSpinner';
import { InstallPwaPrompt } from './operator/InstallPwaPrompt';
import { collection, doc, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { ShiftForm } from './operator/ShiftForm';
import { addDays, isAfter, differenceInDays, startOfDay } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toDate, getInitials } from '@/lib/utils';
import { ThemeCustomizer } from '@/components/admin/ThemeCustomizer';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

// --- HELPER FUNCTIONS ---
function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

// --- SUB-COMPONENTS ---
function UpgradeToPremium({ price }: { price: number }) {
    
    return (
        <Card className="border-accent">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="text-accent" /> Activar Cuenta Premium</CardTitle>
                <CardDescription>Para desbloquear todas las funciones y eliminar las restricciones, contacta a tu administrador.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center">El acceso premium tiene un costo de activación de</p>
                <p className="text-3xl font-bold text-center mb-4">{formatCurrency(price)}</p>
                <Button disabled={true} className="w-full btn-accent">
                    Activación Manual
                </Button>
            </CardContent>
        </Card>
    );
}


// --- COMPONENT ---
export function OperatorDashboard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading: isUserAuthLoading, userProfile } = useUser();
  const { toast } = useToast();
  
  // Form state
  const [date, setDate] = useState<Date | undefined>();
  
  // Calculated Summaries
  const [dailySummary, setDailySummary] = useState<Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PayrollSummary | null>(null);
  
  const [trialStatus, setTrialStatus] = useState<{expired: boolean, daysRemaining: number | null}>({ expired: false, daysRemaining: null });
  const [premiumStatus, setPremiumStatus] = useState<{expired: boolean, daysRemaining: number | null}>({ expired: false, daysRemaining: null });
  const [isPremium, setIsPremium] = useState(true); // Assume premium for now to avoid blocking UI

  const [showTrialBanner, setShowTrialBanner] = useState(true);
  const [showPremiumBanner, setShowPremiumBanner] = useState(true);

  // --- Firestore Data ---
  const companyRef = useMemoFirebase(() => {
    if (!firestore || !companyId || !user) return null;
    return doc(firestore, 'companies', companyId);
  }, [firestore, companyId, user]);
  const { data: company, isLoading: companyLoading, error: companyError } = useDoc<Company>(companyRef);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !companyId || !user) return null;
    return doc(firestore, 'companies', companyId, 'settings', 'main');
  }, [firestore, companyId, user]);
  const { data: settings, isLoading: settingsLoading } = useDoc<CompanySettings>(settingsRef);
  
  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !companyId) return null;
    return query(collection(firestore, 'companies', companyId, 'shifts'), where('userId', '==', user.uid));
  }, [firestore, companyId, user]);
  const { data: allShifts, isLoading: shiftsLoading, error: shiftsError } = useCollection<Shift>(shiftsQuery);

  const holidaysRef = useMemoFirebase(() => firestore ? collection(firestore, 'holidays') : null, [firestore]);
  const { data: holidaysData, isLoading: holidaysLoading } = useCollection<{ date: string }>(holidaysRef);
  const holidays = useMemo(() => holidaysData?.map(h => new Date(h.date)) || [], [holidaysData]);

  const benefitsRef = useMemoFirebase(() => {
    if (!firestore || !companyId || !user) return null;
    return collection(firestore, 'companies', companyId, 'benefits');
  }, [firestore, companyId, user]);
  const { data: benefits, isLoading: benefitsLoading } = useCollection<Benefit>(benefitsRef);

  const deductionsRef = useMemoFirebase(() => {
    if (!firestore || !companyId || !user) return null;
    return collection(firestore, 'companies', companyId, 'deductions');
  }, [firestore, companyId, user]);
  const { data: deductions, isLoading: deductionsLoading } = useCollection<Deduction>(deductionsRef);

  const itemsRef = useMemoFirebase(() => {
    if (!firestore || !companyId || !user) return null;
    return collection(firestore, 'companies', companyId, 'items');
  }, [firestore, companyId, user]);
  const { data: companyItems, isLoading: itemsLoading } = useCollection<CompanyItem>(itemsRef);

  const isLoading = isUserAuthLoading || companyLoading || settingsLoading || shiftsLoading || holidaysLoading || benefitsLoading || deductionsLoading || itemsLoading;

  const shiftDays = useMemo(() => {
    return allShifts?.map(s => new Date(s.date)) || [];
  }, [allShifts]);
  
  // Set date on client mount to avoid hydration mismatch
  useEffect(() => {
    setDate(new Date());
  }, []);

  // Effect to calculate subscription status (Trial / Premium)
  useEffect(() => {
    if (!userProfile || !settings) return;

    // Check Premium status first
    const premiumEndDate = toDate(userProfile.premiumUntil);
    if (premiumEndDate) {
        const daysRemaining = differenceInDays(startOfDay(premiumEndDate), startOfDay(new Date()));
        
        if (isAfter(premiumEndDate, new Date())) {
            setIsPremium(true);
            setPremiumStatus({ expired: false, daysRemaining: settings.premiumDurationDays === 0 ? null : daysRemaining });
            return; // Is premium, no need to check trial
        }
    } else if (userProfile.premiumUntil === null) { // Lifetime premium
         setIsPremium(true);
         setPremiumStatus({ expired: false, daysRemaining: null });
         return;
    }

    // If not premium, check Trial status
    const trialDays = settings.trialPeriodDays ?? 30;
    const createdAt = toDate(userProfile.createdAt);
    if (!createdAt) return; // Can't determine trial status

    const trialStartDate = startOfDay(createdAt); // Start trial from beginning of creation day
    const trialEndDate = addDays(trialStartDate, trialDays);
    
    const today = startOfDay(new Date());
    const daysRemaining = differenceInDays(trialEndDate, today);
    
    if (isAfter(trialEndDate, new Date())) { // Use new Date() here to check against exact time for expiration
        setIsPremium(false); // In trial, not premium
        setTrialStatus({ expired: false, daysRemaining });
    } else {
        setIsPremium(false); // Expired trial, not premium
        setTrialStatus({ expired: true, daysRemaining: null });
    }

  }, [userProfile, settings]);

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
      }, {} as Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'>);
      setDailySummary(totalSummary);
    } else {
      setDailySummary(null);
    }
  }, [date, allShifts, settings, holidays]);


  // Effect to calculate accumulated hours for the current period (month/fortnight)
  useEffect(() => {
    if (!date || !settings || !user || !allShifts || !benefits || !deductions || !companyId) return;
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
  
    const handleChangeCompany = () => {
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
        router.replace('/select-company');
    };

    if (isLoading || !user || !date) {
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
    <div className="flex min-h-screen w-full flex-col items-center bg-background">
      
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
              <div className="text-left">
                  <p className="font-semibold">{user?.isAnonymous ? 'Operador Anónimo' : user?.displayName || 'Usuario'}</p>
                  <p className="text-sm text-muted-foreground">Operador</p>
              </div>
            </div>

            {company && (
              <div className="flex items-center gap-3 text-right">
                  <div className="text-right">
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
                <h1 className="text-3xl font-bold text-foreground">
                  Bienvenido
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <ThemeCustomizer />
                <Button variant="outline" size="icon" onClick={() => router.push('/operator/history')} title="Ver Historial">
                    <History />
                    <span className="sr-only">Ver Historial</span>
                </Button>
                <Button variant="outline" size="icon" onClick={handleChangeCompany} title="Cambiar Empresa">
                    <Repeat />
                    <span className="sr-only">Cambiar Empresa</span>
                </Button>
                <Button variant="ghost" onClick={handleSignOut} aria-label="Cerrar sesión">
                    <LogOut className="mr-2 h-5 w-5" />
                    <span className="hidden sm:inline">Salir</span>
                </Button>
            </div>
          </div>
        </header>

        <main className="space-y-8">
            {!isPremium && showTrialBanner && !trialStatus.expired && (
                 <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <div className="flex justify-between items-center">
                        <div>
                            <AlertTitle>Período de Prueba Activo</AlertTitle>
                            <AlertDescription>
                                {trialStatus.daysRemaining !== null 
                                    ? `Te quedan ${trialStatus.daysRemaining} días de prueba.`
                                    : 'Disfruta de tu período de prueba.'}
                            </AlertDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowTrialBanner(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </Alert>
            )}

             {isPremium && showPremiumBanner && premiumStatus.daysRemaining !== null && (
                 <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <div className="flex justify-between items-center">
                        <div>
                            <AlertTitle>Acceso Premium Activo</AlertTitle>
                            <AlertDescription>
                                Tu suscripción premium es válida por {premiumStatus.daysRemaining} días más.
                            </AlertDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowPremiumBanner(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </Alert>
            )}

            {!isPremium && trialStatus.expired && settings && <UpgradeToPremium price={settings.premiumPrice ?? 5000} />}

            <div className={`transition-opacity duration-500 ${!isPremium && trialStatus.expired ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-center mb-8">
                    <DatePicker date={date} setDate={setDate} highlightedDays={shiftDays} />
                </div>

                {date && user && !shiftsError && companyId && (
                    <ShiftForm 
                        key={date.toISOString()} // Force re-mount on date change
                        selectedDate={date}
                        userId={user.uid}
                        companyId={companyId}
                        shiftsForDay={allShifts?.filter(s => new Date(s.date).toDateString() === date.toDateString()) || []}
                        companyItems={companyItems || []}
                    />
                )}
            </div>

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
                    <div className="flex justify-around items-center text-center p-4 rounded-lg bg-muted">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center p-4 rounded-lg bg-muted">
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
                </CardContent>
            </Card>
        </main>
      </div>
      <InstallPwaPrompt />
    </div>
  );
}
