"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Calendar, User, DollarSign, Clock, ShieldCheck, CreditCard } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Loan, Customer, Payment } from "@/types";

function LoanDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { loans, customers, payments } = useData();

  const loanId = ((params?.loanId as string) || (params?.id as string));
  const loan = loans.find((l: Loan) => l.id === loanId);
  const customer = customers.find((c: Customer) => c.id === loan?.customerId);
  const loanPayments = payments.filter((p: Payment) => p.loanId === loanId);

  if (!loan) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm text-center space-y-4">
          <h2 className="text-xl font-black text-slate-900">Loan Facility Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
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

  function handleDelete() {
    if (confirm("Are you sure you want to delete this loan record? This action cannot be undone.")) {
      router.push("/loans");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest">
            PORTFOLIO OPERATIONS / FACILITY DETAILS
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
            Loan Record: <span className="font-mono text-red-700">{loan.id}</span>
          </h1>
          <p className="text-xs text-slate-500">
            Detailed breakdown of loan terms, repayment scheme, amortization, and transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/loans"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Loans
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

      {/* Main Grid: Summary & Borrower */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Loan Financial Summary (2 cols) */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Financial Overview</h2>
              <p className="text-xs text-slate-500">Principal, interest structure, and real-time ledger balance.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {repaymentScheme}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  loan.status === "Active"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : loan.status === "Overdue"
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : loan.status === "Completed"
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {loan.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Loan Amount</span>
              <strong className="text-sm sm:text-base font-mono font-black text-slate-900 mt-1 block">
                {MONEY(loan.principal || loan.amount || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Interest Rate</span>
              <strong className="text-sm sm:text-base font-mono font-black text-rose-600 mt-1 block">
                {loan.interestRate}% ({loan.ratePeriod})
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Interest</span>
              <strong className="text-sm sm:text-base font-mono font-black text-rose-700 mt-1 block">
                {MONEY(loan.interest || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Repayment</span>
              <strong className="text-sm sm:text-base font-mono font-black text-slate-900 mt-1 block">
                {MONEY(loan.totalRepayment || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Disbursed</span>
              <strong className="text-sm sm:text-base font-mono font-black text-emerald-700 mt-1 block">
                {MONEY(loan.netDisbursement || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {loan.repaymentFrequency} Installment
              </span>
              <strong className="text-sm sm:text-base font-mono font-black text-red-600 mt-1 block">
                {MONEY(loan.installment || 0)}
              </strong>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Remitted</span>
              <strong className="text-sm sm:text-base font-mono font-black text-emerald-700 mt-1 block">
                {MONEY(totalPaid)}
              </strong>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Outstanding Balance</span>
              <strong className="text-sm sm:text-base font-mono font-black text-rose-700 mt-1 block">
                {MONEY(balanceDue)}
              </strong>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 font-medium">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-500" />
              <span>
                Schedule: <strong>{loan.duration}</strong> {loan.repaymentFrequency.toLowerCase()} cycles · First repayment on{" "}
                <strong>{loan.firstPaymentDate}</strong>
              </span>
            </div>
            {loan.disbursementMethod && (
              <span className="font-semibold text-slate-600">Disbursed via: {loan.disbursementMethod}</span>
            )}
          </div>
        </section>

        {/* Borrower Information (1 col) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">Borrower Details</h2>
            <p className="text-xs text-slate-500">Identity and contact information</p>
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
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {customer.id} · NIC: {customer.nic}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
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
            <p className="text-xs text-slate-400 italic">Associated customer profile not found.</p>
          )}

          {loan.guarantorName && (
            <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Guarantor</span>
              <p className="font-bold text-slate-800">{loan.guarantorName}</p>
              {loan.guarantorNic && <p className="text-slate-500 font-mono text-[11px]">NIC: {loan.guarantorNic}</p>}
            </div>
          )}
        </section>
      </div>

      {/* Repayment History Table */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Repayment Ledger</h2>
            <p className="text-xs text-slate-500">All registered installment payments and collections for this facility.</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {loanPayments.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-5">Receipt / Payment ID</th>
                <th className="py-3 px-5">Remittance Date</th>
                <th className="py-3 px-5">Allocation Type</th>
                <th className="py-3 px-5">Payment Method</th>
                <th className="py-3 px-5 text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loanPayments.map((p: Payment) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-slate-900">{p.id}</td>
                  <td className="py-3.5 px-5 text-slate-600">{p.date}</td>
                  <td className="py-3.5 px-5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">{p.method || "Cash"}</td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-700">
                    {MONEY(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loanPayments.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No remittance payments recorded for this facility yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function LoanDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading loan record...</div>}>
      <LoanDetailsContent />
    </Suspense>
  );
}