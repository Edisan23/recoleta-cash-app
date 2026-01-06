'use client';

import { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import type { Shift, CompanySettings, PayrollSummary, Benefit, Deduction } from '@/types/db-entities';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { calculatePeriodSummary, getPeriodDateRange } from '@/lib/payroll-calculator';
import { format, startOfMonth, addMonths, subMonths, getWeeksInMonth, startOfWeek, endOfWeek, addDays, getDaysInMonth, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { PayrollBreakdown } from './PayrollBreakdown';
import { Calendar } from '../ui/calendar';
import { calculateShiftSummary } from '@/lib/payroll-calculator';
import { HistoryDayDetail } from './HistoryDayDetail';

interface HistorySheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: User;
  settings: CompanySettings;
  allShifts: Shift[];
  holidays: Date[];
  benefits: Benefit[];
  deductions: Deduction[];
  companyId: string;
}

const generatePeriods = (allShifts: Shift[], settings: CompanySettings) => {
    if (allShifts.length === 0) return [];
    
    const sortedShifts = allShifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstShiftDate = new Date(sortedShifts[0].date);
    const lastShiftDate = new Date(sortedShifts[sortedShifts.length - 1].date);
    
    const periods: { start: Date, end: Date }[] = [];
    let current = startOfMonth(firstShiftDate);

    while (current <= lastShiftDate) {
        if (settings.payrollCycle === 'monthly') {
            const period = getPeriodDateRange(current, 'monthly');
            periods.push(period);
            current = addMonths(current, 1);
        } else { // bi-weekly
            const firstHalf = { start: startOfDay(new Date(current.getFullYear(), current.getMonth(), 1)), end: startOfDay(new Date(current.getFullYear(), current.getMonth(), 15))};
            const secondHalf = { start: startOfDay(new Date(current.getFullYear(), current.getMonth(), 16)), end: startOfDay(new Date(current.getFullYear(), current.getMonth() + 1, 0))};
            
            // Check if there are any shifts in the first half
            if(allShifts.some(s => isWithinPeriod(new Date(s.date), firstHalf))) {
                periods.push(firstHalf);
            }
             // Check if there are any shifts in the second half
            if(allShifts.some(s => isWithinPeriod(new Date(s.date), secondHalf))) {
                 periods.push(secondHalf);
            }
            current = addMonths(current, 1);
        }
    }
    return periods.reverse(); // Show most recent first
}

const isWithinPeriod = (date: Date, period: { start: Date; end: Date }) => {
    const time = date.getTime();
    return time >= period.start.getTime() && time <= new Date(period.end).setHours(23, 59, 59, 999);
}

export function HistorySheet({ isOpen, setIsOpen, user, settings, allShifts, holidays, benefits, deductions, companyId }: HistorySheetProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: Date, end: Date } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const availablePeriods = useMemo(() => generatePeriods(allShifts, settings), [allShifts, settings]);

  const periodSummary = useMemo(() => {
    if (!selectedPeriod) return null;
    // We pass a date from within the period to the calculator
    return calculatePeriodSummary(allShifts, settings, holidays, benefits, deductions, user.uid, companyId, selectedPeriod.start);
  }, [selectedPeriod, allShifts, settings, holidays, benefits, deductions, user.uid, companyId]);

  const shiftsInPeriod = useMemo(() => {
    if (!selectedPeriod) return [];
    return allShifts.filter(s => isWithinPeriod(new Date(s.date), selectedPeriod));
  }, [selectedPeriod, allShifts]);

  const shiftDaysInPeriod = useMemo(() => shiftsInPeriod.map(s => new Date(s.date)), [shiftsInPeriod]);

  const dailyDetail = useMemo(() => {
    if (!selectedDay || !selectedPeriod) return null;
    
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
      });
      return { summary: totalSummary, shiftsForDay: shiftsForDay };
    }
    return { summary: null, shiftsForDay: [] };

  }, [selectedDay, selectedPeriod, allShifts, settings, holidays]);

  const handlePeriodSelect = (period: { start: Date, end: Date }) => {
    setSelectedPeriod(period);
    setSelectedDay(undefined); // Reset day when period changes
  }
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Historial de Períodos</SheetTitle>
          <SheetDescription>
            Consulta el resumen y detalle de tus períodos de pago anteriores.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full pt-4">
            {/* Periods List */}
            <div className="md:col-span-1 border-r pr-4">
                <h3 className="font-semibold mb-2 text-center md:text-left">Selecciona un Período</h3>
                <ScrollArea className="h-full max-h-[75vh] md:max-h-full">
                    <div className="space-y-2">
                    {availablePeriods.length > 0 ? availablePeriods.map((period, index) => (
                        <Button
                            key={index}
                            variant={selectedPeriod?.start.getTime() === period.start.getTime() ? 'secondary' : 'ghost'}
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => handlePeriodSelect(period)}
                        >
                           <div>
                             <p className="font-semibold capitalize">
                                {format(period.start, 'MMMM yyyy', { locale: es })}
                             </p>
                             <p className="text-sm text-muted-foreground">
                                {format(period.start, 'dd MMM', { locale: es })} - {format(period.end, 'dd MMM', { locale: es })}
                             </p>
                           </div>
                        </Button>
                    )) : (
                        <p className='text-sm text-muted-foreground text-center py-10'>No hay períodos con turnos registrados.</p>
                    )}
                    </div>
                </ScrollArea>
            </div>
            {/* Period Details */}
            <div className="md:col-span-2">
                 <ScrollArea className="h-full max-h-[75vh] md:max-h-full">
                    {selectedPeriod && periodSummary ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold">Resumen del Período</h3>
                                 <p className="text-sm text-muted-foreground capitalize">
                                    {format(selectedPeriod.start, "d 'de' MMMM", { locale: es })} - {format(selectedPeriod.end, "d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                                <PayrollBreakdown summary={periodSummary} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Detalle por Día</h3>
                                <p className="text-sm text-muted-foreground">
                                    Selecciona un día en el calendario para ver su detalle.
                                </p>
                                <div className="flex justify-center mt-2">
                                     <Calendar 
                                        mode="single"
                                        selected={selectedDay}
                                        onSelect={setSelectedDay}
                                        month={selectedPeriod.start}
                                        disabled={(date) => date < selectedPeriod.start || date > selectedPeriod.end }
                                        modifiers={{ highlighted: shiftDaysInPeriod }}
                                        modifiersClassNames={{ highlighted: 'bg-primary/20 rounded-full' }}
                                        locale={es}
                                    />
                                </div>
                                {selectedDay && (
                                    <HistoryDayDetail summary={dailyDetail?.summary || null} shiftsForDay={dailyDetail?.shiftsForDay || []} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-10">
                            <p>Selecciona un período de la lista para ver su detalle.</p>
                        </div>
                    )}
                 </ScrollArea>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

