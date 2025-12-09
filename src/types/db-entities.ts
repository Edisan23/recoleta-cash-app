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
  paymentRuleId?: string; // Reference to the payment rule for this company.
};

export type PaymentRule = {
    id: string;
    companyId: string;
    hourlyRate: number;
    overtimeRate: number;
};

export type Shift = {
  id: string; // Unique identifier for the shift.
  userId: string; // Reference to User. (Relationship: User 1:N Shift) The ID of the user who worked the shift.
  companyId: string; // Reference to Company. (Relationship: Company 1:N Shift) The ID of the company the shift belongs to.
  date: string; // The date of the shift.
  startTime: string; // The start time of the shift.
  endTime: string; // The end time of the shift.
  createdAt?: string; // The timestamp when the shift was created.
  updatedAt?: string; // The timestamp when the shift was last updated.
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
  netPay: number; // The net pay for the payroll period.
  status: string; // The status of the payroll (e.g., draft, approved, paid).
};
