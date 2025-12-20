'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Trash2, Download, ChevronsUpDown } from 'lucide-react';
import type { Company, Shift, CompanySettings, PayrollSummary, Benefit, Deduction, UserProfile, CompanyItem } from '@/types/db-entities';
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
import { collection, doc, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';


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
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const voucherRef = useRef<HTMLDivElement>(null);
  
  // Local state
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Form state for the selected day
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [itemDetails, setItemDetails] = useState<Record<string, string>>({}); // { itemId: detail }
  
  // Calculated Summaries
  const [dailySummary, setDailySummary] = useState<Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PayrollSummary | null>(null);

  // --- Firestore Data ---
  const companyRef = useMemoFirebase(() => firestore ? doc(firestore, 'companies', companyId) : null, [firestore, companyId]);
  const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

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

  const isLoading = companyLoading || settingsLoading || shiftsLoading || holidaysLoading || benefitsLoading || deductionsLoading || itemsLoading;

  // --- DERIVED STATE ---
  const shiftForSelectedDate = useMemo(() => {
    if (!date || !allShifts) return null;
    return allShifts.find(s => new Date(s.date).toDateString() === date.toDateString());
  }, [date, allShifts]);
  
  const shiftDays = useMemo(() => {
    return allShifts?.map(s => new Date(s.date)) || [];
  }, [allShifts]);

  // Effect 1: Check for company existence
  useEffect(() => {
      if (!companyLoading && !company) {
        toast({ title: 'Error', description: 'Empresa no encontrada.', variant: 'destructive' });
        localStorage.removeItem(OPERATOR_COMPANY_KEY);
        router.replace('/select-company');
      }
  }, [company, companyLoading, router, toast]);

    // Effect 1.5: Save/update user profile in firestore for subscription management
    useEffect(() => {
        if (user && user.uid && firestore) {
            const profileRef = doc(firestore, "users", user.uid);
            updateDoc(profileRef, {
                uid: user.uid,
                displayName: user.displayName || 'Operador Anónimo',
                photoURL: user.photoURL || '',
                email: user.email || '',
                isAnonymous: user.isAnonymous,
            }).catch(() => {
                // If doc doesn't exist, it will fail, so we create it.
                addDoc(collection(firestore, "users"), {
                     uid: user.uid,
                     displayName: user.displayName || 'Operador Anónimo',
                     photoURL: user.photoURL || '',
                     email: user.email || '',
                     isAnonymous: user.isAnonymous,
                     createdAt: new Date().toISOString(),
                     paymentStatus: 'trial',
                });
            });
        }
    }, [user, firestore]);

  // Effect 2: Update inputs when date changes or shifts are updated
  useEffect(() => {
    if (shiftForSelectedDate) {
      setStartTime(shiftForSelectedDate.startTime || '');
      setEndTime(shiftForSelectedDate.endTime || '');
      
      const details = shiftForSelectedDate.itemDetails?.reduce((acc, item) => {
          acc[item.itemId] = item.detail;
          return acc;
      }, {} as Record<string, string>) || {};
      setItemDetails(details);
    } else {
      setStartTime('');
      setEndTime('');
      setItemDetails({});
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
    if (!date || !settings || !user || !allShifts || !benefits || !deductions) return;
    const summary = calculatePeriodSummary(allShifts, settings, holidays, benefits, deductions, user.uid, companyId, date);
    setPeriodSummary(summary);
  }, [allShifts, user, companyId, settings, date, holidays, benefits, deductions]);


  const handleItemDetailChange = (itemId: string, value: string) => {
    setItemDetails(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSave = async () => {
    if (!date || !user || !firestore) {
        toast({ title: "Error", description: "No se puede guardar sin fecha, usuario o conexión.", variant: "destructive"});
        return;
    }

    const hasItemDetails = Object.values(itemDetails).some(detail => detail.trim() !== '');
     if (!startTime && !endTime && !hasItemDetails) {
        toast({ title: "Atención", description: "Debes ingresar horas o añadir algún detalle para guardar.", variant: "destructive"});
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

    const shiftData = { 
        userId: user.uid,
        companyId: companyId,
        date: date.toISOString(),
        startTime, 
        endTime,
        itemDetails: filledItemDetails,
    };

    try {
        const shiftsCollection = collection(firestore, 'companies', companyId, 'shifts');
        if (shiftForSelectedDate) {
            const shiftDoc = doc(shiftsCollection, shiftForSelectedDate.id);
            await updateDoc(shiftDoc, shiftData);
        } else {
            await addDoc(shiftsCollection, shiftData);
        }
        toast({ title: "¡Guardado!", description: "Tu turno se ha guardado correctamente." });
    } catch(e) {
        console.error("Error saving shift to Firestore", e);
        toast({ title: "Error", description: "No se pudo guardar tu turno.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!date || !user || !shiftForSelectedDate || !firestore) return;

    setIsSaving(true);
    const shiftDoc = doc(firestore, 'companies', companyId, 'shifts', shiftForSelectedDate.id);
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


  if (isLoading || !company || !user || !settings) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LogoSpinner />
        </div>
    );
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
                        shifts={allShifts}
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
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Panel de Operador
                </p>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
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
                    <CardDescription>
                        Selecciona una fecha y registra tus horas. Los días con turnos guardados aparecen marcados.
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
                            </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

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
                        {isSaving ? <LogoSpinner className="mr-2" /> : null}
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
      <InstallPwaPrompt />
    </div>
  );
}
