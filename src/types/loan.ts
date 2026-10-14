export interface Customer {
  id: string;
  fullName: string;
  nicNumber: string;
  dateOfBirth: string;
  gender?: string;
  residentialAddress: string;
  village: string;
  town: string;
  district: string;
  primaryContact: string;
  alternativeContact?: string;
  email?: string;
  occupation?: string;
  monthlyIncome?: number;
  customerPhotoUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export type InterestMethod = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type DeductionType = 'FIXED' | 'PERCENTAGE';

export interface LoanFormValues {
  customerId: string;
  grossLoanAmount: number;
  capitalDeductionType: DeductionType;
  capitalDeductionValue: number;
  interestDeductionMethod: 'UPFRONT' | 'COLLECTED_VIA_INSTALLMENTS';
  interestRate: number;
  interestPeriod: InterestMethod;
  repaymentFrequency: InterestMethod;
  loanDurationMonths: number;
  numberOfInstallments: number;
  loanIssueDate: string;
  firstRepaymentDate: string;
  loanPurpose: string;
  additionalFees: number;
  guarantorInfo?: string;
  notes?: string;
}

export interface LoanSummary {
  grossLoanAmount: number;
  capitalDeductionAmount: number;
  interestDeductionAmount: number;
  otherFees: number;
  totalDeductions: number;
  netDisbursement: number;
  totalRepayment: number;
  installmentAmount: number;
}