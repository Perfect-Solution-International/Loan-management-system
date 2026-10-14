/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Calculator,
  PlusCircle,
  Search,
  MapPin,
  FileText,
  CreditCard,
  DollarSign,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Check,
  FileCheck2,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";

type WizardStep = "select" | "review" | "form" | "done";

function IssueNewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("customerId") || "";

  const { customers, loans, payments, documents, addLoan } = useData();

  // ── Step State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(preselectedId ? "review" : "select");

  // ── Customer Selection State ──────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedId);
  const [customerSearch, setCustomerSearch] = useState("");

  // ── Loan Form Fields (Completely blank on open!) ───────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultFirstPaymentStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [grossAmount, setGrossAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily" | "">("");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily" | "">("");
  const [duration, setDuration] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>("");
  const [disbursementMethod, setDisbursementMethod] = useState<"Cash" | "Bank Transfer" | "Cheque" | "">("");

  // Upfront Deductions (Completely blank on open!)
  const [capitalDeduction, setCapitalDeduction] = useState<string>("");
  const [interestDeduction, setInterestDeduction] = useState<string>("");
  const [processingFee, setProcessingFee] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");
  const [otherFees, setOtherFees] = useState<string>("");

  // Guarantor Details (Completely blank on open!)
  const [guarantorName, setGuarantorName] = useState<string>("");
  const [guarantorNic, setGuarantorNic] = useState<string>("");
  const [guarantorPhone, setGuarantorPhone] = useState<string>("");
  const [guarantorRelationship, setGuarantorRelationship] = useState<string>("");
  const [guarantorAddress, setGuarantorAddress] = useState<string>("");

  // Contract remarks
  const [notes, setNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submittedLoanId, setSubmittedLoanId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived Selected Customer ─────────────────────────────────────────────
  const selectedCustomer = useMemo(
    () => customers.find((c: Customer) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  // Customer Financial Profile
  const customerFinancialSnapshot = useMemo(() => {
    if (!selectedCustomer) {
      return {
        customerLoans: [] as Loan[],
        customerPayments: [] as Payment[],
        customerDocs: [] as CustomerDocument[],
        outstanding: 0,
        activeLoansCount: 0,
        totalPaid: 0,
        isActive: true,
      };
    }
    const customerLoans = loans.filter((l) => l.customerId === selectedCustomer.id);
    const loanIds = customerLoans.map((l) => l.id);
    const customerPayments = payments.filter(
      (p) => p.customerId === selectedCustomer.id || loanIds.includes(p.loanId)
    );
    const customerDocs = documents.filter((d) => d.customerId === selectedCustomer.id);

    const totalRepayable = customerLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
    const totalPaid = customerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = Math.max(0, totalRepayable - totalPaid);
    const activeLoansCount = customerLoans.filter((l) => l.status === "Active" || l.status === "Overdue").length;
    const isActive = (selectedCustomer.status || "").toUpperCase() === "ACTIVE";

    return {
      customerLoans,
      customerPayments,
      customerDocs,
      outstanding,
      activeLoansCount,
      totalPaid,
      isActive,
    };
  }, [selectedCustomer, loans, payments, documents]);

  // Customer Filter
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter((c: Customer) =>
      [c.id, c.name, c.fullName, c.phone, c.nic, c.town, c.district]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, customerSearch]);

  // ── Financial Calculation Engine ──────────────────────────────────────────
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

  // Schedule preview table (first 5 installments)
  const schedulePreview = useMemo(() => {
    if (!Number(grossAmount)) return [];
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
  }, [calculations, firstPaymentDate, frequency, todayStr, grossAmount]);

  // ── Step Navigation Handlers ──────────────────────────────────────────────
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
  };

  const handleGoToReview = () => {
    if (!selectedCustomerId) {
      setErrorMsg("Please select a borrower to continue.");
      return;
    }
    setErrorMsg("");
    setStep("review");
  };

  const handleGoToForm = () => {
    setErrorMsg("");
    setStep("form");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedCustomerId) {
      setErrorMsg("Please select a borrower first.");
      setStep("select");
      return;
    }

    if (!grossAmount || Number(grossAmount) <= 0) {
      setErrorMsg("Please enter a valid loan principal amount.");
      return;
    }

    if (!duration || Number(duration) <= 0) {
      setErrorMsg("Please specify the duration / number of installments.");
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
      otherFees:
        Number(otherFees || 0) + Number(processingFee || 0) + Number(adminFee || 0),
      interestRate: Number(interestRate) || 0,
      ratePeriod: (ratePeriod || "Monthly") as "Monthly" | "Weekly" | "Daily",
      repaymentFrequency: (frequency || "Monthly") as "Monthly" | "Weekly" | "Daily",
      duration: Number(duration) || 12,
      issueDate: issueDate || todayStr,
      firstPaymentDate: firstPaymentDate || defaultFirstPaymentStr,
      purpose: purpose.trim() || undefined,
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
      disbursementMethod: (disbursementMethod || "Cash") as "Cash" | "Bank Transfer" | "Cheque",
      notes: notes.trim() || undefined,
    };

    addLoan(newLoan);
    setSubmittedLoanId(newId);
    setStep("done");

    setTimeout(() => {
      router.push(`/loans/${newId}`);
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest">
              PORTFOLIO OPERATIONS / NEW LOAN WIZARD
            </p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Create Loan Application
            </h1>
            <p className="text-xs text-slate-500">
              Follow the multi-step workflow to select borrower, review profile, and issue loan contract.
            </p>
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
        {/* ── CLICKABLE TABS / STEPPER WIZARD ─────────────────────────────────── */}
        {step !== "done" && (
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Tab 1: Select Borrower */}
              <button
                type="button"
                onClick={() => setStep("select")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  step === "select"
                    ? "bg-red-600 text-white shadow-xs"
                    : selectedCustomer
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {selectedCustomer && step !== "select" ? (
                  <Check size={14} className="text-emerald-600 stroke-[3]" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-center text-[10px] leading-4">
                    1
                  </span>
                )}
                <span>1. Select Borrower</span>
              </button>

              <ChevronRight size={14} className="text-slate-300 shrink-0" />

              {/* Tab 2: Review Profile */}
              <button
                type="button"
                disabled={!selectedCustomer}
                onClick={() => selectedCustomer && setStep("review")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  step === "review"
                    ? "bg-red-600 text-white shadow-xs"
                    : selectedCustomer
                    ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    : "bg-slate-100/60 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-center text-[10px] leading-4">
                  2
                </span>
                <span>2. Review Profile</span>
              </button>

              <ChevronRight size={14} className="text-slate-300 shrink-0" />

              {/* Tab 3: Loan Details */}
              <button
                type="button"
                disabled={!selectedCustomer}
                onClick={() => selectedCustomer && setStep("form")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  step === "form"
                    ? "bg-red-600 text-white shadow-xs"
                    : selectedCustomer
                    ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    : "bg-slate-100/60 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-center text-[10px] leading-4">
                  3
                </span>
                <span>3. Loan Details</span>
              </button>
            </div>

            {selectedCustomer && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Selected:</span>
                <span className="font-bold text-slate-900 truncate max-w-[180px]">
                  {selectedCustomer.fullName || selectedCustomer.name}
                </span>
                <span className="font-mono text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                  {selectedCustomer.id}
                </span>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── STEP 1: SELECT BORROWER ────────────────────────────────────────── */}
        {step === "select" && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Step 1: Select a Borrower
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a customer to proceed to profile review and loan parameters configuration.
                </p>
              </div>

              <Link
                href="/customers/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
              >
                + Register New Customer
              </Link>
            </div>

            {/* Search Input */}
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
                  placeholder="Search by customer name, NIC, customer ID, or town..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Customers Grid */}
            <div className="p-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-1">
                {filteredCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  const custLoans = loans.filter((l) => l.customerId === c.id);
                  const custLoanIds = custLoans.map((l) => l.id);
                  const custPayments = payments.filter(
                    (p) => p.customerId === c.id || custLoanIds.includes(p.loanId)
                  );
                  const totalRepayable = custLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
                  const totalPaid = custPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                  const outstanding = Math.max(0, totalRepayable - totalPaid);

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "border-red-500 bg-red-50/50 shadow-md ring-2 ring-red-500/20"
                          : "border-slate-200 hover:border-red-300 bg-white shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 font-extrabold text-base flex items-center justify-center shrink-0">
                            {(c.fullName || c.name || "C").charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              {c.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                (c.status || "").toUpperCase() === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate mt-1">
                            {c.fullName || c.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono">NIC: {c.nic}</p>
                          <p className="text-[11px] text-slate-600 truncate">
                            {c.town || c.village || "Sri Lanka"} · {c.phone}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Outstanding: <strong className="font-mono text-slate-700">{MONEY(outstanding)}</strong>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            isSelected
                              ? "bg-red-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check size={12} /> Selected
                            </>
                          ) : (
                            "Select"
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions for Step 1 */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                {selectedCustomer ? (
                  <p className="text-xs text-slate-600">
                    Selected borrower:{" "}
                    <strong className="text-slate-900">
                      {selectedCustomer.fullName || selectedCustomer.name}
                    </strong>{" "}
                    ({selectedCustomer.id})
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Please select a borrower to enable the next step.</p>
                )}
              </div>
              <button
                type="button"
                disabled={!selectedCustomerId}
                onClick={handleGoToReview}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Next: Review Profile</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: REVIEW PROFILE ─────────────────────────────────────────── */}
        {step === "review" && selectedCustomer && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden space-y-6">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Step 2: Review Borrower Profile Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify customer identity, residency, and liability history before configuring loan details.
                </p>
              </div>
              <span className="text-xs font-bold text-red-600 font-mono bg-red-50 px-2.5 py-1 rounded-lg">
                Customer ID: {selectedCustomer.id}
              </span>
            </div>

            {/* Profile Overview Card */}
            <div className="px-6 space-y-6">
              {/* Profile Banner: Deep Obsidian Black + Luxurious Maroon */}
              <div className="p-6 bg-gradient-to-r from-[#09090b] via-[#2a040b] to-[#6b0f1a] text-white rounded-2xl flex flex-col sm:flex-row sm:items-center gap-5 shadow-sm border border-red-950">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt={selectedCustomer.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/60 shadow-md shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 border border-white/40 text-white font-black text-3xl flex items-center justify-center shrink-0">
                    {(selectedCustomer.fullName || selectedCustomer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-200 uppercase tracking-widest bg-black/40 px-2.5 py-0.5 rounded-full border border-rose-900/40">
                      Borrower Dossier
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        customerFinancialSnapshot.isActive
                          ? "bg-emerald-400/20 text-emerald-100"
                          : "bg-amber-400/20 text-amber-100"
                      }`}
                    >
                      {selectedCustomer.status}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">{selectedCustomer.fullName || selectedCustomer.name}</h3>
                  <p className="text-xs text-rose-100 font-mono">
                    NIC: <strong className="text-white">{selectedCustomer.nic}</strong> · Contact: {selectedCustomer.phone}
                  </p>
                </div>
              </div>

              {/* Status warning if suspended */}
              {!customerFinancialSnapshot.isActive && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Warning: Customer status is <strong>{selectedCustomer.status}</strong>. Review credit risk before proceeding.
                  </span>
                </div>
              )}

              {/* Financial Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Outstanding Balance Due
                  </span>
                  <span className="text-xl font-mono font-black text-rose-600 mt-1 block">
                    {MONEY(customerFinancialSnapshot.outstanding)}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Active Contracts
                  </span>
                  <span className="text-xl font-mono font-black text-red-600 mt-1 block">
                    {customerFinancialSnapshot.activeLoansCount}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Repayments Settled
                  </span>
                  <span className="text-xl font-mono font-black text-emerald-600 mt-1 block">
                    {MONEY(customerFinancialSnapshot.totalPaid)}
                  </span>
                </div>
              </div>

              {/* Identity & Address Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Identity info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                    <CreditCard size={14} className="text-red-600" /> Identity Information
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">NIC Number:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCustomer.nic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gender &amp; DOB:</span>
                      <span className="font-bold text-slate-800">
                        {selectedCustomer.gender || "Male"} · {selectedCustomer.dob || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Contact Phone:</span>
                      <span className="font-bold text-slate-900">{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Alternative Phone:</span>
                      <span className="font-bold text-slate-700">{selectedCustomer.alternatePhone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email Address:</span>
                      <span className="font-bold text-slate-700">{selectedCustomer.email || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Residential Location */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                    <MapPin size={14} className="text-rose-700" /> Residential Address
                  </h4>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Street / House:</span>
                      <span className="font-bold text-slate-900">{selectedCustomer.address || "Main Street"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Village / GN:</span>
                        <span className="font-bold text-slate-800">{selectedCustomer.village || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Town:</span>
                        <span className="font-bold text-slate-800">{selectedCustomer.town || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">District:</span>
                        <span className="font-bold text-slate-800">{selectedCustomer.district || "Colombo"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents preview if any */}
              {(selectedCustomer.nicFrontUrl || selectedCustomer.nicBackUrl || customerFinancialSnapshot.customerDocs.length > 0) && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-rose-600" /> Attached Identity Documents
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedCustomer.nicFrontUrl && (
                      <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg flex items-center gap-1.5">
                        <Check size={12} /> NIC Front Uploaded
                      </span>
                    )}
                    {selectedCustomer.nicBackUrl && (
                      <span className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg flex items-center gap-1.5">
                        <Check size={12} /> NIC Back Uploaded
                      </span>
                    )}
                    {customerFinancialSnapshot.customerDocs.map((doc) => (
                      <span
                        key={doc.id}
                        className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <FileCheck2 size={12} /> {doc.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions for Step 2 */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back: Change Borrower
              </button>
              <button
                type="button"
                onClick={handleGoToForm}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Next: Configure Loan Details</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: LOAN DETAILS ───────────────────────────────────────────── */}
        {step === "form" && selectedCustomer && (
          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* Top Borrower Summary Strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 font-bold text-base flex items-center justify-center shrink-0">
                    {(selectedCustomer.fullName || selectedCustomer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-slate-900">{selectedCustomer.fullName || selectedCustomer.name}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    NIC: <strong className="text-slate-800">{selectedCustomer.nic}</strong> · {selectedCustomer.phone} ·{" "}
                    {selectedCustomer.town || "Sri Lanka"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Change Borrower
                </button>
              </div>
            </div>

            {/* Layout: Form on Left 2 cols, Financial Summary on Right col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Loan Terms & Structure */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                      <DollarSign size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">1. Loan Terms &amp; Structure</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Gross Loan Amount */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Gross Loan Amount (LKR) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          {["50000", "100000", "200000", "500000"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setGrossAmount(preset)}
                              className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-md transition cursor-pointer"
                            >
                              {(Number(preset) / 1000).toFixed(0)}k
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="5000"
                        step="1000"
                        autoComplete="off"
                        required
                        value={grossAmount}
                        onChange={(e) => setGrossAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono font-black rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
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
                        autoComplete="off"
                        required
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                      />
                    </div>

                    {/* Rate Period */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Rate Period</label>
                      <select
                        value={ratePeriod}
                        onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily")}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                      >
                        <option value="">-- Select Rate Period --</option>
                        <option value="Monthly">Per Month</option>
                        <option value="Weekly">Per Week</option>
                        <option value="Daily">Per Day</option>
                      </select>
                    </div>

                    {/* Repayment Frequency */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Repayment Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as "Monthly" | "Weekly" | "Daily")}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                      >
                        <option value="">-- Select Frequency --</option>
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
                        autoComplete="off"
                        required
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                      />
                    </div>

                    {/* Loan Purpose */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Loan Purpose</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                      />
                    </div>

                    {/* Dates */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Issue Date *</label>
                      <input
                        type="date"
                        required
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
                        value={capitalDeduction}
                        onChange={(e) => setCapitalDeduction(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Interest Deduction (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        value={interestDeduction}
                        onChange={(e) => setInterestDeduction(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Processing Fee (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        value={processingFee}
                        onChange={(e) => setProcessingFee(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Admin / Legal Fee (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        value={adminFee}
                        onChange={(e) => setAdminFee(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Other Fees (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        autoComplete="off"
                        value={otherFees}
                        onChange={(e) => setOtherFees(e.target.value)}
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
                        <option value="">-- Select Mode --</option>
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
                    <div className="p-2 bg-red-50 text-red-600 rounded-xl">
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
                        name="loan_guarantor_fullname"
                        autoComplete="off"
                        spellCheck={false}
                        value={guarantorName}
                        onChange={(e) => setGuarantorName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Relationship to Borrower</label>
                      <select
                        name="loan_guarantor_relationship"
                        value={guarantorRelationship}
                        onChange={(e) => setGuarantorRelationship(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                      >
                        <option value="">-- Select Relationship --</option>
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
                        name="loan_guarantor_nic"
                        autoComplete="off"
                        spellCheck={false}
                        value={guarantorNic}
                        onChange={(e) => setGuarantorNic(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Guarantor Contact Phone</label>
                      <input
                        type="tel"
                        name="loan_guarantor_phone"
                        autoComplete="off"
                        spellCheck={false}
                        value={guarantorPhone}
                        onChange={(e) => setGuarantorPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-3">
                      <label className="text-xs font-bold text-slate-700">Guarantor Residential Address</label>
                      <input
                        type="text"
                        name="loan_guarantor_address"
                        autoComplete="off"
                        spellCheck={false}
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
                    autoComplete="off"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 resize-none font-medium"
                  />
                </div>
              </div>

              {/* Right Column: Financial Summary & Submit */}
              <div className="space-y-4 sticky top-24">
                <div className="bg-[#0e0e11] text-white p-6 rounded-3xl shadow-xl space-y-5 border border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-rose-400" />
                      <h3 className="font-black text-sm tracking-tight">Financial Summary</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Live
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Gross Principal</span>
                      <span className="font-mono font-bold text-zinc-100">{MONEY(calculations.gross)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Total Deductions</span>
                      <span className="font-mono font-bold text-red-400">
                        - {MONEY(calculations.totalDeductions)}
                      </span>
                    </div>

                    {/* Net Cash Disbursement */}
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          Net Disbursement
                        </span>
                        <span className="text-[10px] text-zinc-400">Borrower cashout</span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-400">
                        {MONEY(calculations.netDisbursement)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Total Interest ({interestRate || 0}%)</span>
                      <span className="font-mono font-bold text-rose-300">
                        + {MONEY(calculations.totalInterest)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-300 font-bold">Total Repayment</span>
                      <span className="font-mono font-black text-white text-sm">
                        {MONEY(calculations.totalRepayment)}
                      </span>
                    </div>

                    <div className="p-3 bg-[#24040a] border border-red-500/30 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                          {frequency} Installment
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {calculations.numberOfInstallments} payments
                        </span>
                      </div>
                      <span className="font-mono text-lg font-black text-rose-400">
                        {MONEY(calculations.installmentAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Installment breakdown preview */}
                  {schedulePreview.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-zinc-800 text-[11px]">
                      <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider">
                        Installment Schedule Preview
                      </span>
                      {schedulePreview.map((item) => (
                        <div
                          key={item.num}
                          className="flex items-center justify-between p-1.5 bg-zinc-900/80 rounded-lg text-[10px] font-mono text-zinc-300"
                        >
                          <span>
                            #{item.num} · {item.date}
                          </span>
                          <span className="font-bold text-rose-300">{MONEY(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlusCircle size={16} />
                      <span>Disburse &amp; Activate Loan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("review")}
                      className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer text-center"
                    >
                      ← Back: Review Profile
                    </button>
                  </div>
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
                Loan contract <span className="font-mono font-bold text-red-600">{submittedLoanId}</span> has been
                successfully approved, registered, and scheduled.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">
                  {selectedCustomer?.fullName || selectedCustomer?.name}
                </span>
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
                <span className="font-bold text-red-600">
                  {MONEY(calculations.installmentAmount)} / {frequency}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Redirecting to loan detail page...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssueNewLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading loan creation workflow...
        </div>
      }
    >
      <IssueNewLoanContent />
    </Suspense>
  );
}