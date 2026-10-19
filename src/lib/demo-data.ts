import type { Customer, Loan, Payment, CustomerDocument, SystemSettings, StaffUser, OnlinePayment } from "@/types";

export const initialCustomers: Customer[] = [];

export const initialLoans: Loan[] = [];

export const initialPayments: Payment[] = [];

export const initialOnlinePayments: OnlinePayment[] = [];

export const initialDocuments: CustomerDocument[] = [];

export const initialSettings: SystemSettings = {
  systemName: "PSI ONE Loan Management System",
  currency: "LKR",
  defaultMonthlyRate: 3.0,
  defaultWeeklyRate: 0.8,
  defaultDailyRate: 0.15,
  defaultCapitalDeductionRate: 1.5,
  defaultInterestDeductionMethod: "UPFRONT",
  defaultProcessingFee: 1500,
  defaultAdminFee: 500,
  lateFeePercentage: 2.0,
  gracePeriodDays: 3,
};

export const initialStaffUsers: StaffUser[] = [
  {
    id: "STF-01",
    name: "System Administrator",
    email: "admin@psione.lk",
    role: "Administrator",
    branch: "Head Office",
    status: "Active",
    joinedDate: "2025-01-01",
    password: "admin123",
    permissions: {
      approveLoans: true,
      recordRepayments: true,
      exportReports: true,
      manageSettings: true,
      manageCustomers: true,
    },
  },
  {
    id: "STF-02",
    name: "Staff Officer",
    email: "staff@psione.lk",
    role: "Loan Officer",
    branch: "Colombo Central",
    status: "Active",
    joinedDate: "2025-01-15",
    password: "Staff@123",
    permissions: {
      approveLoans: true,
      recordRepayments: true,
      exportReports: false,
      manageSettings: false,
      manageCustomers: true,
    },
  },
];
