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
  ChevronRight,
  Sparkles,
  Eye,
  Coins,
  ExternalLink,
  Wallet,
  Check,
  Upload,
  Image as ImageIcon,
  FileCheck,
  XCircle,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";
import { CustomerPaymentGatewayModal } from "@/components/payment/CustomerPaymentGatewayModal";
import type { Payment, OnlinePayment } from "@/types";

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
  const { customers, loans, repayments, onlinePayments, addOnlinePayment } = useData();

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

  // Tab state: 'schedule' (Installment Due Dates) | 'history' (Repayment History) | 'slips' (Bank Slips & Online)
  const [activeTab, setActiveTab] = useState<"schedule" | "history" | "slips">("schedule");

  // Receipt & Statement Modal States
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Secure Payment Gateway Modal States
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayLoanId, setGatewayLoanId] = useState<string>("");

  const handleOpenGateway = (targetLoanId?: string) => {
    const loanIdToUse = targetLoanId || activeLoanId || customerLoans[0]?.id || "";
    const loanStat = loanIdToUse ? loanStats.get(loanIdToUse) : null;
    const targetLoan = customerLoans.find((l) => l.id === loanIdToUse);
    const due = loanStat ? loanStat.outstanding : portfolioSummary.totalOutstandingSum;
    if (due <= 0 || targetLoan?.status === "Completed") {
      return;
    }
    setGatewayLoanId(loanIdToUse);
    setIsGatewayOpen(true);
  };

  const handleGatewaySuccess = (receiptNo?: string) => {
    if (receiptNo) {
      setActiveTab("history");
      const match = repayments.find((p) => p.receiptNo === receiptNo);
      if (match) {
        setReceiptToPrint(match);
      }
    } else {
      setActiveTab("slips");
    }
  };

  // Viewing Slip Details Modal
  const [viewingSlip, setViewingSlip] = useState<OnlinePayment | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");

  // Customer's online payment slips
  const customerOnlinePayments = useMemo(() => {
    if (!currentCustomer?.id) return [];
    if (!currentLoan) {
      return onlinePayments.filter(
        (op) =>
          op.customerId === currentCustomer.id ||
          (op.customerNic && op.customerNic.toLowerCase() === currentCustomer.nic?.toLowerCase())
      );
    }
    return onlinePayments.filter(
      (op) =>
        op.loanId === currentLoan.id ||
        (op.customerId === currentCustomer.id && (!op.loanId || op.loanId === currentLoan.id))
    );
  }, [onlinePayments, currentCustomer, currentLoan]);

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
    <div className="min-h-screen bg-slate-50/80 font-sans flex flex-col">
      {/* ═══ Top Global Header (Brand + Borrower Self-Service Status) ═══ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" theme="light" />
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-slate-800 uppercase">
                Customer Portal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentLoan && (
              <button
                type="button"
                onClick={() => setActiveLoanId("")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">All Facilities</span>
                <span className="sm:hidden">Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsStatementOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="View and print official account statement"
            >
              <Printer size={13} className="text-red-600" />
              <span className="hidden md:inline">Official Statement</span>
              <span className="md:hidden">Statement</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Secure Sign Out"
            >
              <LogOut size={13} />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Main Portal Container ═════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* ═══ Welcome Hero Card with Borrower Identity ═════════════════ */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 text-white rounded-3xl p-5 sm:p-6 lg:p-7 shadow-lg border border-slate-850">
          {/* Subtle Ambient Glows */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-16 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border-2 border-white/20 text-white flex items-center justify-center font-black text-xl shrink-0 overflow-hidden shadow-inner backdrop-blur-xs">
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
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {currentCustomer.fullName || currentCustomer.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    Verified Borrower
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-300 font-mono flex-wrap">
                  {currentCustomer.id && (
                    <span className="bg-white/10 px-2 py-0.5 rounded-md">
                      ID: <b>{currentCustomer.id}</b>
                    </span>
                  )}
                  {currentCustomer.nic && (
                    <span className="bg-white/10 px-2 py-0.5 rounded-md">
                      NIC: <b>{currentCustomer.nic}</b>
                    </span>
                  )}
                  {currentCustomer.phone && (
                    <span className="hidden sm:inline-block text-slate-300">
                      📞 {currentCustomer.phone}
                    </span>
                  )}
                  {currentCustomer.town && (
                    <span className="text-slate-300">📍 {currentCustomer.town}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 md:pt-0 border-t border-white/10 md:border-0 text-left md:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Facilities
              </span>
              <span className="text-sm font-black text-white font-mono">
                {portfolioSummary.activeCount} Active / {customerLoans.length} Total
              </span>
            </div>
          </div>
        </div>

        {uploadSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs animate-in fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{uploadSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadSuccessMsg("")}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {!currentLoan ? (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW 1: MY LOAN FACILITIES LIST (Default View)
             ═══════════════════════════════════════════════════════════════════ */
          <div className="space-y-5">
            {/* ═══ Portfolio Summary 4-KPI Grid ════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Total Facilities */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Total Facilities
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Coins size={17} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight">
                    {customerLoans.length} Loans
                  </p>
                  <p className="text-xs text-blue-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {portfolioSummary.activeCount} Active Contracts
                  </p>
                </div>
              </div>

              {/* Card 2: Total Borrowed */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Total Borrowed
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CreditCard size={17} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight truncate">
                    {MONEY(portfolioSummary.totalBorrowing)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Payable: <b className="font-mono text-slate-700">{MONEY(portfolioSummary.totalPayableSum)}</b>
                  </p>
                </div>
              </div>

              {/* Card 3: Total Repaid */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Total Repaid
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CheckCircle2 size={17} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl sm:text-2xl font-black font-mono text-emerald-600 tracking-tight truncate">
                    {MONEY(portfolioSummary.totalPaidSum)}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 truncate">
                    <Check size={12} /> Recorded Repayments
                  </p>
                </div>
              </div>

              {/* Card 4: Total Outstanding */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    Total Outstanding
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Wallet size={17} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight truncate">
                    {MONEY(portfolioSummary.totalOutstandingSum)}
                  </p>
                  <p className="text-xs font-bold truncate">
                    {portfolioSummary.totalOutstandingSum === 0 ? (
                      <span className="text-emerald-600">🎉 Fully Settled</span>
                    ) : (
                      <span className="text-rose-600">Remaining Balance</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ Loans Section ════════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>My Loan Facilities</span>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200/60 rounded-full">
                      {customerLoans.length} {customerLoans.length === 1 ? "Facility" : "Facilities"}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your loan facility to view installment due dates, repayment history, and download official receipts.
                  </p>
                </div>
              </div>

              {customerLoans.length === 1 ? (
                /* ── Single Loan Featured Showcase Card (Fills screen beautifully) ── */
                (() => {
                  const loan = customerLoans[0];
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
                    <div className="bg-gradient-to-br from-white via-white to-slate-50/60 rounded-2xl border-2 border-slate-200 hover:border-red-300 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Left Column: Facility Identity, Purpose, Installment */}
                        <div className="lg:col-span-6 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Target Loan Facility
                              </span>
                              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                                {loan.loanNo || loan.id}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full border ${statusClass}`}
                              >
                                {loan.status || "Active"}
                              </span>
                              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {loan.repaymentFrequency || "Daily"}
                              </span>
                            </div>
                          </div>

                          {loan.purpose && (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-700">
                              <span>Purpose:</span>
                              <span className="font-bold text-slate-900">&ldquo;{loan.purpose}&rdquo;</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                Installment
                              </span>
                              <span className="text-base font-black font-mono text-slate-900">
                                {MONEY(loan.installment || 0)}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                Duration / Cycles
                              </span>
                              <span className="text-base font-black font-mono text-slate-900">
                                {loan.duration || 30} Cycles
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                            {/* Pay Now Button - Available ONLY when there is an active payment due */}
                            {(stats.outstanding || 0) > 0 && loan.status !== "Completed" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGateway(loan.id)}
                                  className="flex-1 py-3 px-6 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 via-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/25 cursor-pointer active:scale-[0.99]"
                                  title={`Pay installment of ${MONEY(loan.installment || 0)}`}
                                >
                                  <CreditCard size={16} className="text-white" />
                                  <span>Pay Now</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setActiveLoanId(loan.id)}
                                  className="py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer shrink-0"
                                >
                                  <Eye size={15} className="text-slate-400" />
                                  <span>View Schedule</span>
                                  <ChevronRight size={14} className="text-slate-400" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActiveLoanId(loan.id)}
                                  className="flex-1 py-3 px-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                                >
                                  <Eye size={15} className="text-slate-500" />
                                  <span>View Installment Schedule &amp; Receipts</span>
                                  <ChevronRight size={14} className="text-slate-400" />
                                </button>

                                <span className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0">
                                  <CheckCircle2 size={15} className="text-emerald-600" />
                                  <span>No Dues • Fully Settled</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Financial Breakdown Matrix & Progress */}
                        <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Financial Breakdown &amp; Progress
                          </span>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                              <span className="text-slate-500 font-medium">Principal Disbursed:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {MONEY(loan.principal || loan.amount || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                              <span className="text-slate-500 font-medium">Total Payable:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {MONEY(stats.payable)}
                              </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                              <span className="text-slate-500 font-medium">Total Repaid:</span>
                              <span className="font-bold font-mono text-emerald-600">
                                {MONEY(stats.paid)}
                              </span>
                            </div>
                            <div className="pt-2 flex justify-between items-baseline">
                              <span className="text-xs font-bold text-slate-700 uppercase">
                                Remaining Balance:
                              </span>
                              <span className="text-lg font-black font-mono text-slate-900">
                                {MONEY(stats.outstanding)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-red-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                              <span>{stats.percent}% Settled</span>
                              <span>{stats.paymentsCount} Payments Recorded</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : customerLoans.length > 1 ? (
                /* ── Multiple Loans Grid ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

                        <div className="mt-4 flex items-center gap-2">
                          {(stats?.outstanding || 0) > 0 && loan.status !== "Completed" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenGateway(loan.id)}
                                className="flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xs shadow-red-600/25 cursor-pointer active:scale-[0.99]"
                                title="Pay installment now"
                              >
                                <CreditCard size={14} className="text-white" />
                                <span>Pay Now</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveLoanId(loan.id)}
                                className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                              >
                                <Eye size={14} className="text-slate-400" />
                                <span>Details</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveLoanId(loan.id)}
                                className="flex-1 py-2.5 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Eye size={14} className="text-slate-500" />
                                <span>View Facility</span>
                              </button>
                              <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shrink-0">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Settled</span>
                              </span>
                            </>
                          )}
                        </div>
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
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW 2: SPECIFIC LOAN DETAILED VIEW (Active when a loan is selected)
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* ═══ Active Facility Top Navigator Bar ══════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveLoanId("")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>All Facilities</span>
                </button>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">Viewing Facility:</span>
                  <span className="text-sm font-black font-mono text-slate-900">
                    {currentLoan?.loanNo || currentLoan?.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {currentLoan?.status || "Active"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                {customerLoans.length > 1 && (
                  <select
                    value={currentLoan?.id}
                    onChange={(e) => setActiveLoanId(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none"
                  >
                    {customerLoans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.loanNo || l.id} ({MONEY(l.principal || l.amount || 0)})
                      </option>
                    ))}
                  </select>
                )}
                {outstandingBalance > 0 && currentLoan?.status !== "Completed" ? (
                  <button
                    type="button"
                    onClick={() => handleOpenGateway(currentLoan?.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25 cursor-pointer active:scale-[0.99]"
                    title="Pay installment now"
                  >
                    <CreditCard size={13} className="text-white" />
                    <span>Pay Now</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Fully Settled</span>
                  </span>
                )}
              </div>
            </div>

            {/* ═══ Zone 1: Financial Standing Pulse (4 Micro KPI Cards) ═════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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

                  <button
                    type="button"
                    onClick={() => setActiveTab("slips")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "slips"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard size={13} className={activeTab === "slips" ? "text-blue-600" : "text-slate-400"} />
                    <span>Bank Slips ({customerOnlinePayments.length})</span>
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

              {/* TAB 3: Online Bank Slips Table */}
              {activeTab === "slips" && (
                <div className="overflow-x-auto min-w-full">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 font-medium">
                      All submitted electronic transfer slips and online payments for this facility.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenGateway(currentLoan?.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      title="Upload a new bank deposit slip"
                    >
                      <Upload size={12} />
                      <span>Upload Slip</span>
                    </button>
                  </div>
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                      <tr>
                        <th className="py-2.5 px-4">Slip ID</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Bank &amp; Ref</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Verification Status</th>
                        <th className="py-2.5 px-4 text-right">Action / Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {customerOnlinePayments.map((op) => {
                        const isPending = op.status === "PENDING";
                        const isApproved = op.status === "COMPLETED";
                        const isDeclined = op.status === "REJECTED";

                        return (
                          <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900 text-xs">
                              {op.id}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">
                              {op.paymentDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800 block text-xs truncate max-w-[160px]">
                                {op.bankName}
                              </span>
                              {op.referenceNumber && (
                                <span className="text-[10px] font-mono text-slate-400 block">
                                  Ref: {op.referenceNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                              {MONEY(op.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock size={10} /> Pending Review
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 size={10} /> Approved &amp; Credited
                                </span>
                              )}
                              {isDeclined && (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                                  title={op.reviewNotes || "Declined by accounts team"}
                                >
                                  <XCircle size={10} /> Declined
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setViewingSlip(op)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                                  title="View Uploaded Bank Slip"
                                >
                                  <Eye size={12} className="text-slate-500 shrink-0" />
                                  <span>View Slip</span>
                                </button>
                                {isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchingPayment: Payment = repayments.find((p) => p.receiptNo === op.receiptNo) || {
                                        id: op.receiptNo || op.id,
                                        loanId: op.loanId,
                                        customerId: op.customerId,
                                        amount: op.amount,
                                        date: op.paymentDate,
                                        type: "Capital",
                                        method: "Bank Transfer",
                                        collectedBy: op.reviewedBy || "Finance Admin",
                                        receiptNo: op.receiptNo,
                                      };
                                      setReceiptToPrint(matchingPayment);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                                    title="View Official Repayment Receipt"
                                  >
                                    <Receipt size={12} className="text-emerald-600 shrink-0" />
                                    <span>Receipt</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {customerOnlinePayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            <Upload size={32} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">No bank slips submitted yet</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              After making a bank transfer or cash deposit, upload your slip here for quick verification.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenGateway()}
                              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              <Upload size={12} />
                              <span>Upload Deposit Slip</span>
                            </button>
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

                {/* Quick Upload Button */}
                {/* Upload Bank Slip Proof */}
                <button
                  type="button"
                  onClick={() => handleOpenGateway(currentLoan?.id)}
                  className="w-full mt-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Upload proof of bank transfer or deposit slip"
                >
                  <Upload size={14} />
                  <span>Upload Deposit Slip</span>
                </button>
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
      </main>

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

      {/* ── Modal 2: Viewing Slip Modal ──────────────────────────────────── */}
      {viewingSlip && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-red-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Bank Deposit Slip · {viewingSlip.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSlip(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Slip Status Banner */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                viewingSlip.status === "COMPLETED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : viewingSlip.status === "REJECTED"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {viewingSlip.status === "COMPLETED" && (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Approved &amp; Credited! Official Receipt: <b>{viewingSlip.receiptNo}</b>
                  </span>
                </>
              )}
              {viewingSlip.status === "REJECTED" && (
                <>
                  <XCircle size={16} className="text-rose-600 shrink-0" />
                  <span>
                    Slip Declined: {viewingSlip.reviewNotes || "Verification failed. Contact branch."}
                  </span>
                </>
              )}
              {viewingSlip.status === "PENDING" && (
                <>
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Pending Admin Verification — Your loan balance will update as soon as the accounts team approves this slip.
                  </span>
                </>
              )}
            </div>

            {/* Slip Image View */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
              <img
                src={viewingSlip.slipUrl}
                alt="Bank Slip"
                className="max-h-72 mx-auto rounded-lg object-contain shadow-xs border border-slate-200/80"
              />
            </div>

            {/* Slip metadata breakdown */}
            <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {MONEY(viewingSlip.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank:</span>
                <span className="font-semibold text-slate-800">{viewingSlip.bankName}</span>
              </div>
              {viewingSlip.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference No:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingSlip.referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Transfer Date:</span>
                <span className="font-medium text-slate-800">{viewingSlip.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility ID:</span>
                <span className="font-mono font-bold text-red-600">{viewingSlip.loanNo || viewingSlip.loanId}</span>
              </div>
              {viewingSlip.notes && (
                <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <span className="text-slate-400 block font-bold">Borrower Remarks:</span>
                  {viewingSlip.notes}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingSlip(null)}
                className="px-4 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Secure Fintech Customer Payment Gateway Modal ────────────────── */}
      {currentCustomer && isGatewayOpen && (
        <CustomerPaymentGatewayModal
          isOpen={isGatewayOpen}
          onClose={() => setIsGatewayOpen(false)}
          customer={currentCustomer}
          loans={customerLoans}
          initialLoanId={gatewayLoanId}
          onPaymentSuccess={handleGatewaySuccess}
        />
      )}
    </div>
  );
}
