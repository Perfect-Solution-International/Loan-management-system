/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  Clock,
  Printer,
  CheckCircle2,
  FileText,
  Receipt,
  X,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Building,
  Phone,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  Coins,
  ExternalLink,
  Wallet,
  Check,
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

  // Session customer state & today's date
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
      const urlLoanId = params.get("loanId");
      if (urlLoanId) {
        setActiveLoanId(urlLoanId);
      }
    }
  }, []);

  const [lookupQuery, setLookupQuery] = useState<string>("");
  const [lookupError, setLookupError] = useState<string>("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    const term = lookupQuery.trim().toLowerCase();
    if (!term) {
      setLookupError("Please enter your NIC number or Registered Mobile Phone.");
      return;
    }
    const found = customers.find(
      (c) =>
        c.id.toLowerCase() === term ||
        c.nic.toLowerCase() === term ||
        c.phone.replace(/[^0-9]/g, "") === term.replace(/[^0-9]/g, "") ||
        (c.email && c.email.toLowerCase() === term)
    );
    if (found) {
      setSessionCustomerId(found.id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customerSessionId", found.id);
      }
    } else {
      setLookupError("No borrower account found with the provided NIC or Phone number.");
    }
  };

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
    return null;
  }, [customers, sessionCustomerId]);

  // Loans belonging to current customer
  const customerLoans = useMemo(() => {
    if (!currentCustomer?.id) return [];
    return loans.filter(
      (l) => l.customerId === currentCustomer.id || l.customerName === currentCustomer.name
    );
  }, [loans, currentCustomer]);

  // Active primary loan (empty string by default to show Loans List first)
  const [activeLoanId, setActiveLoanId] = useState<string>("");

  const currentLoan = useMemo(() => {
    if (activeLoanId) {
      const match = customerLoans.find((l) => l.id === activeLoanId);
      if (match) return match;
    }
    return null;
  }, [customerLoans, activeLoanId]);

  // Pre-calculate statistics for each customer loan
  const loanStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        paid: number;
        payable: number;
        outstanding: number;
        percent: number;
        paymentsCount: number;
      }
    >();

    customerLoans.forEach((loan) => {
      const principal = loan.principal || loan.amount || 0;
      const interest = loan.interest || (loan.totalRepayment ? loan.totalRepayment - principal : 0);
      const payable = loan.totalRepayment || (principal + interest);

      const loanPayments = repayments.filter(
        (p) =>
          p.loanId === loan.id ||
          (currentCustomer?.id && p.customerId === currentCustomer.id && !p.loanId)
      );
      const paid = loanPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const outstanding = Math.max(0, payable - paid);
      const percent = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 0;

      statsMap.set(loan.id, {
        paid,
        payable,
        outstanding,
        percent,
        paymentsCount: loanPayments.length,
      });
    });

    return statsMap;
  }, [customerLoans, repayments, currentCustomer?.id]);

  // Portfolio overview totals across all facilities
  const portfolioSummary = useMemo(() => {
    let totalBorrowing = 0;
    let totalPayableSum = 0;
    let totalPaidSum = 0;
    let totalOutstandingSum = 0;

    customerLoans.forEach((loan) => {
      const principal = loan.principal || loan.amount || 0;
      totalBorrowing += principal;
      const stat = loanStats.get(loan.id);
      if (stat) {
        totalPayableSum += stat.payable;
        totalPaidSum += stat.paid;
        totalOutstandingSum += stat.outstanding;
      }
    });

    return {
      activeCount: customerLoans.filter((l) => (l.status || "").toLowerCase() === "active").length,
      totalCount: customerLoans.length,
      totalBorrowing,
      totalPayableSum,
      totalPaidSum,
      totalOutstandingSum,
    };
  }, [customerLoans, loanStats]);

  // Payments / Repayments for current customer's loans
  const customerPayments = useMemo(() => {
    if (!currentCustomer?.id) return [];
    if (!currentLoan) {
      return repayments.filter((p) => p.customerId === currentCustomer.id);
    }
    return repayments.filter(
      (p) => p.loanId === currentLoan.id || p.customerId === currentCustomer.id
    );
  }, [repayments, currentLoan, currentCustomer?.id]);

  // Calculate financial totals
  const totalPrincipal = currentLoan ? currentLoan.principal || currentLoan.amount || 0 : 0;
  const totalInterest = currentLoan ? currentLoan.interest || (currentLoan.totalRepayment ? currentLoan.totalRepayment - totalPrincipal : 0) : 0;
  const totalPayable = currentLoan ? currentLoan.totalRepayment || (totalPrincipal + totalInterest) : 0;

  const totalPaid = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [customerPayments]);

  const outstandingBalance = Math.max(0, totalPayable - totalPaid);
  const percentSettled = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0;

  // Upcoming installment calculations
  const nextInstallmentAmount = currentLoan?.installment || (totalPayable > 0 ? Math.ceil(totalPayable / (currentLoan?.duration || 1)) : 0);
  const nextDueDate = currentLoan?.firstPaymentDate || currentLoan?.issueDate || todayStr;

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
    const startDate = parseDateString(currentLoan.firstPaymentDate || currentLoan.issueDate) || parseDateString(todayStr)!;
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

  if (!currentCustomer) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <BrandLogo size="lg" theme="light" />
          </div>
          <h2 className="mt-5 text-center text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Borrower Portal Login
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500 font-medium">
            Access your loan balances, repayment schedule, and download payment receipts.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-6 px-5 sm:px-7 shadow-xs rounded-2xl border border-slate-200 space-y-5">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  National ID (NIC) or Registered Mobile
                </label>
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => {
                    setLookupQuery(e.target.value);
                    setLookupError("");
                  }}
                  placeholder="e.g. 199512345678 or 0771234567"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  autoFocus
                />
                {lookupError && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle size={13} /> {lookupError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={16} />
                <span>Verify &amp; Access Facility</span>
              </button>
            </form>

            <div className="pt-2 text-center border-t border-slate-100">
              <a
                href="/login"
                className="text-xs font-semibold text-slate-500 hover:text-red-600 transition inline-flex items-center gap-1"
              >
                <span>Staff or Management Officer?</span>
                <span className="font-bold underline">Staff Login</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const borrowerInitials = (currentCustomer.fullName || currentCustomer.name || "B")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-8 space-y-3.5">
        {/* ═══ Customer Identity & Portal Action Strip ══════════════════════ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
              {currentCustomer.photoUrl ? (
                <img
                  src={currentCustomer.photoUrl}
                  alt={currentCustomer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                borrowerInitials
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 leading-tight">
                  {currentCustomer.fullName || currentCustomer.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck size={11} className="text-emerald-600" />
                  Verified Borrower
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {currentCustomer.id ? `ID: ${currentCustomer.id} · ` : ""}
                {currentCustomer.nic ? `NIC: ${currentCustomer.nic}` : "Registered Borrower"}
                {currentCustomer.town ? ` · ${currentCustomer.town}` : ""}
              </p>
            </div>
          </div>

          {/* Quick Actions & Facility Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {currentLoan && (
              <button
                type="button"
                onClick={() => setActiveLoanId("")}
                className="inline-flex items-center gap-1.5 px-3 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                title="Return to All Loans"
              >
                <ArrowLeft size={13} className="text-slate-600" />
                <span>All Loans</span>
              </button>
            )}

            {currentLoan && customerLoans.length > 1 && (
              <select
                value={currentLoan.id}
                onChange={(e) => setActiveLoanId(e.target.value)}
                className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none"
              >
                {customerLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.loanNo || l.id} ({MONEY(l.principal || l.amount || 0)})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setIsStatementOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
            >
              <Printer size={13} className="text-red-600" />
              <span>Statement</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 px-2.5 h-8 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
              title="Secure Sign Out"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {!currentLoan ? (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW 1: MY LOAN FACILITIES LIST (Default View)
             ═══════════════════════════════════════════════════════════════════ */
          <div className="space-y-4">
            {/* Portfolio Summary 4-KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Coins size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Total Facilities
                  </p>
                  <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                    {customerLoans.length} Loans
                  </p>
                  <p className="text-[10px] text-blue-600 font-semibold truncate">
                    {portfolioSummary.activeCount} Active Contracts
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <CreditCard size={16} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Total Borrowed
                  </p>
                  <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                    {MONEY(portfolioSummary.totalBorrowing)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    Payable: {MONEY(portfolioSummary.totalPayableSum)}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Total Repaid
                  </p>
                  <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 leading-tight">
                    {MONEY(portfolioSummary.totalPaidSum)}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium truncate">
                    Recorded Payments
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                  <Wallet size={16} className="text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    Total Outstanding
                  </p>
                  <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                    {MONEY(portfolioSummary.totalOutstandingSum)}
                  </p>
                  <p className="text-[10px] text-rose-600 font-medium truncate">
                    Remaining Balance
                  </p>
                </div>
              </div>
            </div>

            {/* Loans Cards Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    My Loan Facilities
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select any loan facility below to view its installment due dates, payments history, and settlement receipts.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                  Total: {customerLoans.length} Facilities
                </span>
              </div>

              {customerLoans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerLoans.map((loan) => {
                    const stats = loanStats.get(loan.id) || {
                      paid: 0,
                      payable: loan.totalRepayment || (loan.principal || 0),
                      outstanding: loan.totalRepayment || (loan.principal || 0),
                      percent: 0,
                      paymentsCount: 0,
                    };

                    const statusLower = (loan.status || "").toLowerCase();
                    const statusClass =
                      statusLower === "completed"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : statusLower === "overdue"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : "bg-blue-100 text-blue-800 border-blue-200";

                    return (
                      <div
                        key={loan.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-red-300 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Loan Facility
                              </span>
                              <h3 className="text-base font-black text-slate-900 font-mono group-hover:text-red-600 transition">
                                {loan.loanNo || loan.id}
                              </h3>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}
                              >
                                {loan.status || "Active"}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {loan.repaymentFrequency || "Daily"}
                              </span>
                            </div>
                          </div>

                          {loan.purpose && (
                            <p className="text-xs text-slate-600 line-clamp-1 italic">
                              &ldquo;{loan.purpose}&rdquo;
                            </p>
                          )}

                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Principal Disbursed:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {MONEY(loan.principal || loan.amount || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Payable:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {MONEY(stats.payable)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Repaid:</span>
                              <span className="font-bold font-mono text-emerald-600">
                                {MONEY(stats.paid)}
                              </span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/80 flex justify-between items-baseline">
                              <span className="text-[11px] font-bold text-slate-700">
                                Remaining Balance:
                              </span>
                              <span className="text-sm font-black font-mono text-slate-900">
                                {MONEY(stats.outstanding)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-red-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${stats.percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                              <span>{stats.percent}% Settled</span>
                              <span>{stats.paymentsCount} Payments Recorded</span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                            <span>
                              Installment: <b className="text-slate-800 font-mono">{MONEY(loan.installment || 0)}</b>
                            </span>
                            <span>{loan.duration || 30} Cycles</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveLoanId(loan.id)}
                          className="w-full mt-4 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer group-hover:bg-red-700"
                        >
                          <Eye size={14} />
                          <span>View Loan Details &amp; Schedule</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800">
                    No active loan facilities found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    There are no registered loans under your borrower account. Please contact your loan officer or branch office.
                  </p>
                </div>
              )}
            </div>

            {/* Assistance & Helpline strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={16} className="text-red-600 shrink-0" />
                <span>Need assistance? <b>Branch Hotline: 011-2345678</b> (Mon-Sat 8:30AM - 5:00PM)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition cursor-pointer"
              >
                <Printer size={13} className="text-red-600" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW 2: SPECIFIC LOAN DETAILED VIEW (Active when a loan is selected)
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* ═══ Zone 1: Financial Standing Pulse (4 Micro KPI Cards) ═════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Outstanding Balance */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <CreditCard size={16} className="text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Outstanding Balance
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {MONEY(outstandingBalance)}
              </p>
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-red-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex justify-between">
                <span>{percentSettled}% Settled</span>
                <span>Total: {MONEY(totalPayable)}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Upcoming Installment */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Next Installment
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {MONEY(nextInstallmentAmount)}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold truncate flex items-center gap-1 mt-0.5">
                <Clock size={10} />
                Due {nextDueDate}
              </p>
            </div>
          </div>

          {/* Card 3: Total Repaid */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Repaid to Date
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 leading-tight">
                {MONEY(totalPaid)}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium truncate">
                {customerPayments.length} recorded payments
              </p>
            </div>
          </div>

          {/* Card 4: Active Loan Standing */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Facility Standing
              </p>
              <p className="text-sm font-bold text-slate-900 leading-tight font-mono mt-0.5">
                {currentLoan?.loanNo || "No Active Loan"}
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold mt-1 ${
                  (currentLoan?.status || "").toLowerCase() === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : (currentLoan?.status || "").toLowerCase() === "overdue"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {currentLoan?.status || "Active Contract"}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ Zone 2: Core Two Pillars ═════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* ── Left Pillar (68%): Installment Schedule & Receipts Vault Tabs ── */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header & Tab Bar */}
              <div className="p-3 sm:p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Repayment Schedule &amp; Receipts
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Verified installments, cycle due dates, and official settlement receipts
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "schedule"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Calendar size={13} className={activeTab === "schedule" ? "text-red-600" : "text-slate-400"} />
                    <span>Due Dates ({installmentSchedule.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "history"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt size={13} className={activeTab === "history" ? "text-emerald-600" : "text-slate-400"} />
                    <span>Receipts ({customerPayments.length})</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: Installment Due Dates Table */}
              {activeTab === "schedule" && (
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                      <tr>
                        <th className="py-2.5 px-4">Cycle</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3 text-right">Installment</th>
                        <th className="py-2.5 px-3 text-right">Principal</th>
                        <th className="py-2.5 px-3 text-right">Interest</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                        <th className="py-2.5 px-4 text-center">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {installmentSchedule.map((row) => (
                        <tr key={row.cycle} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800 text-xs">
                            #{row.cycle}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 text-xs">
                            {row.dueDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                            {MONEY(row.installmentAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">
                            {MONEY(row.principalPortion)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">
                            {MONEY(row.interestPortion)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">
                            {MONEY(row.balance)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {row.status === "PAID" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <Check size={10} /> Paid
                              </span>
                            )}
                            {row.status === "DUE_TODAY" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Clock size={10} /> Due Today
                              </span>
                            )}
                            {row.status === "OVERDUE" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle size={10} /> Overdue
                              </span>
                            )}
                            {row.status === "UPCOMING" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                Upcoming
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {installmentSchedule.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            <Calendar size={32} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">No active installment schedule</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              When a loan is issued, the payment schedule will automatically appear here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Payment Receipts Table */}
              {activeTab === "history" && (
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                      <tr>
                        <th className="py-2.5 px-4">Receipt No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                        <th className="py-2.5 px-3">Collector</th>
                        <th className="py-2.5 px-4 text-right">Official Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {customerPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 text-xs">
                            {p.receiptNo || p.id}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-xs">{p.date}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {p.method || "Cash"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 text-xs">
                            {MONEY(p.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-xs">
                            {p.collectedBy || "Authorized Officer"}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptToPrint(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60 font-bold text-[11px] transition cursor-pointer"
                              title="Download & Print Official Settlement Receipt"
                            >
                              <Receipt size={12} className="text-red-600 shrink-0" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {customerPayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            <Receipt size={32} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">No payment receipts recorded yet</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Payments recorded by field officers or branch cashiers will show here immediately.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Pillar (32%): Bank Deposit Channels & Support Helpline ── */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* 1. Official Bank Deposit Channels */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Building size={15} className="text-red-600" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Bank Deposit Accounts
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full">
                  Direct Transfer
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[11px] text-slate-500 font-medium">
                  Use your <strong className="text-slate-800">NIC or Loan ID ({currentLoan?.loanNo || "LN"})</strong> as payment reference when making direct online deposits:
                </p>

                {/* Bank 1: Commercial Bank */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs">Commercial Bank of Ceylon</p>
                  <p className="text-[11px] text-slate-600 font-mono">Acc: <strong>1000 248 952</strong></p>
                  <p className="text-[10px] text-slate-400">Branch: Maharagama Branch</p>
                </div>

                {/* Bank 2: Sampath Bank */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs">Sampath Bank PLC</p>
                  <p className="text-[11px] text-slate-600 font-mono">Acc: <strong>0145 1002 9841</strong></p>
                  <p className="text-[10px] text-slate-400">Branch: City Office, Colombo</p>
                </div>
              </div>
            </div>

            {/* 2. Customer Assistance Helpline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Phone size={15} className="text-slate-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Assistance &amp; Helpline
                </h3>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-[11px]">Branch Helpline:</span>
                  <a href="tel:0112345678" className="font-bold text-red-600 hover:underline">
                    011-2345678
                  </a>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-[11px]">Field Support:</span>
                  <a href="tel:0771234567" className="font-bold text-slate-900 hover:underline">
                    077-1234567
                  </a>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-[11px]">Hours:</span>
                  <span className="font-semibold text-slate-700">Mon - Sat: 8:30 AM - 5:00 PM</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 pt-1">
                For settlement queries or installment adjustments, contact your loan officer directly.
              </p>
            </div>
          </div>
        </div>
      </>
      )}
    </div>

      {/* ── Single Payment Printable Receipt Modal ───────────────────────── */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <BrandLogo size="sm" theme="light" />
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="py-4 text-center border-b border-dashed border-slate-200">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full mb-1.5">
                OFFICIAL PAYMENT RECEIPT
              </span>
              <p className="font-mono text-xs text-slate-500">
                Receipt No: <strong className="text-slate-900">{receiptToPrint.receiptNo || receiptToPrint.id}</strong>
              </p>
              <h2 className="text-2xl font-black text-slate-900 font-mono mt-2">
                {MONEY(receiptToPrint.amount)}
              </h2>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                Payment Credited Successfully
              </p>
            </div>

            {/* Receipt Details Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-semibold text-slate-800">{currentCustomer.fullName || currentCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility ID:</span>
                <span className="font-mono font-bold text-red-600">{currentLoan?.loanNo || "LN"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.method || "Cash"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Collector / Officer:</span>
                <span className="text-slate-800">{receiptToPrint.collectedBy || "Authorized Officer"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="px-3 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Statement of Account Modal ──────────────────────────────── */}
      {isStatementOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" theme="light" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">Borrower Statement of Account</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Issued: {todayStr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Statement Summary */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Principal</span>
                <span className="text-sm font-black text-slate-900 font-mono">{MONEY(totalPrincipal)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Total Repaid</span>
                <span className="text-sm font-black text-emerald-700 font-mono">{MONEY(totalPaid)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] text-rose-700 font-bold uppercase block">Remaining</span>
                <span className="text-sm font-black text-rose-700 font-mono">{MONEY(outstandingBalance)}</span>
              </div>
            </div>

            {/* Statement Transactions */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                Transaction History
              </h4>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Receipt #</th>
                    <th className="p-2">Method</th>
                    <th className="p-2 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customerPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2 text-slate-700">{p.date}</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{p.receiptNo || p.id}</td>
                      <td className="p-2 text-slate-700">{p.method || "Cash"}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{MONEY(p.amount)}</td>
                    </tr>
                  ))}
                  {customerPayments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Strictly confidential · PSI ONE Financial Operations
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                <Printer size={13} /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
