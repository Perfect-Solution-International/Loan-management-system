// src/lib/loan-calculator.ts
import { LoanCalculation } from '@/types';

export function calculateLoanDetails(
  grossAmount: number,
  capitalDeduction: number,
  interestDeduction: number,
  interestRate: number,
  duration: number
): LoanCalculation {
  const totalDeductions = capitalDeduction + interestDeduction;
  const netDisbursement = Math.max(0, grossAmount - totalDeductions);
  const totalInterest = (grossAmount * interestRate) / 100;
  const totalRepayment = grossAmount + totalInterest;
  const numberOfInstallments = duration > 0 ? duration : 1;
  const installmentAmount = totalRepayment / numberOfInstallments;

  return {
    grossAmount,
    totalDeductions,
    netDisbursement,
    totalInterest,
    totalRepayment,
    installmentAmount,
    numberOfInstallments,
  };
}