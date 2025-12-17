import type { Shift, CompanySettings, PayrollSummary } from '@/types/db-entities';
import { isHoliday } from './date-helpers';
import { startOfDay, endOfDay, isWithinInterval, addDays, getMonth, getYear, getDate } from 'date-fns';

const NIGHT_SHIFT_END_HOUR = 6;   // 6 AM
const DAILY_HOUR_LIMIT = 8;

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


export function calculateShiftSummary(shift: Shift, settings: CompanySettings, holidays: Date[]): PayrollSummary {
  const summary: PayrollSummary = {
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

  for (let i = 0; i < totalShiftMinutes; i++) {
    const currentMinuteTime = new Date(start.getTime() + i * 60 * 1000);
    const hourFraction = 1 / 60;
    
    const isCurrentMinuteHoliday = isHoliday(currentMinuteTime, holidays);
    const isNight = isNightHour(currentMinuteTime, nightShiftStartHour);
    const hoursSoFar = i / 60;
    const isOvertime = hoursSoFar >= DAILY_HOUR_LIMIT;
    
    // Determine rate and hour category
    if (isOvertime) {
        if(isCurrentMinuteHoliday) {
            if(isNight) {
                summary.holidayNightOvertimeHours += hourFraction;
                summary.holidayNightOvertimePay += (settings.holidayNightOvertimeRate || 0) * hourFraction;
            } else {
                summary.holidayDayOvertimeHours += hourFraction;
                summary.holidayDayOvertimePay += (settings.holidayDayOvertimeRate || 0) * hourFraction;
            }
        } else {
            if(isNight) {
                summary.nightOvertimeHours += hourFraction;
                summary.nightOvertimePay += (settings.nightOvertimeRate || 0) * hourFraction;
            } else {
                summary.dayOvertimeHours += hourFraction;
                summary.dayOvertimePay += (settings.dayOvertimeRate || 0) * hourFraction;
            }
        }
    } else { // Regular hours
        if(isCurrentMinuteHoliday) {
            if(isNight) {
                summary.holidayNightHours += hourFraction;
                summary.holidayNightPay += (settings.holidayNightRate || 0) * hourFraction;
            } else {
                summary.holidayDayHours += hourFraction;
                summary.holidayDayPay += (settings.holidayDayRate || 0) * hourFraction;
            }
        } else {
            if(isNight) {
                summary.nightHours += hourFraction;
                summary.nightPay += (settings.nightRate || 0) * hourFraction;
            } else {
                summary.dayHours += hourFraction;
                summary.dayPay += (settings.dayRate || 0) * hourFraction;
            }
        }
    }
  }

  summary.grossPay = summary.dayPay + summary.nightPay + summary.dayOvertimePay + summary.nightOvertimePay +
                     summary.holidayDayPay + summary.holidayNightPay + summary.holidayDayOvertimePay + summary.holidayNightOvertimePay;
  
  return summary;
}


export function calculatePeriodSummary(
  allShifts: Shift[],
  settings: CompanySettings,
  holidays: Date[],
  userId: string,
  companyId: string,
  selectedDate: Date
): PayrollSummary {
  const year = getYear(selectedDate);
  const month = getMonth(selectedDate);
  const day = getDate(selectedDate);

  let periodShifts: Shift[];

  if (settings.payrollCycle === 'bi-weekly') {
    const isFirstFortnight = day <= 15;
    periodShifts = allShifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shift.userId === userId &&
               shift.companyId === companyId &&
               getYear(shiftDate) === year &&
               getMonth(shiftDate) === month &&
               (isFirstFortnight ? getDate(shiftDate) <= 15 : getDate(shiftDate) > 15);
    });
  } else { // monthly
    periodShifts = allShifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shift.userId === userId &&
               shift.companyId === companyId &&
               getYear(shiftDate) === year &&
               getMonth(shiftDate) === month;
    });
  }

  const periodSummary: PayrollSummary = periodShifts.reduce((acc, shift) => {
    const shiftSummary = calculateShiftSummary(shift, settings, holidays);
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
  }, {
    totalHours: 0, grossPay: 0,
    dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
    holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
    dayPay: 0, nightPay: 0, dayOvertimePay: 0, nightOvertimePay: 0,
    holidayDayPay: 0, holidayNightPay: 0, holidayDayOvertimePay: 0, holidayNightOvertimePay: 0
  });

  return periodSummary;
}
