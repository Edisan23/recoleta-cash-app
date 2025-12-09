// This file is auto-generated, do not edit.

export type User = {
  id: string; // Unique identifier for the user.
  name: string; // The user's full name.
  email: string; // The user's email address.
  role: string; // The user's role within the application (e.g., operator, admin).
  companyId?: string; // The ID of the company the user belongs to.
  createdAt: string; // The timestamp when the user account was created.
  paymentStatus: 'trial' | 'paid' | 'blocked'; // The payment status of the user's account.
};

export type Company = {
  id: string; // Unique identifier for the company.
  name: string; // The name of the company.
  logoUrl?: string; // URL of the company's logo.
  isActive: boolean; // Whether the company is active or not.
};

export type CompanySettings = {
    id?: string;
    dayRate?: number;
    nightRate?: number;
    dayOvertimeRate?: number;
    nightOvertimeRate?: number;
    holidayRate?: number;
    holidayOvertimeRate?: number;
    transportSubsidy?: number;
    otherSubsidies?: number;
    healthDeduction?: number; // Percentage for health deduction.
    pensionDeduction?: number; // Percentage for pension deduction.
    arlDeduction?: number; // Percentage for ARL deduction.
    taxWithholding?: number; // Percentage for tax withholding.
    hasBasicSalary?: boolean;
    paymentType?: 'hourly' | 'salary';
    incentiveType?: 'none' | 'perHour' | 'perShift';
    normalHoursType?: 'daily' | 'fortnightly';
    normalHours?: number; // Number of hours considered normal work.
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
    date: string; // ISO 8601 format
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    itemId?: string;
    supervisor?: string;
};

export type Payroll = {
    id: string;
    userId: string;
    companyId: string;
    periodStart: string; // ISO 8601 format
    periodEnd: string; // ISO 8601 format
};

    