/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
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
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import {
  getDailyCollections,
  formatFriendlyDate,
  type ScheduledCollectionItem,
} from "@/lib/collection-schedule";
import type { Customer, Loan, Payment } from "@/types";
import ReceiptModal from "@/components/modals/ReceiptModal";

interface DashboardPageProps {
  initialRole?: "admin" | "staff";
}

export function DashboardPage({ initialRole = "admin" }: DashboardPageProps) {
  const { customers, loans, payments, addPayment } = useData();

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
        const totalRepay =
          l.totalRepayment || (l.principal || l.amount || 0) + (l.interest || 0);
        const loanPaid = payments
          .filter((p) => p.loanId === l.id)
          .reduce((pSum, p) => pSum + (p.amount || 0), 0);
        return sum + Math.max(0, totalRepay - loanPaid);
      }, 0);
  }, [loans, payments]);

  // Compute today's collection items and metrics
  const collectionData = useMemo(() => {
    return getDailyCollections(loans, customers, payments, todayDateStr);
  }, [loans, customers, payments, todayDateStr]);

  const todaysCollections = collectionData.items;
  const collectionSummary = collectionData.summary;

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

  // Admin stats: Executive Portfolio Perspective
  const adminStats = [
    {
      label: "Total Loan Capital",
      value: MONEY(total),
      foot: "Disbursed across loan portfolio",
      icon: Wallet,
      color: "red",
    },
    {
      label: "Outstanding Balance",
      value: MONEY(Math.max(0, outstanding)),
      foot: "Estimated remaining recovery",
      icon: TrendingUp,
      color: "amber",
    },
    {
      label: "Active Lending Facilities",
      value: loans
        .filter(
          (l: Loan) =>
            (l.status || "").toLowerCase() === "active" ||
            (l.status || "").toLowerCase() === "overdue"
        )
        .length.toString(),
      foot: `${overdueLoans.length} requiring risk intervention`,
      icon: HandCoins,
      color: "emerald",
    },
    {
      label: "Customer Base",
      value: customers.length.toLocaleString(),
      foot: "KYC verified borrower profiles",
      icon: Users,
      color: "blue",
    },
  ];

  // Staff stats: Operational Field & Cashier Perspective
  const staffStats = [
    {
      label: "Today's Target",
      value: MONEY(collectionSummary.targetAmount),
      foot: "Scheduled route collections",
      icon: Calendar,
      color: "red",
    },
    {
      label: "Collected Today",
      value: MONEY(collectionSummary.collectedAmount),
      foot: `${collectionSummary.collectedCount} installment payments received`,
      icon: CheckCircle2,
      color: "emerald",
    },
    {
      label: "Remaining Due Today",
      value: MONEY(collectionSummary.pendingAmount),
      foot: `${collectionSummary.totalCount - collectionSummary.collectedCount} field visits pending`,
      icon: Clock,
      color: "amber",
    },
    {
      label: "Collection Efficiency",
      value: `${collectionSummary.collectionRate}%`,
      foot: `${collectionSummary.collectedCount} of ${collectionSummary.totalCount} installments settled`,
      icon: TrendingUp,
      color: "blue",
    },
  ];

  const currentStats = role === "admin" ? adminStats : staffStats;

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
        badge: "Ledger",
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
            ? "Loan application pending review"
            : "Loan facility disbursed",
        detail: `${l.loanNo || l.id} · ${c?.name || l.customerName} (${MONEY(l.principal || l.amount || 0)})`,
        time: l.issueDate === todayDateStr ? "Today" : l.issueDate || "Recent",
        badge: (l.status || "").toLowerCase() === "pending" ? "Underwriting" : "Active",
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

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification("")}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── ROLE-SPECIFIC HERO HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                role === "admin"
                  ? "bg-purple-100 text-purple-900 border-purple-200"
                  : "bg-blue-100 text-blue-900 border-blue-200"
              }`}
            >
              {role === "admin" ? "🛡️ Administrator Workstation" : "📋 Loan Officer / Staff Operations"}
            </span>
            <span className="text-xs font-bold text-slate-600">
              {formatFriendlyDate(todayDateStr)}
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
            {role === "admin" ? "Executive Portfolio Dashboard" : "Operational Staff Dashboard"}
          </h1>

          <p className="text-xs font-medium text-slate-600 mt-0.5 max-w-2xl">
            {role === "admin"
              ? "Comprehensive overview of disbursed capital, regulatory health, Committee approvals, and islandwide field collections."
              : "Daily field collection sheet, assigned borrower schedules, repayment receipts, and new loan origination."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {role === "admin" ? (
            <>
              <Link
                href="/overdue"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 transition"
              >
                <AlertOctagon size={14} className="text-rose-600" /> Overdue UI
              </Link>
              <Link
                href="/loans/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition cursor-pointer"
              >
                <Plus size={15} /> Issue Loan
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition"
              >
                <Calendar size={14} className="text-red-600" /> Daily Sheet
              </Link>
              <Link
                href="/repayments"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition"
              >
                <Receipt size={14} className="text-emerald-700" /> Record Payment
              </Link>
              <Link
                href="/customers/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition cursor-pointer"
              >
                <Plus size={15} /> Register Borrower
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── STAFF ONLY: DAILY OPERATIONS ROUTINE BAR ── */}
      {role === "staff" && (
        <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300 font-black">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                Officer Field Route #01 · Daily Target Operations
              </h2>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Target: {MONEY(collectionSummary.targetAmount)} · {todaysCollections.length} total borrower installments scheduled for today.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/collections"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Open Route Sheet
            </Link>
            <Link
              href="/overdue"
              className="px-3.5 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-bold border border-rose-700/60 transition"
            >
              Overdue Recoveries
            </Link>
            <Link
              href="/repayments"
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition"
            >
              Record Payment
            </Link>
          </div>
        </div>
      )}

      {/* ── 4 KPI METRIC CARDS (Contextualized for Admin vs Staff) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentStats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              key={s.label}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {s.label}
                </span>
                <div
                  className={`p-2.5 rounded-xl ${
                    s.color === "red"
                      ? "bg-red-50 text-red-600"
                      : s.color === "emerald"
                      ? "bg-emerald-50 text-emerald-700"
                      : s.color === "amber"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{s.value}</div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">{s.foot}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TODAY'S COLLECTION LIST SECTION ── */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-red-700 uppercase tracking-widest bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                Live Field Collections
              </span>
              <span className="text-xs text-slate-600 font-bold">
                {formatFriendlyDate(todayDateStr)}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1">
              Today&apos;s Collection List
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Scheduled borrower installments and delinquent recoveries assigned for collection today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/collections"
              className="text-xs font-bold text-red-700 hover:text-red-800 hover:underline inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition"
            >
              View Full Collection Sheet ({todaysCollections.length}) <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Snapshot Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wider block">
              Target Today
            </span>
            <span className="font-black text-slate-900 text-sm">
              {MONEY(collectionSummary.targetAmount)}
            </span>
          </div>
          <div>
            <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider block">
              Collected
            </span>
            <span className="font-black text-emerald-800 text-sm">
              {MONEY(collectionSummary.collectedAmount)}
            </span>
          </div>
          <div>
            <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider block">
              Pending
            </span>
            <span className="font-black text-amber-800 text-sm">
              {MONEY(collectionSummary.pendingAmount)}
            </span>
          </div>
          <div>
            <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wider block">
              Collection Rate
            </span>
            <span className="font-black text-slate-900 text-sm">
              {collectionSummary.collectionRate}% ({collectionSummary.collectedCount}/{collectionSummary.totalCount})
            </span>
          </div>
        </div>

        {/* Table of Today's Collections */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-[10px] text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Borrower / Contact</th>
                <th className="py-2.5 px-3">Facility</th>
                <th className="py-2.5 px-3">Cycle</th>
                <th className="py-2.5 px-3 text-right">Installment</th>
                <th className="py-2.5 px-3 text-right">Total Due Today</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todaysCollections.map((item) => {
                const bName =
                  item.customer?.fullName || item.customer?.name || item.loan.customerName || "Borrower";
                const initials = bName
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("");

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition ${
                      item.isCollectedToday ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    {/* Borrower / Contact */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-red-200">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {bName}
                          </div>
                          <div className="text-[10px] text-slate-600 font-medium flex items-center gap-1.5">
                            <span>{item.routeArea}</span>
                            {item.customer?.phone && (
                              <>
                                <span>•</span>
                                <span>{item.customer.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Facility */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-xs">
                        {item.loan.loanNo || item.loan.id}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {item.repaymentFrequency}
                      </div>
                    </td>

                    {/* Cycle */}
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">
                        #{item.cycleNumber} of {item.totalCycles}
                      </span>
                    </td>

                    {/* Installment */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {MONEY(item.installmentAmount)}
                    </td>

                    {/* Total Due Today */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-slate-900">
                        {MONEY(item.totalDueToday)}
                      </div>
                      {item.arrearsAmount > 0 && (
                        <div className="text-[9px] font-bold text-rose-700">
                          incl. {MONEY(item.arrearsAmount)} arrears
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {item.isCollectedToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 size={11} className="text-emerald-700" />
                          Collected
                        </span>
                      ) : item.status === "OVERDUE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                          <AlertTriangle size={11} className="text-rose-700" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock size={11} className="text-amber-700" />
                          Due Today
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      {item.isCollectedToday ? (
                        <span className="text-[11px] font-bold text-emerald-800 inline-flex items-center gap-1">
                          <Check size={12} /> Settled
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenCollect(item)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <CreditCard size={11} /> Collect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {todaysCollections.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 text-xs font-semibold">
                    No loan collections scheduled for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grid: Recent Loans & Side Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Loans</h2>
              <p className="text-xs text-slate-600 font-medium">Latest loan applications and portfolio status</p>
            </div>
            <Link
              href="/loans"
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-700 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">LOAN / CUSTOMER</th>
                  <th className="py-2.5 px-3">AMOUNT</th>
                  <th className="py-2.5 px-3">FREQUENCY</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.slice(0, 5).map((l: Loan) => {
                  const c = customers.find((x: Customer) => x.id === l.customerId);
                  const initials = (c?.name || "NA")
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("");
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-red-100 text-red-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-red-200">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {l.loanNo || l.id}
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium">
                              {c?.name || l.customerName || "Customer"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-xs text-slate-900">
                        {MONEY(l.principal || l.amount || 0)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-700 font-medium">
                        {l.repaymentFrequency || "Monthly"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            (l.status || "").toLowerCase() === "overdue"
                              ? "bg-rose-100 text-rose-900 border-rose-300"
                              : (l.status || "").toLowerCase() === "pending"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-emerald-100 text-emerald-900 border-emerald-300"
                          }`}
                        >
                          {l.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loans.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-medium text-xs">
                No loans yet. Create your first loan.
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Collection Snapshot</h2>
                <p className="text-xs text-slate-600 font-medium">Monthly recovery targets</p>
              </div>
              <ArrowUpRight size={17} className="text-slate-500" />
            </div>
            <div className="flex items-end justify-between h-28 pt-4 gap-1.5">
              {[42, 65, 48, 80, 57, 92, 68, 75, 51, 86, 61, 96].map((h, i) => (
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end" key={i}>
                  <div
                    className="w-full bg-gradient-to-t from-red-700 to-rose-500 rounded-t-sm transition-all"
                    style={{ height: `${h}%`, opacity: i === 11 ? 1 : 0.65 }}
                  />
                  <span className="text-[9px] text-slate-700 font-bold">
                    {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Dynamic Live Activity Feed */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
                <p className="text-xs text-slate-600 font-medium">Live transactions & credit workflow</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-3">
              {dynamicActivity.map((a) => (
                <div className="flex items-start gap-3 text-xs" key={a.detail}>
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{
                      background:
                        a.type === "repayment" ? "#059669" : a.badge.includes("Pending") ? "#d97706" : "#dc2626",
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{a.title}</p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {a.badge}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium text-[11px] mt-0.5">{a.detail}</p>
                    <span className="text-[10px] text-slate-500 font-medium">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ── ROLE-ADAPTED QUICK ACTIONS ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {role === "admin" ? "Administrator Executive Actions" : "Loan Officer Daily Actions"}
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              {role === "admin"
                ? "Manage authority levels, examine audits, configure products, and originate loans."
                : "Record repayments, access today's field route, and onboard new borrowers."}
            </p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-1 rounded">
            Role: {role}
          </span>
        </div>

        <div className="flex gap-3 flex-wrap pt-1">
          {role === "admin" ? (
            <>
              <Link
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-md shadow-red-600/20 cursor-pointer"
                href="/loans/new"
              >
                <Plus size={14} /> Issue New Loan
              </Link>
              <Link
                className="px-4 py-2.5 bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/overdue"
              >
                <AlertOctagon size={14} className="text-rose-600" /> Overdue UI
              </Link>
              <Link
                className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/arrears"
              >
                <AlertTriangle size={14} className="text-amber-600" /> Arrears & Risk
              </Link>
              <Link
                className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/reports"
              >
                <TrendingUp size={14} className="text-emerald-600" /> Financial Reports
              </Link>
              <Link
                className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/settings"
              >
                <Settings size={14} className="text-purple-600" /> System Settings & Staff
              </Link>
            </>
          ) : (
            <>
              <Link
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-md shadow-red-600/20 cursor-pointer"
                href="/collections"
              >
                <Calendar size={14} /> Open Today&apos;s Collections Sheet
              </Link>
              <Link
                className="px-4 py-2.5 bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/overdue"
              >
                <AlertOctagon size={14} className="text-rose-600" /> Overdue Recoveries
              </Link>
              <Link
                className="px-4 py-2.5 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/repayments"
              >
                <Receipt size={14} className="text-emerald-700" /> Record Repayment Receipt
              </Link>
              <Link
                className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/customers/new"
              >
                <Plus size={14} /> Register New Borrower
              </Link>
              <Link
                className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/loans/new"
              >
                <CreditCard size={14} /> Create Loan Application
              </Link>
              <Link
                className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                href="/customers"
              >
                <Users size={14} /> View Customer Directory
              </Link>
            </>
          )}
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
                  <Check size={13} /> Confirm & Issue Receipt
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
