
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
  
  export interface PayrollSummary {
    grossPay: number;
    netPay: number;
    totalHours: number;
    totalBasePayment: number;
  }
    
