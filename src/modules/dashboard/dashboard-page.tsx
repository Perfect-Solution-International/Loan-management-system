"use client";

import React, { useState } from "react";
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
  CreditCard,
  X,
  Check,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import {
  getDailyCollections,
  formatFriendlyDate,
  type ScheduledCollectionItem,
} from "@/lib/collection-schedule";
import type { Customer, Loan, Payment } from "@/types";

export function DashboardPage() {
  const { customers, loans, payments, addPayment } = useData();

  // Today's date reference
  const todayDateStr = "2026-10-14";

  // Quick collect modal state on dashboard
  const [collectingItem, setCollectingItem] = useState<ScheduledCollectionItem | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [notification, setNotification] = useState<string>("");

  // Portfolio level aggregations
  const total = loans.reduce((s, l: Loan) => s + (l.principal || l.amount || 0), 0);
  const outstanding =
    loans
      .filter((l: Loan) => (l.status || "").toLowerCase() !== "completed")
      .reduce((s, l: Loan) => s + (l.totalRepayment || 0), 0) -
    payments.reduce((s, p) => s + (p.amount || 0), 0);

  // Compute today's collection items and metrics
  const collectionData = getDailyCollections(loans, customers, payments, todayDateStr);
  const todaysCollections = collectionData.items;
  const collectionSummary = collectionData.summary;

  const stats = [
    {
      label: "Total Customers",
      value: customers.length.toLocaleString(),
      foot: "Registered customer profiles",
      icon: Users,
    },
    {
      label: "Active Loans",
      value: loans
        .filter(
          (l: Loan) =>
            (l.status || "").toLowerCase() === "active" ||
            (l.status || "").toLowerCase() === "overdue"
        )
        .length.toString(),
      foot: "Loans currently being managed",
      icon: HandCoins,
    },
    {
      label: "Total Loan Value",
      value: MONEY(total),
      foot: "Across listed loan records",
      icon: Wallet,
    },
    {
      label: "Outstanding Balance",
      value: MONEY(Math.max(0, outstanding)),
      foot: "Estimated remaining collection",
      icon: TrendingUp,
    },
  ];

  const activity = [
    {
      title: "Daily collection received",
      detail: "LN-2004 · LKR 1,545 recorded via Cash",
      time: "Today · 9:30 AM",
    },
    {
      title: "Loan application approved",
      detail: "LN-2006 · Priyantha Jayasuriya",
      time: "Yesterday · 4:15 PM",
    },
    {
      title: "Repayment recorded",
      detail: "LN-2001 · LKR 29,500",
      time: "Oct 1 · 11:20 AM",
    },
  ];

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
      notes: `Installment #${collectingItem.cycleNumber} collected on dashboard`,
      method: paymentMethod,
      collectedBy: "Admin Officer",
      receiptNo,
    };

    addPayment(newPayment);
    setNotification(
      `Receipt ${receiptNo} recorded: LKR ${numAmount.toLocaleString()} collected from ${
        collectingItem.customer?.name || collectingItem.loan.customerName
      }.`
    );
    setCollectingItem(null);
    setCollectAmount("");

    setTimeout(() => {
      setNotification("");
    }, 5000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
            OVERVIEW / DASHBOARD
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Good morning, Admin 👋
          </h1>
          <p className="text-xs text-slate-500">
            Here&apos;s what&apos;s happening with your loan portfolio and field collections today.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200/90 shadow-xs transition cursor-pointer"
          >
            <Calendar size={15} className="text-red-600" /> Today&apos;s Collections Sheet
          </Link>
          <Link
            href="/loans/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            <Plus size={16} /> Create Loan
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
              key={s.label}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {s.label}
                </span>
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900">{s.value}</div>
                <div className="text-[11px] text-slate-400 mt-1">{s.foot}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TODAY'S COLLECTION LIST SECTION ── */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200/60 px-2 py-0.5 rounded">
                Live Field Collections
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {formatFriendlyDate(todayDateStr)}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1">
              Today&apos;s Collection List
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled borrower installments and delinquent recoveries assigned for collection today.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/collections"
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition"
            >
              View Full Collection Sheet ({todaysCollections.length}) <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Snapshot Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
              Target Today
            </span>
            <span className="font-black text-slate-900 text-sm">
              {MONEY(collectionSummary.targetAmount)}
            </span>
          </div>
          <div>
            <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider block">
              Collected
            </span>
            <span className="font-black text-emerald-700 text-sm">
              {MONEY(collectionSummary.collectedAmount)}
            </span>
          </div>
          <div>
            <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider block">
              Pending
            </span>
            <span className="font-black text-amber-700 text-sm">
              {MONEY(collectionSummary.pendingAmount)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
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
            <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
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
                      item.isCollectedToday ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    {/* Borrower / Contact */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {bName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
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
                      <div className="text-[10px] text-slate-400">
                        {item.repaymentFrequency}
                      </div>
                    </td>

                    {/* Cycle */}
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700">
                        #{item.cycleNumber} of {item.totalCycles}
                      </span>
                    </td>

                    {/* Installment */}
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {MONEY(item.installmentAmount)}
                    </td>

                    {/* Total Due Today */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-slate-900">
                        {MONEY(item.totalDueToday)}
                      </div>
                      {item.arrearsAmount > 0 && (
                        <div className="text-[9px] font-bold text-rose-600">
                          incl. {MONEY(item.arrearsAmount)} arrears
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {item.isCollectedToday ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Collected
                        </span>
                      ) : item.status === "OVERDUE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle size={11} className="text-rose-600" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={11} className="text-amber-600" />
                          Due Today
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      {item.isCollectedToday ? (
                        <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                          <Check size={12} /> Settled
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenCollect(item)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-1"
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
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
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
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Loans</h2>
              <p className="text-xs text-slate-500">Latest loan applications and portfolio status</p>
            </div>
            <Link
              href="/loans"
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 font-bold uppercase">
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
                          <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">
                              {l.loanNo || l.id}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {c?.name || l.customerName || "Customer"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-xs text-slate-900">
                        {MONEY(l.principal || l.amount || 0)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {l.repaymentFrequency || "Monthly"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (l.status || "").toLowerCase() === "overdue"
                              ? "bg-red-100 text-red-700"
                              : (l.status || "").toLowerCase() === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
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
              <div className="p-8 text-center text-slate-400 text-xs">
                No loans yet. Create your first loan.
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Collection Snapshot</h2>
                <p className="text-xs text-slate-500">Monthly recovery targets</p>
              </div>
              <ArrowUpRight size={17} className="text-slate-400" />
            </div>
            <div className="flex items-end justify-between h-28 pt-4 gap-1.5">
              {[42, 65, 48, 80, 57, 92, 68, 75, 51, 86, 61, 96].map((h, i) => (
                <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end" key={i}>
                  <div
                    className="w-full bg-gradient-to-t from-red-700 to-rose-500 rounded-t-sm transition-all"
                    style={{ height: `${h}%`, opacity: i === 11 ? 1 : 0.65 }}
                  />
                  <span className="text-[9px] text-slate-400 font-bold">
                    {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500">Latest updates across the system</p>
            </div>
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div className="flex items-start gap-3 text-xs" key={a.title}>
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{
                      background:
                        i === 1 ? "#e8a34b" : i === 2 ? "#20a17b" : "#dc2626",
                    }}
                  />
                  <div>
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="text-slate-500 text-[11px]">{a.detail}</p>
                    <span className="text-[10px] text-slate-400">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <Link
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-md shadow-red-600/20 cursor-pointer"
            href="/collections"
          >
            <Calendar size={14} /> Open Today&apos;s Collections
          </Link>
          <Link
            className="px-4 py-2.5 bg-red-50 text-red-800 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/customers/new"
          >
            <Plus size={14} /> Register Customer
          </Link>
          <Link
            className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/repayments"
          >
            <Wallet size={14} /> Record Repayment
          </Link>
          <Link
            className="px-4 py-2.5 bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
            href="/loans"
          >
            <HandCoins size={14} /> View All Loans
          </Link>
        </div>
      </div>

      {/* Quick Collect Modal (Dashboard) */}
      {collectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                  Quick Collection
                </p>
                <h3 className="text-sm font-black text-slate-900">
                  {collectingItem.customer?.name || collectingItem.loan.customerName}
                </h3>
              </div>
              <button
                onClick={() => setCollectingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Facility:</span>
                <span className="font-bold text-slate-900">
                  {collectingItem.loan.loanNo || collectingItem.loan.id}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
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
                <label className="block font-bold text-slate-700 mb-1">
                  Amount Received (LKR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                    )
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
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
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check size={13} /> Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
