/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertOctagon,
  Search,
  Phone,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Clock,
  Download,
  Send,
  MessageSquare,
  FileWarning,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { calculateLoanFinancials, type LoanFinancials } from "@/lib/loan-financials";
import type { Loan, Customer, Payment } from "@/types";
import ReceiptModal from "@/components/modals/ReceiptModal";
import { BrandLogo } from "@/components/brand-logo";

export default function OverduePage() {
  const { loans, customers, payments, addPayment } = useData();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState<string>("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("ALL");
  const [routeFilter, setRouteFilter] = useState<string>("ALL");
  const [todayDateStr, setTodayDateStr] = useState<string>("2026-10-15");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTodayDateStr(new Date().toISOString().slice(0, 10));
    }
  }, []);

  // Quick Action Settlement Modal State
  const [settlingItem, setSettlingItem] = useState<{
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
  } | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [collectorName, setCollectorName] = useState<string>("Field Recovery Officer");
  const [settleNotes, setSettleNotes] = useState<string>("");

  // Communication & SMS Reminder Modal State
  const [reminderItem, setReminderItem] = useState<{
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
  } | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  // Formal Letter of Demand / Default Notice Modal State
  const [demandNoticeItem, setDemandNoticeItem] = useState<{
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
    penaltyAmount: number;
    totalOverdueWithPenalty: number;
  } | null>(null);

  // Printable Official Receipt Modal State
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");

  // Customer Map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // As of Date for overdue evaluation
  const asOfDate = useMemo(() => new Date(2026, 9, 15), []);

  // Calculate Overdue Delinquent Facilities
  const overdueList = useMemo(() => {
    const list: Array<{
      loan: Loan;
      customer?: Customer;
      fin: LoanFinancials;
      routeArea: string;
      penaltyAmount: number;
      totalOverdueWithPenalty: number;
    }> = [];

    loans.forEach((loan) => {
      const fin = calculateLoanFinancials(loan, payments, asOfDate);
      if (fin.isDelinquent && fin.arrears > 0) {
        const customer = customerMap.get(loan.customerId);
        const routeArea = customer?.town || customer?.village || customer?.district || "Central Zone";
        // Late penalty calculation: 2.5% of arrears if overdue > 14 days, min LKR 250
        const penaltyAmount = fin.overdueDays > 14 ? Math.max(250, Math.round(fin.arrears * 0.025)) : 0;
        const totalOverdueWithPenalty = fin.arrears + penaltyAmount;

        list.push({
          loan,
          customer,
          fin,
          routeArea,
          penaltyAmount,
          totalOverdueWithPenalty,
        });
      }
    });

    // Sort by highest overdue arrears first
    return list.sort((a, b) => b.fin.arrears - a.fin.arrears);
  }, [loans, payments, asOfDate, customerMap]);

  // Aggregate Metrics
  const totalOverdueAmount = useMemo(() => {
    return overdueList.reduce((sum, item) => sum + item.fin.arrears, 0);
  }, [overdueList]);

  const totalPenalties = useMemo(() => {
    return overdueList.reduce((sum, item) => sum + item.penaltyAmount, 0);
  }, [overdueList]);

  const criticalOverdueCount = useMemo(() => {
    return overdueList.filter((item) => item.fin.overdueDays >= 30).length;
  }, [overdueList]);

  const totalActivePrincipal = useMemo(() => {
    return loans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0);
  }, [loans]);

  const parRate =
    totalActivePrincipal > 0
      ? ((totalOverdueAmount / totalActivePrincipal) * 100).toFixed(1)
      : "0.0";

  // Filtered List
  const filteredList = useMemo(() => {
    return overdueList.filter((item) => {
      // Aging filter
      if (agingFilter === "GRACE" && (item.fin.overdueDays < 1 || item.fin.overdueDays > 14)) {
        return false;
      }
      if (agingFilter === "15_30" && (item.fin.overdueDays < 15 || item.fin.overdueDays > 30)) {
        return false;
      }
      if (agingFilter === "31_60" && (item.fin.overdueDays < 31 || item.fin.overdueDays > 60)) {
        return false;
      }
      if (agingFilter === "60_PLUS" && item.fin.overdueDays <= 60) {
        return false;
      }

      // Frequency filter
      if (frequencyFilter !== "ALL" && item.loan.repaymentFrequency !== frequencyFilter) {
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
  }, [overdueList, agingFilter, frequencyFilter, routeFilter, searchTerm]);

  // Open Settlement Modal
  const openSettlement = (item: {
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
  }) => {
    setSettlingItem(item);
    setSettleAmount(String(item.fin.arrears));
    setPaymentMethod("Cash");
    setSettleNotes(`Overdue recovery payment for ${item.loan.loanNo} (${item.fin.missedInstallments} cycles)`);
  };

  // Submit Overdue Settlement
  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingItem) return;

    const numAmount = Number(settleAmount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid recovery amount.");
      return;
    }

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: Payment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      loanId: settlingItem.loan.id,
      customerId: settlingItem.loan.customerId,
      amount: numAmount,
      date: todayDateStr,
      type: "Capital",
      notes: settleNotes.trim() || `Overdue installment settlement`,
      method: paymentMethod,
      collectedBy: collectorName,
      receiptNo,
    };

    addPayment(newPayment);
    setActiveReceiptPayment(newPayment);
    setToastMessage(
      `Successfully collected ${MONEY(numAmount)} from ${
        settlingItem.customer?.name || settlingItem.loan.customerName
      }. Receipt ${receiptNo} issued.`
    );
    setSettlingItem(null);
    setSettleAmount("");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Loan No",
      "Borrower Name",
      "NIC",
      "Phone",
      "Route/Town",
      "Disbursed (LKR)",
      "Overdue Arrears (LKR)",
      "Late Penalty (LKR)",
      "Total Due (LKR)",
      "Days Past Due",
      "Missed Cycles",
      "Guarantor",
    ];

    const rows = filteredList.map((item) => [
      item.loan.loanNo || item.loan.id,
      item.customer?.fullName || item.customer?.name || item.loan.customerName,
      item.customer?.nic || "N/A",
      item.customer?.phone || "N/A",
      item.routeArea,
      item.loan.principal || item.loan.amount || 0,
      item.fin.arrears,
      item.penaltyAmount,
      item.totalOverdueWithPenalty,
      item.fin.overdueDays,
      item.fin.missedInstallments,
      item.customer?.guarantorName || item.loan.guarantorName || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((f) => `"${f}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PSI_ONE_Overdue_Report_${todayDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage("")}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
              Risk & Collections Console
            </span>
            <span className="text-xs text-slate-500 font-semibold">Jira Card 21</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <AlertOctagon className="text-red-600" size={28} />
            Overdue Payments & Defaulter UI
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Operational center for tracking past-due installments, executing recoveries, and generating formal demand notices.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Printer size={14} />
            Print Run Sheet
          </button>
        </div>
      </div>

      {/* ── Financial KPI Metric Cards (4 Cards) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Overdue Arrears */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Total Overdue Capital
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono tracking-tight">
            {MONEY(totalOverdueAmount)}
          </p>
          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1 font-medium">
            <span>Accumulated across active overdue cycles</span>
          </p>
        </div>

        {/* Card 2: Delinquent Borrowers */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Overdue Accounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <User size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {overdueList.length} <span className="text-xs font-bold text-slate-600">Borrowers</span>
          </p>
          <p className="text-xs text-slate-600 mt-2 font-medium">
            Requires field contact & collection action
          </p>
        </div>

        {/* Card 3: Critical Default (30+ Days) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Critical (30+ Days Past Due)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 tracking-tight">
            {criticalOverdueCount} <span className="text-xs font-bold text-slate-600">Accounts</span>
          </p>
          <p className="text-xs text-amber-800 font-semibold mt-2">
            Priority recovery / Legal Demand required
          </p>
        </div>

        {/* Card 4: Portfolio at Risk (PAR %) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Portfolio At Risk (PAR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {parRate}%
          </p>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Number(parRate) * 4)}%` }}
            />
          </div>
        </div>
      </section>

      {/* ── Search & Filter Toolbars ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by borrower name, NIC, phone, loan number, or guarantor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Aging Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-700 font-black mr-1 text-[11px] uppercase">Aging:</span>
            {[
              { id: "ALL", label: `All (${overdueList.length})` },
              { id: "GRACE", label: "1-14 Days" },
              { id: "15_30", label: "15-30 Days" },
              { id: "31_60", label: "31-60 Days" },
              { id: "60_PLUS", label: "60+ Days (Legal)" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setAgingFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs ${
                  agingFilter === btn.id
                    ? "bg-red-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Repayment Frequency:</span>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Frequencies</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Area / Town:</span>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Zones</option>
              {Array.from(new Set(overdueList.map((i) => i.routeArea))).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || agingFilter !== "ALL" || frequencyFilter !== "ALL" || routeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setAgingFilter("ALL");
                setFrequencyFilter("ALL");
                setRouteFilter("ALL");
              }}
              className="text-red-600 hover:text-red-700 text-xs font-bold transition cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Overdue Accounts Ledger Table ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Active Overdue Delinquency Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredList.length} delinquent lending accounts requiring immediate collection intervention
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            Total Overdue: {MONEY(filteredList.reduce((s, i) => s + i.fin.arrears, 0))}
          </span>
        </div>

        {filteredList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Borrower Details</th>
                  <th className="py-3.5 px-4">Facility & Purpose</th>
                  <th className="py-3.5 px-4">Overdue Aging (DPD)</th>
                  <th className="py-3.5 px-4">Overdue Installments</th>
                  <th className="py-3.5 px-4">Late Penalty</th>
                  <th className="py-3.5 px-4">Total Past Due</th>
                  <th className="py-3.5 px-4">Guarantor</th>
                  <th className="py-3.5 px-4 text-right">Recovery Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredList.map((item) => (
                  <tr key={item.loan.id} className="hover:bg-slate-50/60 transition">
                    {/* Borrower Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {item.customer?.photoUrl ? (
                            <img
                              src={item.customer.photoUrl}
                              alt={item.customer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (item.customer?.name || "B").charAt(0)
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/customers/${item.loan.customerId}`}
                            className="font-bold text-slate-900 hover:text-red-600 transition"
                          >
                            {item.customer?.fullName || item.customer?.name || item.loan.customerName}
                          </Link>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{item.customer?.nic || "NIC"}</span>
                            <span>·</span>
                            <span>{item.customer?.phone || "No phone"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Facility Column */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/loans/${item.loan.id}`}
                        className="font-mono font-bold text-slate-900 hover:text-red-600 transition block"
                      >
                        {item.loan.loanNo || item.loan.id}
                      </Link>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">
                        {item.loan.purpose || "Business Capital"}
                      </span>
                    </td>

                    {/* Overdue Aging (DPD) */}
                    <td className="py-3.5 px-4">
                      {item.fin.overdueDays > 60 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle size={12} className="text-rose-600" />
                          {item.fin.overdueDays} Days Past Due
                        </span>
                      ) : item.fin.overdueDays > 30 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock size={12} className="text-amber-600" />
                          {item.fin.overdueDays} Days Past Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          {item.fin.overdueDays} Days Past Due
                        </span>
                      )}
                      <span className="text-[11px] text-slate-600 font-semibold block mt-1">
                        {item.fin.missedInstallments} cycle{item.fin.missedInstallments > 1 ? "s" : ""} defaulted
                      </span>
                    </td>

                    {/* Overdue Installment */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {MONEY(item.fin.arrears)}
                    </td>

                    {/* Late Penalty */}
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.penaltyAmount > 0 ? (
                        <span className="text-red-600 font-semibold">{MONEY(item.penaltyAmount)}</span>
                      ) : (
                        <span className="text-slate-600 font-medium">LKR 0.00</span>
                      )}
                    </td>

                    {/* Total Past Due */}
                    <td className="py-3.5 px-4 font-mono font-extrabold text-red-600 text-sm">
                      {MONEY(item.totalOverdueWithPenalty)}
                    </td>

                    {/* Guarantor Info */}
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      <p className="font-semibold text-slate-800">
                        {item.customer?.guarantorName || item.loan.guarantorName || "None"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.customer?.guarantorPhone || item.loan.guarantorPhone || "—"}
                      </p>
                    </td>

                    {/* Action Hub */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Collect Button */}
                        <button
                          type="button"
                          onClick={() => openSettlement(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                          title="Record Overdue Recovery"
                        >
                          <CreditCard size={13} />
                          Collect
                        </button>

                        {/* Remind Modal Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setReminderItem(item);
                            setReminderCopied(false);
                          }}
                          className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                          title="Send SMS / WhatsApp Reminder"
                        >
                          <MessageSquare size={14} />
                        </button>

                        {/* Call Borrower Button */}
                        {item.customer?.phone && (
                          <a
                            href={`tel:${item.customer.phone}`}
                            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                            title={`Call Borrower: ${item.customer.phone}`}
                          >
                            <Phone size={14} />
                          </a>
                        )}

                        {/* Letter of Demand Button */}
                        <button
                          type="button"
                          onClick={() => setDemandNoticeItem(item)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Formal Letter of Demand"
                        >
                          <FileWarning size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-base font-bold text-slate-800">No overdue accounts found</p>
            <p className="text-xs text-slate-500 mt-1">
              All portfolio accounts match the selected filter criteria or are fully up to date.
            </p>
          </div>
        )}
      </section>

      {/* ── 1. Quick Overdue Settlement Modal ── */}
      {settlingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Overdue Recovery Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettlingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Borrower:</span>
                  <strong className="text-slate-900">
                    {settlingItem.customer?.fullName || settlingItem.customer?.name || settlingItem.loan.customerName}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Facility:</span>
                  <span className="font-mono font-bold text-red-600">{settlingItem.loan.loanNo || settlingItem.loan.id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Days Past Due:</span>
                  <span className="font-bold text-red-700">{settlingItem.fin.overdueDays} Days</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200 font-semibold">
                  <span>Total Overdue Arrears:</span>
                  <span className="font-mono font-bold text-slate-900">{MONEY(settlingItem.fin.arrears)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount to Collect (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 text-base focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="Cash">Cash (Field Collection)</option>
                    <option value="Bank Transfer">Bank Transfer / Remittance</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Collector / Officer
                  </label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Recovery Notes
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none"
                  placeholder="e.g. Received partial recovery at borrower doorstep"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSettlingItem(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  Record Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. SMS & WhatsApp Reminder Modal ── */}
      {reminderItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Borrower Overdue Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => setReminderItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Send a formal overdue reminder to <strong>{reminderItem.customer?.name}</strong> ({reminderItem.customer?.phone || "No phone"}).
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed select-all">
                {`PSI ONE MICROFINANCE: Dear ${
                  reminderItem.customer?.name || "Customer"
                }, your loan payment for ${
                  reminderItem.loan.loanNo || "LN"
                } is overdue by ${
                  reminderItem.fin.overdueDays
                } days (Amount Due: ${MONEY(reminderItem.fin.arrears)}). Please settle immediately to avoid penalty charges. Contact: 011-2345678.`}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `PSI ONE MICROFINANCE: Dear ${
                      reminderItem.customer?.name || "Customer"
                    }, your loan payment for ${
                      reminderItem.loan.loanNo || "LN"
                    } is overdue by ${
                      reminderItem.fin.overdueDays
                    } days (Amount Due: ${MONEY(reminderItem.fin.arrears)}). Please settle immediately to avoid penalty charges. Contact: 011-2345678.`;
                    navigator.clipboard.writeText(text);
                    setReminderCopied(true);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-center cursor-pointer"
                >
                  {reminderCopied ? "✓ Copied to Clipboard!" : "Copy Reminder Message Text"}
                </button>

                {reminderItem.customer?.phone && (
                  <a
                    href={`https://wa.me/${reminderItem.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `PSI ONE MICROFINANCE: Dear ${reminderItem.customer.name}, your loan installment for ${
                        reminderItem.loan.loanNo
                      } is overdue by ${reminderItem.fin.overdueDays} days. Please settle ${MONEY(
                        reminderItem.fin.arrears
                      )} promptly.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-center shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={14} /> Send via WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Formal Letter of Demand / Default Notice Modal ── */}
      {demandNoticeItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" theme="light" />
                <span className="text-xs font-black uppercase text-red-600 tracking-wider">
                  Formal Notice of Default
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDemandNoticeItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Letter Body */}
            <div className="flex-1 overflow-y-auto py-6 space-y-4 text-xs text-slate-800 font-serif leading-relaxed">
              <div className="flex justify-between text-slate-500 font-sans">
                <span>Date: {todayDateStr}</span>
                <span className="font-mono">Ref: DEMAND/{demandNoticeItem.loan.loanNo}/2026</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl font-sans text-xs">
                <p><strong>To:</strong> {demandNoticeItem.customer?.fullName || demandNoticeItem.customer?.name}</p>
                <p><strong>NIC:</strong> {demandNoticeItem.customer?.nic}</p>
                <p><strong>Address:</strong> {demandNoticeItem.customer?.address || "Registered Borrower Address"}, {demandNoticeItem.customer?.town}</p>
                <p><strong>Guarantor:</strong> {demandNoticeItem.customer?.guarantorName || "Assigned Guarantor"}</p>
              </div>

              <h3 className="font-sans font-bold text-sm text-red-700 uppercase tracking-wide border-b pb-1">
                DEMAND NOTICE: OUTSTANDING OVERDUE ARREARS UNDER FACILITY {demandNoticeItem.loan.loanNo}
              </h3>

              <p>Dear Sir / Madam,</p>

              <p>
                We hereby give you formal notice that your credit facility referenced above is severely in arrears.
                As of <strong>{todayDateStr}</strong>, you have defaulted on <strong>{demandNoticeItem.fin.missedInstallments} scheduled installment(s)</strong>,
                resulting in <strong>{demandNoticeItem.fin.overdueDays} days past due</strong>.
              </p>

              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 font-sans text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Overdue Principal & Interest:</span>
                  <span className="font-mono font-bold">{MONEY(demandNoticeItem.fin.arrears)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accrued Late Default Fee:</span>
                  <span className="font-mono">{MONEY(demandNoticeItem.penaltyAmount)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-red-200 text-sm font-bold text-red-700">
                  <span>Total Amount Required to Regularize:</span>
                  <span className="font-mono">{MONEY(demandNoticeItem.totalOverdueWithPenalty)}</span>
                </div>
              </div>

              <p>
                You are strictly advised to settle the full regularization sum within <strong>seven (7) working days</strong> of this notice.
                Failure to settle will compel our recoveries division to initiate recovery actions against you and your guarantor.
              </p>

              <div className="pt-6 font-sans flex justify-between items-end">
                <div>
                  <p className="font-bold">Authorized Officer</p>
                  <p className="text-slate-500">Credit Risk & Recoveries Division</p>
                  <p className="text-slate-500">PSI ONE Microfinance Operations</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>Certified Document</p>
                  <p className="font-mono">{demandNoticeItem.loan.loanNo}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-sans">
                Printed on official PSI ONE Letterhead format
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-600/30 cursor-pointer"
              >
                <Printer size={15} /> Print Demand Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Unified Official Receipt Modal ── */}
      {activeReceiptPayment && (
        <ReceiptModal
          payment={activeReceiptPayment}
          onClose={() => setActiveReceiptPayment(null)}
        />
      )}
    </div>
  );
}
