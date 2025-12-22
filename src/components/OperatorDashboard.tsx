'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Trash2, Download, ChevronsUpDown, ArrowLeft, PlusCircle, AlertCircle, Lock, Repeat, CreditCard } from 'lucide-react';
import type { Company, Shift, CompanySettings, PayrollSummary, Benefit, Deduction, UserProfile, CompanyItem, DailyShiftEntry } from '@/types/db-entities';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { TimeInput } from '@/components/TimeInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeleteShiftDialog } from '@/components/operator/DeleteShiftDialog';
import { calculateShiftSummary, calculatePeriodSummary, getPeriodDateRange } from '@/lib/payroll-calculator';
import { PayrollBreakdown } from './operator/PayrollBreakdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth, useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { ThemeToggle } from './ui/theme-toggle';
import { PayrollVoucher } from './operator/PayrollVoucher';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LogoSpinner } from './LogoSpinner';
import { InstallPwaPrompt } from './operator/InstallPwaPrompt';
import { collection, doc, query, where, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { addMonths, format, isValid, parseISO, isAfter, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';


// --- FAKE DATA & KEYS ---
const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';


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
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const voucherRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dailyShifts, setDailyShifts] = useState<DailyShiftEntry[]>([
    { id: `new_${Date.now()}`, startTime: '', endTime: '' }
  ]);
  const [itemDetails, setItemDetails] = useState<Record<string, string>>({}); // { itemId: detail }
  
  // Calculated Summaries
  const [dailySummary, setDailySummary] = useState<Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PayrollSummary | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
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
  const { data: allShifts, isLoading: shiftsLoading } = useCollection<Shift>(shiftsQuery);

  const holidaysRef = useMemoFirebase(() => firestore ? collection(firestore, 'holidays') : null, [firestore]);
  const { data: holidaysData, isLoading: holidaysLoading } = useCollection<{ date: string }>(holidaysRef);
  const holidays = useMemo(() => holidaysData?.map(h => new Date(h.date)) || [], [holidaysData]);

  const benefitsRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies', companyId, 'benefits') : null, [firestore, companyId]);
  const { data: benefits, isLoading: benefitsLoading } = useCollection<Benefit>(benefitsRef);

  const deductionsRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies', companyId, 'deductions') : null, [firestore, companyId]);
  const { data: deductions, isLoading: deductionsLoading } = useCollection<Deduction>(deductionsRef);

  const companyItemsRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies', companyId, 'items') : null, [firestore, companyId]);
  const { data: companyItems, isLoading: itemsLoading } = useCollection<CompanyItem>(companyItemsRef);

  const userProfileRef = useMemoFirebase(() => firestore && user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: userProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isLoading = isUserAuthLoading || companyLoading || settingsLoading || shiftsLoading || holidaysLoading || benefitsLoading || deductionsLoading || itemsLoading || userProfileLoading;

  const shiftDays = useMemo(() => {
    return allShifts?.map(s => new Date(s.date)) || [];
  }, [allShifts]);

  // Effect to save/update user profile in firestore for subscription management
  useEffect(() => {
      if (user && !userProfileLoading && firestore) {
          const profileRef = doc(firestore, "users", user.uid);
          if (!userProfile) { // If profile doesn't exist, create it.
              const creationTime = new Date().toISOString();
              const userProfileData: Omit<UserProfile, 'id'> = {
                    uid: user.uid,
                    displayName: user.displayName || 'Operador Anónimo',
                    photoURL: user.photoURL || '',
                    email: user.email || '',
                    isAnonymous: user.isAnonymous,
                    createdAt: creationTime,
                    paymentStatus: 'trial', // default value
              };
              setDoc(profileRef, userProfileData, { merge: true }).catch(err => {
                  console.error("Error saving user profile:", err);
              });
              // Immediately update local state to reflect the new profile
              setLocalUserProfile({ ...userProfileData, id: user.uid });
          } else {
             setLocalUserProfile(userProfile);
          }
      } else if (userProfile) {
          setLocalUserProfile(userProfile);
      }
  }, [user, userProfile, userProfileLoading, firestore]);

  useEffect(() => {
    if (localUserProfile && localUserProfile.paymentStatus !== 'paid' && localUserProfile.createdAt) {
        let creationDate: Date;
        // Firestore timestamp can be an object, handle it
        if (typeof localUserProfile.createdAt === 'string') {
            creationDate = parseISO(localUserProfile.createdAt);
        } else if (localUserProfile.createdAt && typeof (localUserProfile.createdAt as any).toDate === 'function') {
            creationDate = (localUserProfile.createdAt as any).toDate();
        } else {
            creationDate = new Date(); // Fallback
        }

        if (isValid(creationDate)) {
            const endDate = addMonths(creationDate, 1);
            const remaining = differenceInDays(endDate, new Date());
            setTrialDaysRemaining(Math.max(0, remaining));
            
            if (isAfter(new Date(), endDate)) {
                setIsTrialExpired(true);
            }
        }
    } else if (localUserProfile && localUserProfile.paymentStatus === 'paid') {
      setTrialDaysRemaining(null);
      setIsTrialExpired(false);
    }
  }, [localUserProfile]);

  // Effect to update inputs when date changes or shifts are updated
  useEffect(() => {
    if (!date || !allShifts) {
        setDailyShifts([
            { id: `new_${Date.now()}`, startTime: '', endTime: '' }
        ]);
        setItemDetails({});
        return;
    }
    const shiftsForDate = allShifts.filter(s => new Date(s.date).toDateString() === date.toDateString());
    
    if (shiftsForDate.length > 0) {
        const existingShifts = shiftsForDate.map(s => ({ id: s.id, startTime: s.startTime || '', endTime: s.endTime || '' }));
        setDailyShifts(existingShifts);
        
        const details = shiftsForDate[0]?.itemDetails?.reduce((acc, item) => {
            acc[item.itemId] = item.detail;
            return acc;
        }, {} as Record<string, string>) || {};
        setItemDetails(details);
    } else {
        setDailyShifts([
            { id: `new_${Date.now()}`, startTime: '', endTime: '' },
        ]);
        setItemDetails({});
    }
  }, [date, allShifts]);


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

  const handleDailyShiftChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updatedShifts = [...dailyShifts];
    updatedShifts[index][field] = value;
    setDailyShifts(updatedShifts);
  };

  const addDailyShift = () => {
    setDailyShifts([...dailyShifts, { id: `new_${Date.now()}`, startTime: '', endTime: '' }]);
  };

    const removeDailyShift = (index: number) => {
        const shiftToDelete = dailyShifts[index];
        if (!shiftToDelete.id.startsWith('new_')) {
            handleDelete(shiftToDelete.id, index);
        } else {
            setDailyShifts(dailyShifts.filter((_, i) => i !== index));
        }
    };


  const handleItemDetailChange = (itemId: string, value: string) => {
    setItemDetails(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = async (shiftIndex?: number) => {
    if (!date || !user || !firestore) {
      toast({ title: "Error", description: "No se puede guardar sin fecha, usuario o conexión.", variant: "destructive" });
      return;
    }
  
    setIsSaving(true);
  
    const filledItemDetails = Object.entries(itemDetails)
      .filter(([_, detail]) => detail.trim() !== '')
      .map(([itemId, detail]) => {
        const item = companyItems?.find(i => i.id === itemId);
        return {
          itemId,
          itemName: item?.name || 'Item Desconocido',
          detail,
        };
      });
  
    try {
      const shiftsCollection = collection(firestore, 'companies', companyId, 'shifts');
      
      // If a specific shift is being saved (from its own save button)
      if (shiftIndex !== undefined) {
        const shiftToSave = dailyShifts[shiftIndex];
        if (!shiftToSave.startTime && !shiftToSave.endTime) {
            toast({ title: "Atención", description: "Debes ingresar hora de entrada o salida para guardar el turno.", variant: "destructive"});
            setIsSaving(false);
            return;
        }

        const shiftData: Omit<Shift, 'id'> = {
          userId: user.uid,
          companyId: companyId,
          date: date.toISOString(),
          startTime: shiftToSave.startTime,
          endTime: shiftToSave.endTime,
          itemDetails: filledItemDetails,
        };
  
        if (shiftToSave.id.startsWith('new_')) {
          await addDoc(shiftsCollection, shiftData);
        } else {
          const shiftDoc = doc(shiftsCollection, shiftToSave.id);
          await updateDoc(shiftDoc, shiftData);
        }
      } else { 
        // This is the main "Guardar Detalles" button, now it saves details for all shifts
        const batch = writeBatch(firestore);
        const shiftsForDate = allShifts?.filter(s => new Date(s.date).toDateString() === date.toDateString()) || [];
        
        shiftsForDate.forEach(dbShift => {
            const shiftDocRef = doc(shiftsCollection, dbShift.id);
            batch.update(shiftDocRef, { itemDetails: filledItemDetails });
        });
        
        await batch.commit();
      }
      
      toast({ title: "¡Guardado!", description: "Tu actividad se ha guardado correctamente." });
    } catch (e) {
      console.error("Error saving shift to Firestore", e);
      toast({ title: "Error", description: "No se pudo guardar tu actividad.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  

  const handleDelete = async (shiftId: string, index: number) => {
    if (!user || !firestore) return;

    // If it's a new shift not yet saved, just remove from UI
    if (shiftId.startsWith('new_')) {
        setDailyShifts(dailyShifts.filter((_, i) => i !== index));
        return;
    }

    setIsSaving(true);
    const shiftDoc = doc(firestore, 'companies', companyId, 'shifts', shiftId);
    try {
        await deleteDoc(shiftDoc);
        toast({ title: "¡Eliminado!", description: "El turno ha sido eliminado." });
    } catch (e) {
        console.error("Error deleting shift from Firestore", e);
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
                scale: 2,
                backgroundColor: '#ffffff',
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
              <h2 className="text-2xl font-bold mb-2">Empresa no encontrada</h2>
              <p className="text-lg text-muted-foreground mb-6">La empresa que seleccionaste ya no está disponible. Por favor, vuelve y elige otra.</p>
              <Button onClick={handleChangeCompany}>
                  <ArrowLeft className="mr-2" />
                  Volver a la selección
              </Button>
          </div>
      )
    }

    if (isTrialExpired) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
                <div className="mb-4">
                    <Lock className="h-16 w-16 text-destructive mx-auto" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Período de Prueba Finalizado</h1>
                <p className="text-xl text-muted-foreground max-w-md mb-8">
                    Tu acceso a la aplicación ha sido suspendido. Activa tu cuenta para continuar.
                </p>
                 <Button asChild size="lg">
                    <Link href={`/payment?userId=${user.uid}`}>
                        <CreditCard className="mr-2" />
                        Activar Cuenta Premium
                    </Link>
                </Button>
                <Button onClick={handleSignOut} variant="link" className="mt-4">
                    Cerrar Sesión
                </Button>
            </div>
        )
    }
  
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gray-100 dark:bg-gray-900">
      
       {/* Hidden element for PDF generation */}
       <div className="absolute left-[-9999px] top-[-9999px]">
            <div ref={voucherRef} className="bg-white text-black p-8">
                {company && user && date && periodSummary && settings && allShifts && (
                    <PayrollVoucher 
                        operatorName={user.displayName || 'Operador'}
                        companyName={company.name}
                        period={getPeriodDateRange(date, settings.payrollCycle)}
                        summary={periodSummary}
                        shifts={allShifts.filter(s => new Date(s.date).toDateString() === date?.toDateString())}
                    />
                )}
            </div>
        </div>
      
      <div className="flex-1 w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-4">
          {localUserProfile && localUserProfile.paymentStatus !== 'paid' && trialDaysRemaining !== null && (
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Período de Prueba Activo</AlertTitle>
                <div className='flex justify-between items-center'>
                    <AlertDescription>
                       Te quedan <strong>{trialDaysRemaining} días</strong> de prueba.
                    </AlertDescription>
                    <Button asChild size="sm">
                        <Link href={`/payment?userId=${user.uid}`}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Activar Cuenta Premium
                        </Link>
                    </Button>
                </div>
            </Alert>
          )}
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
                <Button variant="outline" size="icon" onClick={handleDownload} disabled={isDownloading || !periodSummary}>
                    {isDownloading ? <LogoSpinner /> : <Download />}
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
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center">
                      <DatePicker date={date} setDate={setDate} highlightedDays={shiftDays} />
                    </div>

                    <div className="space-y-4">
                        {dailyShifts.map((shift, index) => (
                             <div key={shift.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-muted/50">
                                <div className="col-span-12 sm:col-span-5">
                                   <TimeInput 
                                        label={`Entrada Turno ${index + 1}`}
                                        value={shift.startTime}
                                        onChange={(val) => handleDailyShiftChange(index, 'startTime', val)}
                                    />
                                </div>
                                <div className="col-span-12 sm:col-span-5">
                                   <TimeInput 
                                        label={`Salida Turno ${index + 1}`}
                                        value={shift.endTime}
                                        onChange={(val) => handleDailyShiftChange(index, 'endTime', val)}
                                    />
                                </div>
                                <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2">
                                     <Button size="sm" onClick={() => handleSave(index)} disabled={isSaving}>
                                        {isSaving ? <LogoSpinner className="mr-2 h-4 w-4" /> : null}
                                        Guardar
                                    </Button>
                                    <DeleteShiftDialog onConfirm={() => removeDailyShift(index)}>
                                        <Button variant="ghost" size="icon" disabled={isSaving}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </DeleteShiftDialog>
                                </div>
                            </div>
                        ))}
                         <Button variant="outline" onClick={addDailyShift} className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Turno
                        </Button>
                    </div>

                    {(companyItems || []).length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-details">
                            <AccordionTrigger>Detalles Adicionales</AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                  {companyItems?.map(item => (
                                    <div key={item.id}>
                                      <Label htmlFor={`item-detail-${item.id}`}>{item.name}</Label>
                                       <Input 
                                        id={`item-detail-${item.id}`}
                                        value={itemDetails[item.id] || ''}
                                        onChange={(e) => handleItemDetailChange(item.id, e.target.value)}
                                        placeholder={item.description || "Ingresa el detalle"}
                                      />
                                    </div>
                                  ))}
                                </div>
                                <Button onClick={() => handleSave()} disabled={isSaving} size="sm" className="mt-4">
                                    {isSaving ? <LogoSpinner className="mr-2" /> : null}
                                    Guardar Detalles
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resumen del Día</CardTitle>
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
      <InstallPwaPrompt />
    </div>
  );
}
