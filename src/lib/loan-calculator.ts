// src/lib/loan-calculator.ts
import { LoanCalculation, RepaymentType } from '@/types';

export function calculateLoanDetails(
  grossAmount: number,
  capitalDeduction: number = 0,
  interestDeduction: number = 0,
  interestRate: number = 0,
  duration: number = 1,
  ratePeriod: "Monthly" | "Weekly" | "Daily" | "Flat" = "Monthly",
  frequency: "Monthly" | "Weekly" | "Daily" = "Daily",
  repaymentType: RepaymentType = "Capital + Interest",
  fees: number = 0
): LoanCalculation {
  const gross = Math.max(0, Number(grossAmount) || 0);
  const rate = Math.max(0, Number(interestRate) || 0);
  const dur = Math.max(1, Number(duration) || 1);
  const capDed = Math.max(0, Number(capitalDeduction) || 0);
  const intDed = Math.max(0, Number(interestDeduction) || 0);
  const extraFees = Math.max(0, Number(fees) || 0);

  // 1. Total Upfront Deductions withheld at disbursement
  const totalDeductions = capDed + intDed + extraFees;

  // 2. Net Cash Disbursed to Borrower in hand
  const netDisbursement = Math.max(0, Math.round((gross - totalDeductions) * 100) / 100);

  // 3. Normalization of duration into interest-rate calculation periods
  let periods = dur;
  if (ratePeriod === "Monthly") {
    if (frequency === "Monthly") periods = dur;
    else if (frequency === "Weekly") periods = dur / 4;
    else if (frequency === "Daily") periods = dur / 30;
  } else if (ratePeriod === "Weekly") {
    if (frequency === "Weekly") periods = dur;
    else if (frequency === "Monthly") periods = dur * 4;
    else if (frequency === "Daily") periods = dur / 7;
  } else if (ratePeriod === "Daily") {
    if (frequency === "Daily") periods = dur;
    else if (frequency === "Weekly") periods = dur * 7;
    else if (frequency === "Monthly") periods = dur * 30;
  } else {
    periods = 1; // Flat rate for entire loan term
  }

  // 4. Total Interest over the loan term
  const totalInterest = Math.round(gross * (rate / 100) * periods * 100) / 100;

  // 5. Total Repayable Amount
  // Upfront capital deduction reduces the principal liability; upfront interest deduction reduces interest liability.
  const remainingCapital = Math.max(0, Math.round((gross - capDed) * 100) / 100);
  const remainingInterest = Math.max(0, Math.round((totalInterest - intDed) * 100) / 100);
  const totalRepayment = Math.round((remainingCapital + remainingInterest) * 100) / 100;

  // 6. Installments breakdown based on Repayment Scheme
  let installmentAmount = 0;
  let periodicInterest = 0;
  let finalInstallmentAmount = 0;

  if (repaymentType === "Interest Only") {
    // Under Interest Only, regular installments only cover periodic interest.
    // Remaining principal is repaid in the final installment at maturity.
    periodicInterest = dur > 0 ? Math.round((remainingInterest / dur) * 100) / 100 : 0;
    installmentAmount = periodicInterest;
    finalInstallmentAmount = Math.round((remainingCapital + periodicInterest) * 100) / 100;
  } else {
    // Under Capital + Interest, equal periodic installments cover principal and interest
    installmentAmount = dur > 0 ? Math.round((totalRepayment / dur) * 100) / 100 : 0;
    periodicInterest = dur > 0 ? Math.round((remainingInterest / dur) * 100) / 100 : 0;
    // Final installment absorbs any remaining rounding difference
    finalInstallmentAmount =
      dur > 1
        ? Math.round((totalRepayment - installmentAmount * (dur - 1)) * 100) / 100
        : installmentAmount;
  }

  return {
    grossAmount: gross,
    totalDeductions,
    netDisbursement,
    totalInterest,
    totalRepayment,
    installmentAmount,
    numberOfInstallments: dur,
    repaymentType,
    periodicInterest,
    capitalAtMaturity: remainingCapital,
    finalInstallmentAmount,
  };
}