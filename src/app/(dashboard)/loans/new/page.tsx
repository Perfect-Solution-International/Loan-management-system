/* eslint-disable react-hooks/purity */
"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Calculator, PlusCircle } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan } from "@/types";

function IssueNewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const { customers, addLoan } = useData();

  const [customerId, setCustomerId] = useState(
    preselectedCustomerId || (customers[0]?.id || "")
  );
  const [grossAmount, setGrossAmount] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(3);
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [duration, setDuration] = useState<number>(12);
  const [capitalDeduction, setCapitalDeduction] = useState<number>(0);
  const [interestDeduction, setInterestDeduction] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);
  const [purpose, setPurpose] = useState("Business Expansion / Working Capital");
  const [submitted, setSubmitted] = useState(false);

  // Live Calculations
  const calculations = useMemo(() => {
    const gross = Number(grossAmount) || 0;
    const rate = Number(interestRate) || 0;
    const dur = Number(duration) > 0 ? Number(duration) : 1;
    const capDed = Number(capitalDeduction) || 0;
    const intDed = Number(interestDeduction) || 0;
    const fees = Number(otherFees) || 0;

    const totalDeductions = capDed + intDed + fees;
    const netDisbursement = Math.max(0, gross - totalDeductions);
    const totalInterest = (gross * rate) / 100;
    const totalRepayment = gross + totalInterest;
    const installmentAmount = totalRepayment / dur;

    return {
      gross,
      totalDeductions,
      netDisbursement,
      totalInterest,
      totalRepayment,
      installmentAmount,
      numberOfInstallments: dur,
    };
  }, [grossAmount, interestRate, duration, capitalDeduction, interestDeduction, otherFees]);

  const selectedCustomer = customers.find((c: Customer) => c.id === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !grossAmount) return;

    const newLoan: Loan = {
      id: `LN-${Date.now().toString().slice(-4)}`,
      customerId,
      customerName: selectedCustomer?.name || "Customer",
      principal: calculations.gross,
      amount: calculations.gross,
      capitalDeduction: Number(capitalDeduction) || 0,
      interestDeduction: Number(interestDeduction) || 0,
      otherFees: Number(otherFees) || 0,
      interestRate: Number(interestRate) || 0,
      ratePeriod,
      repaymentFrequency: frequency,
      duration: Number(duration) || 12,
      issueDate: new Date().toISOString().slice(0, 10),
      firstPaymentDate: new Date().toISOString().slice(0, 10),
      purpose,
      status: "Active",
      interest: calculations.totalInterest,
      totalRepayment: calculations.totalRepayment,
      netDisbursement: calculations.netDisbursement,
      installment: calculations.installmentAmount,
      loanNo: `LN-2026-${Date.now().toString().slice(-3)}`,
    };

    addLoan(newLoan);
    setSubmitted(true);

    setTimeout(() => {
      router.push("/loans");
    }, 1200);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            OPERATIONS / NEW LOAN
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Issue New Loan Contract
          </h1>
          <p className="text-xs text-slate-500">
            Configure principal terms, deductions, repayment schedules, and borrower details.
          </p>
        </div>
        <Link
          href="/loans"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
        >
          <ArrowLeft size={14} /> Back to Loans
        </Link>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
          <CheckCircle2 className="text-emerald-600" size={20} />
          Loan contract registered and disbursed successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              1. Select Borrower
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Customer Profile *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — NIC: {c.nic} ({c.town})
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800">{selectedCustomer.name}</p>
                  <p className="text-slate-500">
                    Phone: {selectedCustomer.phone} · Monthly Income: {MONEY(selectedCustomer.monthlyIncome || 0)}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                  {selectedCustomer.status}
                </span>
              </div>
            )}
          </div>

          {/* Loan Configuration Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              2. Loan Terms & Structure
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Gross Loan Amount (LKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Interest Rate (%) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Repayment Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "Monthly" | "Weekly" | "Daily")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Duration (Number of Installments) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Rate Period
                </label>
                <select
                  value={ratePeriod}
                  onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Monthly">Per Month</option>
                  <option value="Weekly">Per Week</option>
                  <option value="Daily">Per Day</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Loan Purpose
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Agriculture / Vehicle purchase"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Deductions Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              3. Upfront Deductions & Fees
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Capital Deduction (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={capitalDeduction}
                  onChange={(e) => setCapitalDeduction(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Interest Deduction (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={interestDeduction}
                  onChange={(e) => setInterestDeduction(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Other Admin Fees (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={otherFees}
                  onChange={(e) => setOtherFees(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Calculation Summary & Submit */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Calculator size={18} className="text-blue-400" />
              <h3 className="font-bold text-sm tracking-wide">
                Financial Summary
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Gross Principal</span>
                <span className="font-bold text-slate-200">
                  {MONEY(calculations.gross)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Deductions</span>
                <span className="font-bold text-red-400">
                  - {MONEY(calculations.totalDeductions)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Net Disbursement</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {MONEY(calculations.netDisbursement)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Interest ({interestRate}%)</span>
                <span className="font-bold text-slate-200">
                  {MONEY(calculations.totalInterest)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Repayment</span>
                <span className="font-black text-white text-sm">
                  {MONEY(calculations.totalRepayment)}
                </span>
              </div>

              <div className="flex justify-between py-1 pt-2">
                <div>
                  <p className="text-slate-400">Installment ({frequency})</p>
                  <p className="text-[10px] text-slate-500">
                    {calculations.numberOfInstallments} payments
                  </p>
                </div>
                <span className="font-black text-blue-400 text-base">
                  {MONEY(calculations.installmentAmount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle size={16} /> Disburse & Activate Loan
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function IssueNewLoanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Loading loan creation wizard...</div>}>
      <IssueNewLoanContent />
    </Suspense>
  );
}