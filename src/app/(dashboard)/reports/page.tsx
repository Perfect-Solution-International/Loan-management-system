/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Download,
  DollarSign,
  PieChart,
  Layers,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Building,
  ShieldCheck,
  Search,
  FileText,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type { Payment, Loan, Customer } from "@/types";
import { getLoanTotalRepayment, calculateLoanFinancials } from "@/lib/loan-financials";
import { BrandLogo } from "@/components/brand-logo";

export default function FinancialReportsPage() {
  const { customers, loans, payments } = useData();

  // Active report tab
  const [reportTab, setReportTab] = useState<
    "collections" | "portfolio" | "income" | "par"
  >("collections");

  // Filter states
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly" | "all" | "custom">("monthly");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  // Custom date range states (safe for SSR)
  const [todayStr, setTodayStr] = useState<string>("2026-10-15");
  const [startDateStr, setStartDateStr] = useState<string>("2026-10-01");
  const [endDateStr, setEndDateStr] = useState<string>("2026-10-31");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().slice(0, 10);
      setTodayStr(today);
      setEndDateStr(today);
      const startOfMonth = today.slice(0, 7) + "-01";
      setStartDateStr(startOfMonth);
    }
  }, []);

  // Fast Lookup Maps for instant O(1) search and retrieval
  const customerMap = useMemo(() => {
    const map = new Map<string, (typeof customers)[0]>();
    for (const c of customers) {
      map.set(String(c.id), c);
    }
    return map;
  }, [customers]);

  const loanMap = useMemo(() => {
    const map = new Map<string, (typeof loans)[0]>();
    for (const l of loans) {
      map.set(String(l.id), l);
    }
    return map;
  }, [loans]);

  // Filtered Payments based on timeframe & search (O(1) cached lookups)
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Date filter
      if (timePeriod === "daily") {
        if (p.date !== todayStr) return false;
      } else if (timePeriod === "weekly") {
        const today = new Date(todayStr + "T00:00:00");
        const pDate = new Date(p.date + "T00:00:00");
        const diffDays = Math.floor((today.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (timePeriod === "monthly") {
        const currentYearMonth = todayStr.slice(0, 7);
        if (!p.date.startsWith(currentYearMonth)) return false;
      } else if (timePeriod === "custom") {
        if (p.date < startDateStr || p.date > endDateStr) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const c = customerMap.get(String(p.customerId));
        const l = loanMap.get(String(p.loanId));
        const cName = (c?.fullName || c?.name || "").toLowerCase();
        const lNo = (l?.loanNo || p.loanId || "").toLowerCase();
        const rNo = (p.receiptNo || "").toLowerCase();
        const method = (p.method || "").toLowerCase();
        if (!cName.includes(q) && !lNo.includes(q) && !rNo.includes(q) && !method.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, timePeriod, todayStr, startDateStr, endDateStr, searchTerm, customerMap, loanMap]);

  // Filtered Loans based on status & search
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (statusFilter !== "ALL") {
        if ((l.status || "").toUpperCase() !== statusFilter.toUpperCase()) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const c = customerMap.get(String(l.customerId));
        const cName = (c?.fullName || c?.name || l.customerName || "").toLowerCase();
        const lNo = (l.loanNo || l.id || "").toLowerCase();
        const nic = (c?.nic || "").toLowerCase();
        if (!cName.includes(q) && !lNo.includes(q) && !nic.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [loans, statusFilter, searchTerm, customerMap]);

  // Aggregate Portfolio Financials
  const totalDisbursed = useMemo(
    () => loans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0),
    [loans]
  );

  const totalRepaymentExpected = useMemo(
    () => loans.reduce((sum, l) => sum + getLoanTotalRepayment(l), 0),
    [loans]
  );

  const totalCollectionsAllTime = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  );

  const totalPeriodCollections = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [filteredPayments]
  );

  // Mathematically exact outstanding balance across active facilities - Linear O(N+M)
  const outstandingReceivable = useMemo(() => {
    const paidByLoan = new Map<string, number>();
    for (const p of payments) {
      if (!p.loanId) continue;
      const id = String(p.loanId);
      paidByLoan.set(id, (paidByLoan.get(id) || 0) + (Number(p.amount) || 0));
    }

    let sum = 0;
    for (const l of loans) {
      if ((l.status || "").toLowerCase() === "completed") continue;
      const totalRepay = getLoanTotalRepayment(l);
      const paid = paidByLoan.get(String(l.id)) || 0;
      sum += Math.max(0, Math.round((totalRepay - paid) * 100) / 100);
    }
    return Math.round(sum * 100) / 100;
  }, [loans, payments]);

  // Single-pass Revenue Breakdown
  const { capitalCollected, interestCollected, otherFeesCollected } = useMemo(() => {
    let capital = 0;
    let interest = 0;
    let other = 0;
    for (const p of filteredPayments) {
      const amt = Number(p.amount) || 0;
      if (p.type === "Capital") capital += amt;
      else if (p.type === "Interest") interest += amt;
      else if (p.type === "Other") other += amt;
    }
    return {
      capitalCollected: capital,
      interestCollected: interest,
      otherFeesCollected: other,
    };
  }, [filteredPayments]);

  const totalPeriodInterestAndFees = interestCollected + otherFeesCollected;

  // Upfront Capital Deductions & Processing Fee Income
  const totalUpfrontDeductions = useMemo(() => {
    return loans.reduce(
      (sum, l) => sum + (l.capitalDeduction || 0) + (l.interestDeduction || 0) + (l.otherFees || 0),
      0
    );
  }, [loans]);

  // Overdue Default Portfolio & PAR Metrics
  const overdueLoansList = useMemo(
    () => loans.filter((l) => (l.status || "").toLowerCase() === "overdue"),
    [loans]
  );

  const overduePortfolio = useMemo(
    () => overdueLoansList.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0),
    [overdueLoansList]
  );

  const parRate =
    totalDisbursed > 0
      ? ((overduePortfolio / totalDisbursed) * 100).toFixed(1)
      : "0.0";

  const collectionEfficiency =
    totalRepaymentExpected > 0
      ? Math.min(100, Math.round((totalCollectionsAllTime / totalRepaymentExpected) * 1000) / 10)
      : 0;

  // Aging Buckets for PAR Audit (calculated from actual repayment history & days overdue)
  const parBuckets = useMemo(() => {
    let b1_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let b90Plus = 0;

    overdueLoansList.forEach((l) => {
      const p = Number(l.principal || l.amount || 0);
      const fin = calculateLoanFinancials(l, payments);
      const bucket = fin.agingBucket;
      if (bucket === "1_30") {
        b1_30 += p;
      } else if (bucket === "31_60") {
        b31_60 += p;
      } else if (bucket === "61_90") {
        b61_90 += p;
      } else if (bucket === "90_PLUS") {
        b90Plus += p;
      } else {
        b1_30 += p;
      }
    });

    return {
      b1_30,
      b31_60,
      b61_90,
      b90Plus,
    };
  }, [overdueLoansList, payments]);

  // Expected Credit Loss (ECL) Impairment Provision:
  // 1-30d: 5%, 31-60d: 20%, 61-90d: 50%, 90+d: 100%
  const totalImpairmentProvision = useMemo(() => {
    return Math.round(
      parBuckets.b1_30 * 0.05 +
      parBuckets.b31_60 * 0.20 +
      parBuckets.b61_90 * 0.50 +
      parBuckets.b90Plus * 1.00
    );
  }, [parBuckets]);

  // Export CSV Handlers
  const exportCollectionsCsv = () => {
    const headers = ["Payment ID", "Receipt No", "Date", "Loan ID", "Borrower", "Type", "Method", "Collector", "Amount"];
    const rows = filteredPayments.map((p) => {
      const c = customers.find((cust) => cust.id === p.customerId);
      const l = loans.find((loan) => loan.id === p.loanId);
      return [
        p.id,
        p.receiptNo || "N/A",
        p.date,
        l?.loanNo || p.loanId,
        c?.fullName || c?.name || "Customer",
        p.type,
        p.method || "Cash",
        p.collectedBy || "Authorized Officer",
        p.amount,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PSI_ONE_Collections_${timePeriod}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPortfolioCsv = () => {
    const headers = [
      "Loan ID",
      "Loan Number",
      "Customer ID",
      "Customer Name",
      "Principal",
      "Interest Rate (%)",
      "Frequency",
      "Total Repayment",
      "Total Paid",
      "Remaining Balance",
      "Status",
    ];

    const rows = filteredLoans.map((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      const paid = payments.filter((p) => p.loanId === l.id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const balance = Math.max(0, (l.totalRepayment || (l.principal || l.amount || 0) + (l.interest || 0)) - paid);
      return [
        l.id,
        l.loanNo || l.id,
        l.customerId,
        c?.fullName || c?.name || l.customerName || "Customer",
        l.principal || l.amount || 0,
        l.interestRate,
        l.repaymentFrequency || "Monthly",
        l.totalRepayment,
        paid,
        balance,
        l.status,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PSI_ONE_Portfolio_Register_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-2.5 sm:space-y-3 font-sans">
      {/* ── Top Action Bar ── */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={reportTab === "collections" ? exportCollectionsCsv : exportPortfolioCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition shadow-2xs cursor-pointer"
        >
          <Download size={13} />
          Export CSV
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-2xs shadow-slate-900/20 cursor-pointer"
        >
          <Printer size={13} />
          Print Audit Statement
        </button>
      </div>

      {/* ── Aggregate Financial Metrics (5 KPI Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Card 1: Total Disbursed */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Disbursed Capital
          </span>
          <div className="mt-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-mono leading-tight">{MONEY(totalDisbursed)}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{loans.length} loan accounts</p>
          </div>
        </div>

        {/* Card 2: Period Collections */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Period Collections ({timePeriod.toUpperCase()})
          </span>
          <div className="mt-1">
            <h3 className="text-base sm:text-lg font-black text-emerald-600 font-mono leading-tight">{MONEY(totalPeriodCollections)}</h3>
            <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
              {filteredPayments.length} receipts logged
            </p>
          </div>
        </div>

        {/* Card 3: Outstanding Receivable */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Active Outstanding
          </span>
          <div className="mt-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-mono leading-tight">{MONEY(outstandingReceivable)}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Principal + earned interest</p>
          </div>
        </div>

        {/* Card 4: Overdue Default Portfolio */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Overdue Default Portfolio
          </span>
          <div className="mt-1">
            <h3 className="text-base sm:text-lg font-black text-red-600 font-mono leading-tight">{MONEY(overduePortfolio)}</h3>
            <p className="text-[10px] text-red-700 font-semibold mt-0.5">
              PAR Rate: {parRate}%
            </p>
          </div>
        </div>

        {/* Card 5: Recovery Efficiency */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Recovery Efficiency
          </span>
          <div className="mt-1">
            <h3 className="text-base sm:text-lg font-black text-emerald-600 font-mono leading-tight">{collectionEfficiency}%</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Settlement against expected</p>
          </div>
        </div>
      </div>

      {/* ── Main Report Module Tabs (4 Core Modules) ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Main 4 Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReportTab("collections")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                reportTab === "collections"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <DollarSign size={14} /> Collections Journal
            </button>

            <button
              type="button"
              onClick={() => setReportTab("portfolio")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                reportTab === "portfolio"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Layers size={14} /> Portfolio Register
            </button>

            <button
              type="button"
              onClick={() => setReportTab("income")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                reportTab === "income"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <PieChart size={14} /> Income Statement
            </button>

            <button
              type="button"
              onClick={() => setReportTab("par")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                reportTab === "par"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <AlertTriangle size={14} /> PAR & Delinquency Aging
            </button>
          </div>

          {/* Search bar inside reports */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        {/* ── Sub-Filters Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          {reportTab === "collections" || reportTab === "income" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Period Filter:
              </span>
              {(["daily", "weekly", "monthly", "all", "custom"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTimePeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition uppercase cursor-pointer ${
                    timePeriod === p
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {p === "daily" ? "Daily (Today)" : p === "weekly" ? "Weekly (7d)" : p === "monthly" ? "Monthly" : p === "all" ? "All Time" : "Custom Range"}
                </button>
              ))}

              {timePeriod === "custom" && (
                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  />
                  <span className="text-slate-700 font-black text-xs">to</span>
                  <input
                    type="date"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Portfolio Status:
              </span>
              {(["ALL", "ACTIVE", "PENDING", "OVERDUE", "COMPLETED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === s
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <span className="text-slate-500 text-[11px] font-mono">
            Generated as of {todayStr}
          </span>
        </div>

        {/* ── TAB 1: COLLECTIONS SUMMARY REPORT TABLE ── */}
        {reportTab === "collections" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt / Voucher</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Borrower Name</th>
                  <th className="py-3 px-4">Facility Reference</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Collector</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.map((p) => {
                  const cust = customers.find((c) => c.id === p.customerId);
                  const loan = loans.find((l) => l.id === p.loanId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNo || p.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {cust?.fullName || cust?.name || "Customer"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {loan?.loanNo || p.loanId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.type === "Capital"
                              ? "bg-red-100 text-red-700"
                              : p.type === "Interest"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{p.method || "Cash"}</td>
                      <td className="py-3.5 px-4 text-slate-700">{p.collectedBy || "Authorized Officer"}</td>
                      <td className="py-3.5 px-4 text-right font-black font-mono text-emerald-600">
                        {MONEY(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptPayment(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                          title="View & Print Official Receipt"
                        >
                          <Receipt size={13} className="text-white shrink-0" />
                          <span className="text-white font-bold">Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPayments.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <Receipt size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No collections found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No payment entries match the selected {timePeriod} timeframe and search filter.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: LOAN PORTFOLIO REGISTER TABLE ── */}
        {reportTab === "portfolio" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Facility No</th>
                  <th className="py-3 px-4">Borrower Name</th>
                  <th className="py-3 px-4">Disbursed Principal</th>
                  <th className="py-3 px-4">Rate & Frequency</th>
                  <th className="py-3 px-4">Total Repayment</th>
                  <th className="py-3 px-4">Total Paid</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4 text-right">Facility Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLoans.map((l) => {
                  const cust = customers.find((c) => c.id === l.customerId);
                  const paid = payments
                    .filter((p) => p.loanId === l.id)
                    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                  const totalRepay = l.totalRepayment || (l.principal || l.amount || 0) + (l.interest || 0);
                  const balance = Math.max(0, totalRepay - paid);

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {l.loanNo || l.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {cust?.fullName || cust?.name || l.customerName || "Customer"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {MONEY(l.principal || l.amount || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {l.interestRate}% / mo ({l.repaymentFrequency || "Monthly"})
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {MONEY(totalRepay)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        {MONEY(paid)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                        {MONEY(balance)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            (l.status || "").toLowerCase() === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : (l.status || "").toLowerCase() === "overdue"
                              ? "bg-red-100 text-red-700"
                              : (l.status || "").toLowerCase() === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLoans.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <Layers size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No loan records found</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No lending facilities match the status filter &quot;{statusFilter}&quot;.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: INCOME & PROFITABILITY STATEMENT ── */}
        {reportTab === "income" && (
          <div className="space-y-6">
            {/* Executive Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider block">
                  Capital Principal Recovered
                </span>
                <p className="text-xl font-black text-red-950 font-mono mt-1">
                  {MONEY(capitalCollected)}
                </p>
                <p className="text-[11px] text-red-700 mt-1">Returned to capital fund</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Earned Interest Income
                </span>
                <p className="text-xl font-black text-emerald-950 font-mono mt-1">
                  {MONEY(interestCollected)}
                </p>
                <p className="text-[11px] text-emerald-700 mt-1">Core lending yield</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                  Fees & Late Default Penalties
                </span>
                <p className="text-xl font-black text-purple-950 font-mono mt-1">
                  {MONEY(otherFeesCollected)}
                </p>
                <p className="text-[11px] text-purple-700 mt-1">Documentation & late charges</p>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Net Period Gross Revenue
                </span>
                <p className="text-xl font-black text-emerald-400 font-mono mt-1">
                  {MONEY(totalPeriodInterestAndFees)}
                </p>
                <p className="text-[11px] text-slate-300 mt-1">Excludes returned capital</p>
              </div>
            </div>

            {/* Income Statement Table */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Operational Statement of Profit & Loss ({timePeriod.toUpperCase()} Timeframe)
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Gross Operating Inflow (Total Payments Collected)</span>
                  <span className="font-mono font-bold text-slate-900">{MONEY(totalPeriodCollections)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500 pl-4">
                  <span>Less: Capital Principal Re-credited to Lending Pool</span>
                  <span className="font-mono text-slate-600">({MONEY(capitalCollected)})</span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-200 font-bold text-emerald-700">
                  <span>Net Interest & Fee Revenue</span>
                  <span className="font-mono">{MONEY(totalPeriodInterestAndFees)}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-600 pl-4">
                  <span>Add: Upfront Processing Deductions on Active Portfolio</span>
                  <span className="font-mono">{MONEY(totalUpfrontDeductions)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-300 font-black text-slate-900 text-sm">
                  <span>Total Cumulative Operating Margin</span>
                  <span className="font-mono text-emerald-600">{MONEY(totalPeriodInterestAndFees + totalUpfrontDeductions)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: DELINQUENCY & PAR AGING AUDIT ── */}
        {reportTab === "par" && (
          <div className="space-y-6">
            {/* PAR Summary Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">PAR 1 - 30 Days</span>
                <p className="text-xl font-black text-slate-900 font-mono mt-1">{MONEY(parBuckets.b1_30)}</p>
                <span className="text-[11px] text-amber-600 font-semibold">5% Provision: {MONEY(Math.round(parBuckets.b1_30 * 0.05))}</span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">PAR 31 - 60 Days</span>
                <p className="text-xl font-black text-amber-600 font-mono mt-1">{MONEY(parBuckets.b31_60)}</p>
                <span className="text-[11px] text-amber-700 font-semibold">20% Provision: {MONEY(Math.round(parBuckets.b31_60 * 0.20))}</span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block">PAR 61 - 90 Days</span>
                <p className="text-xl font-black text-rose-600 font-mono mt-1">{MONEY(parBuckets.b61_90)}</p>
                <span className="text-[11px] text-rose-700 font-semibold">50% Provision: {MONEY(Math.round(parBuckets.b61_90 * 0.50))}</span>
              </div>

              <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
                <span className="text-xs font-bold text-red-800 uppercase block">PAR 90+ Days (Default)</span>
                <p className="text-xl font-black text-red-700 font-mono mt-1">{MONEY(parBuckets.b90Plus)}</p>
                <span className="text-[11px] text-red-800 font-bold">100% Provision: {MONEY(parBuckets.b90Plus)}</span>
              </div>
            </div>

            {/* Total Impairment Provision Card */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  Estimated Credit Loss (ECL) Regulatory Provision
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Mandated loan-loss reserve calculated across overdue aging delinquency tiers under Central Bank guidelines.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-200 font-bold uppercase tracking-wider block">Required Provision</span>
                <span className="text-2xl font-black font-mono text-rose-400">{MONEY(totalImpairmentProvision)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Official Printable Financial Audit Statement (Hidden on screen, prints on window.print()) ── */}
      <div className="hidden print:block printable-receipt-card p-8 bg-white text-slate-900 space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <BrandLogo size="md" theme="light" />
          <div className="text-right text-xs">
            <h2 className="text-base font-black uppercase">Official Portfolio Audit Statement</h2>
            <p className="text-slate-500 font-mono">Date Generated: {todayStr}</p>
            <p className="text-slate-500">Report Reference: AUDIT/2026/FIN</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs p-4 bg-slate-50 rounded-xl">
          <div>
            <span className="text-slate-500 block uppercase">Total Disbursed Capital</span>
            <span className="font-mono font-bold text-sm">{MONEY(totalDisbursed)}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase">Total Collections</span>
            <span className="font-mono font-bold text-sm text-emerald-700">{MONEY(totalCollectionsAllTime)}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase">Outstanding Receivable</span>
            <span className="font-mono font-bold text-sm text-red-700">{MONEY(outstandingReceivable)}</span>
          </div>
        </div>

        <div className="pt-12 flex justify-between text-xs border-t border-slate-200">
          <div>
            <div className="w-40 border-b border-slate-400 mb-1" />
            <p className="font-bold">Chief Executive Officer</p>
            <p className="text-slate-500">PSI ONE Operations</p>
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 mb-1" />
            <p className="font-bold">Internal Auditor</p>
            <p className="text-slate-500">Financial Audit & Compliance</p>
          </div>
        </div>
      </div>

      {/* Official Receipt Modal */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  );
}
