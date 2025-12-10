// This file is auto-generated, do not edit.

export type User = {
  id: string; // Unique identifier for the user.
  name: string; // The user's full name.
  email: string; // The user's email address.
  role: 'admin'; // The user's role, always 'admin'.
};

export type Company = {
  id: string; // Unique identifier for the company.
  name: string; // The name of the company.
  logoUrl?: string; // URL of the company's logo.
  isActive: boolean; // Whether the company is active or not.
};
