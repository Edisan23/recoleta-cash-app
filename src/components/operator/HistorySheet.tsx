'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getPeriodDateRange, calculatePeriodSummary, calculateShiftSummary } from '@/lib/payroll-calculator';
import type { Shift, CompanySettings, Benefit, Deduction, Company, UserProfile } from '@/types/db-entities';
import { User } from 'firebase/auth';
import { PayrollBreakdown } from './PayrollBreakdown';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrintVoucherButton } from './PrintVoucherButton';

interface HistorySheetProps {
    allShifts: Shift[];
    settings: CompanySettings | null;
    holidays: Date[];
    benefits: Benefit[];
    deductions: Deduction[];
    user: User | null;
    userProfile: UserProfile | null;
    company: Company | null;
    companyId: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function HistorySheet({ allShifts, settings, holidays, benefits, deductions, user, userProfile, company, companyId }: HistorySheetProps) {

    const payrollPeriods = useMemo(() => {
        if (!settings || allShifts.length === 0) return [];

        const sortedShifts = [...allShifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const periods: { period: { start: Date; end: Date }; shifts: Shift[] }[] = [];
        
        if (sortedShifts.length === 0) return [];

        let currentPeriod = getPeriodDateRange(new Date(sortedShifts[0].date), settings.payrollCycle);
        let currentShifts: Shift[] = [];

        for (const shift of sortedShifts) {
            const shiftDate = new Date(shift.date);
            if (shiftDate >= currentPeriod.start && shiftDate <= currentPeriod.end) {
                currentShifts.push(shift);
            } else {
                if (currentShifts.length > 0) {
                    periods.push({ period: currentPeriod, shifts: currentShifts });
                }
                currentPeriod = getPeriodDateRange(shiftDate, settings.payrollCycle);
                currentShifts = [shift];
            }
        }
        if (currentShifts.length > 0) {
            periods.push({ period: currentPeriod, shifts: currentShifts });
        }

        return periods.reverse(); // Show most recent first
    }, [allShifts, settings]);

    const periodSummaries = useMemo(() => {
        if (!settings || !user) return [];
        return payrollPeriods.map(({ period, shifts }) => {
            const summary = calculatePeriodSummary(shifts, settings, holidays, benefits, deductions, user.uid, companyId, period.start);
            return { period, summary, shifts };
        });
    }, [payrollPeriods, settings, holidays, benefits, deductions, user, companyId]);

    const generalHistory = useMemo(() => {
        if (!allShifts || !settings || !holidays) return [];

        const shiftsByDay: { [key: string]: Shift[] } = allShifts.reduce((acc, shift) => {
            const dayKey = new Date(shift.date).toISOString().split('T')[0];
            if (!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(shift);
            return acc;
        }, {} as { [key: string]: Shift[] });

        const allSummaries: (Shift & { summary: ReturnType<typeof calculateShiftSummary> })[] = [];

        Object.keys(shiftsByDay).forEach(dayKey => {
            const dayShifts = shiftsByDay[dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
            let hoursWorkedOnThisDay = 0;
            dayShifts.forEach(shift => {
                const summary = calculateShiftSummary(shift, settings, holidays, hoursWorkedOnThisDay);
                allSummaries.push({ ...shift, summary });
                hoursWorkedOnThisDay += summary.totalHours;
            });
        });

        // Sort final result for display (most recent first)
        return allSummaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allShifts, settings, holidays]);

    return (
        <div className="h-full overflow-y-auto">
             <Card className="rounded-none border-0 border-b shadow-none sticky top-0 bg-background z-10">
                <CardHeader>
                    <CardTitle>Historial de Pagos</CardTitle>
                    <CardDescription>Resumen de tus períodos de pago y turnos individuales.</CardDescription>
                </CardHeader>
             </Card>

            <Tabs defaultValue="periods" className="w-full p-4 sm:p-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="periods">Por Período</TabsTrigger>
                    <TabsTrigger value="general">General</TabsTrigger>
                </TabsList>
                <TabsContent value="periods">
                    <div className="py-4">
                        {periodSummaries.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                                {periodSummaries.map(({ period, summary, shifts }) => {
                                    const shiftsByDay = shifts.reduce((acc, shift) => {
                                        const dayKey = new Date(shift.date).toISOString().split('T')[0];
                                        if (!acc[dayKey]) acc[dayKey] = [];
                                        acc[dayKey].push(shift);
                                        return acc;
                                    }, {} as { [key: string]: Shift[] });

                                    for (const dayKey in shiftsByDay) {
                                        shiftsByDay[dayKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
                                    }

                                    const sortedDays = Object.keys(shiftsByDay).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());

                                    return (
                                        <AccordionItem key={period.start.toISOString()} value={period.start.toISOString()}>
                                            <AccordionTrigger>
                                                <div className="flex justify-between w-full pr-4">
                                                    <div className="text-left">
                                                        <p className="font-semibold">{format(period.start, 'dd MMM', { locale: es })} - {format(period.end, 'dd MMM, yyyy', { locale: es })}</p>
                                                        <p className="text-sm text-muted-foreground">{summary.daysWorked} días trabajados</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-green-600">{formatCurrency(summary.netPay)}</p>
                                                        <p className="text-sm text-muted-foreground">{summary.totalHours} horas</p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <PayrollBreakdown summary={summary} />
                                                <PrintVoucherButton
                                                  summary={summary}
                                                  period={period}
                                                  company={company}
                                                  user={user}
                                                  userProfile={userProfile}
                                                  shifts={shifts}
                                                  settings={settings}
                                                  holidays={holidays}
                                                />

                                                <h4 className="font-semibold text-center mt-4 mb-2 border-t pt-4">Desglose por Día</h4>
                                                <div className="space-y-3">
                                                    {sortedDays.map(dayKey => {
                                                        const dayShifts = shiftsByDay[dayKey];
                                                        const firstShift = dayShifts[0];
                                                        let hoursWorkedOnThisDay = 0;

                                                        return (
                                                            <div key={dayKey} className="p-3 rounded-lg border bg-muted/50">
                                                                <p className="font-semibold mb-2">{format(new Date(dayKey), 'EEEE, dd MMM', { locale: es })}</p>
                                                                
                                                                {dayShifts.map(shift => {
                                                                    if(!settings) return null;
                                                                    const shiftSummary = calculateShiftSummary(shift, settings, holidays, hoursWorkedOnThisDay);
                                                                    hoursWorkedOnThisDay += shiftSummary.totalHours;

                                                                    return (
                                                                        <div key={shift.id} className="mb-2 last:mb-0">
                                                                            <Accordion type="single" collapsible className="w-full text-sm">
                                                                                <AccordionItem value={shift.id} className="border-b-0">
                                                                                    <AccordionTrigger className="py-1 hover:no-underline">
                                                                                        <div className="flex justify-between w-full pr-2">
                                                                                            <span>Turno {shift.startTime} - {shift.endTime}</span>
                                                                                            <span className="font-medium text-green-600">{formatCurrency(shiftSummary.grossPay)}</span>
                                                                                        </div>
                                                                                    </AccordionTrigger>
                                                                                    <AccordionContent className="pb-0">
                                                                                        <PayrollBreakdown summary={shiftSummary} />
                                                                                    </AccordionContent>
                                                                                </AccordionItem>
                                                                            </Accordion>
                                                                        </div>
                                                                    )
                                                                })}

                                                                {(firstShift.itemDetails && firstShift.itemDetails.length > 0) && (
                                                                    <div className="mt-2 pt-2 border-t border-dashed">
                                                                        <h5 className="text-xs font-bold text-muted-foreground uppercase">Detalles Adicionales</h5>
                                                                        {firstShift.itemDetails.map(detail => (
                                                                            <div key={detail.itemId} className="text-xs text-muted-foreground mt-1">
                                                                                <span className="font-semibold">{detail.itemName}:</span> {detail.detail}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {firstShift.notes && (
                                                                    <div className="mt-2 pt-2 border-t border-dashed">
                                                                        <h5 className="text-xs font-bold text-muted-foreground uppercase">Notas</h5>
                                                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{firstShift.notes}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No tienes historial de pagos todavía.</p>
                        )}
                    </div>
                </TabsContent>
                 <TabsContent value="general">
                    <div className="py-4">
                        {generalHistory.length > 0 ? (
                            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                                {generalHistory.map((item, index) => (
                                    <div key={`${item.id}-${index}`} className="p-3 rounded-lg border bg-muted/70">
                                        <div className="flex justify-between items-center font-semibold">
                                            <span>{format(new Date(item.date), 'PPP', { locale: es })}</span>
                                            <span className="text-green-600">{formatCurrency(item.summary.grossPay)}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground flex justify-between">
                                            <span>Turno: {item.startTime} - {item.endTime}</span>
                                            <span>{item.summary.totalHours} horas</span>
                                        </div>
                                        <PayrollBreakdown summary={item.summary} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No tienes turnos registrados.</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
