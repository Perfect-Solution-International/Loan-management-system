import type { Loan, Payment } from "@/types";

export interface LoanFinancials {
  totalPaid: number;
  balanceDue: number;
  arrears: number;
  missedInstallments: number;
  overdueDays: number;
  isDelinquent: boolean;
  agingBucket: "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS";
}

export function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length < 3 || parts.some((p) => isNaN(p))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Standard utility: Return mathematically exact total repayable amount for any loan facility.
 */
export function getLoanTotalRepayment(loan: Partial<Loan>): number {
  if (typeof loan.totalRepayment === "number" && loan.totalRepayment > 0) {
    return loan.totalRepayment;
  }
  const principal = Number(loan.principal || loan.amount || 0);
  const interest = Number(loan.interest || 0);
  const capDed = Number(loan.capitalDeduction || 0);
  const intDed = Number(loan.interestDeduction || 0);
  const remCap = Math.max(0, principal - capDed);
  const remInt = Math.max(0, interest - intDed);
  return Math.round((remCap + remInt) * 100) / 100;
}

/**
 * Standard utility: Return total amount paid for a specific loan facility across ledger payments.
 */
export function getLoanTotalPaid(loanId: string, payments: Payment[]): number {
  return payments
    .filter((p) => p.loanId === loanId)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Standard utility: Return remaining balance due for any loan facility.
 */
export function getLoanBalanceDue(loan: Partial<Loan>, payments: Payment[]): number {
  const totalRepay = getLoanTotalRepayment(loan);
  const totalPaid = loan.id ? getLoanTotalPaid(loan.id, payments) : 0;
  return Math.max(0, Math.round((totalRepay - totalPaid) * 100) / 100);
}

/**
 * Pure calculation of loan financial standings, arrears, missed installments,
 * and aging buckets relative to asOfDate. Defaults safely to real-time current date.
 */
export function calculateLoanFinancials(
  loan: Loan,
  payments: Payment[],
  asOfDate: Date = new Date()
): LoanFinancials {
  const totalRepayment = getLoanTotalRepayment(loan);
  const totalPaid = getLoanTotalPaid(loan.id, payments);
  const balanceDue = Math.max(0, Math.round((totalRepayment - totalPaid) * 100) / 100);

  const statusUpper = (loan.status || "").toUpperCase();

  // Completed loans
  if (statusUpper === "COMPLETED" || (totalRepayment > 0 && totalPaid >= totalRepayment)) {
    return {
      totalPaid,
      balanceDue: 0,
      arrears: 0,
      missedInstallments: 0,
      overdueDays: 0,
      isDelinquent: false,
      agingBucket: "CURRENT",
    };
  }

  // Pending / rejected loans
  if (statusUpper === "PENDING" || statusUpper === "REJECTED") {
    return {
      totalPaid: 0,
      balanceDue: totalRepayment,
      arrears: 0,
      missedInstallments: 0,
      overdueDays: 0,
      isDelinquent: false,
      agingBucket: "CURRENT",
    };
  }

  const startDate = parseDate(loan.firstPaymentDate || loan.issueDate);
  let rawArrears = 0;
  let overdueDays = 0;

  if (startDate && asOfDate > startDate) {
    const diffDays = Math.max(
      0,
      Math.floor((asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    let cycleDays = 30;
    if (loan.repaymentFrequency === "Daily") cycleDays = 1;
    else if (loan.repaymentFrequency === "Weekly") cycleDays = 7;

    // Past completed cycles strictly prior to asOfDate
    const pastCycles = Math.min(
      loan.duration || 1,
      Math.floor(diffDays / cycleDays)
    );
    const expectedPastDue = Math.min(totalRepayment, pastCycles * (loan.installment || 0));
    rawArrears = Math.max(0, Math.round((expectedPastDue - totalPaid) * 100) / 100);

    if (rawArrears > 0) {
      // Calculate how many days past the first missed installment cycle
      const cyclesPaid = loan.installment > 0 ? Math.floor(totalPaid / loan.installment) : 0;
      const missedCycleDay = cyclesPaid * cycleDays;
      overdueDays = Math.max(1, diffDays - missedCycleDay);
    }
  }

  const isOverdueStatus = statusUpper === "OVERDUE";
  const arrears = Math.min(
    balanceDue,
    isOverdueStatus && rawArrears <= 0 ? loan.installment || 0 : rawArrears
  );
  const missedInstallments =
    loan.installment > 0 && arrears > 0 ? Math.ceil(arrears / loan.installment) : 0;
  const isDelinquent = isOverdueStatus || arrears > 0;

  // Determine aging bucket based on exact overdue days
  let agingBucket: LoanFinancials["agingBucket"] = "CURRENT";
  if (isDelinquent) {
    const days = overdueDays > 0 ? overdueDays : 15;
    if (days <= 30) agingBucket = "1_30";
    else if (days <= 60) agingBucket = "31_60";
    else if (days <= 90) agingBucket = "61_90";
    else agingBucket = "90_PLUS";
  }

  return {
    totalPaid,
    balanceDue,
    arrears,
    missedInstallments,
    overdueDays: overdueDays > 0 ? overdueDays : isDelinquent ? 15 : 0,
    isDelinquent,
    agingBucket,
  };
}
