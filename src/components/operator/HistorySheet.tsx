'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getPeriodDateRange, calculatePeriodSummary } from '@/lib/payroll-calculator';
import type { Shift, CompanySettings, PayrollSummary, Benefit, Deduction } from '@/types/db-entities';
import { User } from 'firebase/auth';
import { PayrollBreakdown } from './PayrollBreakdown';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistorySheetProps {
    allShifts: Shift[];
    settings: CompanySettings | null;
    holidays: Date[];
    benefits: Benefit[];
    deductions: Deduction[];
    user: User | null;
    companyId: string;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function HistorySheet({ allShifts, settings, holidays, benefits, deductions, user, companyId }: HistorySheetProps) {

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
            return { period, summary };
        });
    }, [payrollPeriods, settings, holidays, benefits, deductions, user, companyId]);

    return (
        <div className="space-y-4 h-full overflow-y-auto">
             <Card className="rounded-none border-0 border-b shadow-none">
                <CardHeader>
                    <CardTitle>Historial de Pagos</CardTitle>
                    <CardDescription>Resumen de tus períodos de pago anteriores.</CardDescription>
                </CardHeader>
             </Card>
             <CardContent>
                {periodSummaries.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {periodSummaries.map(({ period, summary }) => (
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
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No tienes historial de pagos todavía.</p>
                )}
            </CardContent>
        </div>
    );
}
