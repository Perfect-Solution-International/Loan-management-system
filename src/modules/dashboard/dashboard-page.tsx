/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  HandCoins,
  Wallet,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CreditCard,
  X,
  Check,
  ShieldCheck,
  UserCheck,
  Receipt,
  Settings,
  Sparkles,
  Phone,
  Activity,
  FileText,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import {
  getDailyCollections,
  formatFriendlyDate,
  type ScheduledCollectionItem,
} from "@/lib/collection-schedule";
import type { Customer, Loan, Payment } from "@/types";
import { getLoanTotalRepayment } from "@/lib/loan-financials";
import ReceiptModal from "@/components/modals/ReceiptModal";

interface DashboardPageProps {
  initialRole?: "admin" | "staff";
}

type CollectionTab = "ALL" | "PENDING" | "COLLECTED" | "OVERDUE";

export function DashboardPage({ initialRole = "admin" }: DashboardPageProps) {
  const { customers, loans, payments, addPayment, getNextReceiptNo } = useData();

  // Active role state: "admin" | "staff" (synced with initialRole)
  const [role, setRole] = useState<"admin" | "staff">(initialRole);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  // Today's date reference (dynamic state initialized safely for SSR)
  const [todayDateStr, setTodayDateStr] = useState<string>("2026-10-15");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTodayDateStr(new Date().toISOString().slice(0, 10));
    }
  }, []);

  // Filter tab for Today's Collections
  const [collectionFilter, setCollectionFilter] = useState<CollectionTab>("ALL");

  // Quick collect modal state on dashboard
  const [collectingItem, setCollectingItem] = useState<ScheduledCollectionItem | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [notification, setNotification] = useState<string>("");

  // Official Printable Receipt Modal state
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<Payment | null>(null);

  // Portfolio level aggregations
  const total = useMemo(
    () => loans.reduce((s, l: Loan) => s + (l.principal || l.amount || 0), 0),
    [loans]
  );

  // Mathematically exact active outstanding balance (repayment minus payments per loan)
  const outstanding = useMemo(() => {
    return loans
      .filter((l: Loan) => (l.status || "").toLowerCase() !== "completed")
      .reduce((sum, l: Loan) => {
        const totalRepay = getLoanTotalRepayment(l);
        const loanPaid = payments
          .filter((p) => p.loanId === l.id)
          .reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
        return sum + Math.max(0, totalRepay - loanPaid);
      }, 0);
  }, [loans, payments]);

  // Compute today's collection items and metrics
  const collectionData = useMemo(() => {
    return getDailyCollections(loans, customers, payments, todayDateStr);
  }, [loans, customers, payments, todayDateStr]);

  const todaysCollections = collectionData.items;
  const collectionSummary = collectionData.summary;

  // Filtered collections based on tab
  const filteredCollections = useMemo(() => {
    if (collectionFilter === "PENDING") {
      return todaysCollections.filter((c) => !c.isCollectedToday && c.status !== "OVERDUE");
    }
    if (collectionFilter === "COLLECTED") {
      return todaysCollections.filter((c) => c.isCollectedToday);
    }
    if (collectionFilter === "OVERDUE") {
      return todaysCollections.filter((c) => c.status === "OVERDUE" && !c.isCollectedToday);
    }
    return todaysCollections;
  }, [todaysCollections, collectionFilter]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: todaysCollections.length,
      pending: todaysCollections.filter((c) => !c.isCollectedToday && c.status !== "OVERDUE").length,
      collected: todaysCollections.filter((c) => c.isCollectedToday).length,
      overdue: todaysCollections.filter((c) => c.status === "OVERDUE" && !c.isCollectedToday).length,
    };
  }, [todaysCollections]);

  // Pending approval loans count for Admin committee review
  const pendingLoans = useMemo(
    () => loans.filter((l: Loan) => (l.status || "").toLowerCase() === "pending"),
    [loans]
  );

  // Overdue loans count
  const overdueLoans = useMemo(
    () => loans.filter((l: Loan) => (l.status || "").toLowerCase() === "overdue"),
    [loans]
  );

  // Today's Cash Flow Pulse (Inflow vs Outflow)
  const todayInflow = useMemo(() => {
    return payments
      .filter((p) => p.date === todayDateStr)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }, [payments, todayDateStr]);

  const todayOutflow = useMemo(() => {
    return loans
      .filter((l) => l.issueDate === todayDateStr && (l.status || "").toLowerCase() !== "rejected")
      .reduce((s, l) => s + (Number(l.principal || l.amount) || 0), 0);
  }, [loans, todayDateStr]);

  const todayNetCash = todayInflow - todayOutflow;

  // Current Month String
  const currentMonthStr = useMemo(() => todayDateStr.slice(0, 7), [todayDateStr]);

  // Month-to-date Income
  const monthlyMetrics = useMemo(() => {
    const monthLoans = loans.filter((l) => (l.issueDate || "").startsWith(currentMonthStr));
    const monthPayments = payments.filter((p) => (p.date || "").startsWith(currentMonthStr));

    const docFees = monthLoans.reduce(
      (sum, l) => sum + (Number(l.capitalDeduction) || 0) + (Number(l.otherFees) || 0),
      0
    );
    const totalCollected = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Exact interest component calculated proportional to each loan's interest structure
    const interestIncome = monthPayments.reduce((sum, p) => {
      if (p.type === "Interest") return sum + (Number(p.amount) || 0);
      const l = loans.find((loan) => loan.id === p.loanId);
      if (!l) return sum;
      const lTotal = getLoanTotalRepayment(l);
      const lInterest = l.interest || Math.max(0, lTotal - (Number(l.principal || l.amount) || 0));
      const ratio = lTotal > 0 ? lInterest / lTotal : 0;
      return sum + Math.round((Number(p.amount) || 0) * ratio);
    }, 0);

    const totalRevenue = docFees + interestIncome;

    return {
      docFees,
      totalCollected,
      interestIncome,
      totalRevenue,
    };
  }, [loans, payments, currentMonthStr]);

  // Dynamic 6-Month Trend Data for Real Analytics Chart
  const monthlyTrendData = useMemo(() => {
    const months: Array<{ monthLabel: string; disbursed: number; collected: number; key: string }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleString("default", { month: "short" });

      const disbursed = loans
        .filter((l) => (l.issueDate || "").startsWith(key))
        .reduce((s, l) => s + (Number(l.principal || l.amount) || 0), 0);

      const collected = payments
        .filter((p) => (p.date || "").startsWith(key))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      months.push({ monthLabel, disbursed, collected, key });
    }

    const maxVal = Math.max(1, ...months.map((m) => Math.max(m.disbursed, m.collected)));
    return { months, maxVal };
  }, [loans, payments]);

  // Urgent Action Attention Queue
  const urgentAttention = useMemo(() => {
    const delayed = todaysCollections
      .filter((c) => c.status === "OVERDUE" && !c.isCollectedToday)
      .slice(0, 3);
    const pendingApp = pendingLoans.slice(0, 2);
    return { delayed, pendingApp };
  }, [todaysCollections, pendingLoans]);

  // Dynamic live system activity feed
  const dynamicActivity = useMemo(() => {
    const list: Array<{
      title: string;
      detail: string;
      time: string;
      badge: string;
      type: "repayment" | "loan" | "customer";
    }> = [];

    // Latest recorded payments
    const sortedPayments = [...payments].sort((a, b) =>
      (b.date || "").localeCompare(a.date || "")
    );
    sortedPayments.slice(0, 3).forEach((p) => {
      const loan = loans.find((l) => l.id === p.loanId);
      list.push({
        title: "Repayment credited",
        detail: `${loan?.loanNo || p.loanId} · ${MONEY(p.amount)} via ${p.method || "Cash"}`,
        time: p.date === todayDateStr ? "Today" : p.date || "Recent",
        badge: "Payment",
        type: "repayment",
      });
    });

    // Latest loan applications
    const sortedLoans = [...loans].sort((a, b) =>
      (b.issueDate || "").localeCompare(a.issueDate || "")
    );
    sortedLoans.slice(0, 2).forEach((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      list.push({
        title:
          (l.status || "").toLowerCase() === "pending"
            ? "Pending loan review"
            : "Loan disbursed",
        detail: `${l.loanNo || l.id} · ${c?.name || l.customerName} (${MONEY(l.principal || l.amount || 0)})`,
        time: l.issueDate === todayDateStr ? "Today" : l.issueDate || "Recent",
        badge: (l.status || "").toLowerCase() === "pending" ? "Pending" : "Active",
        type: "loan",
      });
    });

    return list.slice(0, 4);
  }, [payments, loans, customers, todayDateStr]);

  const handleOpenCollect = (item: ScheduledCollectionItem) => {
    setCollectingItem(item);
    setCollectAmount(String(item.totalDueToday || item.installmentAmount));
  };

  const handleConfirmCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingItem) return;

    const numAmount = Number(collectAmount);
    if (!numAmount || numAmount <= 0) return;

    const receiptNo = getNextReceiptNo();
    const newPayment: Payment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      loanId: collectingItem.loan.id,
      customerId: collectingItem.loan.customerId,
      amount: numAmount,
      date: todayDateStr,
      type: "Capital",
      notes: `Installment #${collectingItem.cycleNumber} collected on ${role === "staff" ? "staff" : "admin"} dashboard`,
      method: paymentMethod,
      collectedBy: role === "staff" ? "Field Officer" : "Admin Officer",
      receiptNo,
    };

    addPayment(newPayment);
    setActiveReceiptPayment(newPayment);
    setNotification(
      `Receipt ${receiptNo} recorded: ${MONEY(numAmount)} collected from ${
        collectingItem.customer?.name || collectingItem.loan.customerName
      }. Official receipt generated.`
    );
    setCollectingItem(null);
    setCollectAmount("");

    setTimeout(() => {
      setNotification("");
    }, 6000);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-2.5 pb-8 space-y-3 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification("")}
            className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── ZONE 1: THE EXECUTIVE PULSE (HIGH-END METRIC CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Today's Collection Performance */}
        <div className="bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Today&apos;s Collections
            </span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              {MONEY(collectionSummary.collectedAmount)}
            </div>
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 mt-1">
              <span className="truncate">Target: {MONEY(collectionSummary.targetAmount)}</span>
              <span className="font-bold text-emerald-700 shrink-0 font-mono">{collectionSummary.collectionRate}%</span>
            </div>
            {/* Visual Mini Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
              <div
                className="bg-emerald-600 h-1 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectionSummary.collectionRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Active Capital in the Field */}
        <div className="bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Capital in the Field
            </span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700 shrink-0">
              <Wallet size={13} />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              {MONEY(Math.max(0, outstanding))}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
              <span>
                {loans.filter((l) => (l.status || "").toLowerCase() === "active").length} active accounts
              </span>
              <span className="text-[9px] font-bold bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded font-mono">
                {customers.length} clients
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Month-to-Date Revenue & Earnings */}
        <div className="bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              This Month Revenue
            </span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700 shrink-0">
              <TrendingUp size={13} />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
              {MONEY(monthlyMetrics.totalRevenue)}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
              <span>Interest + Doc fees</span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                Live Revenue
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Portfolio at Risk (Overdue & Arrears) */}
        <div className="bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Portfolio at Risk
            </span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700 shrink-0">
              <AlertTriangle size={13} />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-black text-rose-600 tracking-tight leading-tight">
              {overdueLoans.length > 0 ? `${overdueLoans.length} Overdue` : "Healthy · 0 Risk"}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
              <span>
                {tabCounts.overdue > 0 ? `${tabCounts.overdue} due today delayed` : "No delinquent accounts"}
              </span>
              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-mono">
                {overdueLoans.length === 0 ? "100% Good" : "Needs Action"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ZONE 2: SPLIT SCREEN (TODAY'S OPERATIONS vs CASH FLOW & QUEUE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN (65% / 8 cols): Live Collection Stream & Instant Action */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Header & Interactive Filter Tabs */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  Today&apos;s Collection Stream
                </h2>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  ({formatFriendlyDate(todayDateStr)})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Target: <strong>{MONEY(collectionSummary.targetAmount)}</strong> · {tabCounts.collected} collected · {tabCounts.pending + tabCounts.overdue} pending
              </p>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
              {(
                [
                  { key: "ALL", label: `All (${tabCounts.all})` },
                  { key: "PENDING", label: `Pending (${tabCounts.pending})` },
                  { key: "COLLECTED", label: `Collected (${tabCounts.collected})` },
                  { key: "OVERDUE", label: `Delayed (${tabCounts.overdue})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCollectionFilter(tab.key)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                    collectionFilter === tab.key
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Collection Stream List */}
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {filteredCollections.map((item) => {
              const bName =
                item.customer?.fullName || item.customer?.name || item.loan.customerName || "Borrower";
              const initials = bName
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={item.id}
                  className={`p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition ${
                    item.isCollectedToday ? "bg-emerald-50/30" : ""
                  }`}
                >
                  {/* Borrower info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                        item.isCollectedToday
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : item.status === "OVERDUE"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-red-50 text-red-700 border-red-100"
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{bName}</h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.loan.loanNo || item.loan.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span>{item.routeArea || "Route 01"}</span>
                        <span>•</span>
                        <span>
                          Cycle #{item.cycleNumber}/{item.totalCycles}
                        </span>
                        {item.customer?.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-600">{item.customer.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial & Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900 font-mono">
                        {MONEY(item.totalDueToday)}
                      </div>
                      {item.arrearsAmount > 0 ? (
                        <span className="text-[9px] font-bold text-rose-600 block">
                          incl. {MONEY(item.arrearsAmount)} arrears
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {item.repaymentFrequency}
                        </span>
                      )}
                    </div>

                    <div>
                      {item.isCollectedToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check size={11} className="stroke-[3]" /> Collected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCollect(item)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md text-[10px] font-bold shadow-2xs transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <CreditCard size={11} /> Collect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCollections.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No collection records matching &quot;{collectionFilter}&quot; for today.
              </div>
            )}
          </div>

          {/* Bottom Link to Full Sheet */}
          <div className="p-2.5 bg-slate-50/70 border-t border-slate-100 text-center">
            <Link
              href="/collections"
              className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 transition"
            >
              Open Full Daily Collection Sheet <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN (35% / 4 cols): Today's Cash Flow & Action Queue */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Card 1: Today's Cash Flow Pulse */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-slate-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Today&apos;s Cash Movement
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">Live In/Out</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <ArrowDownRight size={14} />
                  <span>Cash Inflow (Recoveries)</span>
                </div>
                <span className="font-mono font-black text-emerald-700">
                  + {MONEY(todayInflow)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <ArrowUpRight size={14} />
                  <span>Cash Outflow (Loans Disbursed)</span>
                </div>
                <span className="font-mono font-black text-rose-700">
                  - {MONEY(todayOutflow)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-700">Net Daily Movement</span>
                <span
                  className={`font-mono font-black text-sm ${
                    todayNetCash >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {todayNetCash >= 0 ? "+" : ""}
                  {MONEY(todayNetCash)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Executive Attention Queue */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Action Required
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono">
                {urgentAttention.delayed.length + urgentAttention.pendingApp.length} Items
              </span>
            </div>

            <div className="space-y-2">
              {urgentAttention.pendingApp.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 block">
                      Underwriting Review
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {l.customerName} ({MONEY(l.principal || l.amount || 0)})
                    </span>
                  </div>
                  <Link
                    href={`/loans/${l.id}`}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-[10px] shrink-0"
                  >
                    Review
                  </Link>
                </div>
              ))}

              {urgentAttention.delayed.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/40 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-rose-800 block">
                      Overdue Follow-up
                    </span>
                    <span className="font-bold text-slate-900 truncate block text-xs">
                      {c.customer?.name || c.loan.customerName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Due: {MONEY(c.totalDueToday)}
                    </span>
                  </div>
                  {c.customer?.phone && (
                    <a
                      href={`tel:${c.customer.phone}`}
                      className="px-2 py-1 bg-slate-900 hover:bg-black text-white font-bold rounded-md text-[10px] shrink-0 inline-flex items-center gap-1"
                    >
                      <Phone size={10} /> Call
                    </a>
                  )}
                </div>
              ))}

              {urgentAttention.delayed.length === 0 && urgentAttention.pendingApp.length === 0 && (
                <div className="py-4 text-center text-slate-400 text-xs font-medium">
                  ✓ All client accounts and pending queues are up to date.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ZONE 3: FINANCIAL GROWTH TREND & RECENT LEDGER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Dynamic 6-Month Cashflow Analytics Chart */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                6-Month Portfolio Cash Flow
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Actual disbursed capital vs loan repayment collections
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
                <span className="text-slate-600">Disbursed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span className="text-slate-600">Collected</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visual */}
          <div className="h-36 pt-4 flex items-end justify-between gap-3 sm:gap-6">
            {monthlyTrendData.months.map((m) => {
              const disPercent = Math.max(8, Math.round((m.disbursed / monthlyTrendData.maxVal) * 100));
              const colPercent = Math.max(8, Math.round((m.collected / monthlyTrendData.maxVal) * 100));

              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    {/* Disbursed bar */}
                    <div
                      className="w-1/2 max-w-[18px] bg-red-500 hover:bg-red-600 rounded-t-xs transition-all cursor-pointer relative group"
                      style={{ height: `${disPercent}%` }}
                      title={`Disbursed: ${MONEY(m.disbursed)}`}
                    />
                    {/* Collected bar */}
                    <div
                      className="w-1/2 max-w-[18px] bg-emerald-500 hover:bg-emerald-600 rounded-t-xs transition-all cursor-pointer relative group"
                      style={{ height: `${colPercent}%` }}
                      title={`Collected: ${MONEY(m.collected)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold uppercase">{m.monthLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live System Activity Feed */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-700" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Live Audit Activity
              </h3>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-2.5">
            {dynamicActivity.map((a, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{
                    background: a.type === "repayment" ? "#059669" : "#dc2626",
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900 text-xs truncate">{a.title}</p>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                      {a.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium text-[11px] truncate mt-0.5">{a.detail}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMPACT EXECUTIVE QUICK ACTION PORTALS ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Quick Action Portals
          </h3>
          <span className="text-[10px] font-bold text-slate-500">Fast Navigation</span>
        </div>

        <div className="flex gap-2 flex-wrap pt-0.5">
          <Link
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            href="/loans/new"
          >
            <Plus size={14} /> Issue New Loan
          </Link>
          <Link
            className="px-3.5 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/overdue"
          >
            <AlertOctagon size={14} className="text-rose-600" /> Overdue Recovery
          </Link>
          <Link
            className="px-3.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/arrears"
          >
            <AlertTriangle size={14} className="text-amber-600" /> Arrears &amp; Risk
          </Link>
          <Link
            className="px-3.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/reports"
          >
            <TrendingUp size={14} className="text-emerald-600" /> Financial Reports
          </Link>
          <Link
            className="px-3.5 py-1.5 bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/settings"
          >
            <Settings size={14} className="text-purple-600" /> System Settings &amp; Staff
          </Link>
        </div>
      </div>

      {/* Quick Collect Modal (Dashboard) */}
      {collectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <p className="text-[10px] font-black text-red-700 uppercase tracking-wider">
                  Quick Field Collection
                </p>
                <h3 className="text-sm font-black text-slate-900">
                  {collectingItem.customer?.name || collectingItem.loan.customerName}
                </h3>
              </div>
              <button
                onClick={() => setCollectingItem(null)}
                className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Facility:</span>
                <span className="font-bold text-slate-900">
                  {collectingItem.loan.loanNo || collectingItem.loan.id}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Installment Due:</span>
                <span className="font-bold text-slate-900">
                  {MONEY(collectingItem.installmentAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900">
                <span>Total Expected:</span>
                <span className="text-red-700">{MONEY(collectingItem.totalDueToday)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollect} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Amount Received (LKR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                    )
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-900 font-semibold"
                >
                  <option value="Cash">Cash (Field)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectingItem(null)}
                  className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check size={13} /> Confirm &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Official Printable Receipt Modal ── */}
      {activeReceiptPayment && (
        <ReceiptModal
          payment={activeReceiptPayment}
          onClose={() => setActiveReceiptPayment(null)}
        />
      )}
    </div>
  );
}

export default DashboardPage;
