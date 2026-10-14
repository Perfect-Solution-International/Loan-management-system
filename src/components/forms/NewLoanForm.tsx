/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Calculator,
  PlusCircle,
  Eye,
  Check,
  ChevronRight,
  AlertTriangle,
  X,
  ShieldCheck,
  Search,
  Calendar,
  FileText,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";

interface NewLoanFormProps {
  initialCustomerId?: string;
  onSuccess?: (loanId: string) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function NewLoanForm({
  initialCustomerId = "",
  onSuccess,
  onCancel,
  isModal = false,
}: NewLoanFormProps) {
  const router = useRouter();
  const { customers, loans, payments, documents, addLoan } = useData();

  // ── Customer Selection State ──────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [customerSearch, setCustomerSearch] = useState("");

  // ── Loan Terms State ──────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultFirstPaymentStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [grossAmount, setGrossAmount] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(3);
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [duration, setDuration] = useState<number>(12);
  const [purpose, setPurpose] = useState("Business Expansion / Working Capital");
  const [issueDate, setIssueDate] = useState(todayStr);
  const [firstPaymentDate, setFirstPaymentDate] = useState(defaultFirstPaymentStr);
  const [disbursementMethod, setDisbursementMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");

  // ── Upfront Deductions & Fees ─────────────────────────────────────────────
  const [capitalDeduction, setCapitalDeduction] = useState<number>(0);
  const [interestDeduction, setInterestDeduction] = useState<number>(0);
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);

  // ── Guarantor Information (Exclusively collected in loan application) ──────
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorNic, setGuarantorNic] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorRelationship, setGuarantorRelationship] = useState("Spouse");
  const [guarantorAddress, setGuarantorAddress] = useState("");

  // ── Contract Notes & State ────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLoanId, setSubmittedLoanId] = useState("");

  // ── Selected Customer Profile Data ────────────────────────────────────────
  const selectedCustomer = useMemo(
    () => customers.find((c: Customer) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  // Existing liability calculations for selected customer
  const customerFinancialSnapshot = useMemo(() => {
    if (!selectedCustomer) return { outstanding: 0, activeLoansCount: 0, totalPaid: 0 };
    const custLoans = loans.filter((l) => l.customerId === selectedCustomer.id);
    const custLoanIds = custLoans.map((l) => l.id);
    const custPayments = payments.filter(
      (p) => p.customerId === selectedCustomer.id || custLoanIds.includes(p.loanId)
    );
    const totalRepayable = custLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
    const totalPaid = custPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = Math.max(0, totalRepayable - totalPaid);
    const activeLoansCount = custLoans.filter((l) => l.status === "Active" || l.status === "Overdue").length;

    return { outstanding, activeLoansCount, totalPaid };
  }, [selectedCustomer, loans, payments]);

  // Customer filter for dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) =>
      [c.id, c.name, c.fullName, c.phone, c.nic, c.town, c.district].join(" ").toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ── Live Financial Calculations ───────────────────────────────────────────
  const calculations = useMemo(() => {
    const gross = Number(grossAmount) || 0;
    const rate = Number(interestRate) || 0;
    const dur = Math.max(1, Number(duration) || 1);
    const capDed = Number(capitalDeduction) || 0;
    const intDed = Number(interestDeduction) || 0;
    const pFee = Number(processingFee) || 0;
    const aFee = Number(adminFee) || 0;
    const oFees = Number(otherFees) || 0;

    const totalDeductions = capDed + intDed + pFee + aFee + oFees;
    const netDisbursement = Math.max(0, gross - totalDeductions);
    const totalInterest = (gross * rate) / 100;
    const totalRepayment = gross + totalInterest;
    const installmentAmount = totalRepayment / dur;

    return {
      gross,
      totalDeductions,
      netDisbursement,
      totalInterest,
      totalRepayment,
      installmentAmount,
      numberOfInstallments: dur,
    };
  }, [
    grossAmount,
    interestRate,
    duration,
    capitalDeduction,
    interestDeduction,
    processingFee,
    adminFee,
    otherFees,
  ]);

  // Schedule preview table
  const schedulePreview = useMemo(() => {
    const count = Math.min(calculations.numberOfInstallments, 5);
    const list = [];
    const base = new Date(firstPaymentDate || todayStr);

    for (let i = 1; i <= count; i++) {
      const d = new Date(base);
      if (frequency === "Daily") {
        d.setDate(d.getDate() + (i - 1));
      } else if (frequency === "Weekly") {
        d.setDate(d.getDate() + (i - 1) * 7);
      } else {
        d.setMonth(d.getMonth() + (i - 1));
      }
      list.push({
        num: i,
        date: d.toISOString().slice(0, 10),
        amount: calculations.installmentAmount,
      });
    }
    return list;
  }, [calculations, firstPaymentDate, frequency, todayStr]);

  // ── Form Submission ───────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedCustomerId) {
      setErrorMsg("Please select a customer / borrower to proceed.");
      return;
    }
    if (!grossAmount || grossAmount <= 0) {
      setErrorMsg("Please enter a valid loan principal amount.");
      return;
    }

    setIsSubmitting(true);
    const year = new Date().getFullYear();
    const highest = loans.reduce((max, l) => {
      const m = (l.loanNo || l.id).match(/(\d{3,4})$/);
      const n = m ? parseInt(m[1], 10) : 0;
      return n > max ? n : max;
    }, 0);
    const newId = `LN-${year}-${String(highest + 1).padStart(3, "0")}`;

    const newLoan: Loan = {
      id: newId,
      loanNo: newId,
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.fullName || selectedCustomer?.name || "Customer",
      principal: calculations.gross,
      amount: calculations.gross,
      capitalDeduction: Number(capitalDeduction) || 0,
      interestDeduction: Number(interestDeduction) || 0,
      otherFees: Number(otherFees) + Number(processingFee) + Number(adminFee),
      interestRate: Number(interestRate) || 0,
      ratePeriod,
      repaymentFrequency: frequency,
      duration: Number(duration) || 12,
      issueDate,
      firstPaymentDate,
      purpose,
      status: "Active",
      interest: calculations.totalInterest,
      totalRepayment: calculations.totalRepayment,
      netDisbursement: calculations.netDisbursement,
      installment: calculations.installmentAmount,
      guarantorName: guarantorName.trim() || undefined,
      guarantorNic: guarantorNic.trim().toUpperCase() || undefined,
      guarantorPhone: guarantorPhone.trim() || undefined,
      guarantorRelationship: guarantorRelationship || undefined,
      guarantorAddress: guarantorAddress.trim() || undefined,
      disbursementMethod,
      notes: notes.trim() || undefined,
    };

    addLoan(newLoan);
    setSubmittedLoanId(newId);

    if (onSuccess) {
      onSuccess(newId);
    } else {
      setTimeout(() => {
        router.push(`/loans/${newId}`);
      }, 1500);
    }
  };

  // Success screen
  if (submittedLoanId) {
    return (
      <div className="p-8 text-center space-y-5 bg-white rounded-3xl border border-slate-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 size={36} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Loan Contract Created!</h3>
          <p className="text-xs text-slate-500 mt-1">
            Contract <span className="font-mono font-bold text-blue-600">{submittedLoanId}</span> has been successfully issued to{" "}
            <strong>{selectedCustomer?.fullName || selectedCustomer?.name}</strong>.
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono max-w-sm mx-auto space-y-1.5 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Gross Principal:</span>
            <span className="font-bold text-slate-800">{MONEY(calculations.gross)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Net Disbursed:</span>
            <span className="font-bold text-emerald-600">{MONEY(calculations.netDisbursement)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Installment:</span>
            <span className="font-bold text-blue-600">{MONEY(calculations.installmentAmount)} / {frequency}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      {/* ── STEP 1: SELECT CUSTOMER (TOP OF FORM) ─────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Select Customer / Borrower</h3>
              <p className="text-[11px] text-slate-500">
                Choose a customer from the dropdown to automatically load their basic details below.
              </p>
            </div>
          </div>

          {selectedCustomer && (
            <button
              type="button"
              onClick={() => setSelectedCustomerId("")}
              className="self-start sm:self-auto text-xs font-bold text-slate-500 hover:text-red-600 cursor-pointer underline"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Customer Select Dropdown & Quick Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Customer Directory Dropdown <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="">-- Choose a Registered Customer --</option>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || c.name} (NIC: {c.nic}) - {c.id} [{c.town || c.village || "Sri Lanka"}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Quick Search Filter</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoComplete="off"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Filter by name, NIC..."
                className="w-full pl-8 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── STEP 2: AUTOMATICALLY POPULATED BASIC DETAILS BELOW ─────────────── */}
        {selectedCustomer ? (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/70 rounded-2xl p-4 sm:p-5 border border-blue-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded-full">
                Auto-Populated Customer Basic Profile
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  (selectedCustomer.status || "").toUpperCase() === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {selectedCustomer.status}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Photo */}
              {selectedCustomer.photoUrl ? (
                <img
                  src={selectedCustomer.photoUrl}
                  alt={selectedCustomer.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-100 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
                  {(selectedCustomer.fullName || selectedCustomer.name || "C").charAt(0).toUpperCase()}
                </div>
              )}

              {/* Basic Details Grid */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {selectedCustomer.fullName || selectedCustomer.name}
                  </h4>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-md">
                    {selectedCustomer.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">NIC Number</span>
                    <span className="font-mono font-bold text-slate-900">{selectedCustomer.nic}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Primary Phone</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Existing Outstanding</span>
                    <span className="font-mono font-black text-rose-600">
                      {MONEY(customerFinancialSnapshot.outstanding)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Residential Address</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCustomer.address || "Main Street"}
                    {selectedCustomer.village ? `, ${selectedCustomer.village}` : ""}
                    {selectedCustomer.town ? `, ${selectedCustomer.town}` : ""}
                    {selectedCustomer.district ? `, ${selectedCustomer.district}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
            <User size={24} className="text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No customer selected</p>
            <p className="text-[11px] text-slate-500">
              Select a customer above to view their photograph, NIC, address, and credit liability.
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── STEP 3: COMPLETE LOAN APPLICATION FORM WITH GUARANTOR DETAILS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Loan Terms & Structure */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-900">1. Loan Terms &amp; Structure</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gross Loan Amount */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Gross Loan Amount (LKR) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[50000, 100000, 200000, 500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGrossAmount(preset)}
                        className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md transition cursor-pointer"
                      >
                        {(preset / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  required
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-black rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {/* Interest Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Interest Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {/* Rate Period */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Rate Period</label>
                <select
                  value={ratePeriod}
                  onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily")}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                >
                  <option value="Monthly">Per Month</option>
                  <option value="Weekly">Per Week</option>
                  <option value="Daily">Per Day</option>
                </select>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Repayment Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "Monthly" | "Weekly" | "Daily")}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Duration (No. of Installments) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                />
              </div>

              {/* Loan Purpose */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Loan Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                />
              </div>

              {/* Dates */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Issue Date *</label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">First Repayment Date *</label>
                <input
                  type="date"
                  required
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* 2. Upfront Deductions & Fees */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Calculator size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-900">2. Upfront Deductions &amp; Fees</h3>
              </div>
              <span className="font-mono text-xs font-bold text-red-600">
                - {MONEY(calculations.totalDeductions)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Capital Deduction (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={capitalDeduction}
                  onChange={(e) => setCapitalDeduction(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Interest Deduction (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={interestDeduction}
                  onChange={(e) => setInterestDeduction(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Processing Fee (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Admin / Legal Fee (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={adminFee}
                  onChange={(e) => setAdminFee(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Other Fees (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={otherFees}
                  onChange={(e) => setOtherFees(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Disbursement Mode</label>
                <select
                  value={disbursementMethod}
                  onChange={(e) => setDisbursementMethod(e.target.value as "Cash" | "Bank Transfer" | "Cheque")}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                >
                  <option value="Cash">Cash Handover</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Crossed Cheque</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Guarantor Information */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">3. Necessary Guarantor Details</h3>
                <p className="text-[11px] text-slate-500">Security guarantor details registered with this loan.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">Guarantor Full Legal Name</label>
                <input
                  type="text"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Relationship to Borrower</label>
                <select
                  value={guarantorRelationship}
                  onChange={(e) => setGuarantorRelationship(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Business Partner">Business Partner</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend / Colleague">Friend / Colleague</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Guarantor NIC Number</label>
                <input
                  type="text"
                  value={guarantorNic}
                  onChange={(e) => setGuarantorNic(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Guarantor Contact Phone</label>
                <input
                  type="tel"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs font-bold text-slate-700">Guarantor Residential Address</label>
                <input
                  type="text"
                  value={guarantorAddress}
                  onChange={(e) => setGuarantorAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* 4. Additional Contract Notes */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText size={16} className="text-slate-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase">4. Contract Remarks &amp; Notes</h4>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 resize-none font-medium"
            />
          </div>
        </div>

        {/* Right Column: Live Financial Engine & Disburse Button */}
        <div className="space-y-4 sticky top-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-5 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-blue-400" />
                <h3 className="font-black text-sm tracking-tight">Financial Summary</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">Gross Principal</span>
                <span className="font-mono font-bold text-slate-100">{MONEY(calculations.gross)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Deductions</span>
                <span className="font-mono font-bold text-red-400">- {MONEY(calculations.totalDeductions)}</span>
              </div>

              {/* Net Cash Disbursement */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Net Disbursement
                  </span>
                  <span className="text-[10px] text-slate-400">Borrower cashout</span>
                </div>
                <span className="font-mono text-base font-black text-emerald-400">
                  {MONEY(calculations.netDisbursement)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Interest ({interestRate}%)</span>
                <span className="font-mono font-bold text-blue-300">+ {MONEY(calculations.totalInterest)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-300 font-bold">Total Repayment</span>
                <span className="font-mono font-black text-white text-sm">{MONEY(calculations.totalRepayment)}</span>
              </div>

              <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                    {frequency} Installment
                  </span>
                  <span className="text-[10px] text-slate-400">{calculations.numberOfInstallments} payments</span>
                </div>
                <span className="font-mono text-lg font-black text-blue-400">
                  {MONEY(calculations.installmentAmount)}
                </span>
              </div>
            </div>

            {/* Installment breakdown preview */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[11px]">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                Installment Schedule Preview
              </span>
              {schedulePreview.map((item) => (
                <div
                  key={item.num}
                  className="flex items-center justify-between p-1.5 bg-slate-800/60 rounded-lg text-[10px] font-mono text-slate-300"
                >
                  <span>#{item.num} · {item.date}</span>
                  <span className="font-bold text-blue-300">{MONEY(item.amount)}</span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>Disburse &amp; Activate Loan</span>
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer text-center"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

export default NewLoanForm;
