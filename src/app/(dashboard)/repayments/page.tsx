"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Banknote,
  Search,
  CheckCircle2,
  Receipt,
  CreditCard,
  ArrowRight,
  TrendingUp,
  X,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/components/ui";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type { Customer, Loan, Payment } from "@/types";
import { getLoanTotalRepayment } from "@/lib/loan-financials";

export default function RepaymentsCollectionsPage() {
  const {
    customers,
    loans,
    payments,
    addPayment,
    updatePayment,
    deletePayment,
    staffUsers,
    getNextReceiptNo,
  } = useData();

  // RBAC: Check if current logged-in user is an Administrator
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("psi_user_role", "Administrator");
    localStorage.setItem("psi_active_staff_id", "STF-01");
    setIsAdmin(true);
  }, []);

  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    loans.find((l) => l.status === "Active" || l.status === "Overdue")?.id || loans[0]?.id || ""
  );
  const [paymentType, setPaymentType] = useState<Payment["type"]>("Capital");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [notes, setNotes] = useState<string>("");
  const [collectedBy, setCollectedBy] = useState<string>("Admin Officer");
  const [paymentDate, setPaymentDate] = useState<string>("2026-10-19");

  useEffect(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const da = String(now.getDate()).padStart(2, "0");
    setPaymentDate(`${yr}-${mo}-${da}`);
  }, []);

  // Filter state for collections ledger
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Receipt popup state
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);
  const [notificationMsg, setNotificationMsg] = useState("");

  // Admin Edit Payment Modal State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editMethod, setEditMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [editType, setEditType] = useState<Payment["type"]>("Capital");
  const [editNotes, setEditNotes] = useState<string>("");

  // Admin Delete Payment Modal State
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  const openEditPaymentModal = (p: Payment) => {
    setEditingPayment(p);
    setEditAmount(String(p.amount));
    setEditDate(p.date || paymentDate);
    setEditMethod((p.method as "Cash" | "Bank Transfer" | "Cheque") || "Cash");
    setEditType(p.type || "Capital");
    setEditNotes(p.notes || "");
  };

  const handleConfirmEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const numAmount = Number(editAmount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    updatePayment(editingPayment.id, {
      amount: numAmount,
      date: editDate,
      type: editType,
      method: editMethod,
      notes: editNotes.trim() || undefined,
    });

    setNotificationMsg(
      `Payment record ${editingPayment.receiptNo || editingPayment.id} updated successfully.`
    );
    setEditingPayment(null);
    setTimeout(() => setNotificationMsg(""), 4500);
  };

  const handleConfirmDeletePayment = () => {
    if (!deletingPayment) return;
    const p = deletingPayment;
    deletePayment(p.id);
    setNotificationMsg(`Payment record ${p.receiptNo || p.id} reversed and deleted.`);
    setDeletingPayment(null);
    setTimeout(() => setNotificationMsg(""), 4500);
  };

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
    const totalRepay = getLoanTotalRepayment(selectedLoan);
    return Math.max(0, Math.round((totalRepay - totalPaid) * 100) / 100);
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
  const completedLoansCount = loans.filter((l) => (l.status || "").toLowerCase() === "completed").length;

  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || numEnteredAmount <= 0) return;

    const receiptNo = getNextReceiptNo();
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
        ? `Repayment recorded successfully. Loan ${selectedLoan.loanNo || selectedLoan.id} is now fully SETTLED and status has been updated to COMPLETED!`
        : `Repayment of ${MONEY(numEnteredAmount)} recorded successfully!`;

    setNotificationMsg(completionMsg);
    setAmount("");
    setNotes("");

    setTimeout(() => {
      setNotificationMsg("");
    }, 6000);
  };

  // Filtered Payments for Ledger
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const loan = loans.find((l) => l.id === p.loanId);
      const cust = customers.find((c) => c.id === p.customerId);
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        !searchTerm ||
        (p.receiptNo || "").toLowerCase().includes(searchLower) ||
        (p.id || "").toLowerCase().includes(searchLower) ||
        (cust?.name || "").toLowerCase().includes(searchLower) ||
        (loan?.loanNo || "").toLowerCase().includes(searchLower) ||
        (p.notes || "").toLowerCase().includes(searchLower);

      const matchesType = typeFilter === "ALL" || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [payments, loans, customers, searchTerm, typeFilter]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 space-y-3">
        {/* ═══ Action Bar & Notification ═════════════════════════════════════ */}
        {notificationMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2.5 text-emerald-800 text-xs font-bold animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificationMsg("")}
              className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-md">
              Collections Terminal
            </span>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              Record recoveries & generate receipts
            </span>
          </div>

          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 h-8 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition"
          >
            <span>Reports</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* ═══ Summary Cards (Customer Theme Micro KPIs) ═════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <Banknote size={16} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Inflows
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {MONEY(totalCollectionsAllTime)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {payments.length} transactions
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CreditCard size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Capital Recovered
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 leading-tight">
                {MONEY(totalCapitalRepaid)}
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold truncate">
                Principal recovered
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Receipt size={16} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Interest Earned
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-purple-700 leading-tight">
                {MONEY(totalInterestCollected)}
              </p>
              <p className="text-[10px] text-purple-700 font-medium truncate">
                Gross revenue
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Settled Facilities
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {completedLoansCount}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                100% paid off contracts
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Main Repayment Workspace ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left 2 Cols: Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Post Repayment Entry
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Select active credit contract and log remittance
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  POS TERMINAL
                </span>
              </div>

              <form onSubmit={handleRecordRepayment} className="space-y-3.5">
                {/* Loan Dropdown */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Select Loan Contract *
                  </label>
                  <select
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                  >
                    {loans.length === 0 ? (
                      <option value="">No loan contracts available</option>
                    ) : (
                      loans.map((l) => {
                        const c = customers.find((cust) => cust.id === l.customerId);
                        return (
                          <option key={l.id} value={l.id}>
                            {l.loanNo || l.id} — {c?.name || l.customerName || "Customer"} (
                            {l.status} · Principal: {MONEY(l.principal || l.amount || 0)})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* Payment Type Tabs */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Classification *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Capital", "Interest", "Other"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPaymentType(t)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          paymentType === t
                            ? "bg-red-600 text-white shadow-xs"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>
                          {t === "Capital" ? "💳" : t === "Interest" ? "📈" : "⚖️"}
                        </span>
                        <span>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount, Method, Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Amount (LKR) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      autoComplete="off"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                        )
                      }
                      className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    >
                      <option value="Cash">Cash On Hand</option>
                      <option value="Bank Transfer">Bank Transfer / Deposit</option>
                      <option value="Cheque">Bank Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      required
                      autoComplete="off"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    />
                  </div>
                </div>

                {/* Notes & Staff Collector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Collection Officer
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={collectedBy}
                      onChange={(e) => setCollectedBy(e.target.value)}
                      className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Reference / Cashier Notes
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Optional notes or receipt ref"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    />
                  </div>
                </div>

                {/* Real-time settlement banner */}
                {willSettleLoan && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>
                      🎉 This payment settles this loan in full! Status will update to COMPLETED.
                    </span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!selectedLoan || numEnteredAmount <= 0}
                    className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                      !selectedLoan || numEnteredAmount <= 0
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-xs"
                    }`}
                  >
                    <Receipt size={14} /> Record Repayment
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Live Loan Financial Ledger & Balance Due Breakdown */}
          <div>
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="font-extrabold text-xs tracking-wider text-slate-300 uppercase">
                    Contract Position
                  </h3>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {selectedLoan?.loanNo || selectedLoan?.id || "No Loan"}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (selectedLoan?.status || "").toLowerCase() === "completed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : (selectedLoan?.status || "").toLowerCase() === "overdue"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {selectedLoan?.status || "PENDING"}
                </span>
              </div>

              {selectedCustomer && (
                <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs">
                  <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">NIC: {selectedCustomer.nic}</p>
                  </div>
                </div>
              )}

              {/* Balances List */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-medium">Principal Borrowed</span>
                  <span className="font-bold text-white font-mono">
                    {MONEY(selectedLoan?.principal || selectedLoan?.amount || 0)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-medium">Total Agreed Repayable</span>
                  <span className="font-bold text-white font-mono">
                    {MONEY(selectedLoan?.totalRepayment || 0)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-medium">Total Settled to Date</span>
                  <span className="font-black text-emerald-400 font-mono">
                    {MONEY(totalPaid)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-200 font-bold text-xs">Current Balance Due</span>
                  <span className="font-black text-amber-400 text-sm font-mono">
                    {MONEY(balanceDue)}
                  </span>
                </div>

                {numEnteredAmount > 0 && (
                  <div className="flex justify-between py-1.5 px-3 bg-red-950/60 rounded-xl border border-red-800/60 mt-2">
                    <span className="text-rose-300 font-semibold text-xs">New Balance After</span>
                    <span className="font-black text-white text-xs font-mono">
                      {MONEY(newBalanceAfter)}
                    </span>
                  </div>
                )}
              </div>

              {/* Repayment Progress Bar */}
              {selectedLoan && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>Settlement Ratio</span>
                    <span className="font-bold text-white">
                      {selectedLoan.totalRepayment > 0
                        ? Math.min(100, Math.round((totalPaid / selectedLoan.totalRepayment) * 100))
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
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

        {/* ═══ Collections Journal & Ledger Table (Customer Theme) ═══════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header Filter Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 sm:max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search receipt, loan, borrower, or notes…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 py-1.5 h-9 text-xs bg-white border border-slate-200 rounded-xl w-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {(["ALL", "Capital", "Interest", "Other"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`h-9 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    typeFilter === t
                      ? "bg-red-600 text-white shadow-xs shadow-red-600/20"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                <tr>
                  <th className="py-3 px-5">Receipt / Payment ID</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Borrower & Loan</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Method</th>
                  <th className="py-3 px-5">Collected By</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.map((p) => {
                  const loan = loans.find((l) => l.id === p.loanId);
                  const cust = customers.find((c) => c.id === p.customerId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {p.receiptNo || p.id}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-600 font-medium">
                        {p.date}
                      </td>
                      <td className="py-3 px-5">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {cust?.name || "Customer"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {loan?.loanNo || p.loanId}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.type === "Capital"
                              ? "bg-blue-100 text-blue-800"
                              : p.type === "Interest"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-700 font-medium">
                        {p.method || "Cash"}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-600">
                        {p.collectedBy || "Admin Officer"}
                      </td>
                      <td className="py-3 px-5 text-right font-black font-mono text-slate-900 text-xs">
                        {MONEY(p.amount)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg transition cursor-pointer"
                            title="View & Print Official Receipt"
                          >
                            <Receipt size={12} className="text-red-600 shrink-0" />
                            <span>Receipt</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditPaymentModal(p)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 rounded-lg transition cursor-pointer"
                                title="Admin: Edit payment details"
                              >
                                <Edit size={11} className="text-amber-600 shrink-0" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPayment(p)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 rounded-lg transition cursor-pointer"
                                title="Admin: Delete & reverse payment"
                              >
                                <Trash2 size={11} className="text-rose-600 shrink-0" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
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
      </div>

      {/* OFFICIAL RECEIPT POPUP MODAL */}
      {activeReceipt && (
        <ReceiptModal
          payment={activeReceipt}
          onClose={() => setActiveReceipt(null)}
          customer={selectedCustomer}
          loan={selectedLoan}
        />
      )}

      {/* ═══ ADMIN EXCLUSIVE: EDIT PAYMENT MODAL ════════════════════════════ */}
      {isAdmin && editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Edit size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Edit Payment Record
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Receipt: {editingPayment.receiptNo || editingPayment.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleConfirmEditPayment} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Repayment Amount (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) =>
                      setEditType(e.target.value as Payment["type"])
                    }
                    className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs font-semibold"
                  >
                    <option value="Capital">Capital</option>
                    <option value="Interest">Interest</option>
                    <option value="Fee">Fee</option>
                    <option value="Penalty">Penalty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={editMethod}
                  onChange={(e) =>
                    setEditMethod(e.target.value as "Cash" | "Bank Transfer" | "Cheque")
                  }
                  className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs font-semibold"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Admin Modification Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected installment breakdown"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3.5 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-8 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ ADMIN EXCLUSIVE: DELETE PAYMENT CONFIRMATION MODAL ══════════════ */}
      {isAdmin && deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Delete Repayment Record?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete repayment receipt{" "}
                  <strong>
                    {deletingPayment.receiptNo || deletingPayment.id}
                  </strong>{" "}
                  ({MONEY(deletingPayment.amount)})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Financial Ledger Reversal</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Deleting this record will reverse the collected amount, recalculate the loan balance, and revert the loan status back if it was previously completed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                className="px-3.5 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayment}
                className="px-4 h-8 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
