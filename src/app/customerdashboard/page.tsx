/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  Clock,
  Download,
  Printer,
  Plus,
  Trash2,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Phone,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Receipt,
  X,
  Check,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";
import type { Customer, Loan, Payment } from "@/types";

interface BankAccount {
  id: string;
  bankName: string;
  branchName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: "Savings" | "Current";
  isPrimary: boolean;
}

const SRI_LANKA_BANKS = [
  "Commercial Bank of Ceylon",
  "Bank of Ceylon (BOC)",
  "People's Bank",
  "Hatton National Bank (HNB)",
  "Sampath Bank",
  "Seylan Bank",
  "Nations Trust Bank (NTB)",
  "DFCC Bank",
  "National Development Bank (NDB)",
  "Pan Asia Banking Corporation",
  "Union Bank of Colombo",
];

export default function CustomerDashboardPage() {
  const { customers, loans, repayments } = useData();

  // Active customer state (defaults to first customer or CUS-001)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    return customers[0]?.id || "CUS-001";
  });

  // Current customer record
  const currentCustomer = useMemo(() => {
    return (
      customers.find((c) => c.id === selectedCustomerId) ||
      customers[0] || {
        id: "CUS-001",
        name: "Kasun Madushanka Perera",
        fullName: "Kasun Madushanka Perera",
        nic: "199125601234",
        phone: "0771234567",
        email: "kasun@example.com",
        address: "No. 24, Temple Road",
        town: "Maharagama",
        district: "Colombo",
        status: "Active",
      }
    );
  }, [customers, selectedCustomerId]);

  // Loans belonging to current customer
  const customerLoans = useMemo(() => {
    return loans.filter(
      (l) => l.customerId === currentCustomer.id || l.customerName === currentCustomer.name
    );
  }, [loans, currentCustomer]);

  // Active primary loan
  const [activeLoanId, setActiveLoanId] = useState<string>("");

  const currentLoan = useMemo(() => {
    if (activeLoanId) {
      const match = customerLoans.find((l) => l.id === activeLoanId);
      if (match) return match;
    }
    return customerLoans[0] || null;
  }, [customerLoans, activeLoanId]);

  // Payments / Repayments for current customer's loans
  const customerPayments = useMemo(() => {
    if (!currentLoan) {
      return repayments.filter((p) => p.customerId === currentCustomer.id);
    }
    return repayments.filter(
      (p) => p.loanId === currentLoan.id || p.customerId === currentCustomer.id
    );
  }, [repayments, currentLoan, currentCustomer.id]);

  // Calculate financial totals
  const totalPrincipal = currentLoan ? currentLoan.principal || currentLoan.amount || 0 : 0;
  const totalInterest = currentLoan ? currentLoan.interest || (currentLoan.totalRepayment ? currentLoan.totalRepayment - totalPrincipal : 0) : 0;
  const totalPayable = currentLoan ? currentLoan.totalRepayment || (totalPrincipal + totalInterest) : 0;

  const totalPaid = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [customerPayments]);

  const outstandingBalance = Math.max(0, totalPayable - totalPaid);
  const percentSettled = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0;

  // Upcoming installment calculations
  const nextInstallmentAmount = currentLoan?.installment || Math.ceil(totalPayable / (currentLoan?.duration || 12));
  const nextDueDate = currentLoan?.firstPaymentDate || "2026-10-25";

  // Bank accounts state (with persistent initial demo accounts)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    {
      id: "BANK-01",
      bankName: "Commercial Bank of Ceylon",
      branchName: "Maharagama Branch",
      accountHolder: currentCustomer.fullName || currentCustomer.name,
      accountNumber: "8002938471",
      accountType: "Savings",
      isPrimary: true,
    },
    {
      id: "BANK-02",
      bankName: "Bank of Ceylon (BOC)",
      branchName: "Nugegoda City Branch",
      accountHolder: currentCustomer.fullName || currentCustomer.name,
      accountNumber: "0012938401",
      accountType: "Savings",
      isPrimary: false,
    },
  ]);

  // Add Bank Modal State
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: SRI_LANKA_BANKS[0],
    branchName: "",
    accountHolder: currentCustomer.fullName || currentCustomer.name,
    accountNumber: "",
    accountType: "Savings" as "Savings" | "Current",
    isPrimary: false,
  });

  // Receipt Modal State
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.accountNumber.trim() || !newBank.branchName.trim()) {
      alert("Please fill in account number and branch name");
      return;
    }

    const created: BankAccount = {
      id: `BANK-${Date.now()}`,
      bankName: newBank.bankName,
      branchName: newBank.branchName.trim(),
      accountHolder: newBank.accountHolder.trim(),
      accountNumber: newBank.accountNumber.trim(),
      accountType: newBank.accountType,
      isPrimary: newBank.isPrimary,
    };

    setBankAccounts((prev) => {
      if (created.isPrimary) {
        return [created, ...prev.map((b) => ({ ...b, isPrimary: false }))];
      }
      return [...prev, created];
    });

    setNewBank({
      bankName: SRI_LANKA_BANKS[0],
      branchName: "",
      accountHolder: currentCustomer.fullName || currentCustomer.name,
      accountNumber: "",
      accountType: "Savings",
      isPrimary: false,
    });
    setIsAddBankOpen(false);
  };

  const handleDeleteBank = (id: string) => {
    if (confirm("Are you sure you want to remove this bank account?")) {
      setBankAccounts((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleSetPrimaryBank = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((b) => ({
        ...b,
        isPrimary: b.id === id,
      }))
    );
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* ── 1. Top Customer Portal Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3.5">
            <BrandLogo href="/" size="md" theme="light" />
            <span className="hidden md:inline-block h-6 w-px bg-slate-200" />
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Borrower Self-Service
            </span>
          </div>

          {/* Right Customer Info & Navigation */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Switcher dropdown for multi-customer demo viewing */}
            {customers.length > 1 && (
              <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 font-medium">Viewing as:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Avatar & ID */}
            <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/20 overflow-hidden shrink-0">
                {currentCustomer.photoUrl ? (
                  <img
                    src={currentCustomer.photoUrl}
                    alt={currentCustomer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentCustomer.name.charAt(0)
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {currentCustomer.fullName || currentCustomer.name}
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  ID: {currentCustomer.id}
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Return to Home"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Welcome Banner & Profile Summary ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  NIC: {currentCustomer.nic}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {currentCustomer.status || "Active"} Account
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {currentCustomer.district} District
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Welcome back, {currentCustomer.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Review your active loan balances, download settlement receipts, view repayment milestones, and manage your disbursement bank accounts.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              <button
                type="button"
                onClick={() => setIsStatementOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition shadow-sm"
              >
                <Printer size={15} />
                Statement of Account
              </button>

              <button
                type="button"
                onClick={() => setIsPayModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition"
              >
                <Wallet size={15} />
                Make a Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main Dashboard Content Grid ──────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Financial Overview Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Outstanding Balance */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Outstanding Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {MONEY(outstandingBalance)}
            </p>
            <div className="mt-3">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
                <span>{percentSettled}% Settled</span>
                <span>Total: {MONEY(totalPayable)}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Upcoming Installment */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Next Installment
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {MONEY(nextInstallmentAmount)}
            </p>
            <p className="text-xs font-semibold text-blue-600 mt-2 flex items-center gap-1.5">
              <Clock size={14} />
              Due on {nextDueDate}
            </p>
          </div>

          {/* Card 3: Total Repaid */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Repaid to Date
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {MONEY(totalPaid)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Across {customerPayments.length} recorded payments
            </p>
          </div>

          {/* Card 4: Registered Bank Accounts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bank Accounts
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building size={18} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {bankAccounts.length} Verified
            </p>
            <button
              type="button"
              onClick={() => setIsAddBankOpen(true)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 mt-2 flex items-center gap-1 transition"
            >
              <Plus size={14} /> Add new bank account
            </button>
          </div>
        </section>

        {/* ── Active Loan Details & Structure ──────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  {currentLoan?.loanNo || "LN-ACTIVE"}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Facility
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {currentLoan?.purpose || "Micro-Enterprise Working Capital Loan"}
              </h2>
            </div>

            {/* Loan Selector if customer has multiple facilities */}
            {customerLoans.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Facility:</span>
                <select
                  value={currentLoan?.id}
                  onChange={(e) => setActiveLoanId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none"
                >
                  {customerLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loanNo || l.id} ({MONEY(l.principal || l.amount || 0)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Principal Amount</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
                {MONEY(totalPrincipal)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Interest Rate</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-1 block">
                {currentLoan?.interestRate || 3.0}% / mo
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Duration</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.duration || 6} Months
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Frequency</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.repaymentFrequency || "Monthly"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Issue Date</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {currentLoan?.issueDate || "2026-09-20"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Facility Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {currentLoan?.status || "Active"}
              </span>
            </div>
          </div>
        </section>

        {/* ── Two-Column Layout: Repayment Ledger (Left 8 cols) & Bank Details (Right 4 cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left 8 Cols: Repayment History & Download Receipts */}
          <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Repayment History & Receipts
                </h3>
                <p className="text-xs text-slate-500">
                  Official payment entries credited towards this facility.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsStatementOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition self-start sm:self-auto"
              >
                <FileText size={14} />
                Full Ledger Statement
              </button>
            </div>

            {customerPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200/70">
                    <tr>
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Collector</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {customerPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {p.receiptNo || p.id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{p.date}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {p.method || "Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                          {MONEY(p.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {p.collectedBy || "Authorized Field Officer"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setReceiptToPrint(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs transition"
                          >
                            <Download size={13} />
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400">
                <Receipt size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">No payment receipts yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your payments will appear here once credited by our cashiers or verified via bank transfer.
                </p>
              </div>
            )}
          </section>

          {/* Right 4 Cols: Bank Details Management */}
          <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Bank Accounts</h3>
                <p className="text-xs text-slate-500">Settlement & standing orders</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBankOpen(true)}
                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition"
                title="Add Bank Account"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Bank Accounts List */}
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`p-4 rounded-xl border transition ${
                    account.isPrimary
                      ? "border-blue-300 bg-blue-50/40"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {account.bankName}
                        </h4>
                        <p className="text-[11px] text-slate-500">{account.branchName}</p>
                      </div>
                    </div>

                    {account.isPrimary ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryBank(account.id)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition"
                      >
                        Set Primary
                      </button>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-800 tracking-wider">
                        •••• {account.accountNumber.slice(-4)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        ({account.accountType})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBank(account.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="Remove Account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAddBankOpen(true)}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Plus size={15} /> Add Another Bank Account
            </button>

            {/* Security Assurance */}
            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-500">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Bank accounts are encrypted and verified under CBSL electronic fund transfer compliance.
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ── 4. Add Bank Details Modal ───────────────────────────────────────── */}
      {isAddBankOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBankOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBank} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bank Name
                </label>
                <select
                  value={newBank.bankName}
                  onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  {SRI_LANKA_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maharagama Branch"
                  value={newBank.branchName}
                  onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={newBank.accountHolder}
                  onChange={(e) => setNewBank({ ...newBank, accountHolder: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 800291827"
                    value={newBank.accountNumber}
                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-mono font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Account Type
                  </label>
                  <select
                    value={newBank.accountType}
                    onChange={(e) => setNewBank({ ...newBank, accountType: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Current">Current Account</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newBank.isPrimary}
                  onChange={(e) => setNewBank({ ...newBank, isPrimary: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <span className="font-semibold text-slate-700">Set as primary settlement account</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBankOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-md shadow-blue-600/30"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Payment Instructions Modal ───────────────────────────────────── */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Make an Installment Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 font-medium">Installment Amount Due</span>
                  <span className="font-mono text-base font-bold text-blue-600">
                    {MONEY(nextInstallmentAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">Due Date</span>
                  <span className="font-semibold text-slate-800">{nextDueDate}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Bank Transfer / Cash Deposit Options
                </h4>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 font-mono text-[11px]">
                  <p><strong>Bank:</strong> Commercial Bank of Ceylon</p>
                  <p><strong>Account Name:</strong> PSI ONE LMS Operations Ltd</p>
                  <p><strong>Account Number:</strong> 1000 4892 0184</p>
                  <p><strong>Branch:</strong> Head Office Branch (Code: 001)</p>
                  <p className="text-blue-600 font-bold pt-1">
                    <strong>Reference:</strong> {currentCustomer.id} - {currentLoan?.loanNo || "LN"}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Please include your Customer ID ({currentCustomer.id}) as the bank transfer reference. Receipts are credited within 2 business hours.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Understood & Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Single Payment Printable Receipt Modal ───────────────────────── */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <BrandLogo size="sm" theme="light" />
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="py-6 text-center border-b border-dashed border-slate-200">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-2 border border-emerald-200">
                OFFICIAL PAYMENT RECEIPT
              </span>
              <p className="font-mono text-xs text-slate-400">
                Receipt No: <strong className="text-slate-800">{receiptToPrint.receiptNo || receiptToPrint.id}</strong>
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 font-mono mt-3">
                {MONEY(receiptToPrint.amount)}
              </h2>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Payment Credited Successfully
              </p>
            </div>

            {/* Receipt Details Breakdown */}
            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Date</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower Name</span>
                <span className="font-semibold text-slate-800">{currentCustomer.fullName || currentCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer ID / NIC</span>
                <span className="font-mono text-slate-800">{currentCustomer.id} · {currentCustomer.nic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Loan Facility</span>
                <span className="font-mono font-bold text-blue-600">{currentLoan?.loanNo || "LN"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.method || "Cash"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Processed By</span>
                <span className="text-slate-800">{receiptToPrint.collectedBy || "Authorized Cashier"}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/25"
              >
                <Printer size={15} />
                Print / Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Full Statement Modal ────────────────────────────────────────── */}
      {isStatementOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <BrandLogo size="sm" theme="light" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Borrower Statement of Account</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Issued: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Statement Summary */}
            <div className="py-4 grid grid-cols-3 gap-3 text-center border-b border-slate-100 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block font-medium">Principal</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{MONEY(totalPrincipal)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block font-medium">Total Repaid</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">{MONEY(totalPaid)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block font-medium">Remaining</span>
                <span className="text-sm font-bold text-rose-600 font-mono">{MONEY(outstandingBalance)}</span>
              </div>
            </div>

            {/* Statement Transactions */}
            <div className="flex-1 overflow-y-auto py-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Transaction History
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Receipt #</th>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customerPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2.5 text-slate-600">{p.date}</td>
                      <td className="p-2.5 font-mono text-slate-800">{p.receiptNo || p.id}</td>
                      <td className="p-2.5 text-slate-500">{p.method || "Cash"}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{MONEY(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Strictly confidential · PSI ONE Financial Operations
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition"
              >
                <Printer size={15} /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Minimal Portal Footer ───────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">PSI ONE Borrower Portal</span>
            <span>·</span>
            <span>Licensed under Financial Consumer Protection Framework</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-600 transition">Main Home</Link>
            <Link href="/register" className="hover:text-slate-600 transition">Customer Registration</Link>
            <Link href="/login" className="hover:text-slate-600 transition">Staff Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
