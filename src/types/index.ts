export type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "Active" | "Inactive";

export interface CustomerDocument {
  id: string;
  customerId: string;
  title: string;
  type: "photo" | "nic_front" | "nic_back" | "salary_slip" | "agreement" | "utility_bill" | "other";
  fileName: string;
  fileSize: string;
  fileType: "image/jpeg" | "image/png" | "application/pdf" | string;
  fileUrl: string;
  uploadedAt: string;
  uploader?: string;
}

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
  guarantorName?: string;
  guarantorNic?: string;
  guarantorPhone?: string;
  guarantorRelationship?: string;
  status: CustomerStatus;
  registeredAt?: string;
  photoUrl?: string;
  nicFrontUrl?: string;
  nicBackUrl?: string;
  documents?: CustomerDocument[];
  hasExistingLoan?: boolean;
  existingLoanNotes?: string;
  priorRepaymentHistory?: string;
  initialOutstandingBalance?: number;
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
  notes?: string;
  method?: "Cash" | "Bank Transfer" | "Cheque";
  collectedBy?: string;
  receiptNo?: string;
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

export interface SystemSettings {
  systemName: string;
  currency: string;
  defaultMonthlyRate: number;
  defaultWeeklyRate: number;
  defaultDailyRate: number;
  defaultCapitalDeductionRate: number;
  defaultInterestDeductionMethod: "UPFRONT" | "COLLECTED_VIA_INSTALLMENTS";
  defaultProcessingFee: number;
  defaultAdminFee: number;
  lateFeePercentage: number;
  gracePeriodDays: number;
}

export interface StaffPermissions {
  approveLoans: boolean;
  recordRepayments: boolean;
  exportReports: boolean;
  manageSettings: boolean;
  manageCustomers: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Loan Officer" | "Collection Agent" | "Auditor";
  branch: string;
  status: "Active" | "Inactive";
  joinedDate: string;
  permissions: StaffPermissions;
}