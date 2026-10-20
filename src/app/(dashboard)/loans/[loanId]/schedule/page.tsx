"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { parseDateString, formatDateToYMD } from "@/lib/collection-schedule";
import type { Loan, Customer, Payment } from "@/types";
import { getLoanTotalRepayment } from "@/lib/loan-financials";

interface ScheduleRow {
  cycle: number;
  dueDate: string;
  installmentAmount: number;
  principalComponent: number;
  interestComponent: number;
  remainingBalance: number;
  status: "PAID" | "OVERDUE" | "DUE_TODAY" | "UPCOMING";
  paidAmount?: number;
  paidDate?: string;
}

export default function LoanSchedulePreviewPage() {
  const params = useParams();
  const { loans, customers, payments } = useData();

  const loanId = (params?.loanId as string) || (params?.id as string);
  const loan = loans.find((l: Loan) => l.id === loanId);
  const customer = customers.find((c: Customer) => c.id === loan?.customerId);
  const loanPayments = payments.filter((p: Payment) => p.loanId === loanId);

  // Generate the full Amortization / Repayment Schedule
  const scheduleRows: ScheduleRow[] = useMemo(() => {
    if (!loan) return [];

    const rows: ScheduleRow[] = [];
    const duration = Math.max(1, loan.duration || 1);
    const gross = Number(loan.principal || loan.amount || 0);
    const totalRepay = getLoanTotalRepayment(loan);
    const remainingGross = Math.max(0, gross - Number(loan.capitalDeduction || 0));
    const totalInterest =
      typeof loan.interest === "number" && loan.interest >= 0
        ? Math.max(0, loan.interest - Number(loan.interestDeduction || 0))
        : Math.max(0, totalRepay - remainingGross);
    const frequency = loan.repaymentFrequency || "Monthly";
    const repaymentType = loan.repaymentType || "Capital + Interest";
    const startDate = parseDateString(loan.firstPaymentDate || loan.issueDate) || new Date();

    const todayStr = new Date().toISOString().slice(0, 10);
    let runningBalance = totalRepay;
    let accumulatedPaid = loanPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    for (let i = 1; i <= duration; i++) {
      // Calculate installment due date
      const dueDate = new Date(startDate.getTime());
      if (frequency === "Daily") {
        dueDate.setDate(dueDate.getDate() + (i - 1));
      } else if (frequency === "Weekly") {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
      } else {
        // Monthly
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      }
      const dueDateStr = formatDateToYMD(dueDate);

      let installmentAmt = 0;
      let principalPortion = 0;
      let interestPortion = 0;

      if (repaymentType === "Interest Only") {
        if (i === duration) {
          principalPortion = remainingGross;
          installmentAmt = runningBalance;
          interestPortion = Math.max(0, Math.round((installmentAmt - principalPortion) * 100) / 100);
        } else {
          interestPortion = Math.round((totalInterest / duration) * 100) / 100;
          principalPortion = 0;
          installmentAmt = interestPortion;
        }
      } else {
        // Capital + Interest
        if (i === duration) {
          installmentAmt = runningBalance;
          interestPortion = Math.max(0, Math.round((totalInterest - Math.round((totalInterest / duration) * 100) / 100 * (duration - 1)) * 100) / 100);
          principalPortion = Math.max(0, Math.round((installmentAmt - interestPortion) * 100) / 100);
        } else {
          installmentAmt = Math.round((totalRepay / duration) * 100) / 100;
          principalPortion = Math.round((remainingGross / duration) * 100) / 100;
          interestPortion = Math.max(0, Math.round((installmentAmt - principalPortion) * 100) / 100);
        }
      }

      runningBalance = Math.max(0, runningBalance - installmentAmt);

      // Determine payment status
      let rowStatus: "PAID" | "OVERDUE" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
      let rowPaidAmt = 0;

      if (accumulatedPaid >= installmentAmt) {
        rowStatus = "PAID";
        rowPaidAmt = installmentAmt;
        accumulatedPaid -= installmentAmt;
      } else if (accumulatedPaid > 0) {
        rowPaidAmt = accumulatedPaid;
        accumulatedPaid = 0;
        rowStatus = dueDateStr < todayStr ? "OVERDUE" : dueDateStr === todayStr ? "DUE_TODAY" : "UPCOMING";
      } else {
        if (dueDateStr < todayStr) {
          rowStatus = "OVERDUE";
        } else if (dueDateStr === todayStr) {
          rowStatus = "DUE_TODAY";
        } else {
          rowStatus = "UPCOMING";
        }
      }

      rows.push({
        cycle: i,
        dueDate: dueDateStr,
        installmentAmount: installmentAmt,
        principalComponent: principalPortion,
        interestComponent: interestPortion,
        remainingBalance: runningBalance,
        status: rowStatus,
        paidAmount: rowPaidAmt,
      });
    }

    return rows;
  }, [loan, loanPayments]);

  if (!loan) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
          <h2 className="text-lg font-black text-slate-900">Loan Facility Not Found</h2>
          <p className="text-xs text-slate-600 font-medium">The requested loan schedule record could not be located.</p>
          <Link
            href="/loans"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <ArrowLeft size={14} /> Back to Loans Directory
          </Link>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Cycle", "Due Date", "Installment (LKR)", "Principal (LKR)", "Interest (LKR)", "Balance (LKR)", "Status"];
    const rows = scheduleRows.map((r) => [
      `#${r.cycle}`,
      r.dueDate,
      r.installmentAmount,
      r.principalComponent,
      r.interestComponent,
      r.remainingBalance,
      r.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Schedule_${loan.id}_${loan.customerName || "Borrower"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/loans/${loan.id}`}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 transition"
            >
              <ArrowLeft size={13} /> Facility {loan.id}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              Amortization Schedule
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            Repayment Schedule: <span className="font-mono text-red-700">{loan.id}</span>
          </h1>

          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Borrower: <strong className="text-slate-900">{customer?.fullName || customer?.name || loan.customerName}</strong> ·{" "}
            Tenure: {loan.duration} {loan.repaymentFrequency} Cycles · Repayment Mode: {loan.repaymentType || "Capital + Interest"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/loans/${loan.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Details
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Download size={14} className="text-slate-600" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            <Printer size={14} /> Print Schedule
          </button>
        </div>
      </div>

      {/* ── Summary Financial Metrics Strip ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Loan Amount
          </span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {MONEY(loan.principal || loan.amount || 0)}
          </div>
          <span className="text-[10px] text-slate-600 font-medium">Disbursed Principal</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Interest Structure
          </span>
          <div className="text-lg font-black text-rose-700 font-mono mt-1">
            {MONEY(loan.interest || 0)}
          </div>
          <span className="text-[10px] text-slate-600 font-medium">
            {loan.interestRate}% ({loan.ratePeriod})
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Total Repayable
          </span>
          <div className="text-lg font-black text-slate-900 font-mono mt-1">
            {MONEY(loan.totalRepayment || 0)}
          </div>
          <span className="text-[10px] text-slate-600 font-medium">
            Across {loan.duration} installments
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Installment Amount
          </span>
          <div className="text-lg font-black text-red-600 font-mono mt-1">
            {MONEY(loan.installment || 0)}
          </div>
          <span className="text-[10px] text-slate-600 font-medium">
            Per {loan.repaymentFrequency.toLowerCase()} cycle
          </span>
        </div>
      </div>

      {/* ── Full Amortization Table ─────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Detailed Installment Breakdown ({scheduleRows.length} Cycles)
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Principal vs interest portions, scheduled payment dates, and remaining outstanding balance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <CheckCircle2 size={11} className="text-emerald-700" /> Settled
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Clock size={11} className="text-amber-700" /> Due Today
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
              <AlertTriangle size={11} className="text-rose-700" /> Overdue
            </span>
          </div>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 text-[10px] text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Cycle #</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-right">Interest</th>
                <th className="py-3 px-4 text-right">Installment Amount</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduleRows.map((r) => (
                <tr
                  key={r.cycle}
                  className={`hover:bg-slate-50 transition ${
                    r.status === "PAID"
                      ? "bg-emerald-50/30"
                      : r.status === "OVERDUE"
                      ? "bg-rose-50/30"
                      : r.status === "DUE_TODAY"
                      ? "bg-amber-50/30"
                      : ""
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    #{r.cycle}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {r.dueDate}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                    {MONEY(r.principalComponent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                    {MONEY(r.interestComponent)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                    {MONEY(r.installmentAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                    {MONEY(r.remainingBalance)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {r.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 size={11} className="text-emerald-700" /> Settled
                      </span>
                    ) : r.status === "OVERDUE" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        <AlertTriangle size={11} className="text-rose-700" /> Overdue
                      </span>
                    ) : r.status === "DUE_TODAY" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock size={11} className="text-amber-700" /> Due Today
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Scheduled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
