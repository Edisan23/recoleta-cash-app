'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';
import type { Shift, Company, CompanySettings, PayrollSummary, Benefit, Deduction, CompanyItem } from '@/types/db-entities';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculatePeriodSummary, calculateShiftSummary, getPeriodDateRange } from '@/lib/payroll-calculator';
import { ArrowLeft, Download } from 'lucide-react';
import { PayrollBreakdown } from '@/components/operator/PayrollBreakdown';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { PayrollVoucher } from '@/components/operator/PayrollVoucher';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '@/hooks/use-toast';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

const isWithinPeriod = (date: Date, period: { start: Date; end: Date }) => {
    const time = date.getTime();
    return time >= period.start.getTime() && time <= new Date(period.end).setHours(23, 59, 59, 999);
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

// Helper function to clean up item names for display in history
const formatItemNameForHistory = (name: string): string => {
    const wordsToRemove = ['agregar', 'añadir', 'ingresar', 'registrar'];
    const nameParts = name.split(' ');
    if (wordsToRemove.includes(nameParts[0].toLowerCase())) {
        const newName = nameParts.slice(1).join(' ');
        return newName.charAt(0).toUpperCase() + newName.slice(1);
    }
    return name;
}

function HistoryDayDetail({ summary, shiftsForDay }: { summary: Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> | null, shiftsForDay: Shift[] }) {
    
    const allItemDetails = shiftsForDay.flatMap(shift => shift.itemDetails || []).filter(detail => detail.detail);
    const allNotes = shiftsForDay.map(shift => shift.notes).filter(Boolean);


    return (
        <Card className="mt-4 border-primary/20">
            <CardHeader>
                <CardTitle>Detalle del Día Seleccionado</CardTitle>
            </CardHeader>
            <CardContent>
                {!summary || summary.grossPay === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No hay actividad registrada para este día.</p>
                ) : (
                    <>
                        <div className="flex justify-around items-center text-center mb-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Horas</p>
                                <p className="text-xl font-bold">{summary.totalHours}h</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pago del Día</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(summary.grossPay)}</p>
                            </div>
                        </div>
                        <PayrollBreakdown summary={summary} />

                        {(allItemDetails.length > 0 || allNotes.length > 0) && (
                            <>
                                <Separator className="my-4" />
                                <div className="space-y-4">
                                     <h4 className="font-semibold">Detalles Adicionales</h4>
                                     {allItemDetails.length > 0 && (
                                        <div className="space-y-1 text-sm p-3 bg-muted/50 rounded-md">
                                            {allItemDetails.map((detail, index) => (
                                                <div key={index} className="flex justify-between">
                                                    <span className="text-muted-foreground">{formatItemNameForHistory(detail.itemName)}:</span>
                                                    <span className="font-medium">{detail.detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                     )}
                                     {allNotes.map((note, index) => (
                                         <div key={index} className="space-y-1 text-sm p-3 bg-muted/50 rounded-md">
                                             <p className="font-medium">Notas:</p>
                                             <p className="text-muted-foreground whitespace-pre-wrap">{note}</p>
                                         </div>
                                     ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function HistoryDetailPage() {
    const router = useRouter();
    const params = useParams();
    const firestore = useFirestore();
    const { user, isUserLoading: isUserAuthLoading } = useUser();
    const { toast } = useToast();
    const voucherRef = useRef<HTMLDivElement>(null);

    const [companyId, setCompanyId] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

    const periodId = params.periodId as string;
    const [startStr, endStr] = periodId.split('_');

    const period = useMemo(() => {
        const start = parseISO(`${startStr}T00:00:00`);
        const end = parseISO(`${endStr}T23:59:59`);
        return { start, end };
    }, [startStr, endStr]);

    useEffect(() => {
        const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
        if (storedCompanyId) {
            setCompanyId(storedCompanyId);
        } else if (!isUserAuthLoading && user) {
            router.replace('/select-company');
        }
    }, [isUserAuthLoading, user, router]);

    const companyRef = useMemoFirebase(() => firestore && companyId ? doc(firestore, 'companies', companyId) : null, [firestore, companyId]);
    const { data: company, isLoading: companyLoading } = useDoc<Company>(companyRef);

    const shiftsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !companyId) return null;
        return query(collection(firestore, 'companies', companyId, 'shifts'), where('userId', '==', user.uid));
    }, [firestore, companyId, user]);
    const { data: allShifts, isLoading: shiftsLoading } = useCollection<Shift>(shiftsQuery);
    
    const settingsRef = useMemoFirebase(() => firestore && companyId ? doc(firestore, 'companies', companyId, 'settings', 'main') : null, [firestore, companyId]);
    const { data: settings, isLoading: settingsLoading } = useDoc<CompanySettings>(settingsRef);
    
    const holidaysRef = useMemoFirebase(() => firestore ? collection(firestore, 'holidays') : null, [firestore]);
    const { data: holidaysData, isLoading: holidaysLoading } = useCollection<{ date: string }>(holidaysRef);
    const holidays = useMemo(() => holidaysData?.map(h => new Date(h.date)) || [], [holidaysData]);

    const benefitsRef = useMemoFirebase(() => firestore && companyId ? collection(firestore, 'companies', companyId, 'benefits') : null, [firestore, companyId]);
    const { data: benefits, isLoading: benefitsLoading } = useCollection<Benefit>(benefitsRef);

    const deductionsRef = useMemoFirebase(() => firestore && companyId ? collection(firestore, 'companies', companyId, 'deductions') : null, [firestore, companyId]);
    const { data: deductions, isLoading: deductionsLoading } = useCollection<Deduction>(deductionsRef);

    const isLoading = isUserAuthLoading || shiftsLoading || settingsLoading || holidaysLoading || benefitsLoading || deductionsLoading || companyLoading;

    const periodSummary = useMemo(() => {
        if (!allShifts || !settings || !user || !holidays || !benefits || !deductions || !companyId) return null;
        return calculatePeriodSummary(allShifts, settings, holidays, benefits, deductions, user.uid, companyId, period.start);
    }, [allShifts, settings, holidays, benefits, deductions, user, companyId, period.start]);

    const shiftsInPeriod = useMemo(() => {
        if (!allShifts) return [];
        return allShifts.filter(s => isWithinPeriod(new Date(s.date), period));
      }, [allShifts, period]);
    
    const shiftDaysInPeriod = useMemo(() => shiftsInPeriod.map(s => new Date(s.date)), [shiftsInPeriod]);

    const dailyDetail = useMemo(() => {
        if (!selectedDay || !allShifts || !settings || !holidays) return null;
        
        const shiftsForDay = allShifts.filter(s => new Date(s.date).toDateString() === selectedDay.toDateString());

        let hoursAlreadyWorkedOnDay = 0;
        const summaryList = shiftsForDay.map(shift => {
            const shiftSummary = calculateShiftSummary(shift, settings, holidays, hoursAlreadyWorkedOnDay);
            hoursAlreadyWorkedOnDay += shiftSummary.totalHours;
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
          return { summary: totalSummary, shiftsForDay: shiftsForDay };
        }
        return { summary: null, shiftsForDay: [] };
    
    }, [selectedDay, allShifts, settings, holidays]);

     const handlePrint = useReactToPrint({
      content: () => voucherRef.current,
      documentTitle: `comprobante-de-pago-${user?.displayName?.replace(/\s/g, '-').toLowerCase() || 'operador'}`,
      onAfterPrint: () => toast({ title: "Comprobante generado", description: "Tu comprobante se ha descargado."}),
      onPrintError: () => toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el comprobante.'}),
    });


    if (isLoading || !periodSummary) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LogoSpinner />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {/* Hidden element for PDF generation */}
            <div className="hidden">
                {company && user && periodSummary && settings && (
                    <div ref={voucherRef} className="bg-white text-black p-8">
                        <PayrollVoucher 
                            operatorName={user.displayName || 'Operador'}
                            companyName={company.name}
                            period={getPeriodDateRange(period.start, settings.payrollCycle)}
                            summary={periodSummary}
                            shifts={shiftsInPeriod}
                        />
                    </div>
                )}
            </div>

            <header className="flex items-center justify-between mb-8">
                <div>
                    <Button variant="ghost" onClick={() => router.push('/operator/history')} className="mb-4">
                        <ArrowLeft className="mr-2" />
                        Volver a Períodos
                    </Button>
                    <h1 className="text-3xl font-bold">Detalle del Período</h1>
                    <p className="text-muted-foreground capitalize text-lg">
                        {format(period.start, "d 'de' MMMM", { locale: es })} - {format(period.end, "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
                 <div>
                    <Button onClick={handlePrint} disabled={!periodSummary}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Comprobante
                    </Button>
                </div>
            </header>
            <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className='space-y-6'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Resumen del Período</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
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
                             <PayrollBreakdown summary={periodSummary} />
                        </CardContent>
                    </Card>
                </div>

                <div className='space-y-6'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalle por Día</CardTitle>
                            <CardDescription>Selecciona un día en el calendario para ver su detalle.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar 
                                mode="single"
                                selected={selectedDay}
                                onSelect={setSelectedDay}
                                month={period.start}
                                disabled={(date) => date < period.start || date > period.end }
                                modifiers={{ highlighted: shiftDaysInPeriod }}
                                modifiersClassNames={{ highlighted: 'bg-primary/20 rounded-full' }}
                                locale={es}
                            />
                        </CardContent>
                    </Card>
                     {selectedDay && (
                        <HistoryDayDetail summary={dailyDetail?.summary || null} shiftsForDay={dailyDetail?.shiftsForDay || []} />
                    )}
                </div>
            </main>
        </div>
    )
}
