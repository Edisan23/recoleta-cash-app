// This file is auto-generated, do not edit.

export type User = {
  id: string; // Unique identifier for the user.
  name: string; // The user's full name.
  email: string; // The user's email address.
  phone?: string; // The user's phone number.
  companyId?: string; // Reference to Company. (Relationship: Company 1:N User) The ID of the company the user belongs to. Null if the user is an admin.
  role: string; // The user's role within the application (e.g., operator, admin).
  createdAt: string; // The timestamp when the user account was created.
  paymentStatus: 'trial' | 'paid' | 'blocked'; // The payment status of the user's account.
};

export type Company = {
  id: string; // Unique identifier for the company.
  name: string; // The name of the company.
  logoUrl?: string; // URL of the company's logo.
  timezone: string; // The timezone the company operates in.
  country: string; // The country the company is located in.
  currency: string; // The currency used by the company.
  paymentRuleId?: string; // Reference to PaymentRule. (Relationship: Company 1:1 PaymentRule) The ID of the payment rules associated with the company.
};

export type PaymentRule = {
  id: string; // Unique identifier for the payment rule.
  baseType: string; // The base type of payment (e.g., fixed, hourly, hourly+basic).
  baseSalary?: number; // The base salary, if applicable.
  hourlyRates?: {
    diurna?: number;
    nocturna?: number;
    extraDiurna?: number;
    extraNocturna?: number;
    festivaDiurna?: number;
    festivaNocturna?: number;
    extraFestivaDiurna?: number;
    extraFestivaNocturna?: number;
  };
  incentives?: string[]; // Incentives based on certain conditions.
  socialContributions?: {
    salud_pct?: number;
    pension_pct?: number;
  };
  subsidies?: {
    transporte?: number;
  };
};

export type Shift = {
  id: string; // Unique identifier for the shift.
  userId: string; // Reference to User. (Relationship: User 1:N Shift) The ID of the user who worked the shift.
  companyId: string; // Reference to Company. (Relationship: Company 1:N Shift) The ID of the company the shift belongs to.
  date: string; // The date of the shift.
  startTime: string; // The start time of the shift.
  endTime: string; // The end time of the shift.
  itemId?: string; // Reference to Item. (Relationship: Item 1:N Shift) The ID of the item associated with the shift (e.g., TT, bulto, machine).
  ttNumber?: string; // The TT number, if applicable.
  createdAt?: string; // The timestamp when the shift was created.
  updatedAt?: string; // The timestamp when the shift was last updated.
  manualFlag?: boolean; // Indicates if the shift was manually entered.
  hoursBreakdown?: {
    diurna?: number;
    nocturna?: number;
    extraDiurna?: number;
    extraNocturna?: number;
    festivaDiurna?: number;
    festivaNocturna?: number;
  };
  grossValue?: number; // The gross value of the shift.
};

export type Payroll = {
  id: string; // Unique identifier for the payroll.
  companyId: string; // Reference to Company. (Relationship: Company 1:N Payroll) The ID of the company the payroll belongs to.
  userId: string; // Reference to User. (Relationship: User 1:N Payroll) The ID of the user the payroll is for.
  periodStart: string; // The start date of the payroll period.
  periodEnd: string; // The end date of the payroll period.
  totalHours: number; // The total hours worked during the payroll period.
  grossPay: number; // The gross pay for the payroll period.
  incentives?: number; // The incentives earned during the payroll period.
  subsidies?: number; // The subsidies received during the payroll period.
  deductions?: number; // The deductions taken during the payroll period.
  netPay: number; // The net pay for the payroll period.
  status: string; // The status of the payroll (e.g., draft, approved, paid).
};

export type Setting = {
  id: string; // Unique identifier for the setting.
  globalDefaults?: string; // Global default settings.
  holidayCalendar?: string; // Reference to HolidayCalendar. (Relationship: Setting 1:1 HolidayCalendar) Reference to the holiday calendar.
  currencyFormat?: string; // The format for displaying currency.
};

export type Item = {
  id: string; // Unique identifier for the item.
  companyId?: string; // Reference to Company. (Relationship: Company 1:N Item). The id of the company this item belongs to.
  name: string; // The name of the item.
  type: string; // The type of item (e.g., TT, bulto, machine).
  unit: string; // The unit of measurement for the item.
  description?: string; // A description of the item.
};

export type HolidayCalendar = {
  id: string; // Unique identifier for the holiday calendar.
  name: string; // The name of the holiday calendar.
  holidays: string[]; // An array of holiday dates.
};
