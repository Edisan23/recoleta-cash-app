

import { CompanySettings, Shift, CompanyItem } from "@/types/db-entities";
import { parse, addDays, getDay, isSameDay, lastDayOfMonth, startOfDay } from 'date-fns';

// --- CONFIGURATIONS ---
const NIGHT_END_HOUR = 6;   // 6 AM
const DEFAULT_NORMAL_WORK_HOURS_PER_DAY = 8;

// Source: https://www.festivos.com.co/2024
const COLOMBIAN_HOLIDAYS_2024 = [
    '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
    '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
    '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
    '2024-11-11', '2024-12-08', '2024-12-25'
].map(d => parse(d, 'yyyy-MM-dd', new Date()));

const HOLIDAYS_DB_KEY = 'fake_holidays_db';

const getManualHolidays = (): Date[] => {
    if (typeof window === 'undefined') return [];
    try {
        const storedHolidays = localStorage.getItem(HOLIDAYS_DB_KEY);
        if (storedHolidays) {
            const holidayStrings: string[] = JSON.parse(storedHolidays);
            return holidayStrings.map(dateString => new Date(dateString));
        }
    } catch (e) {
        console.error("Failed to load manual holidays from localStorage", e);
    }
    return [];
};


const isHoliday = (date: Date): boolean => {
    const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (dayOfWeek === 0) {
        return true;
    }

    const isOfficialHoliday = COLOMBIAN_HOLIDAYS_2024.some(holiday => isSameDay(date, holiday));
    if (dayOfWeek === 1 && isOfficialHoliday) {
        return true;
    }

    const manualHolidays = getManualHolidays();
    const today = startOfDay(date);
    const isManualHoliday = manualHolidays.some(manualHoliday => isSameDay(today, startOfDay(manualHoliday)));
    if (isManualHoliday) {
        return true;
    }
    
    if (dayOfWeek !== 1 && isOfficialHoliday) {
        return true;
    }

    return false;
};


// --- INTERFACES ---
interface ShiftInput {
    shift: Shift;
    rates: Partial<CompanySettings>;
    items: CompanyItem[];
}

export interface ShiftCalculationResult {
    totalHours: number;
    dayHours: number;
    nightHours: number;
    dayOvertimeHours: number;
    nightOvertimeHours: number;
    holidayDayHours: number;
    holidayNightHours: number;
    holidayDayOvertimeHours: number;
    holidayNightOvertimeHours: number;
    isHoliday: boolean;
    totalPayment: number;
    // Payment breakdowns
    dayPayment: number;
    nightPayment: number;
    dayOvertimePayment: number;
    nightOvertimePayment: number;
    holidayDayPayment: number;
    holidayNightPayment: number;
    holidayDayOvertimePayment: number;
    holidayNightOvertimePayment: number;
}

export interface PayrollSummary {
    grossPay: number;
    netPay: number;
    totalHours: number;
    totalBasePayment: number;
}

interface PayrollInput {
    shifts: Shift[];
    periodSettings: Partial<CompanySettings>;
    items: CompanyItem[];
}


// --- MAIN CALCULATION FUNCTIONS ---

/**
 * Calculates the payment details for a SINGLE shift.
 */
