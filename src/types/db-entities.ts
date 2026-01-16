// This file is auto-generated, do not edit.

export type User = {
    id: string; // Unique identifier for the user.
    name: string; // The user's full name.
    email: string; // The user's email address.
    role: "operator" | "admin"; // The user's role within the application (e.g., operator, admin).
    companyId?: string; // The ID of the company the user belongs to.
    createdAt: string; // The timestamp when the user account was created.
  };

  export type UserProfile = {
    id: string;
    uid: string;
    displayName: string;
    photoURL: string;
    email: string;
    isAnonymous: boolean;
    role: "operator" | "admin";
    createdAt: string; // Simplified to string to avoid build issues.
    premiumUntil?: string; // ISO Date string for when premium access expires
  }
  
  export type Company = {
    id: string; // Unique identifier for the company.
    name: string; // The name of the company.
    logoUrl?: string; // URL of the company's logo.
    isActive: boolean; // Whether the company is active or not.
  };

  export type CompanySettings = {
    id: string; // Corresponds to companyId
    paymentModel: 'hourly' | 'production';
    payrollCycle: 'monthly' | 'bi-weekly';
    nightShiftStartHour?: number; // The hour (0-23) when the night shift begins.
    dailyHourLimit?: number; // Number of hours after which overtime rates apply.
    dayRate?: number;
    nightRate?: number;
    dayOvertimeRate?: number;
    nightOvertimeRate?: number;
    holidayDayRate?: number;
    holidayNightRate?: number;
    holidayDayOvertimeRate?: number;
    holidayNightOvertimeRate?: number;
    premiumPrice?: number; // Cost for premium activation
    trialPeriodDays?: number; // Duration of the trial period in days
    premiumDurationDays?: number; // Duration of premium access in days after payment. 0 or undefined for lifetime.
  };

  export type Benefit = {
    id: string;
    companyId: string;
    name: string;
    type: 'fixed' | 'percentage' | 'per-hour';
    value: number;
    appliesTo: 'all' | 'min-wage'; // Condition for applying the benefit.
  }
  
  export type Deduction = {
    id: string;
    companyId: string;
    name:string;
    type: 'fixed' | 'percentage';
    value: number;
  }
  
  export type CompanyItem = {
    id: string;
    companyId: string;
    name: string;
    description: string;
    requiresSupervisor: boolean;
  };

  export type DailyShiftEntry = {
    id: string;
    startTime: string;
    endTime: string;
  }
    
  export type Shift = {
    id: string;
    userId: string;
    companyId: string;
    date: string; // ISO String
    startTime: string;
    endTime: string;
    notes?: string;
    
    // Custom fields for the shift day
    itemDetails?: { 
      itemId: string; 
      itemName: string; // Name of the CompanyItem (for display)
      detail: string; // The value entered by user (e.g., supervisor name)
    }[];
  };
  
  export type Payroll = {
    id: string;
    userId: string;
    companyId: string;
    userName: string; // Denormalized for easier display
    periodStart: string; // ISO string
    periodEnd: string; // ISO string
    generatedAt: string; // ISO string
    summary: PayrollSummary;
    shifts: Shift[]; // A snapshot of the shifts included in this payroll
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
    netPay: number;
    totalBenefits: number;
    totalDeductions: number;
    benefitBreakdown: { name: string; value: number }[];
    deductionBreakdown: { name: string; value: number }[];
  }
