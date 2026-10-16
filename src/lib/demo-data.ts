import type { Customer, Loan, Payment, CustomerDocument, SystemSettings, StaffUser } from "@/types";

export const initialCustomers: Customer[] = [];

export const initialLoans: Loan[] = [];

export const initialPayments: Payment[] = [];

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
    name: "Ajith Wickramasinghe",
    email: "admin@psione.lk",
    role: "Administrator",
    branch: "Colombo Central",
    status: "Active",
    joinedDate: "2025-01-15",
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
    name: "Chaminda Bandara",
    email: "chaminda.b@psione.lk",
    role: "Loan Officer",
    branch: "Colombo Central",
    status: "Active",
    joinedDate: "2025-04-10",
    permissions: {
      approveLoans: true,
      recordRepayments: true,
      exportReports: true,
      manageSettings: false,
      manageCustomers: true,
    },
  },
  {
    id: "STF-03",
    name: "Dinithi Jayawardena",
    email: "dinithi.j@psione.lk",
    role: "Collection Agent",
    branch: "Gampaha Branch",
    status: "Active",
    joinedDate: "2025-08-01",
    permissions: {
      approveLoans: false,
      recordRepayments: true,
      exportReports: false,
      manageSettings: false,
      manageCustomers: true,
    },
  },
  {
    id: "STF-04",
    name: "Rohan Senanayake",
    email: "rohan.audit@psione.lk",
    role: "Auditor",
    branch: "Head Office",
    status: "Active",
    joinedDate: "2025-02-20",
    permissions: {
      approveLoans: false,
      recordRepayments: false,
      exportReports: true,
      manageSettings: false,
      manageCustomers: false,
    },
  },
];
