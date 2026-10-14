/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  RefreshCw,
  Upload,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  History,
  X,
  Camera,
  Check,
  AlertCircle,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCheck2,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, CustomerStatus, CustomerDocument, Loan, Payment } from "@/types";

const SRI_LANKA_DISTRICTS = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Kandy",
  "Matale",
  "Nuwara Eliya",
  "Galle",
  "Matara",
  "Hambantota",
  "Jaffna",
  "Kilinochchi",
  "Mannar",
  "Vavuniya",
  "Mullaitivu",
  "Batticaloa",
  "Ampara",
  "Trincomalee",
  "Kurunegala",
  "Puttalam",
  "Anuradhapura",
  "Polonnaruwa",
  "Badulla",
  "Moneragala",
  "Ratnapura",
  "Kegalle",
];

interface AttachedDoc {
  id: string;
  title: string;
  type: CustomerDocument["type"];
  fileName: string;
  fileSize: string;
  fileType: string;
  fileUrl: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const { customers, addCustomer, addDocument, addLoan, addPayment } = useData();

  // ── Sequential Customer ID Generator (CUS-001, CUS-002, ...) ──────────────
  const generateCustomerId = useCallback(() => {
    const highestNum = customers.reduce((max, c) => {
      const match = c.id.match(/^CUS-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = highestNum + 1;
    return `CUS-${String(nextNum).padStart(3, "0")}`;
  }, [customers]);

  const [customerId, setCustomerId] = useState(() => generateCustomerId());

  useEffect(() => {
    setCustomerId((prev) => {
      if (!prev) return generateCustomerId();
      return prev;
    });
  }, [generateCustomerId]);

  const handleRegenerateId = () => {
    setCustomerId(generateCustomerId());
  };

  // ── Form State (100% Blank by Default) ────────────────────────────────────
  const [form, setForm] = useState({
    photoUrl: "",
    fullName: "",
    nic: "",
    dob: "",
    gender: "" as "Male" | "Female" | "Other" | "",
    address: "",
    village: "",
    town: "",
    district: "",
    phone: "",
    alternatePhone: "",
    email: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    status: "Active" as CustomerStatus,
    hasExistingLoan: false,
    existingLoanNo: "",
    existingLoanPrincipal: "",
    existingInterestRate: "",
    existingDuration: "",
    existingFrequency: "Monthly" as "Daily" | "Weekly" | "Monthly",
    existingIssueDate: "",
    existingPurpose: "",
    previousAmountPaid: "",
    previousInstallmentsPaid: "",
    previousLastPaymentDate: "",
    previousPaymentMethod: "Cash" as "Cash" | "Bank Transfer" | "Cheque",
    previousRepaymentNotes: "",
    customOutstandingBalance: "",
  });

  // Dedicated NIC Document uploads
  const [nicFrontUrl, setNicFrontUrl] = useState("");
  const [nicFrontFileName, setNicFrontFileName] = useState("");
  const [nicFrontFileSize, setNicFrontFileSize] = useState("");

  const [nicBackUrl, setNicBackUrl] = useState("");
  const [nicBackFileName, setNicBackFileName] = useState("");
  const [nicBackFileSize, setNicBackFileSize] = useState("");

  // Other supporting documents list
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<CustomerDocument["type"]>("other");

  // Validation & UI State
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const nicFrontInputRef = useRef<HTMLInputElement>(null);
  const nicBackInputRef = useRef<HTMLInputElement>(null);
  const otherDocsInputRef = useRef<HTMLInputElement>(null);

  // ── Validation Rules ──────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};

    if (!form.fullName.trim()) {
      errs.fullName = "Full legal name is required";
    } else if (form.fullName.trim().length < 3) {
      errs.fullName = "Please enter complete name (at least 3 characters)";
    }

    const cleanNic = form.nic.trim();
    if (!cleanNic) {
      errs.nic = "National Identity Card (NIC) number is required";
    } else {
      const isOldNic = /^[0-9]{9}[vVxX]$/.test(cleanNic);
      const isNewNic = /^[0-9]{12}$/.test(cleanNic);
      if (!isOldNic && !isNewNic) {
        errs.nic = "Invalid format: enter 9 digits + V/X or modern 12 digits";
      }
    }

    const cleanPhone = form.phone.trim().replace(/[\s-]/g, "");
    if (!cleanPhone) {
      errs.phone = "Primary contact phone is required";
    } else if (!/^(?:0|94|\+94)?7[0-9]{8}$/.test(cleanPhone) && !/^\d{10}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit mobile number (e.g. 07XXXXXXXX)";
    }

    if (form.alternatePhone.trim()) {
      const cleanAlt = form.alternatePhone.trim().replace(/[\s-]/g, "");
      if (!/^(?:0|94|\+94)?7[0-9]{8}$/.test(cleanAlt) && !/^\d{10}$/.test(cleanAlt)) {
        errs.alternatePhone = "Enter a valid 10-digit contact number";
      }
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address";
    }

    if (!form.district) {
      errs.district = "District selection is required";
    }

    if (form.emergencyContactPhone.trim()) {
      const cleanEmerg = form.emergencyContactPhone.trim().replace(/[\s-]/g, "");
      if (!/^(?:0|94|\+94)?7[0-9]{8}$/.test(cleanEmerg) && !/^\d{10}$/.test(cleanEmerg)) {
        errs.emergencyContactPhone = "Enter a valid 10-digit contact number";
      }
    }

    return errs;
  }, [form]);

  const nicFormatInfo = useMemo(() => {
    const cleanNic = form.nic.trim();
    if (/^[0-9]{9}[vVxX]$/.test(cleanNic)) return "Old Format (9-digit + Letter)";
    if (/^[0-9]{12}$/.test(cleanNic)) return "New Format (12-digit Digital NIC)";
    return null;
  }, [form.nic]);

  // Handle generic field change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // ── Image & File Upload Handlers ──────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, photoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNicFrontFileName(file.name);
      setNicFrontFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNicFrontUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNicBackFileName(file.name);
      setNicBackFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNicBackUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const docItem: AttachedDoc = {
          id: `doc-${Date.now()}-${index}`,
          title: newDocTitle.trim() || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          type: newDocType || "other",
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: file.type || "application/pdf",
          fileUrl: event.target?.result as string,
        };
        setAttachedDocs((prev) => [...prev, docItem]);
      };
      reader.readAsDataURL(file);
    });
    setNewDocTitle("");
    e.target.value = "";
  };

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // ── Existing Loan Financial Computations ──────────────────────────────────
  const computedLoanCalculations = useMemo(() => {
    if (!form.hasExistingLoan) return null;
    const principal = Number(form.existingLoanPrincipal) || 0;
    const rate = Number(form.existingInterestRate) || 0;
    const duration = Number(form.existingDuration) || 1;
    const totalInterest = principal * (rate / 100) * duration;
    const totalRepayment = principal + totalInterest;
    const paid = Number(form.previousAmountPaid) || 0;
    const outstanding = form.customOutstandingBalance
      ? Number(form.customOutstandingBalance)
      : Math.max(0, totalRepayment - paid);
    const installment = duration > 0 ? totalRepayment / duration : 0;

    return {
      principal,
      totalInterest,
      totalRepayment,
      paid,
      outstanding,
      installment,
    };
  }, [
    form.hasExistingLoan,
    form.existingLoanPrincipal,
    form.existingInterestRate,
    form.existingDuration,
    form.previousAmountPaid,
    form.customOutstandingBalance,
  ]);

  // ── Form Submission ───────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Mark all required fields as touched
    setTouched({
      fullName: true,
      nic: true,
      phone: true,
      district: true,
    });

    if (Object.keys(errors).length > 0) {
      setFormError("Please correct the highlighted errors before submitting the registration.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    const emergencyContactStr = form.emergencyContactName.trim()
      ? `${form.emergencyContactName.trim()} (${form.emergencyContactRelationship || "Relative"}) - ${
          form.emergencyContactPhone.trim() || form.phone.trim()
        }`
      : "";

    const newCustomer: Customer = {
      id: customerId,
      name: form.fullName.trim(),
      fullName: form.fullName.trim(),
      nic: form.nic.trim().toUpperCase(),
      dob: form.dob || undefined,
      gender: form.gender || undefined,
      address: form.address.trim() || "Main Road",
      village: form.village.trim() || form.town.trim() || "Local Area",
      town: form.town.trim() || "Colombo",
      district: form.district || "Colombo",
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,
      email: form.email.trim() || undefined,
      monthlyIncome: 0,
      emergencyContact: emergencyContactStr || undefined,
      status: form.status,
      registeredAt: new Date().toISOString().slice(0, 10),
      photoUrl: form.photoUrl || undefined,
      nicFrontUrl: nicFrontUrl || undefined,
      nicBackUrl: nicBackUrl || undefined,
      hasExistingLoan: form.hasExistingLoan,
      existingLoanNotes: form.hasExistingLoan
        ? `Existing loan: ${form.existingLoanNo || "LN-PRIOR"} | Outstanding: ${MONEY(
            computedLoanCalculations?.outstanding || 0
          )}`
        : undefined,
      priorRepaymentHistory: form.hasExistingLoan
        ? `${form.previousInstallmentsPaid || 0} installments settled (${MONEY(
            Number(form.previousAmountPaid) || 0
          )}). ${form.previousRepaymentNotes}`
        : undefined,
      initialOutstandingBalance: computedLoanCalculations?.outstanding,
    };

    addCustomer(newCustomer);

    // Attach Dedicated NIC Front & Back
    if (nicFrontUrl) {
      addDocument({
        id: `DOC-NICF-${Date.now()}`,
        customerId: newCustomer.id,
        title: "National Identity Card (Front)",
        type: "nic_front",
        fileName: nicFrontFileName || "nic_front.jpg",
        fileSize: nicFrontFileSize || "1.2 MB",
        fileType: "image/jpeg",
        fileUrl: nicFrontUrl,
        uploadedAt: new Date().toISOString().slice(0, 10),
        uploader: "Registration Desk",
      });
    }

    if (nicBackUrl) {
      addDocument({
        id: `DOC-NICB-${Date.now()}`,
        customerId: newCustomer.id,
        title: "National Identity Card (Back)",
        type: "nic_back",
        fileName: nicBackFileName || "nic_back.jpg",
        fileSize: nicBackFileSize || "1.2 MB",
        fileType: "image/jpeg",
        fileUrl: nicBackUrl,
        uploadedAt: new Date().toISOString().slice(0, 10),
        uploader: "Registration Desk",
      });
    }

    // Attach All Uploaded Identity Documents
    attachedDocs.forEach((doc, idx) => {
      addDocument({
        id: `DOC-${Date.now()}-${idx}`,
        customerId: newCustomer.id,
        title: doc.title,
        type: doc.type,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
        uploadedAt: new Date().toISOString().slice(0, 10),
        uploader: "Registration Desk",
      });
    });

    // Register Existing Loan & Repayment History if toggled
    if (form.hasExistingLoan && computedLoanCalculations) {
      const generatedLoanId =
        form.existingLoanNo.trim() ||
        `LN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const loanStatus = computedLoanCalculations.outstanding <= 0 ? "Completed" : "Active";

      const existingLoan: Loan = {
        id: generatedLoanId,
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        loanNo: generatedLoanId,
        principal: computedLoanCalculations.principal,
        amount: computedLoanCalculations.principal,
        capitalDeduction: 0,
        interestDeduction: 0,
        otherFees: 0,
        interestRate: Number(form.existingInterestRate) || 3,
        ratePeriod: "Monthly",
        repaymentFrequency: form.existingFrequency,
        duration: Number(form.existingDuration) || 6,
        issueDate: form.existingIssueDate || new Date().toISOString().slice(0, 10),
        firstPaymentDate: new Date().toISOString().slice(0, 10),
        purpose: form.existingPurpose || "Prior loan record",
        status: loanStatus,
        interest: computedLoanCalculations.totalInterest,
        totalRepayment: computedLoanCalculations.totalRepayment,
        netDisbursement: computedLoanCalculations.principal,
        installment: computedLoanCalculations.installment,
      };

      addLoan(existingLoan);

      if (computedLoanCalculations.paid > 0) {
        const paymentRecord: Payment = {
          id: `PAY-${Date.now()}`,
          loanId: existingLoan.id,
          customerId: newCustomer.id,
          amount: computedLoanCalculations.paid,
          date: form.previousLastPaymentDate || new Date().toISOString().slice(0, 10),
          type: "Capital",
          notes:
            form.previousRepaymentNotes ||
            `Migrated ${form.previousInstallmentsPaid || 0} past repayments on customer onboarding`,
          method: form.previousPaymentMethod,
          collectedBy: "Branch Credit Officer",
          receiptNo: `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
        };
        addPayment(paymentRecord);
      }
    }

    setSubmitted(true);
    setTimeout(() => {
      router.push(`/customers/${newCustomer.id}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* ── Top Header Navigation ───────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/customers"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Back to Customers Directory"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">
                    Customer Directory
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-[10px] font-semibold text-slate-500">New Registration</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Register Customer
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-500">Assigned ID:</span>
                <span className="font-mono text-xs font-black text-blue-700">{customerId}</span>
                <button
                  type="button"
                  onClick={handleRegenerateId}
                  className="p-1 text-slate-400 hover:text-blue-600 transition"
                  title="Generate next ID"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <Link
                href="/customers"
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {submitted && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
            <span>
              Customer registered successfully with documents and verification records! Redirecting to profile...
            </span>
          </div>
        )}

        {formError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold shadow-xs">
            <AlertCircle className="text-rose-600 shrink-0" size={18} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── Left 2 Columns: Structured Details ──────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Personal Identity & Demographics */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      1. Personal Identity &amp; Demographics
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter the customer’s legal identity details exactly as printed on their National Identity Card.
                    </p>
                  </div>
                  {nicFormatInfo && (
                    <span className="hidden sm:inline-block text-[10px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full">
                      {nicFormatInfo}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Legal Name */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Full Legal Name <span className="text-rose-500">*</span></span>
                      {touched.fullName && !errors.fullName && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check size={12} /> Valid
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.fullName}
                      onChange={handleChange}
                      onBlur={() => handleBlur("fullName")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.fullName && errors.fullName
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    />
                    {touched.fullName && errors.fullName && (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.fullName}</p>
                    )}
                  </div>

                  {/* NIC Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>NIC Number <span className="text-rose-500">*</span></span>
                      {touched.nic && !errors.nic && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check size={12} /> Valid
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="nic"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.nic}
                      onChange={handleChange}
                      onBlur={() => handleBlur("nic")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold uppercase rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.nic && errors.nic
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    />
                    {touched.nic && errors.nic ? (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.nic}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">9 digits with V/X or modern 12 digits</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Gender</label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      autoComplete="off"
                      value={form.dob}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    />
                  </div>

                  {/* Account Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Account Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Section 2: Contact Information */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    2. Contact Information
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Primary phone numbers for SMS payment receipts, installment reminders, and notifications.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Primary Mobile */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Primary Phone <span className="text-rose-500">*</span></span>
                      {touched.phone && !errors.phone && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check size={12} /> Valid
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.phone}
                      onChange={handleChange}
                      onBlur={() => handleBlur("phone")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.phone && errors.phone
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    />
                    {touched.phone && errors.phone ? (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.phone}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">e.g. 0712345678</p>
                    )}
                  </div>

                  {/* Alternative Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Alternative Phone</label>
                    <input
                      type="tel"
                      name="alternatePhone"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.alternatePhone}
                      onChange={handleChange}
                      onBlur={() => handleBlur("alternatePhone")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.alternatePhone && errors.alternatePhone
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    />
                    {touched.alternatePhone && errors.alternatePhone && (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.alternatePhone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.email}
                      onChange={handleChange}
                      onBlur={() => handleBlur("email")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.email && errors.email
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    />
                    {touched.email && errors.email && (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.email}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 3: Residential Address & Location */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    3. Residential Address &amp; Location
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permanent residency address used for physical field verification and notice delivery.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Street Address */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Street / House Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.address}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    />
                  </div>

                  {/* Village / Grama Niladhari */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Village / GN Division
                    </label>
                    <input
                      type="text"
                      name="village"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.village}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    />
                  </div>

                  {/* Town / City */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Town / City</label>
                    <input
                      type="text"
                      name="town"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.town}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    />
                  </div>

                  {/* District */}
                  <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>District <span className="text-rose-500">*</span></span>
                      {touched.district && !errors.district && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check size={12} /> Selected
                        </span>
                      )}
                    </label>
                    <select
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      onBlur={() => handleBlur("district")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.district && errors.district
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    >
                      <option value="">-- Select Administrative District --</option>
                      {SRI_LANKA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} District
                        </option>
                      ))}
                    </select>
                    {touched.district && errors.district && (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.district}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 4: Emergency Contact */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    4. Emergency Contact
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Secondary family or relative contact for emergency communication only.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Contact Person Name</label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.emergencyContactName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Relationship</label>
                    <select
                      name="emergencyContactRelationship"
                      value={form.emergencyContactRelationship}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-2xs"
                    >
                      <option value="">Select Relationship</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                      <option value="Relative">Relative</option>
                      <option value="Friend">Friend</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Emergency Phone</label>
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.emergencyContactPhone}
                      onChange={handleChange}
                      onBlur={() => handleBlur("emergencyContactPhone")}
                      className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border bg-white transition outline-none shadow-2xs ${
                        touched.emergencyContactPhone && errors.emergencyContactPhone
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 text-rose-900"
                          : "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      }`}
                    />
                    {touched.emergencyContactPhone && errors.emergencyContactPhone && (
                      <p className="text-[11px] text-rose-600 font-semibold">{errors.emergencyContactPhone}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 5: National Identity Card (NIC) Dedicated Uploads */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      5. National Identity Card (NIC) Scans
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload clear photo or PDF scans of the customer&apos;s NIC (Front &amp; Back).
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono">2 Documents</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NIC Front Slot */}
                  <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        NIC Front Image
                      </span>
                      {nicFrontUrl && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Attached
                        </span>
                      )}
                    </div>

                    {nicFrontUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={nicFrontUrl}
                          alt="NIC Front"
                          className="w-full h-36 object-cover bg-slate-100"
                        />
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                              {nicFrontFileName || "nic_front.jpg"}
                            </p>
                            <p className="text-[10px] text-slate-500">{nicFrontFileSize}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNicFrontUrl("");
                              setNicFrontFileName("");
                              setNicFrontFileSize("");
                            }}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => nicFrontInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-blue-50/30 transition text-center min-h-[140px]"
                      >
                        <Upload size={20} className="text-slate-400 mb-1.5" />
                        <span className="text-xs font-bold text-slate-700">Choose NIC Front</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, or PDF</span>
                        <input
                          ref={nicFrontInputRef}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleNicFrontUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>

                  {/* NIC Back Slot */}
                  <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        NIC Back Image
                      </span>
                      {nicBackUrl && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Attached
                        </span>
                      )}
                    </div>

                    {nicBackUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={nicBackUrl}
                          alt="NIC Back"
                          className="w-full h-36 object-cover bg-slate-100"
                        />
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                              {nicBackFileName || "nic_back.jpg"}
                            </p>
                            <p className="text-[10px] text-slate-500">{nicBackFileSize}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNicBackUrl("");
                              setNicBackFileName("");
                              setNicBackFileSize("");
                            }}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => nicBackInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-blue-50/30 transition text-center min-h-[140px]"
                      >
                        <Upload size={20} className="text-slate-400 mb-1.5" />
                        <span className="text-xs font-bold text-slate-700">Choose NIC Back</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, or PDF</span>
                        <input
                          ref={nicBackInputRef}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleNicBackUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 6: Other Supporting Documents */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      6. Other Supporting Documents
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload proof of residence, billing proofs, income records, or signed consents.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">
                    {attachedDocs.length} attached
                  </span>
                </div>

                {attachedDocs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            <FileText size={15} />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">{doc.title}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {doc.type.replace(/_/g, " ")} · {doc.fileSize}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition shrink-0"
                          title="Remove document"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Document Attach Input Bar */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Document Label / Title</label>
                      <input
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:border-blue-600 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Category</label>
                      <select
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value as CustomerDocument["type"])}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:border-blue-600 outline-none"
                      >
                        <option value="other">Other Supporting Document</option>
                        <option value="utility_bill">Proof of Billing / Utility Bill</option>
                        <option value="salary_slip">Salary Slip / Income Document</option>
                        <option value="agreement">Signed Agreement / Lease</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Choose Files</label>
                      <label className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition">
                        <Upload size={13} />
                        <span>Select Documents</span>
                        <input
                          ref={otherDocsInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleDocFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 7: Optional Prior Loan History */}
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      7. Previous Loan History (Optional)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enable if migrating an existing active borrower or past payment ledger from a physical book.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasExistingLoan"
                      checked={form.hasExistingLoan}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Migrate Existing Loan</span>
                  </label>
                </div>

                {form.hasExistingLoan && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Existing Loan ID / No.</label>
                        <input
                          type="text"
                          name="existingLoanNo"
                          autoComplete="off"
                          value={form.existingLoanNo}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Principal (LKR)</label>
                        <input
                          type="number"
                          name="existingLoanPrincipal"
                          autoComplete="off"
                          value={form.existingLoanPrincipal}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Interest Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="existingInterestRate"
                          autoComplete="off"
                          value={form.existingInterestRate}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Duration (Months)</label>
                        <input
                          type="number"
                          name="existingDuration"
                          autoComplete="off"
                          value={form.existingDuration}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Past Amount Paid (LKR)</label>
                          <input
                            type="number"
                            name="previousAmountPaid"
                            autoComplete="off"
                            value={form.previousAmountPaid}
                            onChange={handleChange}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Settled Installments</label>
                          <input
                            type="number"
                            name="previousInstallmentsPaid"
                            autoComplete="off"
                            value={form.previousInstallmentsPaid}
                            onChange={handleChange}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Calculated Outstanding</label>
                          <div className="px-3 py-1.5 text-xs rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-mono font-black">
                            {MONEY(computedLoanCalculations?.outstanding || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* ── Right Column: Sticky Passport Dossier & Actions ─────────────── */}
            <div className="space-y-5 lg:sticky lg:top-24">
              {/* Profile Card Preview */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5 text-center">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
                    Live Profile Preview
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      form.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {form.status}
                  </span>
                </div>

                {/* Avatar Portrait Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    {form.photoUrl ? (
                      <div className="relative">
                        <img
                          src={form.photoUrl}
                          alt="Customer Portrait"
                          className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                          className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition shadow-xs cursor-pointer"
                          title="Remove Photograph"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => photoInputRef.current?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition shadow-2xs"
                      >
                        <Camera size={26} className="mb-1" />
                        <span className="text-[10px] font-bold">Add Photo</span>
                      </div>
                    )}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  <h3 className="font-black text-sm text-slate-900 mt-3 truncate max-w-full">
                    {form.fullName || "Customer Full Name"}
                  </h3>
                  <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                    {form.nic || "NIC Pending"}
                  </p>
                </div>

                {/* Essential Quick Summary */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer ID:</span>
                    <span className="font-mono font-bold text-slate-800">{customerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mobile Phone:</span>
                    <span className="font-bold text-slate-800">{form.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">District:</span>
                    <span className="font-bold text-slate-800">{form.district || "—"}</span>
                  </div>
                </div>

                {/* Onboarding Checklist */}
                <div className="space-y-2 text-left pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Registration Requirements
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          form.fullName ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        ✓
                      </div>
                      <span className={form.fullName ? "text-slate-800 font-medium" : "text-slate-400"}>
                        Full Legal Name
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          form.nic && !errors.nic ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        ✓
                      </div>
                      <span className={form.nic && !errors.nic ? "text-slate-800 font-medium" : "text-slate-400"}>
                        Valid NIC Number
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          form.phone && !errors.phone ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        ✓
                      </div>
                      <span className={form.phone && !errors.phone ? "text-slate-800 font-medium" : "text-slate-400"}>
                        Primary Contact Phone
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          form.district ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        ✓
                      </div>
                      <span className={form.district ? "text-slate-800 font-medium" : "text-slate-400"}>
                        District Location
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          nicFrontUrl && nicBackUrl ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        ✓
                      </div>
                      <span className={nicFrontUrl && nicBackUrl ? "text-slate-800 font-medium" : "text-slate-400"}>
                        NIC Front &amp; Back Scans
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={16} />
                    <span>{isSubmitting ? "Registering..." : "Register & Save Customer"}</span>
                  </button>

                  <Link
                    href="/customers"
                    className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition text-center"
                  >
                    Cancel &amp; Return
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
