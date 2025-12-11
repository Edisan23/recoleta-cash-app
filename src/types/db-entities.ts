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
    holidayNightOvertimeHours?: number;
    transportSubsidy?: number;
    otherSubsidies?: number;
    healthDeduction?: number; // Percentage for health deduction.
    pensionDeduction?: number; // Percentage for pension deduction.
    arlDeduction?: number; // Percentage for ARL deduction.
    taxWithholding?: number; // Percentage for tax withholding.
    hasBasicSalary?: boolean;
    paymentType?: "hourly" | "salary";
    payrollCycle?: "monthly" | "fortnightly"; // Defines the company's payroll payment cycle.
    incentiveType?: "none" | "perHour" | "perShift";
    normalHoursType?: "daily" | "fortnightly";
    normalHours?: number; // Number of hours considered normal work.
    nightShiftStart?: string;
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
  
    