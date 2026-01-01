'use client';
import type { Shift, CompanySettings, PayrollSummary, Benefit, Deduction } from '@/types/db-entities';
import { isHoliday } from './date-helpers';

const NIGHT_SHIFT_END_HOUR = 6;   // 6 AM

export function getPeriodDateRange(selectedDate: Date, payrollCycle: 'monthly' | 'bi-weekly'): { start: Date, end: Date } {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();

    const startOfDay = (date: Date) => new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = (date: Date) => new Date(date.setHours(23, 59, 59, 999));
    const endOfMonth = (date: Date) => endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));


    if (payrollCycle === 'bi-weekly') {
        if (day <= 15) {
            return {
                start: startOfDay(new Date(year, month, 1)),
                end: endOfDay(new Date(year, month, 15)),
            };
        } else {
            return {
                start: startOfDay(new Date(year, month, 16)),
                end: endOfMonth(selectedDate),
            };
        }
    } else { // monthly
        return {
            start: startOfDay(new Date(year, month, 1)),
            end: endOfMonth(selectedDate),
        };
    }
}

export function isWithinInterval(date: Date, interval: { start: Date; end: Date }): boolean {
    return date.getTime() >= interval.start.getTime() && date.getTime() <= interval.end.getTime();
}

function getNightIntervals(date: Date, nightShiftStartHour: number) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  
  // Night period from 00:00 to 06:00 of the current day
  const nightInterval1Start = new Date(dayStart);
  const nightInterval1End = new Date(dayStart);
  nightInterval1End.setHours(NIGHT_SHIFT_END_HOUR, 0, 0, 0);

  // Night period from start hour to 23:59:59 of the current day
  const nightInterval2Start = new Date(dayStart);
  nightInterval2Start.setHours(nightShiftStartHour, 0, 0, 0);
  const nightInterval2End = new Date(dayEnd);

  return [
    { start: nightInterval1Start, end: nightInterval1End },
    { start: nightInterval2Start, end: nightInterval2End }
  ];
}

function isNightHour(dateTime: Date, nightShiftStartHour: number) {
    const intervals = getNightIntervals(dateTime, nightShiftStartHour);
    // Check if the time falls into the early morning night shift or the evening night shift
    return isWithinInterval(dateTime, intervals[0]) || isWithinInterval(dateTime, intervals[1]);
}

export function calculateShiftSummary(
    shift: Shift, 
    settings: CompanySettings, 
    holidays: Date[],
    hoursAlreadyWorkedOnDay: number = 0
): Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown'> {
    const summary = {
        totalHours: 0,
        grossPay: 0,
        dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
        holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
        dayPay: 0, nightPay: 0, dayOvertimePay: 0, nightOvertimePay: 0,
        holidayDayPay: 0, holidayNightPay: 0, holidayDayOvertimePay: 0, holidayNightOvertimePay: 0,
    };

    if (!shift.startTime || !shift.endTime || !settings || !shift.startTime.includes(':') || !shift.endTime.includes(':')) {
        return summary;
    }

    const [startHour] = shift.startTime.split(':').map(Number);
    const [endHour] = shift.endTime.split(':').map(Number);

    let start = new Date(shift.date);
    start.setHours(startHour, 0, 0, 0);

    let end = new Date(shift.date);
    end.setHours(endHour, 0, 0, 0);

    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }
    
    const totalMilliseconds = end.getTime() - start.getTime();
    if (totalMilliseconds <= 0) {
        return summary;
    }
    const totalHours = Math.floor(totalMilliseconds / (1000 * 60 * 60));


    summary.totalHours = totalHours;

    const nightShiftStartHour = settings.nightShiftStartHour ?? 21;
    const dailyHourLimit = settings.dailyHourLimit ?? 8;

    for (let i = 0; i < totalHours; i++) {
        // We check the state at the beginning of each hour
        const currentHourTime = new Date(start.getTime() + i * 60 * 60 * 1000);
        
        const isCurrentHourHoliday = isHoliday(currentHourTime, holidays);
        const isNight = isNightHour(currentHourTime, nightShiftStartHour);
        const isOvertime = (hoursAlreadyWorkedOnDay + i) >= dailyHourLimit;

        if (isOvertime) {
            if(isCurrentHourHoliday) {
                if(isNight) summary.holidayNightOvertimeHours++;
                else summary.holidayDayOvertimeHours++;
            } else {
                if(isNight) summary.nightOvertimeHours++;
                else summary.dayOvertimeHours++;
            }
        } else { // Regular hours
            if(isCurrentHourHoliday) {
                if(isNight) summary.holidayNightHours++;
                else summary.holidayDayHours++;
            } else {
                if(isNight) summary.nightHours++;
                else summary.dayHours++;
            }
        }
    }

    // Calculate Pay based on categorized hours
    summary.dayPay = summary.dayHours * (settings.dayRate || 0);
    summary.nightPay = summary.nightHours * (settings.nightRate || 0);
    summary.dayOvertimePay = summary.dayOvertimeHours * (settings.dayOvertimeRate || 0);
    summary.nightOvertimePay = summary.nightOvertimeHours * (settings.nightOvertimeRate || 0);
    summary.holidayDayPay = summary.holidayDayHours * (settings.holidayDayRate || 0);
    summary.holidayNightPay = summary.holidayNightHours * (settings.holidayNightRate || 0);
    summary.holidayDayOvertimePay = summary.holidayDayOvertimeHours * (settings.holidayDayOvertimeRate || 0);
    summary.holidayNightOvertimePay = summary.holidayNightOvertimeHours * (settings.holidayNightOvertimeRate || 0);

    summary.grossPay = summary.dayPay + summary.nightPay + summary.dayOvertimePay + summary.nightOvertimePay +
                       summary.holidayDayPay + summary.holidayNightPay + summary.holidayDayOvertimePay + summary.holidayNightOvertimePay;
  
    return summary;
}

