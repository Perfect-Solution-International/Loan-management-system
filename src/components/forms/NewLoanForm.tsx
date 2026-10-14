/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";

interface NewLoanFormProps {
  initialCustomerId?: string;
  onSuccess?: (loanId: string) => void;
  onCancel?: () => void;
}

export function NewLoanForm({ initialCustomerId = "", onSuccess, onCancel }: NewLoanFormProps) {
  const { customers, loans, payments, documents, addLoan } = useData();

  // State
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(!!initialCustomerId);
  const [isFormUnlocked, setIsFormUnlocked] = useState(!!initialCustomerId);

  // Loan parameters
  const [grossAmount, setGrossAmount] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(3);
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [duration, setDuration] = useState<number>(12);
  const [purpose, setPurpose] = useState("Business Expansion / Working Capital");
  const [disbursementMethod, setDisbursementMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");

  // Deductions
  const [capitalDeduction, setCapitalDeduction] = useState<number>(0);
  const [interestDeduction, setInterestDeduction] = useState<number>(0);
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);

  // Guarantor
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorNic, setGuarantorNic] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorRelationship, setGuarantorRelationship] = useState("Spouse");
  const [guarantorAddress, setGuarantorAddress] = useState("");

  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived selected customer
  const selectedCustomer = useMemo(
    () => customers.find((c: Customer) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c) =>
      [c.id, c.name, c.fullName, c.phone, c.nic, c.town].join(" ").toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Financial calculations
  const calculations = useMemo(() => {
    const gross = Number(grossAmount) || 0;
    const rate = Number(interestRate) || 0;
    const dur = Math.max(1, Number(duration) || 1);
    const totalDeductions =
      Number(capitalDeduction || 0) +
      Number(interestDeduction || 0) +
      Number(processingFee || 0) +
      Number(adminFee || 0) +
      Number(otherFees || 0);

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
  }, [grossAmount, interestRate, duration, capitalDeduction, interestDeduction, processingFee, adminFee, otherFees]);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setIsSummaryOpen(true);
  };

  const handleConfirmSummary = () => {
    setIsSummaryOpen(false);
    setIsFormUnlocked(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedCustomerId) {
      setErrorMsg("Please select a borrower first.");
      return;
    }
    if (!grossAmount || grossAmount <= 0) {
      setErrorMsg("Please specify a valid loan principal amount.");
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
      issueDate: new Date().toISOString().slice(0, 10),
      firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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
    if (onSuccess) onSuccess(newId);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Customer Selection if no customer or changing */}
      {(!isFormUnlocked || !selectedCustomer) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Select Customer</h3>
              <p className="text-xs text-slate-500">Choose a borrower to view profile and set loan terms.</p>
            </div>
            <div className="w-64">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name, NIC..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                onClick={() => handleSelectCustomer(cust.id)}
                className="flex items-center justify-between p-3 hover:bg-blue-50/60 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  {cust.photoUrl ? (
                    <img src={cust.photoUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {(cust.name || "C").charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-800">{cust.fullName || cust.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {cust.id} · NIC: {cust.nic} · {cust.town || "—"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  Select &amp; View Summary
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Summary Modal */}
      {isSummaryOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center gap-4">
              {selectedCustomer.photoUrl ? (
                <img
                  src={selectedCustomer.photoUrl}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/60 shadow-md shrink-0 bg-slate-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 text-white font-black text-2xl flex items-center justify-center shrink-0">
                  {(selectedCustomer.fullName || selectedCustomer.name || "C").charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">
                  Customer Profile Summary
                </span>
                <h3 className="text-lg font-black truncate">{selectedCustomer.fullName || selectedCustomer.name}</h3>
                <p className="text-xs text-blue-100 font-mono">
                  {selectedCustomer.id} · NIC: {selectedCustomer.nic}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">NIC Number</span>
                  <span className="font-mono font-bold text-slate-800">{selectedCustomer.nic}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="font-bold text-emerald-600">{selectedCustomer.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Residential Address</span>
                <span className="font-semibold text-slate-800">
                  {selectedCustomer.address}, {selectedCustomer.town || selectedCustomer.village || "Sri Lanka"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Primary Contact</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Alternative Contact</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.alternatePhone || "—"}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSummaryOpen(false);
                  setIsFormUnlocked(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
              >
                Change Customer
              </button>
              <button
                type="button"
                onClick={handleConfirmSummary}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                Proceed to Loan Form <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Full Loan Parameters Form */}
      {isFormUnlocked && selectedCustomer && (
        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {/* Selected Borrower Header Card */}
          <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {selectedCustomer.photoUrl ? (
                <img src={selectedCustomer.photoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-blue-200 text-blue-800 font-bold text-sm flex items-center justify-center shrink-0">
                  {(selectedCustomer.name || "C").charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs font-black text-slate-900">{selectedCustomer.fullName || selectedCustomer.name}</p>
                <p className="text-[11px] text-slate-600">
                  NIC: <span className="font-mono font-bold text-slate-800">{selectedCustomer.nic}</span> · {selectedCustomer.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSummaryOpen(true)}
                className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition"
              >
                View Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormUnlocked(false);
                  setSelectedCustomerId("");
                }}
                className="px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Change
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Core Loan Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <DollarSign size={14} className="text-blue-600" /> Loan Terms &amp; Repayment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Gross Principal Amount (LKR) *</label>
                <input
                  type="number"
                  required
                  min="5000"
                  step="1000"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Interest Rate (%) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Calculation Basis</label>
                <select
                  value={ratePeriod}
                  onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily")}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300"
                >
                  <option value="Monthly">Per Month</option>
                  <option value="Weekly">Per Week</option>
                  <option value="Daily">Per Day</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Repayment Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "Monthly" | "Weekly" | "Daily")}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Duration (Cycles) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs font-bold text-slate-700">Loan Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Upfront Deductions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calculator size={14} className="text-amber-600" /> Upfront Deductions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Capital Deduction</label>
                <input
                  type="number"
                  min="0"
                  value={capitalDeduction}
                  onChange={(e) => setCapitalDeduction(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Interest Deduction</label>
                <input
                  type="number"
                  min="0"
                  value={interestDeduction}
                  onChange={(e) => setInterestDeduction(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Processing Fee</label>
                <input
                  type="number"
                  min="0"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Guarantor Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <ShieldCheck size={14} className="text-indigo-600" /> Guarantor Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">NIC Number</label>
                <input
                  type="text"
                  value={guarantorNic}
                  onChange={(e) => setGuarantorNic(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Contact Phone</label>
                <input
                  type="tel"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600">Guarantor Address</label>
                <input
                  type="text"
                  value={guarantorAddress}
                  onChange={(e) => setGuarantorAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Live Calculation Strip */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Gross Principal:</span>
              <span className="text-white font-bold">{MONEY(calculations.gross)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Net Disbursement:</span>
              <span className="text-emerald-400 font-black">{MONEY(calculations.netDisbursement)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Total Repayable:</span>
              <span className="text-white font-bold">{MONEY(calculations.totalRepayment)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-blue-400">
              <span>{frequency} Installment:</span>
              <span className="text-base text-blue-300">{MONEY(calculations.installmentAmount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <PlusCircle size={15} /> Disburse &amp; Activate Loan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default NewLoanForm;
