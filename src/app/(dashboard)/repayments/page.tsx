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
  ArrowRight,
} from "lucide-react";
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
            COLLECTIONS / REPAYMENTS MODULE
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Repayment & Collections Terminal
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
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Total Inflows
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {MONEY(totalCollectionsAllTime)}
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              {payments.length} transactions recorded
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Banknote size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Capital Recovered
            </p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">
              {MONEY(totalCapitalRepaid)}
            </h3>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              Principal reductions
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Interest Earned
            </p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">
              {MONEY(totalInterestCollected)}
            </h3>
            <p className="text-[11px] text-purple-800 font-semibold mt-0.5">
              Gross interest recognized
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Receipt size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Settled Loans
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {completedLoansCount}
            </h3>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
              100% paid off contracts
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
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
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Select Loan & Enter Payment Breakdown
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Choose the contract and record repayment categorized by financial component.
              </p>
            </div>

            <form onSubmit={handleRecordRepayment} className="space-y-5">
              {/* Loan Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Choose Loan Contract *
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                >
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Repayment Categorization Type *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Capital", "Interest", "Other"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPaymentType(t)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        paymentType === t
                          ? "bg-red-600 text-white shadow-md shadow-red-600/20"
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
                <p className="text-[11px] text-slate-400 mt-1">
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
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                      )
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Cash">Cash On Hand</option>
                    <option value="Bank Transfer">Bank Transfer / Deposit</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Collection Date
                  </label>
                  <input
                    type="date"
                    required
                    autoComplete="off"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Notes & Staff Collector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Collection Officer
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={collectedBy}
                    onChange={(e) => setCollectedBy(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Reference / Cashier Notes
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Real-time settlement banner */}
              {willSettleLoan && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
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
                  className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <Receipt size={16} /> Record Repayment & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Live Loan Financial Ledger & Balance Due Breakdown */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-black via-[#1c0307] to-[#36050e] border border-red-950 text-white p-6 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-sm tracking-wide">
                  Live Contract Balance
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {selectedLoan?.loanNo || selectedLoan?.id}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedLoan?.status.toLowerCase() === "completed"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : selectedLoan?.status.toLowerCase() === "overdue"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-red-500/20 text-rose-300"
                }`}
              >
                {selectedLoan?.status}
              </span>
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl text-xs">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-zinc-200">{selectedCustomer.name}</p>
                  <p className="text-[10px] text-zinc-400">NIC: {selectedCustomer.nic}</p>
                </div>
              </div>
            )}

            {/* Balances List */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Loan Amount</span>
                <span className="font-semibold text-zinc-200">
                  {MONEY(selectedLoan?.principal || selectedLoan?.amount || 0)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Total Repayment Due</span>
                <span className="font-semibold text-zinc-200">
                  {MONEY(selectedLoan?.totalRepayment || 0)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Total Paid So Far</span>
                <span className="font-bold text-emerald-400">
                  {MONEY(totalPaid)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Current Balance Due</span>
                <span className="font-black text-amber-400 text-sm">
                  {MONEY(balanceDue)}
                </span>
              </div>

              {numEnteredAmount > 0 && (
                <div className="flex justify-between py-1.5 px-3 bg-[#24040a] rounded-xl border border-red-500/30 mt-2">
                  <span className="text-rose-300 font-semibold">After Payment</span>
                  <span className="font-black text-white">
                    {MONEY(newBalanceAfter)}
                  </span>
                </div>
              )}
            </div>

            {/* Repayment Progress Bar */}
            {selectedLoan && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Recovery Progress</span>
                  <span className="font-bold text-slate-200">
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
            <h3 className="text-base font-bold text-slate-900">
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
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-1.5">
              {(["ALL", "Capital", "Interest", "Other"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    typeFilter === t
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-700 font-black uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt / Payment ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Borrower & Loan</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Collected By</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPayments.map((p) => {
                const loan = loans.find((l) => l.id === p.loanId);
                const cust = customers.find((c) => c.id === p.customerId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition text-xs">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.receiptNo || p.id}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {cust?.name || "Customer"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {loan?.loanNo || p.loanId}
                        </span>
                      </div>
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
                    <td className="py-3 px-4 text-slate-600">{p.method || "Cash"}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.collectedBy || "Admin Officer"}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {MONEY(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveReceipt(p)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg text-xs font-semibold transition cursor-pointer"
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
            <div className="p-8 text-center text-slate-400 text-xs">
              No repayment transactions match the filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* OFFICIAL RECEIPT POPUP MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  PSI
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Official Repayment Receipt
                  </h3>
                  <p className="text-[10px] text-slate-400">PSI ONE Microfinance</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Card Body */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs border border-slate-200/60 font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">RECEIPT NO</span>
                <span className="font-bold text-slate-900">
                  {activeReceipt.receiptNo || activeReceipt.id}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">DATE & TIME</span>
                <span>{activeReceipt.date}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">BORROWER</span>
                <span className="font-bold text-slate-900">
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
                <span className="font-bold text-red-600">{activeReceipt.type}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">PAYMENT METHOD</span>
                <span>{activeReceipt.method || "Cash"}</span>
              </div>
              <div className="flex justify-between py-1 text-sm font-bold text-slate-900">
                <span>AMOUNT RECEIVED</span>
                <span className="text-emerald-600 font-black">
                  {MONEY(activeReceipt.amount)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 pt-2 border-t text-center">
                Collected by {activeReceipt.collectedBy || "Authorized Officer"}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
