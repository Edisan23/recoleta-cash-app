'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { es } from 'date-fns/locale';
import { startOfDay } from 'date-fns';
import { User } from 'firebase/auth';
import type { Company, Shift, CompanySettings, PayrollSummary } from '@/types/db-entities';
import { getPeriodDateRange, calculateShiftSummary } from '@/lib/payroll-calculator';
import { PayrollBreakdown } from './PayrollBreakdown';
import { HistoryDayDetail } from './HistoryDayDetail';
import { Badge } from '../ui/badge';


interface HistorySheetProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: User;
    company: Company;
    settings: CompanySettings;
    periodSummary: PayrollSummary;
    allShifts: Shift[];
    holidays: Date[];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}


export function HistorySheet({ isOpen, setIsOpen, user, company, settings, periodSummary, allShifts, holidays }: HistorySheetProps) {
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

    const period = useMemo(() => getPeriodDateRange(new Date(), settings.payrollCycle), [settings.payrollCycle]);

    const daysWithShifts = useMemo(() => allShifts.map(s => startOfDay(new Date(s.date))), [allShifts]);

    const selectedDaySummary = useMemo(() => {
        if (!selectedDay) return null;

        const shiftsForDay = allShifts.filter(s => startOfDay(new Date(s.date)).getTime() === startOfDay(selectedDay).getTime());
        if (shiftsForDay.length === 0) return null;

        let hoursAlreadyWorked = 0;
        const summaries = shiftsForDay.map(shift => {
            const summary = calculateShiftSummary(shift, settings, holidays, hoursAlreadyWorked);
            hoursAlreadyWorked += summary.totalHours;
            return summary;
        });

        return summaries.reduce((acc, summary) => {
            Object.keys(summary).forEach(key => {
                const typedKey = key as keyof typeof summary;
                (acc as any)[typedKey] = (acc[typedKey] || 0) + summary[typedKey];
            });
            return acc;
        });

    }, [selectedDay, allShifts, settings, holidays]);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-full max-w-none sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className='text-3xl'>Historial de Pago</SheetTitle>
                    <SheetDescription>
                        Resumen del período de pago actual. Selecciona un día en el calendario para ver el detalle.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-8 space-y-8">
                    {/* Period Summary */}
                    <div className="p-6 border-2 rounded-lg bg-card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">
                                {settings.payrollCycle === 'bi-weekly' ? 'Resumen Quincenal' : 'Resumen Mensual'}
                            </h3>
                             <Badge variant="outline">{`${period.start.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} - ${period.end.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Horas</p>
                                <p className="text-2xl font-bold">{periodSummary.totalHours}h</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pago Bruto</p>
                                <p className="text-2xl font-bold">{formatCurrency(periodSummary.grossPay)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pago Neto</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(periodSummary.netPay)}</p>
                            </div>
                        </div>
                        <PayrollBreakdown summary={periodSummary} />
                    </div>

                    {/* Daily Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="p-6 border-2 rounded-lg bg-card flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDay}
                                onSelect={setSelectedDay}
                                month={period.start}
                                fromMonth={period.start}
                                toMonth={period.end}
                                modifiers={{
                                    worked: daysWithShifts,
                                }}
                                modifiersClassNames={{
                                    worked: 'bg-primary/20 text-primary-foreground rounded-full',
                                }}
                                locale={es}
                            />
                        </div>
                        
                        <div className='sticky top-0'>
                            <HistoryDayDetail
                                selectedDay={selectedDay}
                                summary={selectedDaySummary}
                            />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
