
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

    const baseResult: Omit<ShiftCalculationResult, 'totalPayment'> = {
        totalHours: 0, dayHours: 0, nightHours: 0, dayOvertimeHours: 0, nightOvertimeHours: 0,
        holidayDayHours: 0, holidayNightHours: 0, holidayDayOvertimeHours: 0, holidayNightOvertimeHours: 0,
        isHoliday: false
    };

    if (paymentModel === 'production' && shift.itemId && shift.quantity) {
        const item = items.find(i => i.id === shift.itemId);
        const payment = (item?.value || 0) * shift.quantity;
        return { ...baseResult, totalPayment: payment };
    }

    if (paymentModel === 'hourly' && shift.startTime && shift.endTime) {
        const nightStartHour = rates.nightShiftStart ? parseInt(rates.nightShiftStart.split(':')[0], 10) : 21;
        const date = new Date(shift.date);
        
        const startDateTime = parseTime(date, shift.startTime);
        let endDateTime = parseTime(date, shift.endTime);

        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return { ...baseResult, totalPayment: 0 };
        }
        
        if (endDateTime <= startDateTime) {
            endDateTime = addDays(endDateTime, 1);
        }
        
        let workedHoursToday = 0;
        let currentMinute = new Date(startDateTime);

        while (currentMinute < endDateTime) {
            const dayOfCurrentMinute = currentMinute;
            const minuteIsHoliday = isHoliday(dayOfCurrentMinute);
            if(minuteIsHoliday) baseResult.isHoliday = true;

            const hour = currentMinute.getHours();
            const isNightHour = hour >= nightStartHour || hour < NIGHT_END_HOUR;

            const isOvertime = workedHoursToday >= NORMAL_WORK_HOURS_PER_DAY;

            if (isOvertime) {
                if(minuteIsHoliday) {
                    if(isNightHour) baseResult.holidayNightOvertimeHours += 1/60;
                    else baseResult.holidayDayOvertimeHours += 1/60;
                } else {
                    if(isNightHour) baseResult.nightOvertimeHours += 1/60;
                    else baseResult.dayOvertimeHours += 1/60;
                }
            } else { // Regular hours
                if(minuteIsHoliday) {
                    if(isNightHour) baseResult.holidayNightHours += 1/60;
                    else baseResult.holidayDayHours += 1/60;
                } else {
                    if(isNightHour) baseResult.nightHours += 1/60;
                    else baseResult.dayHours += 1/60;
                }
            }
            
            workedHoursToday += 1/60;
            currentMinute.setMinutes(currentMinute.getMinutes() + 1);
        }

        baseResult.totalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

        let totalPayment = 0;
        totalPayment += baseResult.dayHours * (rates.dayRate || 0);
        totalPayment += baseResult.nightHours * (rates.nightRate || 0);
        totalPayment += baseResult.dayOvertimeHours * (rates.dayOvertimeRate || 0);
        totalPayment += baseResult.nightOvertimeHours * (rates.nightOvertimeRate || 0);
        totalPayment += baseResult.holidayDayHours * (rates.holidayDayRate || 0);
        totalPayment += baseResult.holidayNightHours * (rates.holidayNightRate || 0);
        totalPayment += baseResult.holidayDayOvertimeHours * (rates.holidayDayOvertimeRate || 0);
        totalPayment += baseResult.holidayNightOvertimeHours * (rates.holidayNightOvertimeRate || 0);

        return { ...baseResult, totalPayment };
    }

    return { ...baseResult, totalPayment: 0 };
};

/**
 * Calculates the full payroll summary for a given period.
 */
export const calculatePayrollForPeriod = (input: PayrollInput): PayrollSummary => {
    const { shifts, periodSettings, periodDeductions, items } = input;
    
    let totalBasePayment = 0;
    let totalHoursInPeriod = 0;
    const daysWithShifts = new Set<string>();

    for (const shift of shifts) {
        daysWithShifts.add(format(new Date(shift.date), 'yyyy-MM-dd'));
        const details = calculateShiftDetails({ shift, rates: periodSettings, items });
        totalBasePayment += details.totalPayment;
        totalHoursInPeriod += details.totalHours;
    }
    
    const monthlyTransportSubsidy = periodSettings.transportSubsidy || 0;
    let totalTransportSubsidyForPeriod = 0;

    if (monthlyTransportSubsidy > 0 && shifts.length > 0) {
        const cycleDays = periodSettings.payrollCycle === 'monthly'
            ? lastDayOfMonth(new Date(shifts[0].date)).getDate()
            : 15; // Approximate days in a fortnight
        const dailySubsidy = monthlyTransportSubsidy / cycleDays;
        totalTransportSubsidyForPeriod = dailySubsidy * daysWithShifts.size;
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
        netPay,
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

    
    