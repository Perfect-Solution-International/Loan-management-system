"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Search, CreditCard, TrendingUp, AlertCircle, Eye } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Loan, Customer } from "@/types";

export default function LoansListPage() {
  const { loans, customers, payments } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredLoans = loans.filter((l: Loan) => {
    const cust = customers.find((c: Customer) => c.id === l.customerId);
    const matchesSearch =
      (l.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.loanNo || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.customerName || cust?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (l.status || "").toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const totalPortfolio = loans.reduce(
    (sum: number, l: Loan) => sum + (l.principal || l.amount || 0),
    0
  );
  const totalRepayments = loans.reduce(
    (sum: number, l: Loan) => sum + (l.totalRepayment || 0),
    0
  );
  const totalCollected = payments.reduce(
    (sum: number, p) => sum + (p.amount || 0),
    0
  );
  const activeLoansCount = loans.filter(
    (l: Loan) => (l.status || "").toUpperCase() === "ACTIVE"
  ).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
            PORTFOLIO / LOANS REGISTER
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Loans Directory
          </h1>
          <p className="text-xs text-slate-500">
            Monitor active loan contracts, repayment schedules, and status.
          </p>
        </div>
        <Link
          href="/loans/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/25 transition cursor-pointer"
        >
          <Plus size={16} /> Issue New Loan
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Disbursed
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {MONEY(totalPortfolio)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{loans.length} loans issued</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Contracts
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {activeLoansCount}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Under recovery</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Collections
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {MONEY(totalCollected)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Receipts recorded</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Outstanding Due
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {MONEY(Math.max(0, totalRepayments - totalCollected))}
            </h3>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Expected receivable</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by Loan ID, loan number, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto">
          {["ALL", "ACTIVE", "PENDING", "COMPLETED", "OVERDUE"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === s
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Loan ID</th>
                <th className="py-3.5 px-6">Borrower</th>
                <th className="py-3.5 px-6">Gross Principal</th>
                <th className="py-3.5 px-6">Interest Rate</th>
                <th className="py-3.5 px-6">Frequency</th>
                <th className="py-3.5 px-6">Installment</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLoans.map((l: Loan) => {
                const cust = customers.find((c: Customer) => c.id === l.customerId);
                const borrowerName = l.customerName || cust?.name || "Customer";

                return (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {l.loanNo || l.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {borrowerName}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {MONEY(l.principal || l.amount || 0)}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">
                      {l.interestRate}% ({l.ratePeriod || "Monthly"})
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">
                      {l.repaymentFrequency || "Monthly"}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-xs text-emerald-700">
                      {MONEY(l.installment || 0)}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          (l.status || "").toLowerCase() === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : (l.status || "").toLowerCase() === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : (l.status || "").toLowerCase() === "overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {l.status || "Active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        href={`/loans/${l.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLoans.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <CreditCard size={32} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">No loans found</p>
              <p>Try adjusting your search criteria or register a new loan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}