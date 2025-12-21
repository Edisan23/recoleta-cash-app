import type { Shift, CompanySettings, PayrollSummary, Benefit, Deduction } from '@/types/db-entities';
import { isHoliday } from './date-helpers';
import { startOfDay, endOfDay, isWithinInterval, addDays, getMonth, getYear, getDate, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

const NIGHT_SHIFT_END_HOUR = 6;   // 6 AM

function getNightIntervals(date: Date, nightShiftStartHour: number) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  // Night period from 00:00 to 06:00 of the current day
  const nightInterval1Start = new Date(dayStart);
  const nightInterval1End = new Date(dayStart);
  nightInterval1End.setHours(NIGHT_SHIFT_END_HOUR);

  // Night period from start hour to 23:59:59 of the current day
  const nightInterval2Start = new Date(dayStart);
  nightInterval2Start.setHours(nightShiftStartHour);
  const nightInterval2End = new Date(dayEnd);

  return [
    { start: nightInterval1Start, end: nightInterval1End },
    { start: nightInterval2Start, end: nightInterval2End }
  ];
}

function isNightHour(dateTime: Date, nightShiftStartHour: number) {
    const intervals = getNightIntervals(dateTime, nightShiftStartHour);
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

  if (!shift.startTime || !shift.endTime || !settings) {
    return summary;
  }

  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);

  let start = new Date(shift.date);
  start.setHours(startHour, startMinute, 0, 0);

  let end = new Date(shift.date);
  end.setHours(endHour, endMinute, 0, 0);

  if (end <= start) {
    end = addDays(end, 1);
  }

  const totalShiftMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  summary.totalHours = totalShiftMinutes / 60;
  
  const nightShiftStartHour = settings.nightShiftStartHour ?? 21;
  const dailyHourLimit = settings.dailyHourLimit ?? 8;

  for (let i = 0; i < totalShiftMinutes; i++) {
    const currentMinuteTime = new Date(start.getTime() + i * 60 * 1000);
    const hourFraction = 1 / 60;
    
    const isCurrentMinuteHoliday = isHoliday(currentMinuteTime, holidays);
    const isNight = isNightHour(currentMinuteTime, nightShiftStartHour);
    
    // Check if the current minute is overtime
    const isOvertime = (hoursAlreadyWorkedOnDay + (i / 60)) >= dailyHourLimit;

    if (isOvertime) {
        if(isCurrentMinuteHoliday) {
            if(isNight) {
                summary.holidayNightOvertimeHours += hourFraction;
            } else {
                summary.holidayDayOvertimeHours += hourFraction;
            }
        } else {
            if(isNight) {
                summary.nightOvertimeHours += hourFraction;
            } else {
                summary.dayOvertimeHours += hourFraction;
            }
        }
    } else { // Regular hours
        if(isCurrentMinuteHoliday) {
            if(isNight) {
                summary.holidayNightHours += hourFraction;
            } else {
                summary.holidayDayHours += hourFraction;
            }
        } else {
            if(isNight) {
                summary.nightHours += hourFraction;
            } else {
                summary.dayHours += hourFraction;
            }
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

export function getPeriodDateRange(selectedDate: Date, payrollCycle: 'monthly' | 'bi-weekly'): { start: Date, end: Date } {
    const year = getYear(selectedDate);
    const month = getMonth(selectedDate);
    const day = getDate(selectedDate);

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
            start: startOfMonth(selectedDate),
            end: endOfMonth(selectedDate),
        };
    }
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

  const emptySummary: PayrollSummary = {
      totalHours: 0, grossPay: 0,
      dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
      holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
      dayPay: 0, nightPay: 0, dayOvertimePay: 0, nightOvertimePay: 0,
      holidayDayPay: 0, holidayNightPay: 0, holidayDayOvertimePay: 0, holidayNightOvertimePay: 0,
      netPay: 0, totalBenefits: 0, totalDeductions: 0,
      benefitBreakdown: [], deductionBreakdown: [],
  };

  const periodSummary: PayrollSummary = periodShifts.reduce((acc, shift) => {
    // For period summary, we don't need to track daily accumulated hours,
    // as each shift's contribution to overtime is already calculated based on its day.
    // However, for accuracy, we should recalculate based on daily totals.
    // This is a simplification; a more robust solution would group shifts by day first.
    const shiftSummary = calculateShiftSummary(shift, settings, holidays, 0); // Simplified call
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

    