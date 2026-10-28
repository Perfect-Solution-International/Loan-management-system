/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  RefreshCw,
  Upload,
  Phone,
  UserCheck,
  FileText,
  CreditCard,
  History,
  X,
  Camera,
  ChevronRight,
  Check,
  AlertTriangle,
  Lock,
  Shield,
  Trash2,
  Sparkles,
  Eye,
  Sun,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, CustomerStatus, CustomerDocument, Loan, Payment } from "@/types";
import { isValidSriLankanNIC, isValidSriLankanPhone } from "@/lib/validation";

interface AttachedDoc {
  id: string;
  title: string;
  type: CustomerDocument["type"];
  fileName: string;
  fileSize: string;
  fileType: string;
  fileUrl: string;
}

const INITIAL_FORM = {
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
  emergencyContactRelationshipCustom: "",
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
};

function CustomerRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const freshKey = searchParams.get("fresh");
  const { customers, addCustomer, addDocument, addLoan, addPayment, getNextReceiptNo } = useData();

  // Helper to generate sequential Customer ID starting from CUS-001, CUS-002, etc.
  const generateCustomerId = React.useCallback(() => {
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
  
  // ── Multi-Step Wizard State ───────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<number>(1);

  const STEPS = [
    { number: 1, title: "Customer Details", subtitle: "Name, NIC, Address & Contacts" },
    { number: 2, title: "Photo & Document Uploads", subtitle: "Photograph, NIC Front/Back & Proofs" },
    { number: 3, title: "Final Review & Submit", subtitle: "Dossier Summary & Submit" },
  ];

  const goToStep = (stepNum: number) => {
    if (stepNum > 1 && currentStep >= 1) {
      if (!form.fullName.trim()) {
        setErrorMsg("Please enter customer's full legal name.");
        setCurrentStep(1);
        return;
      }
      if (!form.nic.trim()) {
        setErrorMsg("Please enter a valid National Identity Card (NIC) number.");
        setCurrentStep(1);
        return;
      }
      if (!form.phone.trim()) {
        setErrorMsg("Please enter a primary contact phone number.");
        setCurrentStep(1);
        return;
      }
    }
    setErrorMsg("");
    setCurrentStep(stepNum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!form.fullName.trim()) {
        setErrorMsg("Please enter customer's full legal name.");
        return;
      }
      if (!form.nic.trim()) {
        setErrorMsg("Please enter a valid National Identity Card (NIC) number.");
        return;
      }
      if (!form.phone.trim()) {
        setErrorMsg("Please enter a primary contact phone number.");
        return;
      }
      setErrorMsg("");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      setErrorMsg("");
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // 1. Core Profile Details (Clean defaults with NO unwanted auto-fill or dummy data)
  const [form, setForm] = useState(INITIAL_FORM);

  // Dedicated NIC Front and Back upload state
  const [nicFrontUrl, setNicFrontUrl] = useState("");
  const [nicFrontFileName, setNicFrontFileName] = useState("");
  const [nicFrontFileSize, setNicFrontFileSize] = useState("");

  const [nicBackUrl, setNicBackUrl] = useState("");
  const [nicBackFileName, setNicBackFileName] = useState("");
  const [nicBackFileSize, setNicBackFileSize] = useState("");

  // 2. Uploaded Supporting Documents List ('Other Docs')
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);

  // Document add sub-modal / fields
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<CustomerDocument["type"]>("other");
  const [newDocFileName, setNewDocFileName] = useState("");
  const [newDocFileUrl, setNewDocFileUrl] = useState("");
  const [newDocFileType, setNewDocFileType] = useState("application/pdf");
  const [newDocFileSize, setNewDocFileSize] = useState("1.5 MB");

  // Submission feedback
  const [submitted, setSubmitted] = useState(false);
  const [registeredCustomer, setRegisteredCustomer] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── RESET FORM TO CLEAN NEW REGISTRATION ────────────────────────────────
  const resetForm = useCallback(() => {
    setCustomerId(generateCustomerId());
    setCurrentStep(1);
    setSubmitted(false);
    setRegisteredCustomer(null);
    setErrorMsg("");
    setForm(INITIAL_FORM);
    setNicFrontUrl("");
    setNicFrontFileName("");
    setNicFrontFileSize("");
    setNicBackUrl("");
    setNicBackFileName("");
    setNicBackFileSize("");
    setAttachedDocs([]);
    setNewDocTitle("");
    setNewDocFileName("");
    setNewDocFileUrl("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [generateCustomerId]);

  // Reset when navigating with fresh search parameter or arriving fresh
  useEffect(() => {
    if (freshKey) {
      resetForm();
    }
  }, [freshKey, resetForm]);

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

  const handleRegenerateId = () => {
    setCustomerId(generateCustomerId());
  };

  // Handle local file selection for Customer Photograph
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

  // Handle local file selection for dedicated NIC Front Image
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

  // Handle local file selection for dedicated NIC Back Image
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

  // Handle local file selection for Other Docs attachment (supports multiple files at once)
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      const file = files[0];
      setNewDocFileName(file.name);
      if (!newDocTitle) {
        setNewDocTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setNewDocFileType(file.type || "application/pdf");
      setNewDocFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewDocFileUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Multiple files selected: directly add all of them to attachedDocs list
      Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const docItem: AttachedDoc = {
            id: `doc-${Date.now()}-${index}`,
            title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
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
      e.target.value = "";
    }
  };

  // Add document to form's list
  const handleAddDocumentToForm = () => {
    if (!newDocTitle.trim()) {
      alert("Please enter a document title.");
      return;
    }
    const docItem: AttachedDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      type: newDocType,
      fileName: newDocFileName || `${newDocTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      fileSize: newDocFileSize || "1.2 MB",
      fileType: newDocFileType || "application/pdf",
      fileUrl:
        newDocFileUrl ||
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    };
    setAttachedDocs((prev) => [...prev, docItem]);
    setNewDocTitle("");
    setNewDocFileName("");
    setNewDocFileUrl("");
  };

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Computed Loan Values for Existing Loan
  const computedLoanCalculations = React.useMemo(() => {
    if (!form.hasExistingLoan) return null;
    const principal = Number(form.existingLoanPrincipal) || 0;
    const rate = Number(form.existingInterestRate) || 0;
    const duration = Number(form.existingDuration) || 1;
    const totalInterest = (principal * (rate / 100)) * duration;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.fullName.trim()) {
      setErrorMsg("Please enter customer's full legal name.");
      setCurrentStep(1);
      return;
    }
    if (!isValidSriLankanNIC(form.nic)) {
      setErrorMsg("Please enter a valid Sri Lankan NIC number (e.g. 852341234V or 199512345678).");
      setCurrentStep(1);
      return;
    }
    if (!isValidSriLankanPhone(form.phone)) {
      setErrorMsg("Please enter a valid Sri Lankan phone number (10 digits starting with 07, e.g. 0771234567).");
      setCurrentStep(1);
      return;
    }

    const finalEmergencyRelationship =
      form.emergencyContactRelationship === "Other"
        ? form.emergencyContactRelationshipCustom.trim() || "Other"
        : form.emergencyContactRelationship;

    const emergencyContactStr = form.emergencyContactName
      ? `${form.emergencyContactName} (${finalEmergencyRelationship || "Contact"}) - ${form.emergencyContactPhone || form.phone}`
      : "";

    // 1. Create Customer Object
    const newCustomer: Customer = {
      id: customerId,
      name: form.fullName.trim(),
      fullName: form.fullName.trim(),
      nic: form.nic.trim().toUpperCase(),
      dob: form.dob || undefined,
      gender: (form.gender as "Male" | "Female" | "Other") || "Male",
      address: form.address.trim() || "Main Road",
      village: undefined,
      town: undefined,
      district: undefined,
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,
      email: form.email.trim() || undefined,
      monthlyIncome: 0,
      emergencyContact: emergencyContactStr,
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
        ? `${form.previousInstallmentsPaid} installments settled (${MONEY(
            Number(form.previousAmountPaid) || 0
          )}). ${form.previousRepaymentNotes}`
        : undefined,
      initialOutstandingBalance: computedLoanCalculations?.outstanding,

    };

    if (!(await addCustomer(newCustomer))) return;

    // 2. Attach Dedicated NIC Front & Back Documents if uploaded
    if (nicFrontUrl) {
      if (!(await addDocument({
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
      }))) return;
    }

    if (nicBackUrl) {
      if (!(await addDocument({
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
      }))) return;
    }

    // 2. Attach All Uploaded Identity Documents
    for (const [idx, doc] of attachedDocs.entries()) {
      const customerDoc: CustomerDocument = {
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
      };
      if (!(await addDocument(customerDoc))) return;
    }

    // 3. Register Existing Loan & Repayment History if present
    if (form.hasExistingLoan && computedLoanCalculations) {
      const generatedLoanId =
        form.existingLoanNo.trim() ||
        `LN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const loanStatus =
        computedLoanCalculations.outstanding <= 0 ? "Completed" : "Active";

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

      if (!(await addLoan(existingLoan))) return;

      // 4. Create Previous Repayment Record if amount paid > 0
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
            `Migrated ${form.previousInstallmentsPaid} past repayments on onboarding`,
          method: form.previousPaymentMethod,
          collectedBy: "Branch Credit Officer",
          receiptNo: getNextReceiptNo(),
        };
        if (!(await addPayment(paymentRecord))) return;
      }
    }

    setRegisteredCustomer({ id: newCustomer.id, name: newCustomer.name });
    setSubmitted(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="mx-auto workspace-page form-page">
      {/* Top Header */}
      <div className="space-y-3">
        <Link
          href="/customers"
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:bg-slate-50 shadow-xs transition"
          title="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Customer Registration
        </h1>
      </div>

      {submitted && registeredCustomer ? (
        <div className="bg-white rounded-3xl border border-emerald-200/80 p-8 sm:p-12 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50/50">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-bold text-emerald-800 font-mono">
              <span>Customer ID: {registeredCustomer.id}</span>
              <span>•</span>
              <span className="text-emerald-700 font-sans font-semibold">Active Customer Dossier</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Customer Registered Successfully!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              <strong>{registeredCustomer.name}</strong> has been enrolled into the system with all dossier documents and configurations.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-5 h-11 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs shadow-red-600/30 transition cursor-pointer"
            >
              <UserPlus size={16} />
              <span>+ Register Another Customer</span>
            </button>

            <Link
              href={`/customers/${registeredCustomer.id}`}
              className="w-full sm:w-auto px-5 h-11 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition"
            >
              <Eye size={15} />
              <span>View Customer Profile</span>
            </Link>

            <Link
              href="/users"
              className="w-full sm:w-auto px-4 h-11 text-slate-500 hover:text-slate-800 rounded-xl text-xs font-semibold inline-flex items-center justify-center transition"
            >
              User Management
            </Link>
          </div>
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold" role="alert">
              {errorMsg}
            </div>
          )}

          {/* ── MULTI-STEP PROGRESS STEPPER ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[1, 2, 3].map((stepNum, idx) => {
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <React.Fragment key={stepNum}>
                {idx > 0 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                      isCompleted ? "bg-red-600" : "bg-slate-200"
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => goToStep(stepNum)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all cursor-pointer ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20 ring-4 ring-red-100"
                      : isCompleted
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  }`}
                >
                  {stepNum}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* ── STEP 1: CUSTOMER DETAILS (PERSONAL DETAILS & EMERGENCY CONTACT) ── */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. PERSONAL DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Personal Details
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-1">
                    Full Legal Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="off"
                    required
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-bold" id="field-app-dashboard-customers-new-page-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-2">
                    National Identity Card (NIC) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="nic"
                    autoComplete="off"
                    required
                    value={form.nic}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-mono font-bold uppercase" id="field-app-dashboard-customers-new-page-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-3">Gender</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-3"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-4">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    name="dob"
                    autoComplete="off"
                    value={form.dob}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-4"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-5">
                    Contact Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="off"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-bold" id="field-app-dashboard-customers-new-page-5"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-6">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="off"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-6"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-7">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    autoComplete="off"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-7"
                  />
                </div>
              </div>
            </div>

            {/* 2. EMERGENCY CONTACT */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Phone size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Emergency Contact
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-8">Name</label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    autoComplete="off"
                    placeholder="Full name"
                    value={form.emergencyContactName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-9">Contact Number</label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    autoComplete="off"
                    placeholder="e.g. 07XXXXXXXX"
                    value={form.emergencyContactPhone}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800" htmlFor="field-app-dashboard-customers-new-page-10">Relationship</label>
                  <select
                    name="emergencyContactRelationship"
                    value={form.emergencyContactRelationship}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-new-page-10"
                  >
                    <option value="">Select Relationship</option>
                    <option value="Other">Other</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Relative">Relative</option>
                    <option value="Friend">Friend</option>
                  </select>

                  {form.emergencyContactRelationship === "Other" && (
                    <div className="pt-1.5 space-y-1 animate-in fade-in duration-150">
                      <label className="text-[11px] font-bold text-slate-700" htmlFor="field-app-dashboard-customers-new-page-11">Specify Relationship</label>
                      <input
                        type="text"
                        name="emergencyContactRelationshipCustom"
                        autoComplete="off"
                        placeholder="Type relationship (e.g. Uncle, Colleague)"
                        value={form.emergencyContactRelationshipCustom}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-red-300 bg-red-50/20 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        autoFocus id="field-app-dashboard-customers-new-page-11"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1 Navigation Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link
                href="/customers"
                className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PHOTO & IDENTITY DOCUMENTS ── */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* SECTION: CUSTOMER PHOTOGRAPH & NATIONAL IDENTITY CARD (NIC) IMAGES */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Identity Documents &amp; Photograph
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                {/* 1. Customer Photograph */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        Customer Photograph
                      </span>
                      {form.photoUrl && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      )}
                    </div>

                    {form.photoUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={form.photoUrl}
                          alt="Customer Portrait Preview"
                          className="w-full h-40 object-cover bg-slate-100"
                        />
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                              Customer Photo
                            </p>
                            <p className="text-[11px] text-slate-500">Portrait Image</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold transition cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-red-50/30 transition text-center min-h-[160px]">
                        <Camera size={24} className="text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700">Upload Photograph</span>
                        <span className="text-[11px] text-slate-400 mt-1">JPG, PNG, WEBP</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 2. NIC Front Image */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        NIC Front Image
                      </span>
                      {nicFrontUrl && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      )}
                    </div>

                    {nicFrontUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={nicFrontUrl}
                          alt="NIC Front Preview"
                          className="w-full h-40 object-cover bg-slate-100"
                        />
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                              {nicFrontFileName || "nic_front.jpg"}
                            </p>
                            <p className="text-[11px] text-slate-500">{nicFrontFileSize || "Image file"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNicFrontUrl("");
                              setNicFrontFileName("");
                              setNicFrontFileSize("");
                            }}
                            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold transition cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-red-50/30 transition text-center min-h-[160px]">
                        <Upload size={22} className="text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700">Upload NIC Front</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleNicFrontUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 3. NIC Back Image */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        NIC Back Image
                      </span>
                      {nicBackUrl && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      )}
                    </div>

                    {nicBackUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={nicBackUrl}
                          alt="NIC Back Preview"
                          className="w-full h-40 object-cover bg-slate-100"
                        />
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <p className="text-[11px] font-bold text-slate-800 truncate">
                              {nicBackFileName || "nic_back.jpg"}
                            </p>
                            <p className="text-[11px] text-slate-500">{nicBackFileSize || "Image file"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNicBackUrl("");
                              setNicBackFileName("");
                              setNicBackFileSize("");
                            }}
                            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold transition cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-red-50/30 transition text-center min-h-[160px]">
                        <Upload size={22} className="text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700">Upload NIC Back</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleNicBackUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: OTHER DOCS & SUPPORTING DOCUMENTS */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Supporting Documents ({attachedDocs.length})
                    </h2>
                  </div>
                </div>
              </div>

              {/* Current Attached Documents List */}
              {attachedDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{doc.title}</p>
                          <p className="text-[11px] text-slate-600">
                            {doc.type.replace(/_/g, " ")} · {doc.fileSize} · {doc.fileName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition shrink-0 cursor-pointer"
                        title="Remove document" aria-label="Remove document"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  No documents attached.
                </p>
              )}

              {/* Add Supporting Documents Inline Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Attach Supporting Document:</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1" htmlFor="field-app-dashboard-customers-new-page-12">
                      Document Title
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500" id="field-app-dashboard-customers-new-page-12"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1" htmlFor="field-app-dashboard-customers-new-page-13">
                      Category
                    </label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value as CustomerDocument["type"])}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500" id="field-app-dashboard-customers-new-page-13"
                    >
                      <option value="other">Other Supporting Document</option>
                      <option value="utility_bill">Utility Bill / Address Proof</option>
                      <option value="salary_slip">Salary Slip / Income Proof</option>
                      <option value="agreement">Signed Loan Agreement</option>
                      <option value="photo">Photograph / Portrait</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Upload Files (JPG, PNG, PDF)
                    </label>
                    <div className="flex gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                        <Upload size={13} /> {newDocFileName ? newDocFileName.slice(0, 15) : "Browse (Multiple)"}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleDocFileUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleAddDocumentToForm}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Attach
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 Navigation Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: FINAL REVIEW & SUBMIT ── */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* SECTION 8: FINAL BORROWER DOSSIER REVIEW */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 size={18} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  Dossier Summary
                </h2>
              </div>

              <div className="space-y-4 pt-1">
                {/* 1. Customer Profile Overview */}
                <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {form.photoUrl ? (
                      <img
                        src={form.photoUrl}
                        alt={form.fullName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-red-500 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 font-semibold text-xl flex items-center justify-center shrink-0">
                        {(form.fullName || "C").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">Customer ID:</span>
                        <span className="font-mono text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                          {customerId}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                        {form.fullName || "No Name Entered"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span>
                          <strong className="text-slate-700">NIC:</strong> {form.nic || "—"}
                        </span>
                        {form.gender && (
                          <>
                            <span>•</span>
                            <span>
                              <strong className="text-slate-700">Gender:</strong> {form.gender}
                            </span>
                          </>
                        )}
                        {form.dob && (
                          <>
                            <span>•</span>
                            <span>
                              <strong className="text-slate-700">DOB:</strong> {form.dob}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Address Details (Full Width Downwards) */}
                <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Contact &amp; Location
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 block font-medium">Contact Number</span>
                      <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                        {form.phone || "Not provided"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">Email Address</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {form.email || "Not provided"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">Emergency Contact</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {form.emergencyContactName ? (
                          <>
                            {form.emergencyContactName} (
                            {form.emergencyContactRelationship === "Other"
                              ? form.emergencyContactRelationshipCustom.trim() || "Other"
                              : form.emergencyContactRelationship || "Contact"}
                            )
                            {form.emergencyContactPhone && ` • ${form.emergencyContactPhone}`}
                          </>
                        ) : (
                          "Not provided"
                        )}
                      </span>
                    </div>

                    <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-slate-200/70">
                      <span className="text-slate-500 block font-medium">Residential Address</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block break-words">
                        {form.address || "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Identity Verification & Documents Status */}
                <div className="p-4 sm:p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Verification &amp; Records
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 block font-medium">Customer Photograph</span>
                      <span className="mt-1 inline-block">
                        {form.photoUrl ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            ✓ Photo Uploaded
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
                            Not Uploaded
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">NIC Images</span>
                      <span className="mt-1 inline-block">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            nicFrontUrl && nicBackUrl
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : nicFrontUrl || nicBackUrl
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {nicFrontUrl && nicBackUrl
                            ? "✓ Front & Back Uploaded"
                            : nicFrontUrl
                            ? "Front Only"
                            : nicBackUrl
                            ? "Back Only"
                            : "Not Uploaded"}
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">Supporting Documents</span>
                      <span className="font-bold text-slate-800 mt-1 block">
                        {attachedDocs.length} attached
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 Navigation Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-7 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Register Customer</span>
              </button>
            </div>
          </div>
        )}
            </form>
        </>
      )}
    </div>
  );
}

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading customer registration...</div>}>
      <CustomerRegistrationContent />
    </Suspense>
  );
}
