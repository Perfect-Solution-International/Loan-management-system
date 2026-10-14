/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Calculator,
  PlusCircle,
  Search,
  X,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  History,
  DollarSign,
  ChevronRight,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Check,
  Eye,
  FileCheck2,
  ArrowRight,
  Sparkles,
  Building2,
  Info,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = "select" | "form" | "done";

// ─── Generate loan ID ─────────────────────────────────────────────────────────
function generateLoanId(existingLoans: Loan[]): string {
  const year = new Date().getFullYear();
  const highest = existingLoans.reduce((max, l) => {
    const m = (l.loanNo || l.id).match(/(\d{3,4})$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `LN-${year}-${String(highest + 1).padStart(3, "0")}`;
}

// ─── Customer Profile Summary Popup / Modal Component ────────────────────────
interface CustomerSummaryModalProps {
  customer: Customer;
  loans: Loan[];
  payments: Payment[];
  documents: CustomerDocument[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmAndProceed: () => void;
  onChangeCustomer: () => void;
  isInitialConfirm?: boolean;
}

function CustomerSummaryModal({
  customer,
  loans,
  payments,
  documents,
  isOpen,
  onClose,
  onConfirmAndProceed,
  onChangeCustomer,
  isInitialConfirm = false,
}: CustomerSummaryModalProps) {
  if (!isOpen) return null;

  const customerLoans = loans.filter((l) => l.customerId === customer.id);
  const loanIds = customerLoans.map((l) => l.id);
  const customerPayments = payments.filter(
    (p) => p.customerId === customer.id || loanIds.includes(p.loanId)
  );
  const customerDocs = documents.filter((d) => d.customerId === customer.id);

  const totalRepayable = customerLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = Math.max(0, totalRepayable - totalPaid);
  const activeLoans = customerLoans.filter((l) => l.status === "Active" || l.status === "Overdue");

  const isActive = (customer.status || "").toUpperCase() === "ACTIVE";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
            title="Close summary"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Photograph */}
            <div className="relative shrink-0">
              {customer.photoUrl ? (
                <img
                  src={customer.photoUrl}
                  alt={customer.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white/60 shadow-lg bg-slate-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/40 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                  {(customer.fullName || customer.name || "C").charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  isActive ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </div>

            {/* Name and ID */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-200 tracking-wider uppercase bg-blue-900/40 px-2 py-0.5 rounded-full">
                  Customer Profile Summary
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {customer.fullName || customer.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100 font-mono">
                <span className="bg-white/15 px-2.5 py-0.5 rounded-md font-bold">
                  {customer.id}
                </span>
                <span>•</span>
                <span>NIC: <strong className="text-white">{customer.nic}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning if inactive */}
        {!isActive && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-800 font-medium">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>Borrower status is {customer.status}. Review active liabilities before approving.</span>
          </div>
        )}

        {/* Body Details */}
        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </p>
              <p className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
                {MONEY(outstanding)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Active Loans
              </p>
              <p className="text-base sm:text-lg font-black font-mono text-blue-700 mt-0.5">
                {activeLoans.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Repaid
              </p>
              <p className="text-base sm:text-lg font-black font-mono text-emerald-600 mt-0.5">
                {MONEY(totalPaid)}
              </p>
            </div>
          </div>

          {/* Section: Identity & Demographic Details */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <CreditCard size={14} className="text-blue-600" /> Identity & Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">NIC Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{customer.nic}</span>
              </div>
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Date of Birth & Gender</span>
                <span className="font-semibold text-slate-800">
                  {customer.dob || "Not recorded"} · {customer.gender || "Male"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Residential Address */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <MapPin size={14} className="text-indigo-600" /> Residential Address
            </h3>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Permanent Domicile</span>
                <span className="font-bold text-slate-900">{customer.address || "Main Street"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Village/GN:</span>
                  <span className="font-bold text-slate-700">{customer.village || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Town:</span>
                  <span className="font-bold text-slate-700">{customer.town || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">District:</span>
                  <span className="font-bold text-slate-700">{customer.district || "Colombo"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact Details */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Phone size={14} className="text-emerald-600" /> Contact & Communication
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Primary Contact</span>
                <span className="font-bold text-slate-900">{customer.phone}</span>
              </div>
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Alternative Phone</span>
                <span className="font-semibold text-slate-700">{customer.alternatePhone || "None"}</span>
              </div>
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                <span className="font-semibold text-slate-700 truncate block">
                  {customer.email || "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Documents Verification */}
          {(customer.nicFrontUrl || customer.nicBackUrl || customerDocs.length > 0) && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText size={14} className="text-purple-600" /> Identity Documents & Attachments
              </h3>
              <div className="flex flex-wrap gap-2">
                {customer.nicFrontUrl && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold">
                    <Check size={12} /> NIC Front Uploaded
                  </span>
                )}
                {customer.nicBackUrl && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold">
                    <Check size={12} /> NIC Back Uploaded
                  </span>
                )}
                {customerDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold"
                  >
                    <FileCheck2 size={12} /> {doc.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onChangeCustomer}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            ← Select Different Customer
          </button>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!isInitialConfirm && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={onConfirmAndProceed}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              Confirm & Open Loan Parameters Form <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────
function IssueNewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("customerId") || "";

  const { customers, loans, payments, documents, addLoan } = useData();

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(preselectedId ? "form" : "select");

  // ── Customer selection state ──────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedId);

  // ── Summary popup state ───────────────────────────────────────────────────
  const [isSummaryOpen, setIsSummaryOpen] = useState(!!preselectedId);
  const [isInitialConfirmation, setIsInitialConfirmation] = useState(!!preselectedId);

  // ── Loan form fields state ────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultFirstPaymentStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [loanId] = useState(() => generateLoanId(loans));
  const [grossAmount, setGrossAmount] = useState<number>(100000);
  const [capitalDeduction, setCapitalDeduction] = useState<number>(0);
  const [interestDeduction, setInterestDeduction] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(0);

  const [interestRate, setInterestRate] = useState<number>(3);
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [duration, setDuration] = useState<number>(12);

  const [issueDate, setIssueDate] = useState(todayStr);
  const [firstPaymentDate, setFirstPaymentDate] = useState(defaultFirstPaymentStr);
  const [purpose, setPurpose] = useState("Business Expansion / Working Capital");
  const [disbursementMethod, setDisbursementMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");

  // Guarantor Details (exclusively collected in loan application)
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorNic, setGuarantorNic] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorRelationship, setGuarantorRelationship] = useState("Spouse");
  const [guarantorAddress, setGuarantorAddress] = useState("");

  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Derived Customer ──────────────────────────────────────────────────────
  const selectedCustomer = useMemo(
    () => customers.find((c: Customer) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter((c: Customer) =>
      [c.id, c.name, c.fullName, c.phone, c.nic, c.town, c.district]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [customers, customerSearch]);

  // ── Financial Calculations ────────────────────────────────────────────────
  const calculations = useMemo(() => {
    const gross = Number(grossAmount) || 0;
    const rate = Number(interestRate) || 0;
    const dur = Math.max(1, Number(duration) || 1);
    const capDed = Number(capitalDeduction) || 0;
    const intDed = Number(interestDeduction) || 0;
    const fees = Number(otherFees) || 0;
    const pFee = Number(processingFee) || 0;
    const aFee = Number(adminFee) || 0;

    const totalDeductions = capDed + intDed + fees + pFee + aFee;
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
    otherFees,
    processingFee,
    adminFee,
  ]);

  // Amortization installment schedule preview
  const installmentSchedulePreview = useMemo(() => {
    const count = Math.min(calculations.numberOfInstallments, 5);
    const schedule = [];
    const baseDate = new Date(firstPaymentDate || todayStr);

    for (let i = 1; i <= count; i++) {
      const d = new Date(baseDate);
      if (frequency === "Daily") {
        d.setDate(d.getDate() + (i - 1));
      } else if (frequency === "Weekly") {
        d.setDate(d.getDate() + (i - 1) * 7);
      } else {
        d.setMonth(d.getMonth() + (i - 1));
      }
      schedule.push({
        num: i,
        date: d.toISOString().slice(0, 10),
        amount: calculations.installmentAmount,
        principal: calculations.gross / calculations.numberOfInstallments,
        interest: calculations.totalInterest / calculations.numberOfInstallments,
      });
    }
    return schedule;
  }, [calculations, firstPaymentDate, frequency, todayStr]);

  // ── Flow Actions ──────────────────────────────────────────────────────────
  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setIsInitialConfirmation(true);
    setIsSummaryOpen(true);
  }, []);

  const handleConfirmAndProceed = useCallback(() => {
    setIsSummaryOpen(false);
    setIsInitialConfirmation(false);
    setStep("form");
  }, []);

  const handleChangeCustomer = useCallback(() => {
    setIsSummaryOpen(false);
    setSelectedCustomerId("");
    setStep("select");
  }, []);

  const handleOpenSummaryModal = useCallback(() => {
    setIsInitialConfirmation(false);
    setIsSummaryOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage("");

      if (!selectedCustomerId) {
        setErrorMessage("Please select a borrower first.");
        return;
      }
      if (!grossAmount || grossAmount <= 0) {
        setErrorMessage("Please enter a valid loan principal amount.");
        return;
      }

      const newLoan: Loan = {
        id: loanId,
        loanNo: loanId,
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
      setSubmitted(true);
      setStep("done");

      setTimeout(() => {
        router.push(`/loans/${loanId}`);
      }, 1600);
    },
    [
      selectedCustomerId,
      grossAmount,
      loanId,
      selectedCustomer,
      calculations,
      capitalDeduction,
      interestDeduction,
      otherFees,
      processingFee,
      adminFee,
      interestRate,
      ratePeriod,
      frequency,
      duration,
      issueDate,
      firstPaymentDate,
      purpose,
      guarantorName,
      guarantorNic,
      guarantorPhone,
      guarantorRelationship,
      guarantorAddress,
      disbursementMethod,
      notes,
      addLoan,
      router,
    ]
  );

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
              PORTFOLIO OPERATIONS / NEW LOAN CONTRACT
            </p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Loan Application &amp; Contract Setup
            </h1>
          </div>
          <Link
            href="/loans"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Loans Directory
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Step Progression Indicators */}
        {step !== "done" && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
              {/* Step 1: Select Customer */}
              <button
                type="button"
                onClick={handleChangeCustomer}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  step === "select"
                    ? "bg-blue-600 text-white shadow-xs"
                    : selectedCustomer
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {selectedCustomer && step !== "select" ? (
                  <Check size={13} className="text-emerald-600 stroke-[3]" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-center text-[10px] leading-4">1</span>
                )}
                <span>1. Select Borrower</span>
              </button>

              <ChevronRight size={14} className="text-slate-300 shrink-0" />

              {/* Step 2: Profile Summary */}
              <button
                type="button"
                disabled={!selectedCustomer}
                onClick={handleOpenSummaryModal}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  selectedCustomer
                    ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Eye size={13} />
                <span>2. Profile Summary</span>
              </button>

              <ChevronRight size={14} className="text-slate-300 shrink-0" />

              {/* Step 3: Loan Parameters */}
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                  step === "form"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-center text-[10px] leading-4">3</span>
                <span>3. Loan Parameters &amp; Processing</span>
              </div>
            </div>

            {selectedCustomer && step === "form" && (
              <button
                type="button"
                onClick={handleOpenSummaryModal}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
              >
                <Eye size={14} /> View Borrower Profile
              </button>
            )}
          </div>
        )}

        {/* ── STEP 1: SELECT CUSTOMER ────────────────────────────────────────── */}
        {step === "select" && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Step 1: Choose Borrower for Loan Application
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a registered customer to view their profile summary and set loan parameters.
                </p>
              </div>

              <Link
                href="/customers/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                <PlusCircle size={14} /> Register New Customer
              </Link>
            </div>

            {/* Search filter input */}
            <div className="px-6">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  autoComplete="off"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by customer name, NIC number, ID, town, or phone..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Customers List Grid */}
            <div className="p-6 pt-2">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <User size={36} className="text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No matching customers found</p>
                  <p className="text-xs text-slate-500">
                    Try searching with another keyword or register a new customer first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCustomers.map((cust) => {
                    const custLoans = loans.filter((l) => l.customerId === cust.id);
                    const custLoanIds = custLoans.map((l) => l.id);
                    const custPayments = payments.filter(
                      (p) => p.customerId === cust.id || custLoanIds.includes(p.loanId)
                    );
                    const custRepayable = custLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
                    const custPaid = custPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                    const custOutstanding = Math.max(0, custRepayable - custPaid);
                    const isCustActive = (cust.status || "").toUpperCase() === "ACTIVE";

                    return (
                      <div
                        key={cust.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Photograph Thumbnail */}
                          {cust.photoUrl ? (
                            <img
                              src={cust.photoUrl}
                              alt={cust.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-base flex items-center justify-center shrink-0 border border-blue-100">
                              {(cust.fullName || cust.name || "C").charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {cust.id}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCustActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {cust.status}
                              </span>
                            </div>

                            <p className="text-sm font-black text-slate-900 truncate mt-1">
                              {cust.fullName || cust.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">NIC: {cust.nic}</p>
                            <p className="text-[11px] text-slate-600 truncate mt-0.5">
                              {cust.town || cust.village || "Sri Lanka"} · {cust.phone}
                            </p>
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Outstanding:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {MONEY(custOutstanding)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectCustomer(cust.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            <span>Select</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2 & 3: SUMMARY MODAL POPUP ───────────────────────────────── */}
        {selectedCustomer && (
          <CustomerSummaryModal
            customer={selectedCustomer}
            loans={loans}
            payments={payments}
            documents={documents}
            isOpen={isSummaryOpen}
            onClose={() => setIsSummaryOpen(false)}
            onConfirmAndProceed={handleConfirmAndProceed}
            onChangeCustomer={handleChangeCustomer}
            isInitialConfirm={isInitialConfirmation}
          />
        )}

        {/* ── STEP 3: FULL LOAN PARAMETERS FORM ─────────────────────────────── */}
        {step === "form" && selectedCustomer && (
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* Borrower Profile Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt={selectedCustomer.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-black text-xl flex items-center justify-center shrink-0 border border-blue-200">
                    {(selectedCustomer.fullName || selectedCustomer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full">
                      Selected Borrower
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {selectedCustomer.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">
                    {selectedCustomer.fullName || selectedCustomer.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    NIC: <strong className="text-slate-800 font-mono">{selectedCustomer.nic}</strong> ·{" "}
                    {selectedCustomer.address}, {selectedCustomer.town} · {selectedCustomer.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                <button
                  type="button"
                  onClick={handleOpenSummaryModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer"
                >
                  <Eye size={14} /> View Profile Summary
                </button>
                <button
                  type="button"
                  onClick={handleChangeCustomer}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Change Customer
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Layout: Main Form (Left 2 cols) & Financial Engine (Right 1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* SECTION 1: LOAN TERMS & STRUCTURE */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <DollarSign size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          1. Loan Facility &amp; Principal Terms
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Define approved principal, interest rates, frequencies, and duration.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Loan ID</span>
                      <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {loanId}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Gross Loan Amount */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Gross Principal Borrowed (LKR) <span className="text-red-500">*</span>
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
                        className="w-full px-3.5 py-2.5 text-sm font-black font-mono rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
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
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    {/* Rate Period */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Interest Calculation Basis</label>
                      <select
                        value={ratePeriod}
                        onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily")}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value="Monthly">Per Month (%)</option>
                        <option value="Weekly">Per Week (%)</option>
                        <option value="Daily">Per Day (%)</option>
                      </select>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Repayment Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as "Monthly" | "Weekly" | "Daily")}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value="Monthly">Monthly Installments</option>
                        <option value="Weekly">Weekly Installments</option>
                        <option value="Daily">Daily Installments</option>
                      </select>
                    </div>

                    {/* Duration / Installments Count */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Duration (Number of Installments) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    {/* Loan Purpose */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Loan Facility Purpose</label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    {/* Issue Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Contract Issue Date</label>
                      <input
                        type="date"
                        required
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    {/* First Repayment Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">First Installment Due Date</label>
                      <input
                        type="date"
                        required
                        value={firstPaymentDate}
                        onChange={(e) => setFirstPaymentDate(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: UPFRONT DEDUCTIONS & FEES */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <Calculator size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          2. Upfront Deductions &amp; Processing Fees
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Amounts deducted at disbursement to compute net borrower cashout.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Deductions</span>
                      <span className="font-mono text-xs font-black text-red-600">
                        {MONEY(calculations.totalDeductions)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Capital Deduction (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={capitalDeduction}
                        onChange={(e) => setCapitalDeduction(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Interest Deduction (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={interestDeduction}
                        onChange={(e) => setInterestDeduction(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Processing Fee (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={processingFee}
                        onChange={(e) => setProcessingFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Documentation &amp; Legal (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={adminFee}
                        onChange={(e) => setAdminFee(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Other Admin Fees (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        value={otherFees}
                        onChange={(e) => setOtherFees(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Disbursement Mode</label>
                      <select
                        value={disbursementMethod}
                        onChange={(e) => setDisbursementMethod(e.target.value as "Cash" | "Bank Transfer" | "Cheque")}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value="Cash">Cash Handover</option>
                        <option value="Bank Transfer">Bank Transfer (SLIPS/CEFT)</option>
                        <option value="Cheque">Crossed Cheque</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: GUARANTOR INFORMATION */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          3. Loan Guarantor Information
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Collected specifically for this loan application as security underwriting.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Guarantor Full Legal Name</label>
                      <input
                        type="text"
                        value={guarantorName}
                        onChange={(e) => setGuarantorName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Relationship to Borrower</label>
                      <select
                        value={guarantorRelationship}
                        onChange={(e) => setGuarantorRelationship(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Business Partner">Business Partner</option>
                        <option value="Relative">Relative</option>
                        <option value="Friend">Friend / Colleague</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Guarantor NIC Number</label>
                      <input
                        type="text"
                        value={guarantorNic}
                        onChange={(e) => setGuarantorNic(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Guarantor Contact Phone</label>
                      <input
                        type="tel"
                        value={guarantorPhone}
                        onChange={(e) => setGuarantorPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-3">
                      <label className="text-xs font-bold text-slate-700">Guarantor Residential Address</label>
                      <input
                        type="text"
                        value={guarantorAddress}
                        onChange={(e) => setGuarantorAddress(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: CONTRACT NOTES */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">4. Additional Contract Notes</h3>
                      <p className="text-[11px] text-slate-500">Internal remarks, collateral agreements, or terms.</p>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs resize-none"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: FINANCIAL ENGINE & AMORTIZATION PREVIEW */}
              <div className="space-y-5 sticky top-24">
                {/* Financial Summary Card */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-5 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-blue-400" />
                      <h3 className="font-black text-sm tracking-tight">Financial Computation</h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Gross Principal</span>
                      <span className="font-mono font-bold text-slate-200">
                        {MONEY(calculations.gross)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Total Upfront Deductions</span>
                      <span className="font-mono font-bold text-red-400">
                        - {MONEY(calculations.totalDeductions)}
                      </span>
                    </div>

                    {/* Net Cash Disbursement */}
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          Net Disbursement to Borrower
                        </span>
                        <span className="text-[10px] text-slate-400">Cash handed over</span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-400">
                        {MONEY(calculations.netDisbursement)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400">Total Interest ({interestRate}%)</span>
                      <span className="font-mono font-bold text-blue-300">
                        + {MONEY(calculations.totalInterest)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-300 font-bold">Total Repayable</span>
                      <span className="font-mono font-black text-white text-sm">
                        {MONEY(calculations.totalRepayment)}
                      </span>
                    </div>

                    <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                          {frequency} Installment Due
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Across {calculations.numberOfInstallments} cycles
                        </span>
                      </div>
                      <span className="font-mono text-lg font-black text-blue-400">
                        {MONEY(calculations.installmentAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Amortization Schedule Preview */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        Schedule Preview (First {installmentSchedulePreview.length} Installments)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {frequency}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {installmentSchedulePreview.map((item) => (
                        <div
                          key={item.num}
                          className="flex items-center justify-between text-[11px] p-2 bg-slate-800/60 rounded-lg border border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                              #{item.num}
                            </span>
                            <span className="font-mono text-slate-300 text-[10px]">{item.date}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-300">
                            {MONEY(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="submit"
                    disabled={submitted}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle size={16} />
                    <span>Disburse &amp; Activate Loan</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ── STEP DONE: SUCCESS CONFIRMATION ────────────────────────────────── */}
        {step === "done" && (
          <div className="max-w-lg mx-auto text-center space-y-6 py-16 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={44} className="text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Loan Contract Issued!</h2>
              <p className="text-xs text-slate-500">
                Loan contract <span className="font-mono font-bold text-blue-600">{loanId}</span> has been successfully approved, registered, and scheduled.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{selectedCustomer?.fullName || selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Principal:</span>
                <span className="font-bold text-slate-900">{MONEY(calculations.gross)}</span>
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
            <p className="text-[11px] text-slate-400">Redirecting to loan detail page...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export wrapped in Suspense for Next.js App Router ────────────────────────
export default function IssueNewLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading loan application workflow...
        </div>
      }
    >
      <IssueNewLoanContent />
    </Suspense>
  );
}