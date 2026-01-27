import type { Shift, CompanySettings, PayrollSummary, Benefit, Deduction } from '@/types/db-entities';
import { isHoliday, isWithinInterval } from './date-helpers';
import { startOfDay, endOfDay, endOfMonth } from 'date-fns';

const NIGHT_SHIFT_END_HOUR = 6;   // 6 AM

export function getPeriodDateRange(selectedDate: Date, payrollCycle: 'monthly' | 'bi-weekly'): { start: Date, end: Date } {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();

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

/**
 * Determines if a given time falls within the night shift hours.
 * @param dateTime The date and time to check.
 * @param nightShiftStartHour The hour (0-23) when the evening night shift begins.
 * @returns True if the time is considered night hours, false otherwise.
 */
function isNightHour(dateTime: Date, nightShiftStartHour: number) {
    const hour = dateTime.getHours();
    // Night is from 00:00 up to (but not including) 06:00.
    const isEarlyMorningNight = hour >= 0 && hour < NIGHT_SHIFT_END_HOUR;
    // And from the configured start hour (e.g., 19:00) to the end of the day.
    const isEveningNight = hour >= nightShiftStartHour;
    
    return isEarlyMorningNight || isEveningNight;
}

export function calculateShiftSummary(
    shift: Shift, 
    settings: CompanySettings, 
    holidays: Date[],
    hoursAlreadyWorkedOnDay: number = 0
): Omit<PayrollSummary, 'netPay' | 'totalBenefits' | 'totalDeductions' | 'benefitBreakdown' | 'deductionBreakdown' | 'daysWorked'> {
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

    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = shift.endTime.split(':').map(Number);

    let start = new Date(shift.date);
    start.setHours(startHour, startMinute, 0, 0);

    let end = new Date(shift.date);
    end.setHours(endHour, endMinute, 0, 0);

    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }
    
    const totalMilliseconds = end.getTime() - start.getTime();
    if (totalMilliseconds <= 0) {
        return summary;
    }

    const minuteBuckets = {
        day: 0, night: 0, dayOvertime: 0, nightOvertime: 0,
        holidayDay: 0, holidayNight: 0, holidayDayOvertime: 0, holidayNightOvertime: 0,
    };

    const nightShiftStartHour = settings.nightShiftStartHour ?? 21;
    const dailyHourLimit = settings.dailyHourLimit ?? 8;
    const minuteInMillis = 60 * 1000;
    const hourInMillis = 60 * minuteInMillis;

    let cursor = start.getTime();
    const endMillis = end.getTime();
    
    while (cursor < endMillis) {
        const currentMinuteTime = new Date(cursor);
        
        const hoursWorkedBeforeThisMinute = hoursAlreadyWorkedOnDay + ((cursor - start.getTime()) / hourInMillis);

        const isHolidayForMinute = isHoliday(currentMinuteTime, holidays);
        const isNightForMinute = isNightHour(currentMinuteTime, nightShiftStartHour);
        const isOvertimeForMinute = hoursWorkedBeforeThisMinute >= dailyHourLimit;
        
        if (isOvertimeForMinute) {
            if (isHolidayForMinute) {
                if (isNightForMinute) minuteBuckets.holidayNightOvertime++;
                else minuteBuckets.holidayDayOvertime++;
            } else {
                if (isNightForMinute) minuteBuckets.nightOvertime++;
                else minuteBuckets.dayOvertime++;
            }
        } else { // Regular hours
            if (isHolidayForMinute) {
                if (isNightForMinute) minuteBuckets.holidayNight++;
                else minuteBuckets.holidayDay++;
            } else {
                if (isNightForMinute) minuteBuckets.night++;
                else minuteBuckets.day++;
            }
        }
        
        cursor += minuteInMillis;
    }

    summary.totalHours = totalMilliseconds / hourInMillis;
    summary.dayHours = minuteBuckets.day / 60;
    summary.nightHours = minuteBuckets.night / 60;
    summary.dayOvertimeHours = minuteBuckets.dayOvertime / 60;
    summary.nightOvertimeHours = minuteBuckets.nightOvertime / 60;
    summary.holidayDayHours = minuteBuckets.holidayDay / 60;
    summary.holidayNightHours = minuteBuckets.holidayNight / 60;
    summary.holidayDayOvertimeHours = minuteBuckets.holidayDayOvertime / 60;
    summary.holidayNightOvertimeHours = minuteBuckets.holidayNightOvertime / 60;

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
      daysWorked: 0,
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

  periodSummary.daysWorked = Object.keys(shiftsByDay).length;

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
