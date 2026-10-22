"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Banknote,
  Search,
  CheckCircle2,
  Receipt,
  Printer,
  X,
  CreditCard,
  User,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment } from "@/types";

export default function RepaymentsCollectionsPage() {
  const { customers, loans, payments, addPayment } = useData();

  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    loans.find((l) => l.status === "Active" || l.status === "Overdue")?.id || loans[0]?.id || ""
  );
  const [paymentType, setPaymentType] = useState<Payment["type"]>("Capital");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [notes, setNotes] = useState<string>("");
  const [collectedBy, setCollectedBy] = useState<string>("Admin Officer");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Filter state for collections ledger
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Receipt popup state
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);
  const [notificationMsg, setNotificationMsg] = useState("");

  const selectedLoan = loans.find((l: Loan) => l.id === selectedLoanId);
  const selectedCustomer = customers.find(
    (c: Customer) => c.id === selectedLoan?.customerId
  );

  // Financial calculations for the selected loan
  const loanPayments = useMemo(() => {
    return payments.filter((p) => p.loanId === selectedLoanId);
  }, [payments, selectedLoanId]);

  const totalPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [loanPayments]);

  const balanceDue = useMemo(() => {
    if (!selectedLoan) return 0;
    return Math.max(0, (selectedLoan.totalRepayment || 0) - totalPaid);
  }, [selectedLoan, totalPaid]);

  const numEnteredAmount = Number(amount) || 0;
  const newBalanceAfter = Math.max(0, balanceDue - numEnteredAmount);
  const willSettleLoan = numEnteredAmount > 0 && numEnteredAmount >= balanceDue;

  // Aggregate Metrics across the entire system
  const totalCollectionsAllTime = payments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const totalCapitalRepaid = payments
    .filter((p) => p.type === "Capital")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalInterestCollected = payments
    .filter((p) => p.type === "Interest")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const completedLoansCount = loans.filter((l) => l.status === "Completed").length;

  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || numEnteredAmount <= 0) return;

    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: Payment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      loanId: selectedLoan.id,
      customerId: selectedLoan.customerId,
      amount: numEnteredAmount,
      date: paymentDate,
      type: paymentType,
      notes: notes.trim() || undefined,
      method: paymentMethod,
      collectedBy,
      receiptNo,
    };

    addPayment(newPayment);
    setActiveReceipt(newPayment);

    const completionMsg =
      willSettleLoan
        ? ` Repayment recorded successfully. Loan ${selectedLoan.loanNo || selectedLoan.id} is now fully SETTLED and status has been updated to COMPLETED!`
        : ` Repayment of ${MONEY(numEnteredAmount)} recorded successfully!`;

    setNotificationMsg(completionMsg);
    setAmount("");
    setNotes("");

    setTimeout(() => {
      setNotificationMsg("");
    }, 6000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Filtered Payments for Ledger
  const filteredPayments = payments.filter((p) => {
    const loan = loans.find((l) => l.id === p.loanId);
    const cust = customers.find((c) => c.id === p.customerId);
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      (p.id || "").toLowerCase().includes(searchLower) ||
      (p.receiptNo || "").toLowerCase().includes(searchLower) ||
      (p.loanId || "").toLowerCase().includes(searchLower) ||
      (loan?.loanNo || "").toLowerCase().includes(searchLower) ||
      (cust?.name || "").toLowerCase().includes(searchLower);

    const matchesType = typeFilter === "ALL" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            COLLECTIONS / REPAYMENTS MODULE
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Repayments
          </h1>
          <p className="text-xs text-slate-500">
            Record loan recoveries separated by Capital, Interest, and Other fees with automated status settlement.
          </p>
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition"
        >
          View Collection Reports <ArrowRight size={14} />
        </Link>
      </div>

      {notificationMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Inflows
            </p>
            <h3 className="text-2xl font-semibold text-slate-900 mt-1">
              {MONEY(totalCollectionsAllTime)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {payments.length} transactions recorded
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Banknote size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Capital Recovered
            </p>
            <h3 className="text-2xl font-semibold text-emerald-600 mt-1">
              {MONEY(totalCapitalRepaid)}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              Principal reductions
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Interest Earned
            </p>
            <h3 className="text-2xl font-semibold text-blue-600 mt-1">
              {MONEY(totalInterestCollected)}
            </h3>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              Gross interest recognized
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Receipt size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Settled Loans
            </p>
            <h3 className="text-2xl font-semibold text-slate-900 mt-1">
              {completedLoansCount}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              100% paid off contracts
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Main Repayment Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Loan Selector & Repayment Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                1. Select Loan & Enter Payment Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose the contract and record repayment categorized by financial component.
              </p>
            </div>

            <form onSubmit={handleRecordRepayment} className="space-y-5">
              {/* Loan Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="ui-field-1">
                  Loan account *
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                 id="ui-field-1">
                  {loans.map((l) => {
                    const c = customers.find((cust) => cust.id === l.customerId);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.loanNo || l.id} — {c?.name || l.customerName || "Customer"} (
                        {l.status} · Principal: {MONEY(l.principal || l.amount || 0)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Payment Type Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Payment category *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Capital", "Interest", "Other"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPaymentType(t)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                        paymentType === t
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>
                        {t === "Capital" ? "💳" : t === "Interest" ? "📈" : "⚖️"}
                      </span>
                      <span>{t} Payment</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {paymentType === "Capital"
                    ? "Deducts directly from principal borrowed."
                    : paymentType === "Interest"
                    ? "Records interest service payment."
                    : "Records document fees, late charges, or other administrative penalties."}
                </p>
              </div>

              {/* Amount, Method, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="ui-field-2">
                    Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={`e.g. ${selectedLoan?.installment || 25000}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   id="ui-field-2"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="ui-field-3">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                      )
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   id="ui-field-3">
                    <option value="Cash">Cash On Hand</option>
                    <option value="Bank Transfer">Bank Transfer / Deposit</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="ui-field-4">
                    Collection Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   id="ui-field-4"/>
                </div>
              </div>

              {/* Notes & Staff Collector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="ui-field-5">
                    Collection Officer
                  </label>
                  <input
                    type="text"
                    value={collectedBy}
                    onChange={(e) => setCollectedBy(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   id="ui-field-5"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="ui-field-6">
                    Reference / Cashier Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Field receipt book #42, slip #88"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   id="ui-field-6"/>
                </div>
              </div>

              {/* Real-time settlement banner */}
              {willSettleLoan && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>
                    🎉 This payment will settle the loan in full! Loan status will automatically transition from Active to COMPLETED upon submission.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!selectedLoan || numEnteredAmount <= 0}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-sm  transition cursor-pointer"
                >
                  <Receipt size={16} /> Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Live Loan Financial Ledger & Balance Due Breakdown */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-sm tracking-wide">
                  Live Contract Balance
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedLoan?.loanNo || selectedLoan?.id}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  selectedLoan?.status.toLowerCase() === "completed"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : selectedLoan?.status.toLowerCase() === "overdue"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {selectedLoan?.status}
              </span>
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl text-xs">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{selectedCustomer.name}</p>
                  <p className="text-xs text-slate-400">NIC: {selectedCustomer.nic}</p>
                </div>
              </div>
            )}

            {/* Balances List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Gross Principal</span>
                <span className="font-semibold text-slate-200">
                  {MONEY(selectedLoan?.principal || selectedLoan?.amount || 0)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Repayment Due</span>
                <span className="font-semibold text-slate-200">
                  {MONEY(selectedLoan?.totalRepayment || 0)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Paid So Far</span>
                <span className="font-semibold text-emerald-400">
                  {MONEY(totalPaid)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Current Balance Due</span>
                <span className="font-semibold text-amber-400 text-sm">
                  {MONEY(balanceDue)}
                </span>
              </div>

              {numEnteredAmount > 0 && (
                <div className="flex justify-between py-1.5 px-3 bg-blue-950/60 rounded-xl border border-blue-800/40 mt-2">
                  <span className="text-blue-300 font-semibold">After Payment</span>
                  <span className="font-semibold text-white">
                    {MONEY(newBalanceAfter)}
                  </span>
                </div>
              )}
            </div>

            {/* Repayment Progress Bar */}
            {selectedLoan && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Recovery Progress</span>
                  <span className="font-semibold text-slate-200">
                    {selectedLoan.totalRepayment > 0
                      ? Math.min(100, Math.round((totalPaid / selectedLoan.totalRepayment) * 100))
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        selectedLoan.totalRepayment > 0
                          ? Math.min(100, (totalPaid / selectedLoan.totalRepayment) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLLECTIONS JOURNAL & LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Collections Journal & Receipts History
            </h3>
            <p className="text-xs text-slate-500">
              Complete historical record of incoming repayments and field collections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search receipt, loan, borrower..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
               aria-label="Search receipt, loan, borrower..."/>
            </div>

            <div className="flex gap-1.5">
              {(["ALL", "Capital", "Interest", "Other"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    typeFilter === t
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable records table">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4" scope="col">Receipt / Payment ID</th>
                <th className="py-3 px-4" scope="col">Date</th>
                <th className="py-3 px-4" scope="col">Borrower & Loan</th>
                <th className="py-3 px-4" scope="col">Type</th>
                <th className="py-3 px-4" scope="col">Method</th>
                <th className="py-3 px-4" scope="col">Collected By</th>
                <th className="py-3 px-4 text-right" scope="col">Amount</th>
                <th className="py-3 px-4 text-right" scope="col">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPayments.map((p) => {
                const loan = loans.find((l) => l.id === p.loanId);
                const cust = customers.find((c) => c.id === p.customerId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition text-xs">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {p.receiptNo || p.id}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {cust?.name || "Customer"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {loan?.loanNo || p.loanId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.type === "Capital"
                            ? "bg-blue-100 text-blue-700"
                            : p.type === "Interest"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.method || "Cash"}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.collectedBy || "Admin Officer"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {MONEY(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveReceipt(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="p-4 sm:p-6 lg:p-8 text-center text-slate-400 text-xs">
              No repayment transactions match the filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* OFFICIAL RECEIPT POPUP MODAL */}
      {activeReceipt && (
        <Modal title="Payment receipt" onClose={() => setActiveReceipt(null)} className="receipt-dialog modal-small">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-sm animate-scale-up border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-xs">
                  PSI
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    Official Repayment Receipt
                  </h3>
                  <p className="text-xs text-slate-400">PSI ONE Microfinance</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
               aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Card Body */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs border border-slate-200/60 font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">RECEIPT NO</span>
                <span className="font-semibold text-slate-900">
                  {activeReceipt.receiptNo || activeReceipt.id}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">DATE & TIME</span>
                <span>{activeReceipt.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">BORROWER</span>
                <span className="font-semibold text-slate-900">
                  {customers.find((c) => c.id === activeReceipt.customerId)?.name ||
                    "Customer"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">LOAN REFERENCE</span>
                <span>
                  {loans.find((l) => l.id === activeReceipt.loanId)?.loanNo ||
                    activeReceipt.loanId}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">PAYMENT TYPE</span>
                <span className="font-semibold text-blue-600">{activeReceipt.type}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">PAYMENT METHOD</span>
                <span>{activeReceipt.method || "Cash"}</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-semibold text-slate-900">
                <span>AMOUNT RECEIVED</span>
                <span className="text-emerald-600 font-semibold">
                  {MONEY(activeReceipt.amount)}
                </span>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t text-center">
                Collected by {activeReceipt.collectedBy || "Authorized Officer"}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
