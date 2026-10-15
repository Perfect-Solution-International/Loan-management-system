// src/lib/loan-calculator.ts
import { LoanCalculation, RepaymentType } from '@/types';

export function calculateLoanDetails(
  grossAmount: number,
  capitalDeduction: number,
  interestDeduction: number,
  interestRate: number,
  duration: number,
  ratePeriod: "Monthly" | "Weekly" | "Daily" | "Flat" = "Monthly",
  frequency: "Monthly" | "Weekly" | "Daily" = "Daily",
  repaymentType: RepaymentType = "Capital + Interest"
): LoanCalculation {
  const gross = Number(grossAmount) || 0;
  const rate = Number(interestRate) || 0;
  const dur = Math.max(1, Number(duration) || 1);
  const capDed = Number(capitalDeduction) || 0;
  const intDed = Number(interestDeduction) || 0;

  const totalDeductions = capDed + intDed;
  const netDisbursement = Math.max(0, gross - totalDeductions);

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
    periods = 1; // Flat rate
  }

  const totalInterest = Math.round(gross * (rate / 100) * periods);
  const remainingInterest = Math.max(0, totalInterest - intDed);
  const totalRepayment = gross + remainingInterest;
  const numberOfInstallments = dur;

  let installmentAmount = 0;
  let periodicInterest = 0;
  let finalInstallmentAmount = 0;

  if (repaymentType === "Interest Only") {
    // Under Interest Only, the borrower pays only the interest portion during regular installments.
    // The entire principal (capital) is returned at maturity (final installment).
    periodicInterest = dur > 0 ? Math.round((remainingInterest / dur) * 100) / 100 : 0;
    installmentAmount = periodicInterest;
    finalInstallmentAmount = gross + periodicInterest;
  } else {
    // Under Capital + Interest, installments are evenly split between principal and interest.
    installmentAmount = dur > 0 ? Math.round((totalRepayment / dur) * 100) / 100 : 0;
    periodicInterest = dur > 0 ? Math.round((remainingInterest / dur) * 100) / 100 : 0;
    finalInstallmentAmount = installmentAmount;
  }

  return {
    grossAmount: gross,
    totalDeductions,
    netDisbursement,
    totalInterest,
    totalRepayment,
    installmentAmount,
    numberOfInstallments,
    repaymentType,
    periodicInterest,
    capitalAtMaturity: gross,
    finalInstallmentAmount,
  };
}