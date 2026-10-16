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

  // SMS / WhatsApp reminder popup state
  const [reminderItem, setReminderItem] = useState<{
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
  } | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  // Demand Notice Modal State
  const [demandNoticeItem, setDemandNoticeItem] = useState<{
    loan: Loan;
    customer?: Customer;
    fin: LoanFinancials;
    penaltyAmount: number;
    totalOverdueWithPenalty: number;
  } | null>(null);

  // Unified Receipt Modal State
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string>("");

  // As of Date for calculating delinquency
  const asOfDate = useMemo(() => new Date(todayDateStr), [todayDateStr]);

  // Customer fast lookup map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Overdue and Delinquent Loans Processing
  const overdueList = useMemo(() => {
    const list: Array<{
      loan: Loan;
      customer?: Customer;
      fin: LoanFinancials;
      penaltyAmount: number;
      totalOverdueWithPenalty: number;
      routeArea: string;
    }> = [];

    loans.forEach((loan) => {
      const statusUpper = (loan.status || "").toUpperCase();
      if (statusUpper === "COMPLETED" || statusUpper === "REJECTED") return;

      const fin = calculateLoanFinancials(loan, payments, asOfDate);

      if (fin.isDelinquent || fin.arrears > 0 || statusUpper === "OVERDUE") {
        const customer = customerMap.get(loan.customerId);

        // Standard Late penalty (2% on overdue installment or flat 500 LKR minimum)
        const penaltyAmount =
          fin.overdueDays > 14
            ? Math.round(Math.max(500, fin.arrears * 0.02))
            : 0;

        const totalOverdueWithPenalty = fin.arrears + penaltyAmount;

        const routeArea =
          customer?.town ||
          customer?.village ||
          customer?.district ||
          "Field Zone 1";

        list.push({
          loan,
          customer,
          fin,
          penaltyAmount,
          totalOverdueWithPenalty,
          routeArea,
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

      // Area / Town filter
      if (routeFilter !== "ALL" && item.routeArea !== routeFilter) {
        return false;
      }

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const borrowerName = (item.customer?.fullName || item.customer?.name || item.loan.customerName || "").toLowerCase();
        const loanNo = (item.loan.loanNo || item.loan.id || "").toLowerCase();
        const nic = (item.customer?.nic || "").toLowerCase();
        const phone = (item.customer?.phone || "").toLowerCase();
        const guarantor = (item.customer?.guarantorName || item.loan.guarantorName || "").toLowerCase();

        return (
          borrowerName.includes(q) ||
          loanNo.includes(q) ||
          nic.includes(q) ||
          phone.includes(q) ||
          guarantor.includes(q)
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

    setTimeout(() => {
      setToastMessage("");
    }, 6000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Borrower Name",
      "Phone",
      "NIC",
      "Loan ID",
      "Principal",
      "Arrears Amount",
      "Late Penalty",
      "Total Past Due",
      "Days Past Due (DPD)",
      "Missed Cycles",
      "Guarantor",
    ];

    const rows = filteredList.map((item) => [
      item.customer?.fullName || item.customer?.name || item.loan.customerName,
      item.customer?.phone || "N/A",
      item.customer?.nic || "N/A",
      item.loan.loanNo || item.loan.id,
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
    <main className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 space-y-3">
        {/* ── Toast Notification ── */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ═══ Action Bar (Search & Export / Print) ══════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search borrower, NIC, phone, loan number, guarantor…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 py-1.5 h-9 text-xs bg-white border border-slate-200 rounded-xl w-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Run Sheet</span>
            </button>
          </div>
        </div>

        {/* ═══ Financial KPI Metric Cards (Customer Theme Micro KPIs) ════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Overdue Arrears */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <DollarSign size={16} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Overdue Capital
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-red-600 leading-tight">
                {MONEY(totalOverdueAmount)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Accumulated arrears
              </p>
            </div>
          </div>

          {/* Card 2: Delinquent Borrowers */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <User size={16} className="text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Overdue Accounts
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {overdueList.length}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Requires field contact
              </p>
            </div>
          </div>

          {/* Card 3: Critical Default (30+ Days) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Critical (30+ DPD)
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-amber-700 leading-tight">
                {criticalOverdueCount}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold truncate">
                Priority recovery
              </p>
            </div>
          </div>

          {/* Card 4: Portfolio at Risk (PAR %) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <ShieldAlert size={16} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider truncate">
                Portfolio At Risk (PAR)
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {parRate}%
              </p>
              <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-red-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Number(parRate) * 4)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Filter Tabs & Controls Row ════════════════════════════════════ */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Aging Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
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
                className={`h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                  agingFilter === btn.id
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Secondary Filters */}
          <div className="flex items-center gap-2">
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="ALL">All Frequencies</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>

            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="ALL">All Zones</option>
              {Array.from(new Set(overdueList.map((i) => i.routeArea))).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            {(searchTerm || agingFilter !== "ALL" || frequencyFilter !== "ALL" || routeFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setAgingFilter("ALL");
                  setFrequencyFilter("ALL");
                  setRouteFilter("ALL");
                }}
                className="h-8 px-2 text-red-600 hover:text-red-700 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ═══ Overdue Accounts Ledger Table (Customer Theme) ════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredList.length > 0 ? (
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left text-xs whitespace-nowrap min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-5">Borrower</th>
                    <th className="py-3 px-4">Facility</th>
                    <th className="py-3 px-4">Overdue Aging (DPD)</th>
                    <th className="py-3 px-4 text-right">Arrears</th>
                    <th className="py-3 px-4 text-right">Penalty</th>
                    <th className="py-3 px-4 text-right">Total Past Due</th>
                    <th className="py-3 px-4">Guarantor</th>
                    <th className="py-3 px-5 text-right">Recovery Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredList.map((item) => (
                    <tr key={item.loan.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Borrower Column */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          {item.customer?.photoUrl ? (
                            <img
                              src={item.customer.photoUrl}
                              alt=""
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                              {(item.customer?.name || "B").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/customers/${item.loan.customerId}`}
                              className="font-bold text-slate-900 text-xs hover:text-red-600 transition truncate max-w-[180px] block"
                            >
                              {item.customer?.fullName || item.customer?.name || item.loan.customerName}
                            </Link>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <span>NIC: {item.customer?.nic || "—"}</span>
                              {item.customer?.phone && (
                                <>
                                  <span>·</span>
                                  <a href={`tel:${item.customer.phone}`} className="text-red-600 hover:underline">
                                    {item.customer.phone}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Facility Column */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/loans/${item.loan.id}`}
                          className="font-mono font-bold text-slate-900 text-xs hover:text-red-600 transition block"
                        >
                          {item.loan.loanNo || item.loan.id}
                        </Link>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[130px]">
                          {item.loan.purpose || "Business Facility"}
                        </span>
                      </td>

                      {/* Overdue Aging (DPD) */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.fin.overdueDays > 60
                                ? "bg-rose-100 text-rose-800"
                                : item.fin.overdueDays > 30
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.fin.overdueDays} DPD
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                          {item.fin.missedInstallments} cycle{item.fin.missedInstallments > 1 ? "s" : ""} defaulted
                        </span>
                      </td>

                      {/* Overdue Installment */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                        {MONEY(item.fin.arrears)}
                      </td>

                      {/* Late Penalty */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600 text-xs">
                        {item.penaltyAmount > 0 ? (
                          <span className="text-red-600 font-semibold">{MONEY(item.penaltyAmount)}</span>
                        ) : (
                          <span className="text-slate-400">LKR 0.00</span>
                        )}
                      </td>

                      {/* Total Past Due */}
                      <td className="py-3 px-4 text-right font-mono font-black text-red-600 text-xs">
                        {MONEY(item.totalOverdueWithPenalty)}
                      </td>

                      {/* Guarantor Info */}
                      <td className="py-3 px-4 text-xs">
                        <p className="font-semibold text-slate-800 text-[11px]">
                          {item.customer?.guarantorName || item.loan.guarantorName || "None"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {item.customer?.guarantorPhone || item.loan.guarantorPhone || "—"}
                        </p>
                      </td>

                      {/* Action Hub */}
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Collect Button */}
                          <button
                            type="button"
                            onClick={() => openSettlement(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer shadow-xs"
                            title="Record Overdue Recovery"
                          >
                            <CreditCard size={11} />
                            <span>Collect</span>
                          </button>

                          {/* Remind Modal Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setReminderItem(item);
                              setReminderCopied(false);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            title="Send SMS / WhatsApp Reminder"
                          >
                            <MessageSquare size={12} />
                          </button>

                          {/* Call Borrower Button */}
                          {item.customer?.phone && (
                            <a
                              href={`tel:${item.customer.phone}`}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                              title={`Call: ${item.customer.phone}`}
                            >
                              <Phone size={12} />
                            </a>
                          )}

                          {/* Letter of Demand Button */}
                          <button
                            type="button"
                            onClick={() => setDemandNoticeItem(item)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Formal Letter of Demand"
                          >
                            <FileWarning size={12} />
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
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-800">No overdue accounts found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                All portfolio accounts match the selected filter criteria or are fully up to date.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 1. Quick Overdue Settlement Modal ── */}
      {settlingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CreditCard size={15} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Record Overdue Recovery Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettlingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Borrower:</span>
                  <strong className="text-slate-900">
                    {settlingItem.customer?.fullName || settlingItem.customer?.name || settlingItem.loan.customerName}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Facility:</span>
                  <span className="font-mono font-bold text-red-600">{settlingItem.loan.loanNo || settlingItem.loan.id}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Days Past Due:</span>
                  <span className="font-bold text-red-700">{settlingItem.fin.overdueDays} Days</span>
                </div>
                <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200 font-bold">
                  <span>Total Overdue Arrears:</span>
                  <span className="font-mono font-bold text-slate-900">{MONEY(settlingItem.fin.arrears)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Amount to Collect (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 h-9 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none text-xs"
                  >
                    <option value="Cash">Cash (Field)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Collector / Officer
                  </label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    className="w-full px-3 py-1.5 h-9 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Recovery Notes
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none text-xs"
                  placeholder="e.g. Received partial recovery at borrower doorstep"
                />
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingItem(null)}
                  className="px-3 h-8 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer text-xs"
                >
                  Confirm Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. SMS & WhatsApp Reminder Modal ── */}
      {reminderItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <MessageSquare size={15} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Borrower Overdue Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => setReminderItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="text-slate-600">
                Send a formal overdue reminder to <strong>{reminderItem.customer?.name}</strong> ({reminderItem.customer?.phone || "No phone"}).
              </p>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed select-all">
                {`PSI ONE MICROFINANCE: Dear ${
                  reminderItem.customer?.name || "Customer"
                }, your loan payment for ${
                  reminderItem.loan.loanNo || "LN"
                } is overdue by ${
                  reminderItem.fin.overdueDays
                } days (Amount Due: ${MONEY(reminderItem.fin.arrears)}). Please settle immediately to avoid penalty charges. Contact: 011-2345678.`}
              </div>

              <div className="pt-1 flex flex-col gap-2">
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
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition text-center cursor-pointer text-xs"
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
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-center shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Send size={13} /> Send via WhatsApp
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
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
                <X size={18} />
              </button>
            </div>

            {/* Letter Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 text-xs text-slate-800 font-serif leading-relaxed">
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

              <div className="p-3 rounded-xl border border-red-200 bg-red-50/50 font-sans text-xs space-y-1">
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

              <div className="pt-4 font-sans flex justify-between items-end">
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

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-sans">
                Printed on official PSI ONE Letterhead format
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                <Printer size={13} /> Print Demand Notice
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
    </main>
  );
}