export const calculateShiftDetails = (input: ShiftInput): ShiftCalculationResult => {
    const { shift, rates, items } = input;
    const paymentModel = rates.paymentModel || 'hourly';

    const result: ShiftCalculationResult = {
        totalHours: 0, dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
        holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
        isHoliday: false,
        totalPayment: 0,
        dayPayment: 0, nightPayment: 0, dayOvertimePayment: 0, nightOvertimePayment: 0,
        holidayDayPayment: 0, holidayNightPayment: 0, holidayDayOvertimePayment: 0, holidayNightOvertimePayment: 0
    };

    if (paymentModel === 'production' && shift.itemId && shift.quantity) {
        const item = items.find(i => i.id === shift.itemId);
        result.totalPayment = (item?.value || 0) * shift.quantity;
        return result;
    }

    if (paymentModel === 'hourly' && shift.startTime && shift.endTime) {
        const shiftDate = parse(shift.date.substring(0, 10), 'yyyy-MM-dd', new Date());

        if (isNaN(shiftDate.getTime())) {
            console.error("Invalid shift date provided:", shift.date);
            return result;
        }
        
        const nightStartHour = rates.nightShiftStart ? parseInt(rates.nightShiftStart.split(':')[0], 10) : 21;
        const normalWorkHours = rates.normalWorkHours || DEFAULT_NORMAL_WORK_HOURS_PER_DAY;
        const shiftIsHoliday = isHoliday(shiftDate);
        result.isHoliday = shiftIsHoliday;

        const startDateTime = parseTime(shiftDate, shift.startTime);
        let endDateTime = parseTime(shiftDate, shift.endTime);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return result;
        }
        
        if (endDateTime <= startDateTime) {
            endDateTime = addDays(endDateTime, 1);
        }
        
        let workedHoursOnDay = 0;
        let currentMinute = new Date(startDateTime);

        while (currentMinute < endDateTime) {
            const hour = currentMinute.getHours();
            const isNightHour = hour >= nightStartHour || hour < NIGHT_END_HOUR;
            const isOvertime = workedHoursOnDay >= normalWorkHours;
            const increment = 1 / 60; 

            if (shiftIsHoliday) {
                if(isOvertime) {
                    if (isNightHour) result.holidayNightOvertimeHours += increment;
                    else result.holidayDayOvertimeHours += increment;
                } else {
                    if (isNightHour) result.holidayNightHours += increment;
                    else result.holidayDayHours += increment;
                }
            } else {
                 if(isOvertime) {
                    if (isNightHour) result.nightOvertimeHours += increment;
                    else result.dayOvertimeHours += increment;
                } else {
                    if (isNightHour) result.nightHours += increment;
                    else result.dayHours += increment;
                }
            }
            
            workedHoursOnDay += increment;
            currentMinute.setMinutes(currentMinute.getMinutes() + 1);
        }

        result.totalHours = workedHoursOnDay;
        
        result.dayPayment = result.dayHours * (rates.dayRate || 0);
        result.nightPayment = result.nightHours * (rates.nightRate || 0);
        result.dayOvertimePayment = result.dayOvertimeHours * (rates.dayOvertimeRate || 0);
        result.nightOvertimePayment = result.nightOvertimeHours * (rates.nightOvertimeRate || 0);
        result.holidayDayPayment = result.holidayDayHours * (rates.holidayDayRate || 0);
        result.holidayNightPayment = result.holidayNightHours * (rates.holidayNightRate || 0);
        result.holidayDayOvertimePayment = result.holidayDayOvertimeHours * (rates.holidayDayOvertimeRate || 0);
        result.holidayNightOvertimePayment = result.holidayNightOvertimeHours * (rates.holidayNightOvertimeRate || 0);

        result.totalPayment = 
            result.dayPayment +
            result.nightPayment +
            result.dayOvertimePayment +
            result.nightOvertimePayment +
            result.holidayDayPayment +
            result.holidayNightPayment +
            result.holidayDayOvertimePayment +
            result.holidayNightOvertimePayment;


        return result;
    }

    return result;
};


/**
 * Calculates the full payroll summary for a given period.
 */
export const calculatePayrollForPeriod = (input: PayrollInput): PayrollSummary => {
    const { shifts, periodSettings, items } = input;
    
    let totalBasePayment = 0;
    let totalHoursInPeriod = 0;

    for (const shift of shifts) {
        const details = calculateShiftDetails({ shift, rates: periodSettings, items });
        totalBasePayment += details.totalPayment;
        totalHoursInPeriod += details.totalHours;
    }
    
    return {
        grossPay: totalBasePayment,
        netPay: totalBasePayment,
        totalHours: totalHoursInPeriod,
        totalBasePayment,
    };
};


// --- HELPER FUNCTIONS ---
const parseTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
};

export const getPeriodKey = (date: Date, cycle: 'monthly' | 'fortnightly' = 'fortnightly'): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; 
    if (cycle === 'monthly') {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    const dayOfMonth = date.getDate();
    const fortnight = dayOfMonth <= 15 ? 1 : 2;
    return `${year}-${String(month).padStart(2, '0')}-${fortnight}`;
  };

export const getPeriodDescription = (periodKey: string, cycle: 'monthly' | 'fortnightly' = 'fortnightly'): string => {
    const parts = periodKey.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('es-CO', { month: 'long' });

    if (cycle === 'monthly') {
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    }

    const fortnight = parseInt(parts[2]);
    if (fortnight === 1) {
        return `1-15 de ${monthName} de ${year}`;
    } else {
        const lastDay = lastDayOfMonth(date).getDate();
        return `16-${lastDay} de ${monthName} de ${year}`;
    }
};