export function calculatePeriodSummary(
  allShifts: Shift[],
  settings: CompanySettings,
  holidays: Date[],
  benefits: Benefit[],
  deductions: Deduction[],
  userId: string,
  companyId: string,
  selectedDate: Date
): PayrollSummary {
  const period = getPeriodDateRange(selectedDate, settings.payrollCycle);

  const periodShifts = allShifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shift.userId === userId &&
               shift.companyId === companyId &&
               isWithinInterval(shiftDate, period);
    });
    
  // Group shifts by day to correctly calculate overtime
  const shiftsByDay: { [key: string]: Shift[] } = periodShifts.reduce((acc, shift) => {
    const dayKey = new Date(new Date(shift.date).setHours(0,0,0,0)).toISOString();
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(shift);
    return acc;
  }, {} as { [key: string]: Shift[] });

  const emptySummary: PayrollSummary = {
      totalHours: 0, grossPay: 0,
      dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
      holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
      dayPay: 0, nightPay: 0, dayOvertimePay: 0, nightOvertimePay: 0,
      holidayDayPay: 0, holidayNightPay: 0, holidayDayOvertimePay: 0, holidayNightOvertimePay: 0,
      netPay: 0, totalBenefits: 0, totalDeductions: 0,
      benefitBreakdown: [], deductionBreakdown: [],
  };

  const periodSummary = Object.values(shiftsByDay).reduce((acc, dayShifts) => {
    let hoursWorkedOnThisDay = 0;
    dayShifts.forEach(shift => {
        const shiftSummary = calculateShiftSummary(shift, settings, holidays, hoursWorkedOnThisDay);
        
        acc.totalHours += shiftSummary.totalHours;
        acc.grossPay += shiftSummary.grossPay;
        acc.dayHours += shiftSummary.dayHours;
        acc.nightHours += shiftSummary.nightHours;
        acc.dayOvertimeHours += shiftSummary.dayOvertimeHours;
        acc.nightOvertimeHours += shiftSummary.nightOvertimeHours;
        acc.holidayDayHours += shiftSummary.holidayDayHours;
        acc.holidayNightHours += shiftSummary.holidayNightHours;
        acc.holidayDayOvertimeHours += shiftSummary.holidayDayOvertimeHours;
        acc.holidayNightOvertimeHours += shiftSummary.holidayNightOvertimeHours;
        acc.dayPay += shiftSummary.dayPay;
        acc.nightPay += shiftSummary.nightPay;
        acc.dayOvertimePay += shiftSummary.dayOvertimePay;
        acc.nightOvertimePay += shiftSummary.nightOvertimePay;
        acc.holidayDayPay += shiftSummary.holidayDayPay;
        acc.holidayNightPay += shiftSummary.holidayNightPay;
        acc.holidayDayOvertimePay += shiftSummary.holidayDayOvertimePay;
        acc.holidayNightOvertimePay += shiftSummary.holidayNightOvertimePay;

        hoursWorkedOnThisDay += shiftSummary.totalHours;
    });
    return acc;
  }, { ...emptySummary });


  // Calculate Benefits
  for (const benefit of benefits) {
      let benefitValue = 0;
      if (benefit.type === 'fixed') {
          benefitValue = benefit.value;
      } else if (benefit.type === 'percentage') {
          benefitValue = periodSummary.grossPay * (benefit.value / 100);
      } else if (benefit.type === 'per-hour') {
          benefitValue = periodSummary.totalHours * benefit.value;
      }
      periodSummary.totalBenefits += benefitValue;
      periodSummary.benefitBreakdown.push({ name: benefit.name, value: benefitValue });
  }

  // Calculate Deductions
  for (const deduction of deductions) {
      let deductionValue = 0;
      if (deduction.type === 'fixed') {
          deductionValue = deduction.value;
      } else if (deduction.type === 'percentage') {
          deductionValue = periodSummary.grossPay * (deduction.value / 100);
      }
      periodSummary.totalDeductions += deductionValue;
      periodSummary.deductionBreakdown.push({ name: deduction.name, value: deductionValue });
  }
  
  periodSummary.netPay = periodSummary.grossPay + periodSummary.totalBenefits - periodSummary.totalDeductions;

  return periodSummary;
}
