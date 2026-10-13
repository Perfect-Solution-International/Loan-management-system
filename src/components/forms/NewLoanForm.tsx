"use client";

import React, { useState } from "react";
import { useData } from "@/providers/data-provider";
import type { Customer, Loan } from "@/types";

interface NewLoanFormProps {
  onSuccess?: () => void;
}

export function NewLoanForm({ onSuccess }: NewLoanFormProps) {
  const { customers, addLoan } = useData();
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [amount, setAmount] = useState<number>(100000);
  const [duration, setDuration] = useState<number>(12);
  const [interestRate, setInterestRate] = useState<number>(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c: Customer) => c.id === customerId);
    const gross = Number(amount) || 0;
    const rate = Number(interestRate) || 0;
    const dur = Number(duration) || 12;
    const totalInterest = (gross * rate) / 100;
    const totalRepayment = gross + totalInterest;

    const newLoan: Loan = {
      id: `LN-${Date.now().toString().slice(-4)}`,
      customerId,
      customerName: cust?.name || "Customer",
      principal: gross,
      amount: gross,
      capitalDeduction: 0,
      interestDeduction: 0,
      otherFees: 0,
      interestRate: rate,
      ratePeriod: "Monthly",
      repaymentFrequency: "Monthly",
      duration: dur,
      issueDate: new Date().toISOString().slice(0, 10),
      firstPaymentDate: new Date().toISOString().slice(0, 10),
      status: "Active",
      interest: totalInterest,
      totalRepayment,
      netDisbursement: gross,
      installment: totalRepayment / dur,
      loanNo: `LN-${Date.now().toString().slice(-4)}`,
    };

    addLoan(newLoan);
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
          Customer
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        >
          {customers.map((c: Customer) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
          Loan Amount (LKR)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
          Interest Rate (%)
        </label>
        <input
          type="number"
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
          Installments Count
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        />
      </div>

      <button
        type="submit"
        className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs uppercase"
      >
        Disburse Loan
      </button>
    </form>
  );
}

export default NewLoanForm;

