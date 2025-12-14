
import { CompanySettings, Shift, CompanyItem, OperatorDeductions } from "@/types/db-entities";
import { parse, set, addDays, getDay, isSameDay, lastDayOfMonth, format } from 'date-fns';

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
    // Sunday is a holiday by law
    if (getDay(date) === 0) return true;
    // Check against the list of official holidays
    return COLOMBIAN_HOLIDAYS_2024.some(holiday => isSameDay(date, holiday));
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
}

export interface PayrollSummary {
    grossPay: number;
    netPay: number;
    totalHours: number;
    totalBasePayment: number;
    legalDeductions: {
        health: number;
        pension: number;
        arl: number;
        familyCompensation: number;
        solidarityFund: number;
        taxWithholding: number;
    },
    voluntaryDeductions: {
        union: number;
        cooperative: number;
        loan: number;
    },
    subsidies: {
        transport: number;
    },
}

interface PayrollInput {
    shifts: Shift[];
    periodSettings: Partial<CompanySettings>;
    periodDeductions: Partial<OperatorDeductions>;
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
        totalPayment: 0
    };

    if (paymentModel === 'production' && shift.itemId && shift.quantity) {
        const item = items.find(i => i.id === shift.itemId);
        result.totalPayment = (item?.value || 0) * shift.quantity;
        return result;
    }

    if (paymentModel === 'hourly' && shift.startTime && shift.endTime) {
        const nightStartHour = rates.nightShiftStart ? parseInt(rates.nightShiftStart.split(':')[0], 10) : 21;
        const date = new Date(shift.date);
        
        const startDateTime = parseTime(date, shift.startTime);
        let endDateTime = parseTime(date, shift.endTime);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return result;
        }
        
        if (endDateTime <= startDateTime) {
            endDateTime = addDays(endDateTime, 1);
        }
        
        result.totalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

        let workedHoursOnDay = 0;
        let currentMinute = new Date(startDateTime);

        while (currentMinute < endDateTime) {
            const minuteDate = currentMinute;
            const hour = minuteDate.getHours();
            
            const minuteIsHoliday = isHoliday(minuteDate);
            if (minuteIsHoliday) result.isHoliday = true;

            const isNightHour = hour >= nightStartHour || hour < NIGHT_END_HOUR;
            const isOvertime = workedHoursOnDay >= NORMAL_WORK_HOURS_PER_DAY;
            const increment = 1 / 60;

            if (isOvertime) {
                if (minuteIsHoliday) {
                    if (isNightHour) result.holidayNightOvertimeHours += increment;
                    else result.holidayDayOvertimeHours += increment;
                } else {
                    if (isNightHour) result.nightOvertimeHours += increment;
                    else result.dayOvertimeHours += increment;
                }
            } else { // Regular hours
                if (minuteIsHoliday) {
                    if (isNightHour) result.holidayNightHours += increment;
                    else result.holidayDayHours += increment;
                } else {
                    if (isNightHour) result.nightHours += increment;
                    else result.dayHours += increment;
                }
            }
            
            workedHoursOnDay += increment;
            currentMinute.setMinutes(currentMinute.getMinutes() + 1);
        }

        result.totalPayment = 
            (result.dayHours * (rates.dayRate || 0)) +
            (result.nightHours * (rates.nightRate || 0)) +
            (result.dayOvertimeHours * (rates.dayOvertimeRate || 0)) +
            (result.nightOvertimeHours * (rates.nightOvertimeRate || 0)) +
            (result.holidayDayHours * (rates.holidayDayRate || 0)) +
            (result.holidayNightHours * (rates.holidayNightRate || 0)) +
            (result.holidayDayOvertimeHours * (rates.holidayDayOvertimeRate || 0)) +
            (result.holidayNightOvertimeHours * (rates.holidayNightOvertimeRate || 0));

        return result;
    }

    return result;
};


/**
 * Calculates the full payroll summary for a given period.
 */
export const calculatePayrollForPeriod = (input: PayrollInput): PayrollSummary => {
    const { shifts, periodSettings, periodDeductions, items } = input;
    
    let totalBasePayment = 0;
    let totalHoursInPeriod = 0;

    for (const shift of shifts) {
        const details = calculateShiftDetails({ shift, rates: periodSettings, items });
        totalBasePayment += details.totalPayment;
        totalHoursInPeriod += details.totalHours;
    }
    
    let totalTransportSubsidyForPeriod = 0;
    const monthlyTransportSubsidy = periodSettings.transportSubsidy || 0;
    
    if (monthlyTransportSubsidy > 0 && shifts.length > 0) {
        const cycle = periodSettings.payrollCycle || 'fortnightly';
        if (cycle === 'monthly') {
            totalTransportSubsidyForPeriod = monthlyTransportSubsidy;
        } else { // fortnightly
            totalTransportSubsidyForPeriod = monthlyTransportSubsidy / 2;
        }
    }

    const grossPay = totalBasePayment + totalTransportSubsidyForPeriod;

    const healthDeductionAmount = grossPay * ((periodSettings.healthDeduction || 0) / 100);
    const pensionDeductionAmount = grossPay * ((periodSettings.pensionDeduction || 0) / 100);
    const arlDeductionAmount = grossPay * ((periodSettings.arlDeduction || 0) / 100);
    const familyCompensationAmount = grossPay * ((periodSettings.familyCompensationDeduction || 0) / 100);
    const solidarityFundAmount = grossPay * ((periodSettings.solidarityFundDeduction || 0) / 100);
    const taxWithholdingAmount = grossPay * ((periodSettings.taxWithholding || 0) / 100);
    const totalLegalDeductions = healthDeductionAmount + pensionDeductionAmount + arlDeductionAmount + familyCompensationAmount + solidarityFundAmount + taxWithholdingAmount;

    const unionFee = periodDeductions.unionFeeDeduction || 0;
    const cooperativeFee = periodDeductions.cooperativeDeduction || 0;
    const loanFee = periodDeductions.loanDeduction || 0;
    const totalVoluntaryDeductions = unionFee + cooperativeFee + loanFee;

    const netPay = grossPay - totalLegalDeductions - totalVoluntaryDeductions;
    
    return {
        grossPay,
        netPay: Math.max(0, netPay), // Ensure net pay is not negative
        totalHours: totalHoursInPeriod,
        totalBasePayment,
        legalDeductions: {
            health: healthDeductionAmount,
            pension: pensionDeductionAmount,
            arl: arlDeductionAmount,
            familyCompensation: familyCompensationAmount,
            solidarityFund: solidarityFundAmount,
            taxWithholding: taxWithholdingAmount,
        },
        voluntaryDeductions: {
            union: unionFee,
            cooperative: cooperativeFee,
            loan: loanFee,
        },
        subsidies: {
            transport: totalTransportSubsidyForPeriod,
        },
    };
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
    const monthName = date.toLocaleString('es-CO', { month: 'long' });

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

