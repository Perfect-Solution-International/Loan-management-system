"use client";

import React, { useState, useMemo } from "react";
import {
  Download,
  DollarSign,
  PieChart,
  Layers,
  Receipt,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type { Payment } from "@/types";

export default function FinancialReportsPage() {
  const { customers, loans, payments } = useData();

  // Active view & filters
  const [reportTab, setReportTab] = useState<"collections" | "portfolio">("collections");
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly" | "all">("monthly");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  // Date boundaries for filtering
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredPayments = useMemo(() => {
    const today = new Date();
    return payments.filter((p) => {
      const pDate = new Date(p.date);
      if (timePeriod === "daily") {
        return p.date === todayStr;
      }
      if (timePeriod === "weekly") {
        const diffTime = Math.abs(today.getTime() - pDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (timePeriod === "monthly") {
        const currentYearMonth = todayStr.slice(0, 7); // e.g. "2026-10"
        return p.date.startsWith(currentYearMonth);
      }
      return true; // "all"
    });
  }, [payments, timePeriod, todayStr]);

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (statusFilter === "ALL") return true;
      return (l.status || "").toUpperCase() === statusFilter.toUpperCase();
    });
  }, [loans, statusFilter]);

  // Aggregate Metrics
  const totalDisbursed = loans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0);
  const totalRepaymentExpected = loans.reduce((sum, l) => sum + (l.totalRepayment || 0), 0);
  const totalCollectionsAllTime = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPeriodCollections = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const capitalCollected = filteredPayments
    .filter((p) => p.type === "Capital")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const interestCollected = filteredPayments
    .filter((p) => p.type === "Interest")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const otherFeesCollected = filteredPayments
    .filter((p) => p.type === "Other")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const overduePortfolio = loans
    .filter((l) => (l.status || "").toLowerCase() === "overdue")
    .reduce((sum, l) => sum + (l.principal || l.amount || 0), 0);

  const outstandingReceivable = Math.max(0, totalRepaymentExpected - totalCollectionsAllTime);
  const collectionEfficiency = totalRepaymentExpected > 0
    ? Math.min(100, Math.round((totalCollectionsAllTime / totalRepaymentExpected) * 100 * 10) / 10)
    : 0;

  // Export CSV Handler
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
        c?.name || "Customer",
        p.type,
        p.method || "Cash",
        p.collectedBy || "Admin",
        p.amount,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `psi_one_collections_${timePeriod}_${todayStr}.csv`);
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
      const balance = Math.max(0, l.totalRepayment - paid);
      return [
        l.id,
        l.loanNo || l.id,
        l.customerId,
        c?.name || l.customerName || "Customer",
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
    link.setAttribute("download", `psi_one_portfolio_register_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
            ANALYTICS / FINANCIAL AUDIT
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Financial Reports & Portfolio Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Audit daily, weekly, and monthly collection journals and monitor loan repayment status.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={reportTab === "collections" ? exportCollectionsCsv : exportPortfolioCsv}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            <Download size={15} />
            Export {reportTab === "collections" ? "Collections Summary" : "Portfolio Register"} (CSV)
          </button>
        </div>
      </div>

      {/* Aggregate Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Total Disbursed
          </span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-900">{MONEY(totalDisbursed)}</h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">{loans.length} loan records</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Period Collections ({timePeriod})
          </span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-emerald-700">{MONEY(totalPeriodCollections)}</h3>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              {filteredPayments.length} receipts logged
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Outstanding Due
          </span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-900">{MONEY(outstandingReceivable)}</h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">Receivable capital & interest</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Overdue In-Arrears
          </span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-red-700">{MONEY(overduePortfolio)}</h3>
            <p className="text-[11px] text-red-700 font-medium mt-0.5">Requires immediate action</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            Recovery Efficiency
          </span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-red-700">{collectionEfficiency}%</h3>
            <p className="text-[11px] text-red-700 font-medium mt-0.5">Overall collection rate</p>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown & Visual Audit Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <PieChart size={16} className="text-red-600" />
          Collections Breakdown for Selected Period ({timePeriod.toUpperCase()})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 bg-red-50/70 rounded-xl border border-red-200/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-800 uppercase">Capital Recovery</span>
              <p className="text-lg font-black text-red-950 mt-1">{MONEY(capitalCollected)}</p>
            </div>
            <span className="text-xs font-bold text-red-600">
              {totalPeriodCollections > 0
                ? Math.round((capitalCollected / totalPeriodCollections) * 100)
                : 0}
              %
            </span>
          </div>

          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase">Interest Income</span>
              <p className="text-lg font-black text-emerald-900 mt-1">{MONEY(interestCollected)}</p>
            </div>
            <span className="text-xs font-bold text-emerald-600">
              {totalPeriodCollections > 0
                ? Math.round((interestCollected / totalPeriodCollections) * 100)
                : 0}
              %
            </span>
          </div>

          <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-800 uppercase">Other Fees / Penalties</span>
              <p className="text-lg font-black text-purple-900 mt-1">{MONEY(otherFeesCollected)}</p>
            </div>
            <span className="text-xs font-bold text-purple-600">
              {totalPeriodCollections > 0
                ? Math.round((otherFeesCollected / totalPeriodCollections) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* Main Report View Selectors & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Main Tab Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReportTab("collections")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                reportTab === "collections"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <DollarSign size={14} /> Collections Summary Report
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
              <Layers size={14} /> Loan Portfolio Register
            </button>
          </div>

          {/* Sub-Filters: Time Period or Status */}
          {reportTab === "collections" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Period:
              </span>
              {(["daily", "weekly", "monthly", "all"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTimePeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition uppercase cursor-pointer ${
                    timePeriod === p
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span className={timePeriod === p ? "text-white" : "text-slate-700"}>
                    {p === "daily" ? "Daily (Today)" : p === "weekly" ? "Weekly (7d)" : p === "monthly" ? "Monthly" : "All Time"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Loan Status:
              </span>
              {(["ALL", "ACTIVE", "PENDING", "OVERDUE", "COMPLETED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === s
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <span className={statusFilter === s ? "text-white" : "text-slate-700"}>
                    {s}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: COLLECTIONS SUMMARY REPORT TABLE */}
        {reportTab === "collections" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-700 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt / ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Borrower Name</th>
                  <th className="py-3 px-4">Loan Reference</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Collector</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredPayments.map((p) => {
                  const cust = customers.find((c) => c.id === p.customerId);
                  const loan = loans.find((l) => l.id === p.loanId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNo || p.id}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{p.date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {cust?.name || "Customer"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono font-medium">
                        {loan?.loanNo || p.loanId}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.type === "Capital"
                              ? "bg-red-100 text-red-700"
                              : p.type === "Interest"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{p.method || "Cash"}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{p.collectedBy || "Admin"}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {MONEY(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptPayment(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-red-600 hover:text-white text-slate-800 border-2 border-slate-300 hover:border-red-600 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                          <Receipt size={12} />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPayments.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-medium text-xs">
                No collections found for the {timePeriod} timeframe.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOAN PORTFOLIO REGISTER TABLE */}
        {reportTab === "portfolio" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-700 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Loan ID</th>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Principal</th>
                  <th className="py-3 px-4">Rate & Frequency</th>
                  <th className="py-3 px-4">Total Repayment</th>
                  <th className="py-3 px-4">Total Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredLoans.map((l) => {
                  const cust = customers.find((c) => c.id === l.customerId);
                  const paid = payments
                    .filter((p) => p.loanId === l.id)
                    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                  const balance = Math.max(0, l.totalRepayment - paid);

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {l.loanNo || l.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {cust?.name || l.customerName || "Customer"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {MONEY(l.principal || l.amount || 0)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {l.interestRate}% ({l.repaymentFrequency || "Monthly"})
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {MONEY(l.totalRepayment)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {MONEY(paid)}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-700">
                        {MONEY(balance)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
              <div className="p-8 text-center text-slate-400 text-xs">
                No loans found matching the status filter &quot;{statusFilter}&quot;.
              </div>
            )}
          </div>
        )}
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
