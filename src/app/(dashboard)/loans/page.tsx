"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Eye,
  Check,
  Wallet,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Loan, Customer, Payment } from "@/types";

// ── Financial Calculation Helper (defined at top-level for React Compiler purity) ─
function calculateLoanFinancials(
  loan: Loan,
  payments: Payment[],
  asOfDate: Date = new Date("2026-10-14")
) {
  const totalPaid = payments
    .filter((p) => p.loanId === loan.id)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalRepayment = loan.totalRepayment || ((loan.principal || loan.amount || 0) + (loan.interest || 0));
  const balanceDue = Math.max(0, totalRepayment - totalPaid);

  const statusUpper = (loan.status || "").toUpperCase();

  if (statusUpper === "COMPLETED" || (totalRepayment > 0 && totalPaid >= totalRepayment)) {
    return {
      totalPaid,
      balanceDue: 0,
      arrears: 0,
      missedInstallments: 0,
      overdueDays: 0,
      isDelinquent: false,
    };
  }

  if (statusUpper === "PENDING" || statusUpper === "REJECTED") {
    return {
      totalPaid: 0,
      balanceDue: totalRepayment,
      arrears: 0,
      missedInstallments: 0,
      overdueDays: 0,
      isDelinquent: false,
    };
  }

  const startDateStr = loan.firstPaymentDate || loan.issueDate;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const isDateValid = startDate && !isNaN(startDate.getTime());

  let rawArrears = 0;
  let overdueDays = 0;

  if (isDateValid && asOfDate >= startDate) {
    const diffDays = Math.max(0, Math.floor((asOfDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    let cycleDays = 30;
    if (loan.repaymentFrequency === "Daily") cycleDays = 1;
    else if (loan.repaymentFrequency === "Weekly") cycleDays = 7;

    const cyclesElapsed = Math.min(loan.duration || 1, Math.floor(diffDays / cycleDays) + 1);
    const expectedDue = Math.min(totalRepayment, cyclesElapsed * (loan.installment || 0));
    rawArrears = Math.max(0, expectedDue - totalPaid);
    overdueDays = rawArrears > 0 ? diffDays : 0;
  }

  const isOverdueStatus = statusUpper === "OVERDUE";
  const arrears = isOverdueStatus && rawArrears <= 0 ? (loan.installment || 0) : rawArrears;
  const missedInstallments = loan.installment > 0 && arrears > 0 ? Math.ceil(arrears / loan.installment) : 0;
  const isDelinquent = isOverdueStatus || arrears > 0;

  return {
    totalPaid,
    balanceDue,
    arrears,
    missedInstallments,
    overdueDays,
    isDelinquent,
  };
}

export default function LoansListPage() {
  const { loans, customers, payments } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pre-calculate financial status for each loan
  const loanFinancialsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateLoanFinancials>>();
    loans.forEach((l) => {
      map.set(l.id, calculateLoanFinancials(l, payments));
    });
    return map;
  }, [loans, payments]);

  // Aggregate Portfolio Metrics
  const totalPortfolio = useMemo(
    () => loans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0),
    [loans]
  );

  const totalCollected = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  );

  const totalArrears = useMemo(() => {
    let sum = 0;
    loanFinancialsMap.forEach((fin) => {
      sum += fin.arrears;
    });
    return sum;
  }, [loanFinancialsMap]);

  const delinquentCount = useMemo(() => {
    let count = 0;
    loanFinancialsMap.forEach((fin) => {
      if (fin.isDelinquent) count++;
    });
    return count;
  }, [loanFinancialsMap]);

  const activeLoansCount = useMemo(
    () => loans.filter((l) => (l.status || "").toUpperCase() === "ACTIVE").length,
    [loans]
  );

  const pendingLoansCount = useMemo(
    () => loans.filter((l) => (l.status || "").toUpperCase() === "PENDING").length,
    [loans]
  );

  const completedLoansCount = useMemo(
    () => loans.filter((l) => (l.status || "").toUpperCase() === "COMPLETED").length,
    [loans]
  );

  // Search and Filter Logic
  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return loans.filter((l: Loan) => {
      const cust = customers.find((c: Customer) => c.id === l.customerId);

      const matchesSearch =
        !query ||
        (l.id || "").toLowerCase().includes(query) ||
        (l.loanNo || "").toLowerCase().includes(query) ||
        (l.customerName || cust?.name || "").toLowerCase().includes(query) ||
        (cust?.nic || "").toLowerCase().includes(query) ||
        (cust?.phone || "").toLowerCase().includes(query) ||
        (l.purpose || "").toLowerCase().includes(query);

      const statusUpper = (l.status || "").toUpperCase();
      let matchesStatus = true;
      if (statusFilter === "ACTIVE") {
        matchesStatus = statusUpper === "ACTIVE";
      } else if (statusFilter === "OVERDUE") {
        matchesStatus = statusUpper === "OVERDUE";
      } else if (statusFilter === "PENDING") {
        matchesStatus = statusUpper === "PENDING";
      } else if (statusFilter === "COMPLETED") {
        matchesStatus = statusUpper === "COMPLETED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [loans, customers, search, statusFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-widest">
            CREDIT PORTFOLIO · LOANS REGISTER
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Credit Facilities Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time commercial lending ledger, repayment cycles, and delinquent arrears oversight.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/loans/new"
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/25 transition cursor-pointer w-full sm:w-auto"
          >
            <Plus size={15} /> Issue Credit Facility
          </Link>
        </div>
      </div>

      {/* ── Summary Financial Metrics ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Portfolio */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Disbursed
            </span>
            <div className="p-2 sm:p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black font-mono text-slate-900">
              {MONEY(totalPortfolio)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {loans.length} facilities across portfolio
            </p>
          </div>
        </div>

        {/* Card 2: Active Contracts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Contracts
            </span>
            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black font-mono text-emerald-600">
              {activeLoansCount}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Performing under schedule
            </p>
          </div>
        </div>

        {/* Card 3: Recoveries Collected */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Recovered
            </span>
            <div className="p-2 sm:p-2.5 bg-slate-100 text-slate-700 rounded-xl shrink-0">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black font-mono text-slate-900">
              {MONEY(totalCollected)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {payments.length} remittances logged
            </p>
          </div>
        </div>

        {/* Card 4: Portfolio Arrears */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-rose-500 uppercase tracking-wider">
              Total In Arrears
            </span>
            <div className="p-2 sm:p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-lg sm:text-2xl font-black font-mono text-rose-600">
              {MONEY(totalArrears)}
            </h3>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
              {delinquentCount} delinquent {delinquentCount === 1 ? "account" : "accounts"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter and Search Controls ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search contract ID, borrower, NIC, or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Facilities", count: loans.length },
            { id: "ACTIVE", label: "Active", count: activeLoansCount },
            { id: "OVERDUE", label: "In Arrears", count: delinquentCount },
            { id: "PENDING", label: "Under Review", count: pendingLoansCount },
            { id: "COMPLETED", label: "Settled", count: completedLoansCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Loans Register Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[860px]">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Facility No</th>
                <th className="py-3.5 px-5">Borrower Dossier</th>
                <th className="py-3.5 px-5 text-right">Principal</th>
                <th className="py-3.5 px-5">Interest Rate</th>
                <th className="py-3.5 px-5 text-right">Installment</th>
                <th className="py-3.5 px-5 text-right">Arrears</th>
                <th className="py-3.5 px-5 text-center">Standing</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLoans.map((l: Loan) => {
                const cust = customers.find((c: Customer) => c.id === l.customerId);
                const borrowerName = l.customerName || cust?.name || "Customer";
                const fin = loanFinancialsMap.get(l.id) || calculateLoanFinancials(l, payments);

                const borrowerInitials = borrowerName
                  .split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "CU";

                const isOverdue = (l.status || "").toLowerCase() === "overdue" || fin.isDelinquent;
                const isPending = (l.status || "").toLowerCase() === "pending";
                const isCompleted = (l.status || "").toLowerCase() === "completed";

                return (
                  <tr
                    key={l.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOverdue ? "bg-rose-50/20" : ""
                    }`}
                  >
                    {/* 1. Facility No */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <Link
                          href={`/loans/${l.id}`}
                          className="font-mono text-xs font-bold text-slate-900 hover:text-red-600 transition"
                        >
                          {l.loanNo || l.id}
                        </Link>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Issued {l.issueDate || "—"}
                        </span>
                      </div>
                    </td>

                    {/* 2. Borrower Dossier */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-slate-200/80">
                          {borrowerInitials}
                        </div>
                        <div className="flex flex-col">
                          <Link
                            href={cust ? `/customers/${cust.id}` : `/loans/${l.id}`}
                            className="font-bold text-slate-900 text-xs hover:text-red-600 transition truncate max-w-[200px]"
                          >
                            {borrowerName}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {cust?.nic ? `NIC: ${cust.nic}` : cust?.phone || l.purpose || "Borrower"}
                            {cust?.town ? ` · ${cust.town}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Gross Principal */}
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 text-xs">
                      <div>
                        {MONEY(l.principal || l.amount || 0)}
                        {l.netDisbursement && l.netDisbursement !== (l.principal || l.amount) && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            Net: {MONEY(l.netDisbursement)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Interest Rate (Includes frequency in brackets) */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-900">
                          {l.interestRate}% ({l.ratePeriod || l.repaymentFrequency || "Monthly"})
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {l.duration} {l.repaymentFrequency === "Daily" ? "Days" : l.repaymentFrequency === "Weekly" ? "Weeks" : "Months"} term
                        </span>
                      </div>
                    </td>

                    {/* 5. Installment Amount */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {MONEY(l.installment || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          per {l.repaymentFrequency?.toLowerCase() || "cycle"}
                        </span>
                      </div>
                    </td>

                    {/* 6. Arrears Column (NEW) */}
                    <td className="py-3.5 px-5 text-right">
                      {fin.arrears > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            {MONEY(fin.arrears)}
                          </span>
                          <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            {fin.missedInstallments > 0
                              ? `${fin.missedInstallments} cycle${fin.missedInstallments > 1 ? "s" : ""} overdue`
                              : "Overdue payment"}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-end">
                          <span className="text-xs font-mono font-medium text-slate-500">
                            {MONEY(0)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                            <Check size={10} /> Up to date
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 7. Standing / Status */}
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isOverdue
                            ? "bg-rose-100 text-rose-700 border border-rose-200/60"
                            : isPending
                            ? "bg-amber-100 text-amber-800 border border-amber-200/60"
                            : isCompleted
                            ? "bg-slate-100 text-slate-600 border border-slate-200/60"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200/60"
                        }`}
                      >
                        {isOverdue
                          ? "In Arrears"
                          : isPending
                          ? "Pending Review"
                          : isCompleted
                          ? "Settled"
                          : "Active"}
                      </span>
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/loans/${l.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition"
                          title="Inspect contract schedule and terms"
                        >
                          <Eye size={12} /> View
                        </Link>
                        {!isCompleted && !isPending && (
                          <Link
                            href="/repayments"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg transition"
                            title="Post recovery payment"
                          >
                            <Wallet size={12} /> Collect
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredLoans.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FileSpreadsheet size={24} />
              </div>
              <p className="font-bold text-slate-700 text-sm">
                No credit facilities match this criteria
              </p>
              <p className="max-w-md mx-auto text-slate-500">
                {search
                  ? `No loan records found matching "${search}". Verify borrower name, national ID, or contract number.`
                  : "No facilities currently recorded in this standing category."}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}