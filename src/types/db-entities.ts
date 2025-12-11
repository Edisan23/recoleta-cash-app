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
    id: string;
    dayRate?: number;
    nightRate?: number;
    dayOvertimeRate?: number;
    nightOvertimeRate?: number;
    holidayDayRate?: number;
    holidayNightRate?: number;
    holidayDayOvertimeRate?: number;
    holidayNightOvertimeRate?: number;
    transportSubsidy?: number; // Fixed amount for transport subsidy.
    otherSubsidies?: number;
    healthDeduction?: number; // Percentage for health deduction (e.g., 4 for 4%).
    pensionDeduction?: number; // Percentage for pension deduction (e.g., 4 for 4%).
    arlDeduction?: number; // Percentage for ARL deduction.
    taxWithholding?: number; // Percentage for tax withholding.
    solidarityFundDeduction?: number; // Percentage for solidarity pension fund.
    unionFeeDeduction?: number; // Fixed amount for union fees, managed by operator.
    cooperativeDeduction?: number; // Fixed amount for cooperative contributions, managed by operator.
    loanDeduction?: number; // Fixed amount for loan payments, managed by operator.
    payrollCycle?: "monthly" | "fortnightly"; // Defines the company's payroll payment cycle.
    nightShiftStart?: string; // The time when the night shift begins (e.g., '21:00').
  };
  
  export type CompanyItem = {
    id: string;
    name: string;
    description?: string;
    affectsPayment: boolean;
    paymentMultiplier?: number;
    extraPerHour?: number;
    requiresSupervisor?: boolean;
  };
  
  export type Shift = {
    id: string;
    userId: string;
    companyId: string;
    date: string;
    startTime: string;
    endTime: string;
    itemId?: string;
    supervisor?: string;
  };
  
  export type Payroll = {
    id: string;
    userId: string;
    companyId: string;
    periodStart: string;
    periodEnd: string;
  };
  
    
