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
  UserCheck,
  X,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument, RepaymentType } from "@/types";

type WizardStep = "select" | "review" | "form" | "done";

function getNextRepaymentDate(dateStr: string, freq: "Monthly" | "Weekly" | "Daily"): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return "";

  if (freq === "Daily") {
    d.setDate(d.getDate() + 1);
  } else if (freq === "Weekly") {
    d.setDate(d.getDate() + 7);
  } else if (freq === "Monthly") {
    d.setMonth(d.getMonth() + 1);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function IssueNewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("customerId") || "";

  const { customers, loans, payments, documents, addLoan, settings } = useData();

  // ── Step State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(preselectedId ? "review" : "select");

  // ── Customer Selection State ──────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedId);
  const [customerSearch, setCustomerSearch] = useState("");

  // ── Loan Form Fields (Defaults: 30 days tenure, 10% rate, Capital + Interest) ──
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultFirstPaymentStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Tomorrow for daily schedule
    return d.toISOString().slice(0, 10);
  }, []);

  const [grossAmount, setGrossAmount] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("10");
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily" | "Flat">("Monthly");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily">("Daily");
  const [repaymentType, setRepaymentType] = useState<RepaymentType>("Capital + Interest");
  const [duration, setDuration] = useState<string>("30");
  const [purpose, setPurpose] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(defaultFirstPaymentStr);
  const [disbursementMethod, setDisbursementMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");

  const handleIssueDateChange = (val: string) => {
    setIssueDate(val);
    if (val) {
      setFirstPaymentDate(getNextRepaymentDate(val, frequency));
    }
  };

  const handleFrequencyChange = (newFreq: "Monthly" | "Weekly" | "Daily") => {
    setFrequency(newFreq);
    if (issueDate) {
      setFirstPaymentDate(getNextRepaymentDate(issueDate, newFreq));
    }
  };

  // Upfront Deductions (Completely blank on open!)
  const [capitalDeduction, setCapitalDeduction] = useState<string>("");
  const [interestDeduction, setInterestDeduction] = useState<string>("");
  const [processingFee, setProcessingFee] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");
  const [otherFees, setOtherFees] = useState<string>("");

  // Guarantor Details (Tick checkbox to enable)
  const [hasGuarantor, setHasGuarantor] = useState<boolean>(false);
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

  // Customer Filter - only show customers when searching or when already selected
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) {
      if (selectedCustomerId) {
        return customers.filter((c: Customer) => c.id === selectedCustomerId);
      }
      return [];
    }
    return customers.filter((c: Customer) =>
      [c.id, c.name, c.fullName, c.phone, c.nic, c.town, c.district, c.village]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, customerSearch, selectedCustomerId]);

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

    // 1. Total Upfront Deductions
    const totalDeductions = capDed + intDed + pFee + aFee + oFees;

    // 2. Net Cash Disbursed to Borrower
    const netDisbursement = Math.max(0, gross - totalDeductions);

    // 3. Duration in rate periods:
    const effRatePeriod = ratePeriod || "Monthly";
    const effFrequency = frequency || "Monthly";
    let periods = dur;

    if (effRatePeriod === "Monthly") {
      if (effFrequency === "Monthly") {
        periods = dur;
      } else if (effFrequency === "Weekly") {
        periods = dur / 4; // 4 weeks = 1 month
      } else if (effFrequency === "Daily") {
        periods = dur / 30; // 30 days = 1 month
      }
    } else if (effRatePeriod === "Weekly") {
      if (effFrequency === "Weekly") {
        periods = dur;
      } else if (effFrequency === "Monthly") {
        periods = dur * 4;
      } else if (effFrequency === "Daily") {
        periods = dur / 7;
      }
    } else if (effRatePeriod === "Daily") {
      if (effFrequency === "Daily") {
        periods = dur;
      } else if (effFrequency === "Weekly") {
        periods = dur * 7;
      } else if (effFrequency === "Monthly") {
        periods = dur * 30;
      }
    } else {
      periods = 1; // Flat rate for entire loan term
    }

    // 4. Total Interest over the loan term
    const totalInterest = Math.round(gross * (rate / 100) * periods);

    // 5. Total Repayment (subtract upfront capital and interest deductions if already deducted at disbursement)
    const remainingCapital = Math.max(0, gross - capDed);
    const remainingInterest = Math.max(0, totalInterest - intDed);
    const totalRepayment = remainingCapital + remainingInterest;

    // 6. Installments breakdown based on Repayment Scheme
    let installmentAmount = 0;
    let periodicInterest = 0;
    let finalInstallmentAmount = 0;

    if (repaymentType === "Interest Only") {
      // Under Interest Only, regular installments only cover periodic interest.
      // Remaining principal is repaid in the final installment at maturity.
      periodicInterest = dur > 0 ? Math.round((remainingInterest / dur) * 100) / 100 : 0;
      installmentAmount = periodicInterest;
      finalInstallmentAmount = remainingCapital + periodicInterest;
    } else {
      // Capital + Interest: equal periodic installments
      installmentAmount = dur > 0 ? Math.round((totalRepayment / dur) * 100) / 100 : 0;
      periodicInterest = dur > 0 ? Math.round((remainingInterest / dur) * 100) / 100 : 0;
      // Final installment absorbs any rounding cents/rupees
      finalInstallmentAmount = dur > 1
        ? Math.round((totalRepayment - installmentAmount * (dur - 1)) * 100) / 100
        : installmentAmount;
    }

    return {
      gross,
      totalDeductions,
      netDisbursement,
      totalInterest,
      totalRepayment,
      installmentAmount,
      numberOfInstallments: dur,
      repaymentType,
      periodicInterest,
      capitalAtMaturity: remainingCapital,
      finalInstallmentAmount,
    };
  }, [
    grossAmount,
    interestRate,
    ratePeriod,
    frequency,
    repaymentType,
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
      const isFinal = i === calculations.numberOfInstallments;
      const amt = isFinal
        ? calculations.finalInstallmentAmount
        : calculations.installmentAmount;
      const typeLabel = repaymentType === "Interest Only"
        ? (isFinal ? "Capital + Interest" : "Interest Only")
        : (isFinal ? "Final Installment" : "Principal + Interest");

      list.push({
        num: i,
        date: isNaN(d.getTime()) ? todayStr : d.toISOString().slice(0, 10),
        amount: amt,
        typeLabel,
        isFinal,
      });
    }
    return list;
  }, [calculations, firstPaymentDate, frequency, todayStr, grossAmount, repaymentType]);

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

    if (hasGuarantor && !guarantorName.trim()) {
      setErrorMsg("Please provide the guarantor's full name, or uncheck 'Guarantor Required'.");
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
      ratePeriod: (ratePeriod || "Monthly") as "Monthly" | "Weekly" | "Daily" | "Flat",
      repaymentFrequency: (frequency || "Daily") as "Monthly" | "Weekly" | "Daily",
      repaymentType: repaymentType,
      duration: Number(duration) || 30,
      issueDate: issueDate || todayStr,
      firstPaymentDate: firstPaymentDate || defaultFirstPaymentStr,
      purpose: purpose.trim() || undefined,
      status: "Active",
      interest: calculations.totalInterest,
      totalRepayment: calculations.totalRepayment,
      netDisbursement: calculations.netDisbursement,
      installment: calculations.installmentAmount,
      guarantorName: hasGuarantor ? guarantorName.trim() || undefined : undefined,
      guarantorNic: hasGuarantor ? guarantorNic.trim().toUpperCase() || undefined : undefined,
      guarantorPhone: hasGuarantor ? guarantorPhone.trim() || undefined : undefined,
      guarantorRelationship: hasGuarantor ? guarantorRelationship || undefined : undefined,
      guarantorAddress: hasGuarantor ? guarantorAddress.trim() || undefined : undefined,
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
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-3 pb-12 space-y-3">
        {/* ── CLICKABLE TABS / STEPPER WIZARD ─────────────────────────────────── */}
        {step !== "done" && (
          <div className="flex items-center gap-2">
            <Link
              href="/loans"
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:text-red-600 hover:bg-slate-50 shadow-xs transition shrink-0 cursor-pointer"
              title="Back to Loans Directory"
            >
              <ArrowLeft size={16} />
            </Link>

            <div className="flex-1 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2">
                {/* Tab 1 */}
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  title="Select Borrower"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition cursor-pointer ${
                    step === "select"
                      ? "bg-red-600 text-white shadow-xs ring-2 ring-red-100"
                      : selectedCustomer
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {selectedCustomer && step !== "select" ? (
                    <Check size={14} className="text-white stroke-[3]" />
                  ) : (
                    "1"
                  )}
                </button>

                <div className="w-4 sm:w-6 h-0.5 bg-slate-200 rounded-full" />

                {/* Tab 2 */}
                <button
                  type="button"
                  disabled={!selectedCustomer}
                  onClick={() => selectedCustomer && setStep("review")}
                  title="Review Profile"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition ${
                    step === "review"
                      ? "bg-red-600 text-white shadow-xs ring-2 ring-red-100 cursor-pointer"
                      : selectedCustomer && step === "form"
                      ? "bg-slate-900 text-white cursor-pointer"
                      : selectedCustomer
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  2
                </button>

                <div className="w-4 sm:w-6 h-0.5 bg-slate-200 rounded-full" />

                {/* Tab 3 */}
                <button
                  type="button"
                  disabled={!selectedCustomer}
                  onClick={() => selectedCustomer && setStep("form")}
                  title="Loan Details"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition ${
                    step === "form"
                      ? "bg-red-600 text-white shadow-xs ring-2 ring-red-100 cursor-pointer"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  3
                </button>
              </div>

              {selectedCustomer && (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
                  <span className="hidden sm:inline">Selected:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                    {selectedCustomer.fullName || selectedCustomer.name}
                  </span>
                  <span className="font-mono text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                    {selectedCustomer.id}
                  </span>
                </div>
              )}
            </div>
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
                  Select a Borrower
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
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Customers Grid */}
            <div className="p-6 pt-2">
              {!customerSearch.trim() && !selectedCustomerId ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <Search size={22} className="text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Search for a Borrower</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Enter the borrower&apos;s name, NIC number, phone, or Customer ID above to display results.
                  </p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-700">No borrowers found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No borrower matching &quot;{customerSearch}&quot; was found.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {!customerSearch.trim() && selectedCustomerId && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Currently Selected Borrower:
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId("")}
                        className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                      >
                        Search Another
                      </button>
                    </div>
                  )}
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
              )}
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
                <span>Next</span>
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
                  Review Borrower Profile Details
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
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={handleGoToForm}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: LOAN DETAILS ───────────────────────────────────────────── */}
        {step === "form" && selectedCustomer && (
          <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
            {/* Top Borrower Summary Strip */}
            <div className="bg-white rounded-xl border border-slate-200/90 py-2 px-3.5 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {(selectedCustomer.fullName || selectedCustomer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {selectedCustomer.fullName || selectedCustomer.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    NIC: <strong className="text-slate-800">{selectedCustomer.nic}</strong> · {selectedCustomer.phone} ·{" "}
                    {selectedCustomer.town || "Sri Lanka"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition cursor-pointer shadow-2xs leading-tight"
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => setStep("select")}
                  className="px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition cursor-pointer shadow-2xs leading-tight"
                >
                  Change Borrower
                </button>
              </div>
            </div>

            {/* Layout: Form on Left 2 cols, Financial Summary on Right col */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                {/* 1. Loan Terms & Structure */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3.5">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                      <DollarSign size={18} />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">1. Loan Terms &amp; Structure</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Loan Amount */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Loan Amount (LKR) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          {["50000", "100000", "200000", "500000"].map((preset) => {
                            const isSelected = grossAmount === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setGrossAmount(preset)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                                  isSelected
                                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                                    : "bg-white text-slate-900 border-slate-300 hover:bg-slate-100 hover:text-black"
                                }`}
                              >
                                <span className={isSelected ? "text-white font-bold" : "text-slate-900 font-bold"}>
                                  {(Number(preset) / 1000).toFixed(0)}k
                                </span>
                              </button>
                            );
                          })}
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

                    {/* Repayment Scheme */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Repayment Scheme <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          {repaymentType}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRepaymentType("Capital + Interest")}
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                            repaymentType === "Capital + Interest"
                              ? "bg-red-50/80 border-red-500 ring-2 ring-red-500/20 text-slate-900 shadow-2xs"
                              : "bg-white border-slate-300 hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <span
                                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                  repaymentType === "Capital + Interest"
                                    ? "border-red-600 bg-red-600"
                                    : "border-slate-400 bg-white"
                                }`}
                              >
                                {repaymentType === "Capital + Interest" && (
                                  <span className="w-1 h-1 bg-white rounded-full" />
                                )}
                              </span>
                              Capital + Interest (Standard)
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 pl-5">
                              Equal periodic installments covering both principal and interest.
                            </p>
                          </div>
                          {repaymentType === "Capital + Interest" && (
                            <Check size={16} className="text-red-600 shrink-0 ml-2" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setRepaymentType("Interest Only")}
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                            repaymentType === "Interest Only"
                              ? "bg-red-50/80 border-red-500 ring-2 ring-red-500/20 text-slate-900 shadow-2xs"
                              : "bg-white border-slate-300 hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <span
                                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                  repaymentType === "Interest Only"
                                    ? "border-red-600 bg-red-600"
                                    : "border-slate-400 bg-white"
                                }`}
                              >
                                {repaymentType === "Interest Only" && (
                                  <span className="w-1 h-1 bg-white rounded-full" />
                                )}
                              </span>
                              Interest Only
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 pl-5">
                              Regular installments cover only interest; capital repaid at maturity.
                            </p>
                          </div>
                          {repaymentType === "Interest Only" && (
                            <Check size={16} className="text-red-600 shrink-0 ml-2" />
                          )}
                        </button>
                      </div>
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
                        onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily" | "Flat")}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xs"
                      >
                        <option value="">-- Select Rate Period --</option>
                        <option value="Monthly">Per Month (Standard)</option>
                        <option value="Weekly">Per Week</option>
                        <option value="Daily">Per Day</option>
                        <option value="Flat">Flat (Entire Term)</option>
                      </select>
                    </div>

                    {/* Repayment Frequency */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Repayment Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => handleFrequencyChange(e.target.value as "Monthly" | "Weekly" | "Daily")}
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
                        onChange={(e) => handleIssueDateChange(e.target.value)}
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
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <Calculator size={18} />
                      </div>
                      <h3 className="text-sm font-black text-slate-900">Fees</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const gross = Number(grossAmount) || 0;
                          if (!interestRate) {
                            if (frequency === "Daily") {
                              setInterestRate(String(settings.defaultDailyRate ?? 0.15));
                              setRatePeriod("Daily");
                            } else if (frequency === "Weekly") {
                              setInterestRate(String(settings.defaultWeeklyRate ?? 0.8));
                              setRatePeriod("Weekly");
                            } else {
                              setInterestRate(String(settings.defaultMonthlyRate ?? 3.0));
                              setRatePeriod("Monthly");
                            }
                          }
                          if (gross > 0 && !capitalDeduction) {
                            const capRate = settings.defaultCapitalDeductionRate ?? 1.5;
                            setCapitalDeduction(String(Math.round((gross * capRate) / 100)));
                          }
                          if (!processingFee) {
                            setProcessingFee(String(settings.defaultProcessingFee ?? 1500));
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        title="Auto-fill standard fee baseline from system settings"
                      >
                        ⚡ Standard System Baseline
                      </button>
                      <span className="font-mono text-xs font-bold text-red-600">
                        - {MONEY(calculations.totalDeductions)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Document Charge (LKR)</label>
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
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">3. Necessary Guarantor Details</h3>
                        <p className="text-[11px] text-slate-600 font-medium">Security guarantor details registered with this loan.</p>
                      </div>
                    </div>

                    {/* Checkbox toggle: Guarantor Required */}
                    <label className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer select-none transition shrink-0">
                      <input
                        type="checkbox"
                        checked={hasGuarantor}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setHasGuarantor(checked);
                          if (!checked) {
                            setGuarantorName("");
                            setGuarantorNic("");
                            setGuarantorPhone("");
                            setGuarantorRelationship("");
                            setGuarantorAddress("");
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Guarantor Required
                      </span>
                    </label>
                  </div>

                  {!hasGuarantor ? (
                    <div className="p-4 bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2.5">
                        <UserCheck size={16} className="text-slate-400 shrink-0" />
                        <span>No guarantor is currently required for this loan. Tick <strong>Guarantor Required</strong> above to enter guarantor information.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHasGuarantor(true)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline shrink-0 cursor-pointer"
                      >
                        + Add Guarantor
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 animate-in fade-in duration-200">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-700">Guarantor Full Legal Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="loan_guarantor_fullname"
                          autoComplete="off"
                          spellCheck={false}
                          value={guarantorName}
                          onChange={(e) => setGuarantorName(e.target.value)}
                          placeholder="e.g. Kamal Perera"
                          className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Relationship to Borrower</label>
                        <select
                          name="loan_guarantor_relationship"
                          value={guarantorRelationship}
                          onChange={(e) => setGuarantorRelationship(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
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
                          placeholder="e.g. 198512345678 / 851234567V"
                          className="w-full px-3.5 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                          placeholder="e.g. 077 123 4567"
                          className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                          placeholder="e.g. No 45, Kandy Road, Colombo"
                          className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Additional Contract Notes */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
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
              <div className="space-y-3.5 sticky top-20">
                <div className="bg-gradient-to-br from-black via-[#160205] to-[#2d050c] text-white p-5 rounded-2xl shadow-xl space-y-4 border-2 border-red-950">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-rose-400" />
                      <h3 className="font-extrabold text-base text-white tracking-tight">Financial Summary</h3>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                      Live
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/80">
                      <span className="text-slate-300 font-bold">Loan Amount</span>
                      <span className="font-mono font-black text-white text-sm">{MONEY(calculations.gross)}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/80">
                      <span className="text-slate-300 font-bold">Total Deductions</span>
                      <span className="font-mono font-black text-rose-400 text-sm">
                        - {MONEY(calculations.totalDeductions)}
                      </span>
                    </div>

                    {/* Net Cash Disbursement */}
                    <div className="p-3.5 bg-emerald-950/60 border-2 border-emerald-500/40 rounded-2xl flex justify-between items-center shadow-xs">
                      <div>
                        <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider block">
                          Net Disbursement
                        </span>
                        <span className="text-xs text-slate-300 font-medium">Borrower cashout</span>
                      </div>
                      <span className="font-mono text-lg font-black text-emerald-300">
                        {MONEY(calculations.netDisbursement)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/80">
                      <span className="text-slate-300 font-bold">Total Interest ({interestRate || 0}%)</span>
                      <span className="font-mono font-black text-rose-300 text-sm">
                        + {MONEY(calculations.totalInterest)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/80">
                      <span className="text-slate-200 font-black uppercase tracking-wide">Total Repayment</span>
                      <span className="font-mono font-black text-amber-300 text-base">
                        {MONEY(calculations.totalRepayment)}
                      </span>
                    </div>

                    {repaymentType === "Interest Only" ? (
                      <div className="space-y-2 pt-1">
                        <div className="p-3 bg-red-950/80 border-2 border-red-500/40 rounded-2xl flex justify-between items-center shadow-xs">
                          <div>
                            <span className="text-[11px] font-black text-rose-200 uppercase tracking-wider block">
                              Periodic Interest Payment
                            </span>
                            <span className="text-xs text-slate-300 font-medium">
                              {calculations.numberOfInstallments} cycles ({frequency})
                            </span>
                          </div>
                          <span className="font-mono text-base font-black text-rose-300">
                            {MONEY(calculations.installmentAmount)}
                          </span>
                        </div>

                        <div className="p-3 bg-zinc-900/90 border border-zinc-700 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] font-black text-slate-200 uppercase tracking-wider block">
                              Capital at Maturity
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">Final balloon repayment</span>
                          </div>
                          <span className="font-mono font-black text-white text-sm">
                            {MONEY(calculations.capitalAtMaturity || 0)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-red-950/80 border-2 border-red-500/40 rounded-2xl flex justify-between items-center shadow-xs">
                        <div>
                          <span className="text-[11px] font-black text-rose-200 uppercase tracking-wider block">
                            {frequency} Installment
                          </span>
                          <span className="text-xs text-slate-300 font-medium">
                            {calculations.numberOfInstallments} equal installments
                          </span>
                        </div>
                        <span className="font-mono text-lg font-black text-rose-300">
                          {MONEY(calculations.installmentAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Installment breakdown preview */}
                  {schedulePreview.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-300 font-black">
                        <span>Installment Preview</span>
                        <span className="text-rose-300 font-bold">{repaymentType}</span>
                      </div>
                      <div className="space-y-1.5">
                        {schedulePreview.map((item) => (
                          <div
                            key={item.num}
                            className="flex items-center justify-between p-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs font-mono text-slate-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                #{item.num} · {item.date}
                              </span>
                              {item.isFinal && (
                                <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Final Due
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-black text-rose-300">{MONEY(item.amount)}</span>
                              {repaymentType === "Interest Only" && (
                                <span className="block text-[10px] text-slate-400 font-sans font-medium">
                                  {item.typeLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
                      className="w-full py-2.5 text-xs font-bold text-slate-200 bg-zinc-850 hover:bg-zinc-800 hover:text-white border border-zinc-700/80 rounded-xl transition cursor-pointer text-center block"
                    >
                      ← Back
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
                <span className="text-slate-500">Loan Amount:</span>
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