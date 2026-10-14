"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  HandCoins,
  Wallet,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan } from "@/types";

export function DashboardPage() {
  const { customers, loans, payments } = useData();

  const total = loans.reduce((s, l: Loan) => s + (l.principal || l.amount || 0), 0);
  const outstanding =
    loans
      .filter((l: Loan) => (l.status || "").toLowerCase() !== "completed")
      .reduce((s, l: Loan) => s + (l.totalRepayment || 0), 0) -
    payments.reduce((s, p) => s + (p.amount || 0), 0);

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
      title: "Customer profile registered",
      detail: "New customer record added",
      time: "Today · 9:42 AM",
    },
    {
      title: "Loan application updated",
      detail: "LN-2002 · Pending review",
      time: "Yesterday · 3:15 PM",
    },
    {
      title: "Repayment recorded",
      detail: "LN-2001 · LKR 29,500",
      time: "Oct 1 · 11:20 AM",
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            OVERVIEW / DASHBOARD
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Good morning, Admin 👋
          </h1>
          <p className="text-xs text-slate-500">
            Here&apos;s what&apos;s happening with your loan portfolio today.
          </p>
        </div>
        <Link
          href="/loans/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <Plus size={16} /> Create Loan
        </Link>
      </div>

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
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Loans</h2>
              <p className="text-xs text-slate-500">Latest loan applications and status</p>
            </div>
            <Link
              href="/loans"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
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
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0">
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
                    className="w-full bg-blue-600 rounded-t-sm transition-all"
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
                        i === 1 ? "#e8a34b" : i === 2 ? "#20a17b" : "#3b82f6",
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

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <Link
            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
            href="/customers/new"
          >
            <Plus size={14} /> Register Customer
          </Link>
          <Link
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            href="/loans/new"
          >
            <Plus size={14} /> Create Loan
          </Link>
          <Link
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
            href="/repayments"
          >
            <Wallet size={14} /> Record Repayment
          </Link>
          <Link
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
            href="/reports"
          >
            <TrendingUp size={14} /> View Reports
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
