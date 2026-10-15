/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  Clock,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Receipt,
  X,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";
import type { Payment } from "@/types";

export default function CustomerDashboardPage() {
  const { customers, loans, repayments } = useData();

  // Current customer record (authenticated borrower)
  const currentCustomer = useMemo(() => {
    return (
      customers[0] || {
        id: "CUS-001",
        name: "Kasun Madushanka Perera",
        fullName: "Kasun Madushanka Perera",
        nic: "199125601234",
        phone: "0771234567",
        email: "kasun@example.com",
        address: "No. 24, Temple Road",
        town: "Maharagama",
        district: "Colombo",
        status: "Active",
      }
    );
  }, [customers]);

  // Loans belonging to current customer
  const customerLoans = useMemo(() => {
    return loans.filter(
      (l) => l.customerId === currentCustomer.id || l.customerName === currentCustomer.name
    );
  }, [loans, currentCustomer]);

  // Active primary loan
  const [activeLoanId, setActiveLoanId] = useState<string>("");

  const currentLoan = useMemo(() => {
    if (activeLoanId) {
      const match = customerLoans.find((l) => l.id === activeLoanId);
      if (match) return match;
    }
    return customerLoans[0] || null;
  }, [customerLoans, activeLoanId]);

  // Payments / Repayments for current customer's loans
  const customerPayments = useMemo(() => {
    if (!currentLoan) {
      return repayments.filter((p) => p.customerId === currentCustomer.id);
    }
    return repayments.filter(
      (p) => p.loanId === currentLoan.id || p.customerId === currentCustomer.id
    );
  }, [repayments, currentLoan, currentCustomer.id]);

  // Calculate financial totals
  const totalPrincipal = currentLoan ? currentLoan.principal || currentLoan.amount || 0 : 0;
  const totalInterest = currentLoan ? currentLoan.interest || (currentLoan.totalRepayment ? currentLoan.totalRepayment - totalPrincipal : 0) : 0;
  const totalPayable = currentLoan ? currentLoan.totalRepayment || (totalPrincipal + totalInterest) : 0;

  const totalPaid = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [customerPayments]);

  const outstandingBalance = Math.max(0, totalPayable - totalPaid);
  const percentSettled = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0;

  // Upcoming installment calculations
  const nextInstallmentAmount = currentLoan?.installment || Math.ceil(totalPayable / (currentLoan?.duration || 12));
  const nextDueDate = currentLoan?.firstPaymentDate || "2026-10-25";

  // Receipt & Statement Modal States
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans selection:bg-red-600 selection:text-white">
      {/* ── 1. Top Customer Portal Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3.5">
            <BrandLogo href="/" size="md" theme="light" />
            <span className="hidden md:inline-block h-6 w-px bg-slate-200" />
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Borrower Self-Service
            </span>
          </div>

          {/* Right Customer Info & Navigation (Dropdown removed as requested) */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Customer Avatar & ID */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-red-600/20 overflow-hidden shrink-0">
                {currentCustomer.photoUrl ? (
                  <img
                    src={currentCustomer.photoUrl}
                    alt={currentCustomer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentCustomer.name.charAt(0)
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {currentCustomer.fullName || currentCustomer.name}
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  ID: {currentCustomer.id}
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Return to Home"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Welcome Banner & Profile Summary ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#09090b] via-[#200308] to-[#3a0610] text-white border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-rose-300 border border-red-500/30">
                  NIC: {currentCustomer.nic}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {currentCustomer.status || "Active"} Account
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700">
                  {currentCustomer.district} District
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Welcome back, {currentCustomer.name}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Review your active loan balances, check installment due dates, view repayment milestones, and download official settlement receipts.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              <button
                type="button"
                onClick={() => setIsStatementOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <Printer size={15} />
                Statement of Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main Dashboard Content Grid ──────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Financial Overview Cards (3 Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Outstanding Balance */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Outstanding Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {MONEY(outstandingBalance)}
            </p>
            <div className="mt-3">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-600 to-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                <span>{percentSettled}% Settled</span>
                <span>Total: {MONEY(totalPayable)}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Upcoming Installment */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Next Installment
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Calendar size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {MONEY(nextInstallmentAmount)}
            </p>
            <p className="text-xs font-semibold text-red-600 mt-2 flex items-center gap-1.5">
              <Clock size={14} />
              Due on {nextDueDate}
            </p>
          </div>

          {/* Card 3: Total Repaid */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Repaid to Date
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {MONEY(totalPaid)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Across {customerPayments.length} recorded payments
            </p>
          </div>
        </section>

        {/* ── Active Loan Details & Structure ──────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 font-mono">
                  {currentLoan?.loanNo || "LN-ACTIVE"}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Facility
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {currentLoan?.purpose || "Micro-Enterprise Working Capital Loan"}
              </h2>
            </div>

            {/* Loan Selector if customer has multiple facilities */}
            {customerLoans.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Facility:</span>
                <select
                  value={currentLoan?.id}
                  onChange={(e) => setActiveLoanId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none"
                >
                  {customerLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loanNo || l.id} ({MONEY(l.principal || l.amount || 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Principal Amount</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
                {MONEY(totalPrincipal)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Interest Rate</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
                {currentLoan?.interestRate || 3.0}% / mo
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Duration</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.duration || 6} Months
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Frequency</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.repaymentFrequency || "Monthly"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Issue Date</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.issueDate || "2026-09-20"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Facility Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {currentLoan?.status || "Active"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Repayment History & Download Receipts (Full Width) ─────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Repayment History & Receipts
              </h3>
              <p className="text-xs text-slate-500">
                Official payment entries credited towards this facility.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsStatementOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition self-start sm:self-auto cursor-pointer"
            >
              <FileText size={14} />
              Full Ledger Statement
            </button>
          </div>

          {customerPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/70">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Collector</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customerPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNo || p.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {p.method || "Cash"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        {MONEY(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {p.collectedBy || "Authorized Field Officer"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setReceiptToPrint(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs transition cursor-pointer"
                        >
                          <Download size={13} />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400">
              <Receipt size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No payment receipts yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Your payments will appear here once credited by our cashiers or recorded by field officers.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* ── 4. Single Payment Printable Receipt Modal ───────────────────────── */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <BrandLogo size="sm" theme="light" />
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="py-6 text-center border-b border-dashed border-slate-200">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-2 border border-emerald-200">
                OFFICIAL PAYMENT RECEIPT
              </span>
              <p className="font-mono text-xs text-slate-400">
                Receipt No: <strong className="text-slate-800">{receiptToPrint.receiptNo || receiptToPrint.id}</strong>
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 font-mono mt-3">
                {MONEY(receiptToPrint.amount)}
              </h2>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Payment Credited Successfully
              </p>
            </div>

            {/* Receipt Details Breakdown */}
            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Date</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower Name</span>
                <span className="font-semibold text-slate-800">{currentCustomer.fullName || currentCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer ID / NIC</span>
                <span className="font-mono text-slate-800">{currentCustomer.id} · {currentCustomer.nic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Loan Facility</span>
                <span className="font-mono font-bold text-red-600">{currentLoan?.loanNo || "LN"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.method || "Cash"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Processed By</span>
                <span className="text-slate-800">{receiptToPrint.collectedBy || "Authorized Cashier"}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/25 cursor-pointer"
              >
                <Printer size={15} />
                Print / Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Full Statement Modal ────────────────────────────────────────── */}
      {isStatementOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <BrandLogo size="sm" theme="light" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Borrower Statement of Account</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Issued: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Statement Summary */}
            <div className="py-4 grid grid-cols-3 gap-3 text-center border-b border-slate-100 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block font-medium">Principal</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{MONEY(totalPrincipal)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block font-medium">Total Repaid</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">{MONEY(totalPaid)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block font-medium">Remaining</span>
                <span className="text-sm font-bold text-rose-600 font-mono">{MONEY(outstandingBalance)}</span>
              </div>
            </div>

            {/* Statement Transactions */}
            <div className="flex-1 overflow-y-auto py-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Transaction History
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Receipt #</th>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customerPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2.5 text-slate-600">{p.date}</td>
                      <td className="p-2.5 font-mono text-slate-800">{p.receiptNo || p.id}</td>
                      <td className="p-2.5 text-slate-500">{p.method || "Cash"}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{MONEY(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Strictly confidential · PSI ONE Financial Operations
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/30 cursor-pointer"
              >
                <Printer size={15} /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Minimal Portal Footer ───────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">PSI ONE Borrower Portal</span>
            <span>·</span>
            <span>Licensed under Financial Consumer Protection Framework</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-600 transition">Main Home</Link>
            <Link href="/register" className="hover:text-slate-600 transition">Customer Registration</Link>
            <Link href="/login" className="hover:text-slate-600 transition">Staff Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
