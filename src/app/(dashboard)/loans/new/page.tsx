/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useCallback, Suspense } from "react";
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
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = "select" | "confirm" | "form" | "done";

// ─── Generate loan ID ─────────────────────────────────────────────────────────
function generateLoanId(existingLoans: Loan[]): string {
  const year = new Date().getFullYear();
  const highest = existingLoans.reduce((max, l) => {
    const m = l.id.match(/(\d{3,4})$/);
    const n = m ? parseInt(m[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  return `LN-${year}-${String(highest + 1).padStart(3, "0")}`;
}

// ─── Customer Profile Modal (Step: "confirm") ─────────────────────────────────
function CustomerProfileModal({
  customer,
  loans,
  payments,
  documents,
  onConfirm,
  onBack,
}: {
  customer: Customer;
  loans: Loan[];
  payments: Payment[];
  documents: CustomerDocument[];
  onConfirm: () => void;
  onBack: () => void;
}) {
  const customerLoans = loans.filter((l) => l.customerId === customer.id);
  const loanIds = customerLoans.map((l) => l.id);
  const customerPayments = payments.filter(
    (p) => p.customerId === customer.id || loanIds.includes(p.loanId)
  );
  const customerDocs = documents.filter((d) => d.customerId === customer.id);

  const totalRepayable = customerLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = Math.max(0, totalRepayable - totalPaid);

  const isActive = (customer.status || "").toUpperCase() === "ACTIVE";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Card header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Blue banner */}
        <div className="bg-blue-800 px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {customer.photoUrl ? (
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/50 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/20 text-white font-semibold text-2xl flex items-center justify-center shrink-0">
                {(customer.name || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">
                CUSTOMER PROFILE
              </p>
              <h2 className="text-xl font-semibold text-white mt-0.5">
                {customer.fullName || customer.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-xs px-2 py-0.5 bg-white/20 text-white rounded">
                  {customer.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isActive ? "bg-emerald-400/20 text-emerald-100" : "bg-slate-400/20 text-slate-200"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding balance */}
        <div className="bg-slate-900 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
              Current Outstanding Balance
            </p>
            <p className="text-2xl font-semibold font-mono text-white mt-0.5">
              {MONEY(outstanding)}
            </p>
          </div>
          <div className="text-right text-xs space-y-1">
            <p className="text-slate-400">
              Total Repayable: <span className="text-white font-semibold">{MONEY(totalRepayable)}</span>
            </p>
            <p className="text-emerald-400 font-semibold">Paid: {MONEY(totalPaid)}</p>
            <p className="text-slate-400">
              Active loans:{" "}
              <span className="text-white font-semibold">
                {customerLoans.filter((l) => l.status === "Active" || l.status === "Overdue").length}
              </span>
            </p>
          </div>
        </div>

        {/* Body sections */}
        <div className="px-4 sm:px-6 py-6 space-y-6">
          {/* Warning if suspended */}
          {!isActive && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertTriangle size={16} className="shrink-0 text-amber-500" />
              <span>
                This customer&apos;s status is <strong>{customer.status}</strong>. Review carefully before issuing a new loan.
              </span>
            </div>
          )}

          {/* Personal Info */}
          <Section icon={<CreditCard size={13} />} title="Personal Identity">
            <Grid2>
              <InfoBox label="Full Name" value={customer.fullName || customer.name} />
              <InfoBox label="NIC Number" value={customer.nic} mono />
              <InfoBox label="Customer ID" value={customer.id} mono />
              <InfoBox label="Status" value={customer.status} />
            </Grid2>
          </Section>

          {/* Contact */}
          <Section icon={<Phone size={13} />} title="Contact Information">
            <Grid2>
              <InfoBox label="Primary Phone" value={customer.phone} />
              <InfoBox label="Alternative Phone" value={customer.alternatePhone || "—"} />
              {customer.email && <InfoBox label="Email" value={customer.email} />}
            </Grid2>
          </Section>

          {/* Address */}
          <Section icon={<MapPin size={13} />} title="Residential Address">
            <Grid2>
              <InfoBox label="Address" value={customer.address} fullWidth />
              <InfoBox label="Village" value={customer.village || "—"} />
              <InfoBox label="Town" value={customer.town || "—"} />
              <InfoBox label="District" value={customer.district || "—"} />
            </Grid2>
          </Section>


          {/* Documents */}
          <Section icon={<FileText size={13} />} title={`Uploaded Documents (${customerDocs.length})`}>
            {customerDocs.length > 0 ? (
              <div className="space-y-2">
                {customerDocs.map((doc: CustomerDocument) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{doc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.fileName} · {doc.fileSize}
                      </p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold rounded-lg transition text-xs"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No documents attached.</p>
            )}
          </Section>

          {/* Existing loans */}
          <Section icon={<DollarSign size={13} />} title={`Existing Loans (${customerLoans.length})`}>
            {customerLoans.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label="Scrollable records table">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Loan ID</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Purpose</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Principal</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Total Due</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerLoans.map((loan: Loan) => (
                      <tr key={loan.id}>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                          {loan.loanNo || loan.id}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {loan.purpose || "Loan Facility"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-800">
                          {MONEY(loan.principal || loan.amount || 0)}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                          {MONEY(loan.totalRepayment || 0)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              loan.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : loan.status === "Overdue"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No prior loans found.</p>
            )}
          </Section>

          {/* Repayment history */}
          <Section icon={<History size={13} />} title={`Repayment History (${customerPayments.length} records)`}>
            {customer.priorRepaymentHistory && (
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                <strong>Prior track record:</strong> {customer.priorRepaymentHistory}
              </div>
            )}
            {customerPayments.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label="Scrollable records table">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Date</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Receipt</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Type</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Amount</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600" scope="col">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerPayments.map((p: Payment) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{p.date}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-blue-700">
                          {p.receiptNo || p.id}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{p.type}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                          {MONEY(p.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{p.method || "Cash"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {customer.priorRepaymentHistory
                  ? "No recent receipts beyond onboarding history."
                  : "No repayment records found."}
              </p>
            )}
          </Section>
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-b-3xl">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft size={13} /> Change Customer
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md  transition cursor-pointer"
          >
            Continue to Loan Terms <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main inner component (uses useSearchParams) ──────────────────────────────
function IssueNewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("customerId") || "";

  const { customers, loans, payments, documents, addLoan } = useData();

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(preselectedId ? "confirm" : "select");

  // ── Customer selection ────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedId);

  // ── Loan form state ───────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);

  const [loanId] = useState(() => generateLoanId(loans));
  const [grossAmount, setGrossAmount] = useState<number>(100000);
  const [capitalDeduction, setCapitalDeduction] = useState<number>(0);
  const [interestDeduction, setInterestDeduction] = useState<number>(0);
  const [otherFees, setOtherFees] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(3);
  const [ratePeriod, setRatePeriod] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [frequency, setFrequency] = useState<"Monthly" | "Weekly" | "Daily">("Monthly");
  const [duration, setDuration] = useState<number>(12);
  const [issueDate, setIssueDate] = useState(todayStr);
  const [firstPaymentDate, setFirstPaymentDate] = useState(todayStr);
  const [purpose, setPurpose] = useState("Business Expansion / Working Capital");
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [adminFee, setAdminFee] = useState<number>(0);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorNic, setGuarantorNic] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedCustomer = useMemo(
    () => customers.find((c: Customer) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c: Customer) =>
        [c.id, c.name, c.fullName, c.phone, c.nic, c.town]
          .join(" ")
          .toLowerCase()
          .includes(customerSearch.toLowerCase())
      ),
    [customers, customerSearch]
  );

  const calculations = useMemo(() => {
    const gross = Number(grossAmount) || 0;
    const rate = Number(interestRate) || 0;
    const dur = Math.max(1, Number(duration));
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
  }, [grossAmount, interestRate, duration, capitalDeduction, interestDeduction, otherFees, processingFee, adminFee]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setStep("confirm");
  }, []);

  const handleConfirm = useCallback(() => setStep("form"), []);
  const handleBackToSelect = useCallback(() => setStep("select"), []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCustomerId || !grossAmount) return;

      const newLoan: Loan = {
        id: loanId,
        loanNo: loanId,
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || "Customer",
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
        guarantorName: guarantorName || undefined,
        guarantorNic: guarantorNic || undefined,
        guarantorPhone: guarantorPhone || undefined,
      } as Loan;

      addLoan(newLoan);
      setSubmitted(true);
      setStep("done");

      setTimeout(() => {
        router.push(`/loans/${loanId}`);
      }, 1800);
    },
    [
      selectedCustomerId, grossAmount, loanId, selectedCustomer, calculations,
      capitalDeduction, interestDeduction, otherFees, processingFee, adminFee,
      interestRate, ratePeriod, frequency, duration, issueDate, firstPaymentDate,
      purpose, guarantorName, guarantorNic, guarantorPhone, addLoan, router,
    ]
  );

  // ─── Render step indicator ─────────────────────────────────────────────────
  const stepLabels: { key: Step; label: string }[] = [
    { key: "select", label: "1. Select Borrower" },
    { key: "confirm", label: "2. Review Profile" },
    { key: "form", label: "3. Loan Details" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
              OPERATIONS / NEW LOAN CONTRACT
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-0.5">
              Create Loan
            </h1>
          </div>
          <Link
            href="/loans"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Loans
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-2">
            {stepLabels.map((s, i) => {
              const isActive = s.key === step;
              const isDone =
                (step === "confirm" && i === 0) ||
                (step === "form" && i <= 1);
              return (
                <React.Fragment key={s.key}>
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isDone && !isActive ? "✓ " : ""}
                    {s.label}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: SELECT CUSTOMER ─────────────────────────────────────── */}
        {step === "select" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Select Borrower</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Search for and select the customer who will receive this loan
              </p>
            </div>

            {/* Search bar */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer by name, NIC, ID, or town…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                 aria-label="Search customer by name, NIC, ID, or town…"/>
              </div>
            </div>

            {/* Customer list */}
            <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
              {filteredCustomers.length === 0 && (
                <div className="px-4 sm:px-6 py-12 text-center">
                  <User size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No customers found</p>
                </div>
              )}
              {filteredCustomers.map((c: Customer) => {
                const displayName = c.fullName || c.name;
                const initials = displayName
                  .split(" ")
                  .map((p: string) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const isActive = (c.status || "").toUpperCase() === "ACTIVE";

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c.id)}
                    className="w-full flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-blue-50/60 transition text-left cursor-pointer"
                  >
                    {c.photoUrl ? (
                      <img
                        src={c.photoUrl}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center shrink-0">
                        {initials}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        NIC: {c.nic} · {c.town || "—"} · {c.phone}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {c.status}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: CONFIRM CUSTOMER PROFILE ────────────────────────────── */}
        {step === "confirm" && selectedCustomer && (
          <CustomerProfileModal
            customer={selectedCustomer}
            loans={loans}
            payments={payments}
            documents={documents}
            onConfirm={handleConfirm}
            onBack={handleBackToSelect}
          />
        )}

        {/* ── STEP 3: LOAN FORM ────────────────────────────────────────────── */}
        {step === "form" && selectedCustomer && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols */}
            <div className="lg:col-span-2 space-y-6">

              {/* Selected borrower summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center gap-4">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-semibold text-lg flex items-center justify-center shrink-0">
                    {(selectedCustomer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {selectedCustomer.fullName || selectedCustomer.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {selectedCustomer.id} · NIC: {selectedCustomer.nic}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg">
                    Loan ID: {loanId}
                  </span>
                  <button
                    type="button"
                    onClick={handleBackToSelect}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="Change customer"
                   aria-label="Change customer">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Section 1: Loan Terms */}
              <FormCard title="1. Loan Terms & Structure">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Gross Loan Amount (LKR)" required>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      value={grossAmount}
                      onChange={(e) => setGrossAmount(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Interest Rate (%)" required>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Rate Period">
                    <select
                      value={ratePeriod}
                      onChange={(e) => setRatePeriod(e.target.value as "Monthly" | "Weekly" | "Daily")}
                      className={inputCls}
                    >
                      <option value="Monthly">Per Month</option>
                      <option value="Weekly">Per Week</option>
                      <option value="Daily">Per Day</option>
                    </select>
                  </FormField>

                  <FormField label="Repayment Frequency">
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as "Monthly" | "Weekly" | "Daily")}
                      className={inputCls}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </FormField>

                  <FormField label="Duration (No. of Installments)" required>
                    <input
                      type="number"
                      required
                      min="1"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Loan Purpose">
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Agriculture / Vehicle purchase"
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Issue Date" required>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="First Repayment Date" required>
                    <input
                      type="date"
                      required
                      value={firstPaymentDate}
                      onChange={(e) => setFirstPaymentDate(e.target.value)}
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </FormCard>

              {/* Section 2: Deductions & Fees */}
              <FormCard title="2. Upfront Deductions & Fees">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Capital Deduction (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={capitalDeduction}
                      onChange={(e) => setCapitalDeduction(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Interest Deduction (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={interestDeduction}
                      onChange={(e) => setInterestDeduction(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Processing Fee (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={processingFee}
                      onChange={(e) => setProcessingFee(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Admin / Legal Fee (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>

                  <FormField label="Other Admin Fees (LKR)">
                    <input
                      type="number"
                      min="0"
                      value={otherFees}
                      onChange={(e) => setOtherFees(Number(e.target.value))}
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </FormCard>

              {/* Section 3: Guarantor */}
              <FormCard title="3. Guarantor (Optional)">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Guarantor Full Name">
                    <input
                      type="text"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      placeholder="Full legal name"
                      className={inputCls}
                    />
                  </FormField>
                  <FormField label="Guarantor NIC">
                    <input
                      type="text"
                      value={guarantorNic}
                      onChange={(e) => setGuarantorNic(e.target.value)}
                      placeholder="NIC number"
                      className={`${inputCls} font-mono uppercase`}
                    />
                  </FormField>
                  <FormField label="Guarantor Phone">
                    <input
                      type="tel"
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      placeholder="077 XXX XXXX"
                      className={inputCls}
                    />
                  </FormField>
                </div>
              </FormCard>

              {/* Section 4: Notes */}
              <FormCard title="4. Additional Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional notes about this loan agreement, collateral, or special terms…"
                  className={`${inputCls} resize-none`}
                 aria-label="Any additional notes about this loan agreement, collateral, or special terms…"/>
              </FormCard>
            </div>

            {/* Right col: Live summary + Submit */}
            <div className="space-y-4">
              {/* Financial Summary */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm xl:sticky xl:top-24 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Calculator size={16} className="text-blue-400" />
                  <h3 className="font-semibold text-sm">Financial Summary</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <SummaryRow label="Gross Principal" value={MONEY(calculations.gross)} />
                  <SummaryRow
                    label="Total Deductions"
                    value={`- ${MONEY(calculations.totalDeductions)}`}
                    valueClass="text-red-400"
                  />
                  <SummaryRow
                    label="Net Disbursement"
                    value={MONEY(calculations.netDisbursement)}
                    valueClass="text-emerald-400 text-sm font-black"
                  />
                  <SummaryRow
                    label={`Total Interest (${interestRate}%)`}
                    value={MONEY(calculations.totalInterest)}
                  />
                  <SummaryRow
                    label="Total Repayment"
                    value={MONEY(calculations.totalRepayment)}
                    valueClass="text-white font-black text-sm"
                  />

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-end">
                    <div>
                      <p className="text-slate-400">
                        {frequency} Installment
                      </p>
                      <p className="text-xs text-slate-500">
                        {calculations.numberOfInstallments} payments
                      </p>
                    </div>
                    <span className="text-blue-400 font-semibold text-base">
                      {MONEY(calculations.installmentAmount)}
                    </span>
                  </div>
                </div>

                {/* Loan ID */}
                <div className="p-3 bg-slate-800 rounded-xl text-xs">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Loan Reference</p>
                  <p className="font-mono font-semibold text-white mt-0.5 text-sm">{loanId}</p>
                </div>

                <button
                  type="submit"
                  disabled={submitted}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-sm  transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle size={15} />
                  Disburse & Activate Loan
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── STEP DONE ─────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="max-w-lg mx-auto text-center space-y-6 py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Loan Activated!</h2>
              <p className="text-sm text-slate-500 mt-2">
                Loan <span className="font-mono font-semibold text-slate-800">{loanId}</span> has been
                disbursed and activated. Redirecting to loan detail page…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────
const inputCls =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactElement<{ id?: string }> }) {
  const fieldId = React.useId();
  return <div><label htmlFor={fieldId} className="block text-sm font-medium text-slate-600 mb-2">{label}{required && <span className="text-red-700 ml-0.5">*</span>}</label>{React.cloneElement(children, {id:fieldId})}</div>;
}

function SummaryRow({
  label,
  value,
  valueClass = "text-slate-200 font-bold",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
      <span className="text-slate-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        <span className="text-blue-600">{icon}</span>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function InfoBox({
  label,
  value,
  mono,
  fullWidth,
}: {
  label: string;
  value: string;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? "sm:col-span-2" : ""} bg-slate-50 rounded-xl p-3 border border-slate-100`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold text-slate-900 mt-0.5 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

// ─── Page export (wrapped in Suspense for useSearchParams) ────────────────────
export default function IssueNewLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8 text-center text-slate-500 text-sm">
          Loading loan creation wizard…
        </div>
      }
    >
      <IssueNewLoanContent />
    </Suspense>
  );
}