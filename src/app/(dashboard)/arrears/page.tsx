"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Search,
  Phone,
  Printer,
  X,
  Check,
  CheckCircle2,
  Calendar,
  Building,
  CreditCard,
  ShieldAlert,
  UserCheck,
  FileWarning,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import {
  calculateLoanFinancials,
  type LoanFinancials,
} from "@/lib/loan-financials";
import type { Loan, Customer, Payment } from "@/types";

export default function ArrearsPage() {
  const { loans, customers, payments, addPayment } = useData();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState<string>("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("ALL");
  const [routeFilter, setRouteFilter] = useState<string>("ALL");

  // Recovery modal state
  const [recoveringLoan, setRecoveringLoan] = useState<{
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
  } | null>(null);
  const [recoveryAmount, setRecoveryAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [collectorName, setCollectorName] = useState<string>("Credit Recovery Officer");
  const [recoveryNotes, setRecoveryNotes] = useState<string>("");
  const [notification, setNotification] = useState<string>("");

  // Customer map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Calculate financials for all loans as of current date
  const asOfDate = useMemo(() => new Date(2026, 9, 14), []);

  const delinquentList = useMemo(() => {
    const list: Array<{
      loan: Loan;
      customer?: Customer;
      fin: LoanFinancials;
      routeArea: string;
    }> = [];

    loans.forEach((loan) => {
      const fin = calculateLoanFinancials(loan, payments, asOfDate);
      if (fin.isDelinquent && fin.arrears > 0) {
        const customer = customerMap.get(loan.customerId);
        const routeArea =
          customer?.town || customer?.village || customer?.district || "Colombo Metro";
        list.push({
          loan,
          customer,
          fin,
          routeArea,
        });
      }
    });

    // Sort by highest arrears first
    return list.sort((a, b) => b.fin.arrears - a.fin.arrears);
  }, [loans, payments, asOfDate, customerMap]);

  // Aggregate Arrears Metrics
  const totalArrearsAmount = useMemo(() => {
    return delinquentList.reduce((sum, item) => sum + item.fin.arrears, 0);
  }, [delinquentList]);

  const totalDelinquentPrincipal = useMemo(() => {
    return delinquentList.reduce(
      (sum, item) => sum + (item.loan.principal || item.loan.amount || 0),
      0
    );
  }, [delinquentList]);

  const totalPortfolioValue = useMemo(() => {
    return loans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0);
  }, [loans]);

  // Portfolio at Risk (PAR)
  const parRate =
    totalPortfolioValue > 0
      ? ((totalDelinquentPrincipal / totalPortfolioValue) * 100).toFixed(1)
      : "0.0";

  // Aging Buckets breakdown
  const agingStats = useMemo(() => {
    let b1_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let b90Plus = 0;

    let count1_30 = 0;
    let count31_60 = 0;
    let count61_90 = 0;
    let count90Plus = 0;

    delinquentList.forEach((item) => {
      const bucket = item.fin.agingBucket;
      if (bucket === "1_30") {
        b1_30 += item.fin.arrears;
        count1_30++;
      } else if (bucket === "31_60") {
        b31_60 += item.fin.arrears;
        count31_60++;
      } else if (bucket === "61_90") {
        b61_90 += item.fin.arrears;
        count61_90++;
      } else if (bucket === "90_PLUS") {
        b90Plus += item.fin.arrears;
        count90Plus++;
      }
    });

    return {
      b1_30,
      b31_60,
      b61_90,
      b90Plus,
      count1_30,
      count31_60,
      count61_90,
      count90Plus,
    };
  }, [delinquentList]);

  // Available routes for filter
  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    delinquentList.forEach((item) => {
      if (item.routeArea) set.add(item.routeArea);
    });
    return Array.from(set).sort();
  }, [delinquentList]);

  // Filtered Delinquent Facilities
  const filteredList = useMemo(() => {
    return delinquentList.filter((item) => {
      // Aging filter
      if (agingFilter !== "ALL" && item.fin.agingBucket !== agingFilter) {
        return false;
      }

      // Frequency filter
      if (
        frequencyFilter !== "ALL" &&
        item.loan.repaymentFrequency !== frequencyFilter
      ) {
        return false;
      }

      // Route filter
      if (routeFilter !== "ALL" && item.routeArea !== routeFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const bName = (item.customer?.name || item.loan.customerName || "").toLowerCase();
        const loanNo = (item.loan.loanNo || item.loan.id || "").toLowerCase();
        const nic = (item.customer?.nic || "").toLowerCase();
        const phone = (item.customer?.phone || "").toLowerCase();
        const gName = (item.customer?.guarantorName || item.loan.guarantorName || "").toLowerCase();

        return (
          bName.includes(q) ||
          loanNo.includes(q) ||
          nic.includes(q) ||
          phone.includes(q) ||
          gName.includes(q)
        );
      }

      return true;
    });
  }, [delinquentList, agingFilter, frequencyFilter, routeFilter, searchTerm]);

  // Open Recovery Modal
  const openRecoveryModal = (item: {
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
  }) => {
    setRecoveringLoan(item);
    setRecoveryAmount(String(item.fin.arrears));
    setRecoveryNotes(`Recovery payment on overdue arrears (${item.fin.missedInstallments} cycles)`);
    setPaymentMethod("Cash");
  };

  const closeRecoveryModal = () => {
    setRecoveringLoan(null);
    setRecoveryAmount("");
    setRecoveryNotes("");
  };

  // Submit Recovery
  const handleConfirmRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveringLoan) return;

    const numAmount = Number(recoveryAmount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid recovery amount.");
      return;
    }

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: Payment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      loanId: recoveringLoan.loan.id,
      customerId: recoveringLoan.loan.customerId,
      amount: numAmount,
      date: "2026-10-14",
      type: "Capital",
      notes: recoveryNotes.trim() || undefined,
      method: paymentMethod,
      collectedBy: collectorName,
      receiptNo,
    };

    addPayment(newPayment);
    setNotification(
      `Recovery Receipt ${receiptNo} generated: Successfully recorded ${MONEY(
        numAmount
      )} from ${recoveringLoan.customer?.name || recoveringLoan.loan.customerName}.`
    );
    closeRecoveryModal();

    setTimeout(() => {
      setNotification("");
    }, 6000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleIssueNotice = (borrowerName: string, loanNo: string) => {
    alert(
      `Formal Arrears Demand Notice queued for ${borrowerName} (${loanNo}). SMS & physical reminder letter dispatched to collection queue.`
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Toast Notification ── */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification("")}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-widest bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 rounded-md">
              Credit Control & Risk
            </span>
            <span className="text-xs text-slate-400 font-medium">Delinquency Register</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Arrears & Delinquent Facilities
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive register of overdue credit accounts, aging delinquency buckets, and field recovery actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer size={14} /> Print Arrears Sheet
          </button>
          <Link
            href="/repayments"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition inline-flex items-center gap-1.5"
          >
            <CreditCard size={14} /> Record Repayment
          </Link>
        </div>
      </div>

      {/* ── Top Exposure KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Arrears Amount */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Total Arrears Balance
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">
              {MONEY(totalArrearsAmount)}
            </div>
            <p className="text-[11px] text-rose-600/80 mt-1">
              Accumulated overdue default sum
            </p>
          </div>
        </div>

        {/* Delinquent Facilities Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Delinquent Accounts
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <FileWarning size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {delinquentList.length}{" "}
              <span className="text-xs font-medium text-slate-400">
                of {loans.length} facilities
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Non-performing loan facilities
            </p>
          </div>
        </div>

        {/* Portfolio at Risk (PAR) */}
        <div className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
              Portfolio at Risk (PAR)
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {parRate}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Exposure: {MONEY(totalDelinquentPrincipal)}
            </p>
          </div>
        </div>

        {/* 30+ Days Critical Overdue */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Critical (30+ Days)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">
              {MONEY(agingStats.b31_60 + agingStats.b61_90 + agingStats.b90Plus)}
            </div>
            <p className="text-[11px] text-amber-600/80 mt-1">
              {agingStats.count31_60 + agingStats.count61_90 + agingStats.count90Plus} severely delinquent facilities
            </p>
          </div>
        </div>
      </div>

      {/* ── Aging Buckets Breakdown Strip ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Delinquency Aging Buckets (Days Past Due)
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Central Bank / Microfinance Classification Standards
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1 - 30 Days */}
          <div
            onClick={() => setAgingFilter(agingFilter === "1_30" ? "ALL" : "1_30")}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              agingFilter === "1_30"
                ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/90 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={agingFilter === "1_30" ? "text-white" : "text-amber-800"}>
                1 – 30 Days
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  agingFilter === "1_30"
                    ? "bg-white/25 text-white"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {agingStats.count1_30}
              </span>
            </div>
            <div
              className={`text-base font-black mt-1 ${
                agingFilter === "1_30" ? "text-white" : "text-slate-900"
              }`}
            >
              {MONEY(agingStats.b1_30)}
            </div>
            <span
              className={`text-[10px] font-medium ${
                agingFilter === "1_30" ? "text-amber-100" : "text-slate-500"
              }`}
            >
              Early Arrears
            </span>
          </div>

          {/* 31 - 60 Days */}
          <div
            onClick={() => setAgingFilter(agingFilter === "31_60" ? "ALL" : "31_60")}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              agingFilter === "31_60"
                ? "bg-orange-600 text-white border-orange-700 shadow-xs ring-2 ring-orange-400"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/90 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={agingFilter === "31_60" ? "text-white" : "text-orange-800"}>
                31 – 60 Days
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  agingFilter === "31_60"
                    ? "bg-white/25 text-white"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {agingStats.count31_60}
              </span>
            </div>
            <div
              className={`text-base font-black mt-1 ${
                agingFilter === "31_60" ? "text-white" : "text-slate-900"
              }`}
            >
              {MONEY(agingStats.b31_60)}
            </div>
            <span
              className={`text-[10px] font-medium ${
                agingFilter === "31_60" ? "text-orange-100" : "text-slate-500"
              }`}
            >
              Moderate Default
            </span>
          </div>

          {/* 61 - 90 Days */}
          <div
            onClick={() => setAgingFilter(agingFilter === "61_90" ? "ALL" : "61_90")}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              agingFilter === "61_90"
                ? "bg-rose-700 text-white border-rose-800 shadow-xs ring-2 ring-rose-400"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/90 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={agingFilter === "61_90" ? "text-white" : "text-rose-800"}>
                61 – 90 Days
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  agingFilter === "61_90"
                    ? "bg-white/25 text-white"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {agingStats.count61_90}
              </span>
            </div>
            <div
              className={`text-base font-black mt-1 ${
                agingFilter === "61_90" ? "text-white" : "text-rose-700"
              }`}
            >
              {MONEY(agingStats.b61_90)}
            </div>
            <span
              className={`text-[10px] font-medium ${
                agingFilter === "61_90" ? "text-rose-100" : "text-slate-500"
              }`}
            >
              Substandard Risk
            </span>
          </div>

          {/* 90+ Days */}
          <div
            onClick={() => setAgingFilter(agingFilter === "90_PLUS" ? "ALL" : "90_PLUS")}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              agingFilter === "90_PLUS"
                ? "bg-red-800 text-white border-red-900 shadow-xs ring-2 ring-red-500"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/90 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={agingFilter === "90_PLUS" ? "text-white" : "text-red-900"}>
                90+ Days
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  agingFilter === "90_PLUS"
                    ? "bg-white/25 text-white"
                    : "bg-red-100 text-red-900"
                }`}
              >
                {agingStats.count90Plus}
              </span>
            </div>
            <div
              className={`text-base font-black mt-1 ${
                agingFilter === "90_PLUS" ? "text-white" : "text-red-700"
              }`}
            >
              {MONEY(agingStats.b90Plus)}
            </div>
            <span
              className={`text-[10px] font-medium ${
                agingFilter === "90_PLUS" ? "text-red-100" : "text-slate-500"
              }`}
            >
              Non-Performing (NPL)
            </span>
          </div>
        </div>
      </div>

      {/* ── Search and Filter Controls Toolbar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by borrower name, loan no, NIC, phone, guarantor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Frequency Filter */}
          <div>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-700 font-medium"
            >
              <option value="ALL">All Frequencies</option>
              <option value="Daily">Daily Loans</option>
              <option value="Weekly">Weekly Loans</option>
              <option value="Monthly">Monthly Loans</option>
            </select>
          </div>

          {/* Route Filter */}
          <div>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-700 font-medium"
            >
              <option value="ALL">All Routes / Towns</option>
              {availableRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Delinquent Facilities Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Delinquent Accounts Register ({filteredList.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Accounts requiring active recovery collection and credit intervention
            </p>
          </div>
          {agingFilter !== "ALL" && (
            <button
              onClick={() => setAgingFilter("ALL")}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Clear Aging Filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Borrower Dossier</th>
                <th className="py-3 px-3">Facility Details</th>
                <th className="py-3 px-3 text-right">Installment</th>
                <th className="py-3 px-3 text-center">Missed Cycles</th>
                <th className="py-3 px-3 text-center">Days Overdue</th>
                <th className="py-3 px-3 text-right">Arrears Balance</th>
                <th className="py-3 px-3 text-right">Remaining Balance</th>
                <th className="py-3 px-4 text-center">Recovery Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((item) => {
                const bName =
                  item.customer?.fullName || item.customer?.name || item.loan.customerName || "Borrower";
                const initials = bName
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("");

                return (
                  <tr key={item.loan.id} className="hover:bg-rose-50/25 transition">
                    {/* Borrower Dossier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {bName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>NIC: {item.customer?.nic || "—"}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                              <Building size={11} className="text-slate-400" />
                              {item.routeArea}
                            </span>
                          </div>
                          {item.customer?.phone && (
                            <div className="mt-0.5">
                              <a
                                href={`tel:${item.customer.phone}`}
                                className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1 font-medium"
                              >
                                <Phone size={10} /> {item.customer.phone}
                              </a>
                            </div>
                          )}
                          {(item.customer?.guarantorName || item.loan.guarantorName) && (
                            <div className="text-[10px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                              <UserCheck size={10} className="text-slate-400" />
                              Guarantor: {item.customer?.guarantorName || item.loan.guarantorName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Facility Details */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 text-xs">
                        <Link
                          href={`/loans/${item.loan.id}`}
                          className="hover:text-red-600 hover:underline"
                        >
                          {item.loan.loanNo || item.loan.id}
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          {item.loan.repaymentFrequency || "Monthly"}
                        </span>{" "}
                        facility
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total {MONEY(item.loan.totalRepayment)}
                      </div>
                    </td>

                    {/* Installment Amount */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-bold text-slate-800 text-xs">
                        {MONEY(item.loan.installment)}
                      </div>
                      <div className="text-[10px] text-slate-400">Regular per cycle</div>
                    </td>

                    {/* Missed Cycles */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {item.fin.missedInstallments} {item.fin.missedInstallments === 1 ? "cycle" : "cycles"}
                      </span>
                    </td>

                    {/* Days Overdue */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.fin.overdueDays > 60
                            ? "bg-red-100 text-red-800 border-red-300"
                            : item.fin.overdueDays > 30
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {item.fin.overdueDays} Days Past Due
                      </span>
                    </td>

                    {/* Arrears Balance */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-black text-rose-700 text-sm">
                        {MONEY(item.fin.arrears)}
                      </div>
                      <div className="text-[9px] font-bold text-rose-600 uppercase">
                        Defaulted
                      </div>
                    </td>

                    {/* Remaining Total Balance */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-bold text-slate-900 text-xs">
                        {MONEY(item.fin.balanceDue)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Paid: {MONEY(item.fin.totalPaid)}
                      </div>
                    </td>

                    {/* Recovery Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => openRecoveryModal(item)}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-1"
                          title="Record Arrears Recovery Payment"
                        >
                          <CreditCard size={12} /> Recover
                        </button>
                        <button
                          onClick={() =>
                            handleIssueNotice(bName, item.loan.loanNo || item.loan.id)
                          }
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                          title="Issue Demand Notice / SMS Reminder"
                        >
                          <FileWarning size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      Zero Arrears Matching Filter
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No facilities are currently delinquent for this search criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Recovery Payment Modal ── */}
      {recoveringLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                  Credit Recovery Action
                </p>
                <h3 className="text-base font-black text-slate-900">
                  Record Arrears Recovery
                </h3>
              </div>
              <button
                onClick={closeRecoveryModal}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Borrower & Delinquency Snapshot */}
            <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Borrower:</span>
                <span className="font-bold text-slate-900">
                  {recoveringLoan.customer?.fullName ||
                    recoveringLoan.customer?.name ||
                    recoveringLoan.loan.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Facility ID:</span>
                <span className="font-bold text-slate-900">
                  {recoveringLoan.loan.loanNo || recoveringLoan.loan.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Regular Installment:</span>
                <span className="font-bold text-slate-900">
                  {MONEY(recoveringLoan.loan.installment)}
                </span>
              </div>
              <div className="flex justify-between border-t border-rose-200/80 pt-1 font-black text-sm">
                <span className="text-rose-800">Total Arrears Owed:</span>
                <span className="text-rose-700">{MONEY(recoveringLoan.fin.arrears)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmRecovery} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Recovered Amount (LKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Recovery Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800 font-medium"
                  >
                    <option value="Cash">Cash (Recovery Officer)</option>
                    <option value="Bank Transfer">Bank Transfer / Deposit</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Recovery Officer
                  </label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Recovery Remarks / Payment Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arrears partial settlement, promised full balance by next week"
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeRecoveryModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-md shadow-red-600/20 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check size={14} /> Confirm Recovery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
