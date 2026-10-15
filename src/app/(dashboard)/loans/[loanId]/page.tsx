"use client";

import React, { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  User,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Check,
  X,
  ExternalLink,
  BadgeCheck,
  Receipt,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { parseDateString, formatDateToYMD } from "@/lib/collection-schedule";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type { Loan, Customer, Payment } from "@/types";

interface ScheduleRow {
  cycle: number;
  dueDate: string;
  installmentAmount: number;
  principalComponent: number;
  interestComponent: number;
  remainingBalance: number;
  status: "PAID" | "OVERDUE" | "DUE_TODAY" | "UPCOMING";
}

function LoanDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { loans, customers, payments, updateLoan } = useData();

  const loanId = (params?.loanId as string) || (params?.id as string);
  const loan = loans.find((l: Loan) => l.id === loanId);
  const customer = customers.find((c: Customer) => c.id === loan?.customerId);
  const loanPayments = payments.filter((p: Payment) => p.loanId === loanId);

  // Approval action state
  const [approvalNote, setApprovalNote] = useState<string>("");
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");

  // Tab view: "schedule" | "ledger"
  const [activeTab, setActiveTab] = useState<"schedule" | "ledger">("schedule");
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  // Calculate Amortization Schedule
  const scheduleRows: ScheduleRow[] = useMemo(() => {
    if (!loan) return [];

    const rows: ScheduleRow[] = [];
    const duration = Math.max(1, loan.duration || 1);
    const gross = Number(loan.principal || loan.amount || 0);
    const totalRepay = Number(loan.totalRepayment || gross + (loan.interest || 0));
    const totalInterest = Math.max(0, totalRepay - gross);
    const frequency = loan.repaymentFrequency || "Monthly";
    const repaymentType = loan.repaymentType || "Capital + Interest";
    const startDate = parseDateString(loan.firstPaymentDate || loan.issueDate) || new Date();

    const todayStr = new Date().toISOString().slice(0, 10);
    let runningBalance = totalRepay;
    let accumulatedPaid = loanPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    for (let i = 1; i <= duration; i++) {
      const dueDate = new Date(startDate.getTime());
      if (frequency === "Daily") {
        dueDate.setDate(dueDate.getDate() + (i - 1));
      } else if (frequency === "Weekly") {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
      } else {
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      }
      const dueDateStr = formatDateToYMD(dueDate);

      let installmentAmt = 0;
      let principalPortion = 0;
      let interestPortion = 0;

      const remainingGross = Math.max(0, gross - (loan.capitalDeduction || 0));

      if (repaymentType === "Interest Only") {
        if (i === duration) {
          principalPortion = remainingGross;
          installmentAmt = runningBalance;
          interestPortion = Math.max(0, installmentAmt - principalPortion);
        } else {
          interestPortion = Math.round(totalInterest / duration);
          principalPortion = 0;
          installmentAmt = interestPortion;
        }
      } else {
        // Capital + Interest
        if (i === duration) {
          installmentAmt = runningBalance;
          interestPortion = Math.max(0, totalInterest - Math.round(totalInterest / duration) * (duration - 1));
          principalPortion = Math.max(0, installmentAmt - interestPortion);
        } else {
          installmentAmt = Math.round(totalRepay / duration);
          principalPortion = Math.round(remainingGross / duration);
          interestPortion = Math.max(0, installmentAmt - principalPortion);
        }
      }

      runningBalance = Math.max(0, runningBalance - installmentAmt);

      let rowStatus: "PAID" | "OVERDUE" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
      if (accumulatedPaid >= installmentAmt) {
        rowStatus = "PAID";
        accumulatedPaid -= installmentAmt;
      } else if (accumulatedPaid > 0) {
        accumulatedPaid = 0;
        rowStatus = dueDateStr < todayStr ? "OVERDUE" : dueDateStr === todayStr ? "DUE_TODAY" : "UPCOMING";
      } else {
        rowStatus = dueDateStr < todayStr ? "OVERDUE" : dueDateStr === todayStr ? "DUE_TODAY" : "UPCOMING";
      }

      rows.push({
        cycle: i,
        dueDate: dueDateStr,
        installmentAmount: installmentAmt,
        principalComponent: principalPortion,
        interestComponent: interestPortion,
        remainingBalance: runningBalance,
        status: rowStatus,
      });
    }

    return rows;
  }, [loan, loanPayments]);

  if (!loan) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
          <h2 className="text-xl font-black text-slate-900">Loan Facility Not Found</h2>
          <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
            The requested loan record does not exist or has been removed from the registry.
          </p>
          <div>
            <Link
              href="/loans"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ArrowLeft size={14} /> Back to Loans Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalPaid = loanPayments.reduce((sum: number, p: Payment) => sum + (Number(p.amount) || 0), 0);
  const balanceDue = Math.max(0, (loan.totalRepayment || 0) - totalPaid);
  const repaymentScheme = loan.repaymentType || "Capital + Interest";
  const isPending = (loan.status || "").toLowerCase() === "pending";

  const handleApprove = () => {
    updateLoan(loan.id, {
      status: "Active",
      approvedBy: "Branch Credit Committee",
      approvedAt: new Date().toISOString().slice(0, 10),
      notes: approvalNote ? `${loan.notes ? loan.notes + " | " : ""}Approval Note: ${approvalNote}` : loan.notes,
    });
    setDecisionFeedback("Facility has been approved and moved to ACTIVE lending ledger.");
    setTimeout(() => setDecisionFeedback(""), 6000);
  };

  const handleReject = () => {
    if (confirm("Are you sure you want to REJECT this loan application?")) {
      updateLoan(loan.id, {
        status: "Rejected",
        approvedBy: "Branch Credit Committee (Declined)",
        approvedAt: new Date().toISOString().slice(0, 10),
        notes: approvalNote ? `${loan.notes ? loan.notes + " | " : ""}Rejection Reason: ${approvalNote}` : loan.notes,
      });
      setDecisionFeedback("Loan application has been marked as REJECTED.");
      setTimeout(() => setDecisionFeedback(""), 6000);
    }
  };

  function handleDelete() {
    if (confirm("Are you sure you want to delete this loan record? This action cannot be undone.")) {
      router.push("/loans");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Decision / Action Toast ─────────────────────────────────────── */}
      {decisionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
            <span>{decisionFeedback}</span>
          </div>
          <button
            onClick={() => setDecisionFeedback("")}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
            PORTFOLIO OPERATIONS / FACILITY DETAILS
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            Loan Record: <span className="font-mono text-red-700">{loan.id}</span>
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            Detailed breakdown of loan terms, repayment scheme, amortization schedule, and committee decision.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/loans"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Loans
          </Link>
          <Link
            href={`/loans/${loan.id}/schedule`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition shadow-xs"
          >
            <Calendar size={14} className="text-red-600" /> Full Schedule
          </Link>
          <Link
            href="/repayments"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition"
          >
            <CreditCard size={14} /> Record Payment
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition cursor-pointer"
            onClick={handleDelete}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* ── CARD 17: LOAN DETAILS & APPROVAL DECISION PANEL ─────────────── */}
      {isPending ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                  Committee Approval Required
                </span>
                <h3 className="text-base font-black text-amber-950 mt-1">
                  Credit Committee & Delegated Lending Authority Review
                </h3>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1 rounded-xl border border-amber-300">
              Application Status: PENDING SIGN-OFF
            </span>
          </div>

          <p className="text-xs text-amber-900 font-medium">
            This loan application requires sign-off by an authorized Administrator or Branch Credit Committee member. Review customer KYC, guarantor stakes, and repayment ability before releasing funds.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">
                Committee Approval Notes / Authority Remarks (Optional):
              </label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="e.g. Approved under BM limit of LKR 500,000. Guarantor NIC verified."
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleApprove}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check size={16} /> Approve & Activate Facility
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <X size={15} /> Decline / Reject Application
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <BadgeCheck size={18} className="text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">
                Credit Committee Approval Verified:
              </span>{" "}
              <span className="text-slate-700 font-medium">
                {loan.approvedBy || "Authorized by Head Office Lending Committee"}
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            Facility Active Since: {loan.issueDate || "2026-10-14"}
          </span>
        </div>
      )}

      {/* ── Main Grid: Financial Summary & Borrower Details ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Loan Financial Summary (2 cols) */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Financial Overview</h2>
              <p className="text-xs text-slate-600 font-medium">Principal, interest structure, and real-time ledger balance.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {repaymentScheme}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  loan.status === "Active"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : loan.status === "Overdue"
                    ? "bg-rose-100 text-rose-900 border-rose-300"
                    : loan.status === "Completed"
                    ? "bg-slate-100 text-slate-800 border-slate-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                {loan.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Loan Amount</span>
              <strong className="text-sm sm:text-base font-mono font-black text-slate-900 mt-1 block">
                {MONEY(loan.principal || loan.amount || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Interest Rate</span>
              <strong className="text-sm sm:text-base font-mono font-black text-rose-700 mt-1 block">
                {loan.interestRate}% ({loan.ratePeriod})
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Total Interest</span>
              <strong className="text-sm sm:text-base font-mono font-black text-rose-700 mt-1 block">
                {MONEY(loan.interest || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Total Repayment</span>
              <strong className="text-sm sm:text-base font-mono font-black text-slate-900 mt-1 block">
                {MONEY(loan.totalRepayment || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Net Disbursed</span>
              <strong className="text-sm sm:text-base font-mono font-black text-emerald-800 mt-1 block">
                {MONEY(loan.netDisbursement || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                {loan.repaymentFrequency} Installment
              </span>
              <strong className="text-sm sm:text-base font-mono font-black text-red-600 mt-1 block">
                {MONEY(loan.installment || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Total Remitted</span>
              <strong className="text-sm sm:text-base font-mono font-black text-emerald-800 mt-1 block">
                {MONEY(totalPaid)}
              </strong>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">Outstanding Balance</span>
              <strong className="text-sm sm:text-base font-mono font-black text-rose-800 mt-1 block">
                {MONEY(balanceDue)}
              </strong>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 font-medium">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-600" />
              <span>
                Schedule: <strong>{loan.duration}</strong> {loan.repaymentFrequency.toLowerCase()} cycles · First repayment on{" "}
                <strong>{loan.firstPaymentDate}</strong>
              </span>
            </div>
            {loan.disbursementMethod && (
              <span className="font-semibold text-slate-800">Disbursed via: {loan.disbursementMethod}</span>
            )}
          </div>
        </section>

        {/* Borrower Information (1 col) */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">Borrower Details</h2>
            <p className="text-xs text-slate-600 font-medium">Identity and contact information</p>
          </div>

          {customer ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {customer.photoUrl ? (
                  <img
                    src={customer.photoUrl}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 font-extrabold text-base flex items-center justify-center shrink-0">
                    {(customer.fullName || customer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-black text-slate-900">{customer.fullName || customer.name}</h3>
                  <p className="text-xs text-slate-600 font-mono font-semibold">
                    ID: {customer.id} · NIC: {customer.nic}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <p><strong>Phone:</strong> {customer.phone}</p>
                <p><strong>Address:</strong> {customer.address}, {customer.town || customer.village || "Sri Lanka"}</p>
                <p><strong>District:</strong> {customer.district || "Colombo"}</p>
              </div>

              <div className="pt-2">
                <Link
                  href={`/customers/${customer.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition"
                >
                  View Full Profile →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Associated customer profile not found.</p>
          )}

          {loan.guarantorName && (
            <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Security Guarantor</span>
              <p className="font-bold text-slate-900">{loan.guarantorName}</p>
              {loan.guarantorNic && <p className="text-slate-600 font-mono text-[11px]">NIC: {loan.guarantorNic}</p>}
            </div>
          )}
        </section>
      </div>

      {/* ── CARD 16: REPAYMENT SCHEDULE PREVIEW & CARD 18: REPAYMENT LEDGER ── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
        {/* Tab Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "schedule"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Calendar size={14} />
              <span>16. Repayment Schedule Preview ({scheduleRows.length} Cycles)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ledger"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <CreditCard size={14} />
              <span>18. Repayment History Ledger ({loanPayments.length} Payments)</span>
            </button>
          </div>

          <Link
            href={`/loans/${loan.id}/schedule`}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            Open Standalone Schedule Page <ExternalLink size={12} />
          </Link>
        </div>

        {/* Tab 1: Repayment Schedule Preview */}
        {activeTab === "schedule" && (
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-50 text-[10px] text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cycle #</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Interest</th>
                  <th className="py-3 px-4 text-right">Installment Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduleRows.map((r) => (
                  <tr
                    key={r.cycle}
                    className={`hover:bg-slate-50 transition ${
                      r.status === "PAID"
                        ? "bg-emerald-50/40"
                        : r.status === "OVERDUE"
                        ? "bg-rose-50/40"
                        : r.status === "DUE_TODAY"
                        ? "bg-amber-50/40"
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
        )}

        {/* Tab 2: Repayment History Ledger */}
        {activeTab === "ledger" && (
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-[10px] text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Receipt / Payment ID</th>
                  <th className="py-3 px-5">Remittance Date</th>
                  <th className="py-3 px-5">Allocation Type</th>
                  <th className="py-3 px-5">Payment Method</th>
                  <th className="py-3 px-5 text-right">Amount (LKR)</th>
                  <th className="py-3 px-5 text-right">Official Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loanPayments.map((p: Payment) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                      {p.receiptNo || p.id}
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 font-medium">{p.date}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 font-medium">{p.method || "Cash"}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-black text-emerald-800">
                      {MONEY(p.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptPayment(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                        title="View & Print Official Receipt"
                      >
                        <Receipt size={13} className="text-white shrink-0" />
                        <span className="text-white font-bold">Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loanPayments.length === 0 && (
              <div className="p-8 text-center text-slate-500 font-medium text-xs">
                No remittance payments recorded for this facility yet.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Official Receipt Modal */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
          customer={customer}
          loan={loan}
        />
      )}
    </div>
  );
}

export default function LoanDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs font-semibold">Loading loan record...</div>}>
      <LoanDetailsContent />
    </Suspense>
  );
}