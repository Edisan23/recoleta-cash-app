
// This file is auto-generated, do not edit.

export type User = {
    id: string; // Unique identifier for the user.
    name: string; // The user's full name.
    email: string; // The user's email address.
    role: "operator" | "admin"; // The user's role within the application (e.g., operator, admin).
    companyId?: string; // The ID of the company the user belongs to.
    createdAt: string; // The timestamp when the user account was created.
    paymentStatus: "trial" | "paid" | "blocked"; // The payment status of the user's account.
  };
  
  export type Company = {
    id: string; // Unique identifier for the company.
    name: string; // The name of the company.
    logoUrl?: string; // URL of the company's logo.
    isActive: boolean; // Whether the company is active or not.
    themeColor?: string; // A hex color code for the company's theme.
  };

  export type CompanySettings = {
    id: string; // Corresponds to companyId
    paymentModel: 'hourly' | 'production';
    payrollCycle: 'monthly' | 'bi-weekly';
    nightShiftStartHour?: number; // The hour (0-23) when the night shift begins.
    dayRate?: number;
    nightRate?: number;
    dayOvertimeRate?: number;
    nightOvertimeRate?: number;
    holidayDayRate?: number;
    holidayNightRate?: number;
    holidayDayOvertimeRate?: number;
    holidayNightOvertimeRate?: number;
  };
    
  export type Shift = {
    id: string;
    userId: string;
    companyId: string;
    date: string;
    // For hourly model
    startTime?: string;
    endTime?: string;
    // For production model
    itemId?: string;
    quantity?: number;
    supervisor?: string;
  };
  
  export type Payroll = {
    id: string;
    userId: string;
    companyId: string;
    periodStart: string;
    periodEnd: string;
  };
  
  export interface PayrollBreakdown {
    dayHours: number;
    nightHours: number;
    dayOvertimeHours: number;
    nightOvertimeHours: number;
    holidayDayHours: number;
    holidayNightHours: number;
    holidayDayOvertimeHours: number;
    holidayNightOvertimeHours: number;
    dayPay: number;
    nightPay: number;
    dayOvertimePay: number;
    nightOvertimePay: number;
    holidayDayPay: number;
    holidayNightPay: number;
    holidayDayOvertimePay: number;
    holidayNightOvertimePay: number;
  }
  
  export interface PayrollSummary extends PayrollBreakdown {
    grossPay: number;
    totalHours: number;
  }
    

    
