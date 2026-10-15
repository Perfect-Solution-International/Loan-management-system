/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  LogOut,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";
import type { Payment } from "@/types";

function parseDateString(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CustomerDashboardPage() {
  const { customers, loans, repayments } = useData();

  // Session customer state & today's date (read in useEffect for clean prerender)
  const [sessionCustomerId, setSessionCustomerId] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("2026-10-15");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTodayStr(new Date().toISOString().slice(0, 10));
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("customerId");
      const stored = sessionStorage.getItem("customerSessionId");
      if (urlId) {
        setSessionCustomerId(urlId);
        sessionStorage.setItem("customerSessionId", urlId);
      } else if (stored) {
        setSessionCustomerId(stored);
      }
    }
  }, []);

  // Current customer record (authenticated borrower)
  const currentCustomer = useMemo(() => {
    if (sessionCustomerId) {
      const found = customers.find(
        (c) =>
          c.id.toLowerCase() === sessionCustomerId.toLowerCase() ||
          c.nic.toLowerCase() === sessionCustomerId.toLowerCase()
      );
      if (found) return found;
    }
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
  }, [customers, sessionCustomerId]);

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

  // Tab state: 'schedule' (Installment Due Dates) | 'history' (Repayment History)
  const [activeTab, setActiveTab] = useState<"schedule" | "history">("schedule");

  // Receipt & Statement Modal States
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Installment Schedule with Due Dates
  const installmentSchedule = useMemo(() => {
    if (!currentLoan) return [];

    const duration = Math.max(1, currentLoan.duration || 1);
    const gross = Number(currentLoan.principal || currentLoan.amount || 0);
    const totalRepay = Number(currentLoan.totalRepayment || gross + (currentLoan.interest || 0));
    const totalInt = Math.max(0, totalRepay - gross);
    const frequency = currentLoan.repaymentFrequency || "Monthly";
    const startDate = parseDateString(currentLoan.firstPaymentDate || currentLoan.issueDate) || parseDateString("2026-10-01")!;
    let runningBalance = totalRepay;
    let accumulatedPaid = customerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const rows = [];

    for (let i = 1; i <= duration; i++) {
      const dueDate = new Date(startDate.getTime());
      if (frequency === "Daily") {
        dueDate.setDate(dueDate.getDate() + (i - 1));
      } else if (frequency === "Weekly") {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
      } else {
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      }
      const dueDateStr = formatDateToYMD(dueDate);

      const remainingGross = Math.max(0, gross - (currentLoan.capitalDeduction || 0));
      let installmentAmt = 0;
      let principalPortion = 0;
      let interestPortion = 0;

      if (i === duration) {
        installmentAmt = runningBalance;
        interestPortion = Math.max(0, totalInt - Math.round(totalInt / duration) * (duration - 1));
        principalPortion = Math.max(0, installmentAmt - interestPortion);
      } else {
        installmentAmt = Math.round(totalRepay / duration);
        principalPortion = Math.round(remainingGross / duration);
        interestPortion = Math.max(0, installmentAmt - principalPortion);
      }

      runningBalance = Math.max(0, runningBalance - installmentAmt);

      let rowStatus: "PAID" | "OVERDUE" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
      if (accumulatedPaid >= installmentAmt) {
        rowStatus = "PAID";
        accumulatedPaid -= installmentAmt;
      } else if (accumulatedPaid > 0) {
        accumulatedPaid = 0;
        rowStatus = dueDateStr < todayStr ? "OVERDUE" : dueDateStr === todayStr ? "DUE_TODAY" : "UPCOMING";
      } else {
        if (dueDateStr < todayStr) {
          rowStatus = "OVERDUE";
        } else if (dueDateStr === todayStr) {
          rowStatus = "DUE_TODAY";
        } else {
          rowStatus = "UPCOMING";
        }
      }

      rows.push({
        cycle: i,
        dueDate: dueDateStr,
        installmentAmount: installmentAmt,
        principalPortion,
        interestPortion,
        balance: runningBalance,
        status: rowStatus,
      });
    }

    return rows;
  }, [currentLoan, customerPayments, todayStr]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("customerSessionId");
    }
    window.location.href = "/login";
  };

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

          {/* Right Customer Info & Secure Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Customer Avatar & ID */}
            <div className="flex items-center gap-3">
              <div
                suppressHydrationWarning
                className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-red-600/20 overflow-hidden shrink-0"
              >
                {currentCustomer.photoUrl ? (
                  <img
                    src={currentCustomer.photoUrl}
                    alt={currentCustomer.name || "Customer"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (currentCustomer.fullName || currentCustomer.name || "B").charAt(0)
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p suppressHydrationWarning className="text-xs font-bold text-slate-900 leading-tight">
                  {currentCustomer.fullName || currentCustomer.name}
                </p>
                <p suppressHydrationWarning className="text-[11px] font-mono text-slate-500 mt-0.5">
                  ID: {currentCustomer.id}
                </p>
              </div>
            </div>

            {/* Secure Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
              title="Secure Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

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
                  {currentCustomer.status || "Active"} Borrower
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700">
                  {currentCustomer.district} District
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                  <ShieldCheck size={12} />
                  Verified Session
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Welcome back, {currentCustomer.name}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Review your active loan balances, check installment due dates, track payment milestones, and download official settlement receipts.
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
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                <span className="text-slate-700 font-bold">Facility:</span>
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
              <span className="text-slate-600 font-bold block">Principal Amount</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
                {MONEY(totalPrincipal)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-bold block">Interest Rate</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
                {currentLoan?.interestRate || 3.0}% / mo
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-bold block">Duration</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.duration || 6} Months
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-bold block">Frequency</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.repaymentFrequency || "Monthly"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-bold block">Issue Date</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.issueDate || "2026-09-20"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-bold block">Facility Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {currentLoan?.status || "Active"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Interactive Installment Schedule & Repayment History Tabs ───────── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Section Header with Tabs */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Loan Repayment Schedule & History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Check installment due dates, track payment milestones, and download official receipts.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Tab Selector */}
              <div className="p-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    activeTab === "schedule"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Calendar size={14} className={activeTab === "schedule" ? "text-red-600" : "text-slate-400"} />
                  Installment Due Dates ({installmentSchedule.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    activeTab === "history"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Receipt size={14} className={activeTab === "history" ? "text-emerald-600" : "text-slate-400"} />
                  Payment Receipts ({customerPayments.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsStatementOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <FileText size={14} />
                Statement
              </button>
            </div>
          </div>

          {/* TAB 1: Installment Due Dates & Schedule */}
          {activeTab === "schedule" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider font-black border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Cycle #</th>
                    <th className="py-3 px-4">Installment Due Date</th>
                    <th className="py-3 px-4">Installment Due</th>
                    <th className="py-3 px-4">Principal Component</th>
                    <th className="py-3 px-4">Interest Component</th>
                    <th className="py-3 px-4">Remaining Balance</th>
                    <th className="py-3 px-4 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {installmentSchedule.map((row) => (
                    <tr key={row.cycle} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        Installment #{row.cycle}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {row.dueDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {MONEY(row.installmentAmount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {MONEY(row.principalPortion)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {MONEY(row.interestPortion)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {MONEY(row.balance)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {row.status === "PAID" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        )}
                        {row.status === "DUE_TODAY" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} /> Due Today
                          </span>
                        )}
                        {row.status === "OVERDUE" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle size={12} /> Overdue
                          </span>
                        )}
                        {row.status === "UPCOMING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Upcoming Due
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Repayment History & Receipts */}
          {activeTab === "history" && (
            <div>
              {customerPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider font-black border-b border-slate-200">
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                              title="Download & Print Official Settlement Receipt"
                            >
                              <Receipt size={13} className="text-white shrink-0" />
                              <span className="text-white font-bold">Receipt</span>
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
                  <p className="text-sm font-semibold text-slate-600">No payment receipts recorded yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your payments will appear here once credited by our cashiers or recorded by field officers.
                  </p>
                </div>
              )}
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
                  <p className="text-[11px] text-slate-400 font-mono">Issued: {todayStr}</p>
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
                <span className="text-slate-600 block font-bold">Remaining</span>
                <span className="text-sm font-bold text-rose-600 font-mono">{MONEY(outstandingBalance)}</span>
              </div>
            </div>

            {/* Statement Transactions */}
            <div className="flex-1 overflow-y-auto py-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                Transaction History
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
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
                      <td className="p-2.5 text-slate-700 font-medium">{p.date}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{p.receiptNo || p.id}</td>
                      <td className="p-2.5 text-slate-700 font-semibold">{p.method || "Cash"}</td>
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
