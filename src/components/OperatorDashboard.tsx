'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Repeat, History, ShieldAlert, X, Palette, Brush, Zap } from 'lucide-react';
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
import { addDays, isAfter, parseISO, differenceInDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { createWompiTransaction } from '@/app/actions/wompi';

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

// Function to convert hex to HSL string: "H S% L%"
const hexToHslString = (hex: string): { hsl: string, hue: string } => {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    const hue = (h * 360).toFixed(0);
    const hsl = `${hue} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
    return { hsl, hue };
};

// Function to apply the user's theme color
function applyThemeColor(color: string | null | undefined) {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (color) {
        const { hsl, hue } = hexToHslString(color);
        root.style.setProperty('--user-primary-color', hsl);
        root.style.setProperty('--user-primary-hue', hue);
    } else {
        // Fallback to default if no color is provided
        const defaultColor = '#6d28d9'; // Deep Purple
        const { hsl, hue } = hexToHslString(defaultColor);
        root.style.setProperty('--user-primary-color', hsl);
        root.style.setProperty('--user-primary-hue', hue);
    }
}


function UpgradeToPremium({ user, price, companyId }: { user: UserProfile, price: number, companyId: string }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handleUpgrade = async () => {
        if (!user.email) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Se requiere un email para realizar el pago.'
            });
            return;
        }
        setIsProcessing(true);

        const result = await createWompiTransaction(price, user.email, user.id, companyId);
        
        if ('error' in result) {
            toast({
                variant: 'destructive',
                title: 'Error de Pago',
                description: result.error,
            });
            setIsProcessing(false);
            return;
        }
        
        const { checkoutUrl } = result;
        
        // Redirect the user to Wompi's payment page
        window.location.href = checkoutUrl;
    };

    return (
        <Card className="mb-6 bg-primary/10 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap />¡Actualiza a Premium!</CardTitle>
                <CardDescription>Obtén acceso ilimitado a todas las funciones de Turno Pro por un pago único.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between">
                <p className="text-2xl font-bold text-primary mb-4 sm:mb-0">{formatCurrency(price)} <span className="text-sm font-normal text-muted-foreground">/ pago único</span></p>
                <Button onClick={handleUpgrade} disabled={isProcessing} size="lg">
                    {isProcessing ? <LogoSpinner className="mr-2" /> : <Zap className="mr-2 h-4 w-4" />}
                    Pagar y Activar Premium
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
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const { toast } = useToast();
  
  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Calculated Summaries
  const [dailySummary, setDailySummary] = useState<Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PayrollSummary | null>(null);
  const [localUserProfile, setLocalUserProfile] = useState<UserProfile | null>(null);
  
  const [trialStatus, setTrialStatus] = useState<{expired: boolean, daysRemaining: number | null}>({ expired: false, daysRemaining: null });
  const [premiumStatus, setPremiumStatus] = useState<{expired: boolean, daysRemaining: number | null}>({ expired: false, daysRemaining: null });
  const [isPremium, setIsPremium] = useState(false);

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

  const userProfileRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: userProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserAuthLoading || companyLoading || settingsLoading || shiftsLoading || holidaysLoading || benefitsLoading || deductionsLoading || userProfileLoading || itemsLoading;

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
              setDoc(profileRef, newUserProfile); // non-blocking write
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
  
  // Effect to check for trial and premium status
  useEffect(() => {
    if (!localUserProfile || !settings) return;

    // Check Premium Status
    const premiumUntilDate = localUserProfile.premiumUntil ? parseISO(localUserProfile.premiumUntil) : undefined;
    const now = new Date();

    // `isCurrentlyPremium` is true if premium is for lifetime (null) or if the expiration date is in the future.
    const isLifetimePremium = localUserProfile.premiumUntil === null;
    const isSubscriptionActive = premiumUntilDate && isAfter(premiumUntilDate, now);
    const isCurrentlyPremium = isLifetimePremium || isSubscriptionActive;
    
    setIsPremium(isCurrentlyPremium);

    if (premiumUntilDate) { // User has or had a premium subscription
      if (isAfter(premiumUntilDate, now)) {
        const daysLeft = differenceInDays(premiumUntilDate, now);
        setPremiumStatus({ expired: false, daysRemaining: daysLeft });
      } else {
        setPremiumStatus({ expired: true, daysRemaining: 0 });
      }
    } else if (premiumUntilDate === undefined) { // premiumUntil field does not exist, not premium yet.
        setPremiumStatus({ expired: false, daysRemaining: null });
    }

    // Check Trial Status (only if not premium)
    if (!isCurrentlyPremium && localUserProfile.createdAt) {
      try {
        const registrationDate = parseISO(localUserProfile.createdAt);
        const trialEndDate = addDays(registrationDate, settings.trialPeriodDays ?? 30);
        
        if (isAfter(now, trialEndDate)) {
          setTrialStatus({ expired: true, daysRemaining: 0 });
        } else {
          const daysLeft = differenceInDays(trialEndDate, now);
          setTrialStatus({ expired: false, daysRemaining: daysLeft });
        }
      } catch (error) {
        console.error("Error parsing user creation date:", error);
      }
    } else {
        // If user is premium, trial is irrelevant.
        setTrialStatus({ expired: false, daysRemaining: null });
    }

  }, [localUserProfile, settings]);


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

    // Effect to apply user's custom theme color
    useEffect(() => {
        applyThemeColor(localUserProfile?.themeColor);
    }, [localUserProfile]);
  
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

    const handleThemeColorChange = async (color: string | null) => {
        if (!firestore || !user) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, { themeColor: color });
             toast({
                title: 'Tema Actualizado',
                description: color ? 'Se ha aplicado tu nuevo color.' : 'Se ha restaurado el color por defecto.',
            });
            // The userProfile listener will update localUserProfile and trigger the effect to apply the color
        } catch (error) {
            console.error("Failed to save theme color", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo guardar el color del tema.',
            });
        }
    };


    if (isLoading || !user) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <LogoSpinner />
          </div>
      );
    }
    
    if ((trialStatus.expired || premiumStatus.expired) && !isPremium) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-background">
          <ShieldAlert className="h-20 w-20 text-destructive mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">{premiumStatus.expired ? "Suscripción Expirada" : "Período de Prueba Terminado"}</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto mb-8">
            Tu acceso ha finalizado. Por favor, actualiza a Premium para continuar usando el servicio.
          </p>
          {localUserProfile && settings && <UpgradeToPremium user={localUserProfile} price={settings.premiumPrice ?? 5000} companyId={companyId} />}
          <Button onClick={handleSignOut} size="lg" variant="ghost">
            Cerrar Sesión
          </Button>
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
                <h1 className="text-3xl font-bold text-foreground">
                  Bienvenido
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" title="Personalizar Color">
                            <Palette />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4">
                        <div className="flex flex-col gap-4 items-center">
                            <Label htmlFor="theme-color">Color Primario</Label>
                            <Input 
                                id="theme-color"
                                type="color" 
                                className="h-10 w-20 p-1"
                                value={localUserProfile?.themeColor || '#6d28d9'}
                                onChange={(e) => handleThemeColorChange(e.target.value)}
                            />
                             <Button variant="ghost" size="sm" onClick={() => handleThemeColorChange(null)}>
                                <Brush className="mr-2 h-4 w-4" />
                                Restaurar por defecto
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <ThemeToggle />
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

        {showTrialBanner && !isPremium && trialStatus.daysRemaining !== null && trialStatus.daysRemaining >= 0 && (
             <Alert className="mb-6 border-primary/50 relative">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Período de Prueba</AlertTitle>
                <AlertDescription>
                    {trialStatus.daysRemaining > 0 ? `Te quedan ${trialStatus.daysRemaining} días de tu prueba gratuita.` : 'Tu período de prueba termina hoy.'}
                </AlertDescription>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setShowTrialBanner(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </Alert>
        )}
         {showPremiumBanner && isPremium && premiumStatus.daysRemaining !== null && premiumStatus.daysRemaining <= 7 && (
             <Alert className="mb-6 border-yellow-500/50 relative text-yellow-600">
                <ShieldAlert className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Tu suscripción está por expirar</AlertTitle>
                <AlertDescription>
                    {premiumStatus.daysRemaining > 0 ? `Te quedan ${premiumStatus.daysRemaining} días de acceso Premium. ¡Renueva pronto!` : 'Tu suscripción Premium expira hoy.'}
                </AlertDescription>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setShowPremiumBanner(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </Alert>
        )}
        
        {!isPremium && localUserProfile && settings && <UpgradeToPremium user={localUserProfile} price={settings.premiumPrice ?? 5000} companyId={companyId}/>}

        <main className="space-y-8">
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
                </CardContent>
            </Card>
        </main>
      </div>
      <InstallPwaPrompt />
    </div>
  );
}
