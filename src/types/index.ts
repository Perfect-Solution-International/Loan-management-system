export type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "Active" | "Inactive";

export interface Customer {
  id: string;
  name: string;
  fullName?: string;
  nic: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  dob?: string;
  gender?: string;
  primaryContact?: string;
  address: string;
  village: string;
  town: string;
  district: string;
  occupation?: string;
  monthlyIncome: number;
  emergencyContact?: string;
  guarantor?: string;
  status: CustomerStatus;
  registeredAt?: string;
  photoUrl?: string;
}

export type LoanStatus = "Pending" | "Active" | "Completed" | "Rejected" | "Overdue";

export interface Loan {
  id: string;
  customerId: string;
  customerName?: string;
  loanNo?: string;
  amount?: number;
  principal: number;
  capitalDeduction: number;
  interestDeduction: number;
  otherFees: number;
  interestRate: number;
  ratePeriod: "Daily" | "Weekly" | "Monthly";
  repaymentFrequency: "Daily" | "Weekly" | "Monthly";
  duration: number;
  issueDate: string;
  firstPaymentDate: string;
  purpose?: string;
  status: LoanStatus;
  interest: number;
  totalRepayment: number;
  netDisbursement: number;
  installment: number;
}

export interface Payment {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  date: string;
  type: "Capital" | "Interest" | "Other";
}

export interface LoanCalculation {
  grossAmount: number;
  totalDeductions: number;
  netDisbursement: number;
  totalInterest: number;
  totalRepayment: number;
  installmentAmount: number;
  numberOfInstallments: number;
}