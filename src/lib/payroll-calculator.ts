import { CompanySettings } from "@/types/db-entities";
import { parse, set, addDays, getDay, isSameDay, lastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// --- CONFIGURATIONS ---
const NIGHT_END_HOUR = 6;   // 6 AM
const NORMAL_WORK_HOURS_PER_DAY = 8;

// Source: https://www.festivos.com.co/2024
const COLOMBIAN_HOLIDAYS_2024 = [
    '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
    '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
    '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
    '2024-11-11', '2024-12-08', '2024-12-25'
].map(d => parse(d, 'yyyy-MM-dd', new Date()));

const isHoliday = (date: Date): boolean => {
    // Sunday is a holiday
    if (getDay(date) === 0) return true;
    // Check against the list of holidays
    return COLOMBIAN_HOLIDAYS_2024.some(holiday => isSameDay(date, holiday));
};


// --- INTERFACES ---
interface ShiftInput {
    date: Date;
    startTime: string; // "HH:mm" format
    endTime: string;   // "HH:mm" format
    rates: Partial<CompanySettings>;
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
    transportSubsidyApplied: number;
}


// --- MAIN CALCULATION FUNCTION ---
export const calculateShiftDetails = (input: ShiftInput): ShiftCalculationResult => {
    const { date, startTime, endTime, rates } = input;
    const nightStartHour = rates.nightShiftStart ? parseInt(rates.nightShiftStart.split(':')[0], 10) : 21;


    // 1. Parse Times and Handle Invalid Input
    const startDateTime = parseTime(date, startTime);
    let endDateTime = parseTime(date, endTime);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Formato de hora inválido. Usa HH:mm.");
    }
    
    // Handle overnight shifts
    if (endDateTime <= startDateTime) {
        endDateTime = addDays(endDateTime, 1);
    }
    
    const result: ShiftCalculationResult = {
        totalHours: 0, dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
        holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
        isHoliday: false, totalPayment: 0, transportSubsidyApplied: 0
    };

    let workedHoursToday = 0;

    // 2. Iterate through each minute of the shift
    let currentMinute = new Date(startDateTime);
    while (currentMinute < endDateTime) {
        const dayOfCurrentMinute = currentMinute;
        const minuteIsHoliday = isHoliday(dayOfCurrentMinute);
        if(minuteIsHoliday) result.isHoliday = true;

        const hour = currentMinute.getHours();
        const isNightHour = hour >= nightStartHour || hour < NIGHT_END_HOUR;

        const hourTypeKey = `${minuteIsHoliday ? 'holiday' : 'normal'}_${isNightHour ? 'night' : 'day'}`;

        if (workedHoursToday < NORMAL_WORK_HOURS_PER_DAY) {
            // Regular hours
            if (hourTypeKey === 'normal_day') result.dayHours += 1/60;
            else if (hourTypeKey === 'normal_night') result.nightHours += 1/60;
            else if (hourTypeKey === 'holiday_day') result.holidayDayHours += 1/60;
            else if (hourTypeKey === 'holiday_night') result.holidayNightHours += 1/60;
        } else {
            // Overtime hours
            if (hourTypeKey === 'normal_day') result.dayOvertimeHours += 1/60;
            else if (hourTypeKey === 'normal_night') result.nightOvertimeHours += 1/60;
            else if (hourTypeKey === 'holiday_day') result.holidayDayOvertimeHours += 1/60;
            else if (hourTypeKey === 'holiday_night') result.holidayNightOvertimeHours += 1/60;
        }
        
        workedHoursToday += 1/60;
        currentMinute.setMinutes(currentMinute.getMinutes() + 1);
    }

    result.totalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    // 3. Calculate Payment
    let paymentForHours = 0;
    paymentForHours += result.dayHours * (rates.dayRate || 0);
    paymentForHours += result.nightHours * (rates.nightRate || 0);
    paymentForHours += result.dayOvertimeHours * (rates.dayOvertimeRate || 0);
    paymentForHours += result.nightOvertimeHours * (rates.nightOvertimeRate || 0);
    paymentForHours += result.holidayDayHours * (rates.holidayDayRate || 0);
    paymentForHours += result.holidayNightHours * (rates.holidayNightRate || 0);
    paymentForHours += result.holidayDayOvertimeHours * (rates.holidayDayOvertimeRate || 0);
    paymentForHours += result.holidayNightOvertimeHours * (rates.holidayNightOvertimeRate || 0);
    
    // Add transport subsidy for the shift if applicable
    const dailyTransportSubsidy = (rates.transportSubsidy || 0) / (rates.payrollCycle === 'monthly' ? lastDayOfMonth(date).getDate() : 15);
    if(rates.transportSubsidy && rates.transportSubsidy > 0) {
        result.transportSubsidyApplied = dailyTransportSubsidy;
    }

    result.totalPayment = paymentForHours + result.transportSubsidyApplied;

    return result;
};


// --- HELPER FUNCTIONS ---
const parseTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
};

export const getPeriodKey = (date: Date, cycle: 'monthly' | 'fortnightly' = 'fortnightly'): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-indexed month
    if (cycle === 'monthly') {
      return `${year}-${month}`;
    }
    const dayOfMonth = date.getDate();
    const fortnight = dayOfMonth <= 15 ? 1 : 2;
    return `${year}-${month}-${fortnight}`;
  };

export const getPeriodDescription = (periodKey: string, cycle: 'monthly' | 'fortnightly' = 'fortnightly'): string => {
    const parts = periodKey.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleDateString('es-CO', { month: 'long' });

    if (cycle === 'monthly') {
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    }

    const fortnight = parseInt(parts[2]);
    if (fortnight === 1) {
        return `1-15 de ${monthName} ${year}`;
    } else {
        const lastDay = lastDayOfMonth(date).getDate();
        return `16-${lastDay} de ${monthName} ${year}`;
    }
};