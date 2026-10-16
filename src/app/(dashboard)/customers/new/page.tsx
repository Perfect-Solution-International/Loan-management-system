/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, CustomerStatus, CustomerDocument, Loan, Payment } from "@/types";

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
    { number: 1, title: "Photo & Customer ID", subtitle: "Portrait & System Number" },
    { number: 2, title: "Customer Details", subtitle: "Name, NIC, Address & Contacts" },
    { number: 3, title: "Document Uploads", subtitle: "NIC Front/Back & Proofs" },
    { number: 4, title: "Prior Loan & Review", subtitle: "Existing Facility & Submit" },
  ];

  const goToStep = (stepNum: number) => {
    if (stepNum > 1) {
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
    } else if (currentStep === 3) {
      setErrorMsg("");
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // 1. Core Profile Details (Clean defaults with NO unwanted auto-fill or dummy data)
  const [form, setForm] = useState({
    // Photograph
    photoUrl: "",
    
    // Identity
    fullName: "",
    nic: "",
    dob: "",
    gender: "" as "Male" | "Female" | "Other" | "",
    
    // Residential address & Location
    address: "",
    village: "",
    town: "",
    district: "",
    
    // Contact
    phone: "",
    alternatePhone: "",
    email: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    
    // Customer Status
    status: "Active" as CustomerStatus,

    // Existing Loan Details
    hasExistingLoan: false,
    existingLoanNo: "",
    existingLoanPrincipal: "",
    existingInterestRate: "",
    existingDuration: "",
    existingFrequency: "Monthly" as "Daily" | "Weekly" | "Monthly",
    existingIssueDate: "",
    existingPurpose: "",
    
    // Outstanding balance & Previous Repayment History
    previousAmountPaid: "",
    previousInstallmentsPaid: "",
    previousLastPaymentDate: "",
    previousPaymentMethod: "Cash" as "Cash" | "Bank Transfer" | "Cheque",
    previousRepaymentNotes: "",
    customOutstandingBalance: "",
  });

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
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

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

    const emergencyContactStr = form.emergencyContactName
      ? `${form.emergencyContactName} (${form.emergencyContactRelationship}) - ${form.emergencyContactPhone || form.phone}`
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
      village: form.village.trim() || form.town.trim() || "Village Area",
      town: form.town.trim() || "Colombo",
      district: form.district || "Colombo",
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

    addCustomer(newCustomer);

    // 2. Attach Dedicated NIC Front & Back Documents if uploaded
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

    // 2. Attach All Uploaded Identity Documents
    attachedDocs.forEach((doc, idx) => {
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
      addDocument(customerDoc);
    });

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

      addLoan(existingLoan);

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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link
            href="/customers"
            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 shadow-xs transition active:scale-95 cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Registration
          </h1>
        </div>
        <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>Step {currentStep} of 4</span>
        </div>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-fade-in shadow-xs">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
          <span>
            Customer registered successfully with documents, loans & repayment history! Redirecting to profile...
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2 shadow-2xs animate-fade-in">
          <AlertTriangle size={16} className="shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── MULTI-STEP PROGRESS STEPPER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-sm sm:max-w-md mx-auto">
          {[1, 2, 3, 4].map((stepNum, idx) => {
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <React.Fragment key={stepNum}>
                {idx > 0 && (
                  <div className="flex-1 h-1 mx-2 sm:mx-3 rounded-full overflow-hidden bg-slate-100">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCompleted ? "bg-red-600" : "bg-transparent"
                      }`}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => goToStep(stepNum)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-500/25 ring-4 ring-red-100 scale-105"
                      : isCompleted
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  }`}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNum}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* ── STEP 1: IDENTITY & PHOTOGRAPH ── */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <UserCheck size={20} />
                </div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Customer Identity &amp; Photograph
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Photograph Studio Column */}
                <div className="lg:col-span-4 flex flex-col items-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 shadow-2xs text-center space-y-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Camera size={14} className="text-red-600" />
                    Portrait Photo
                  </span>

                  {/* Avatar Display */}
                  <div className="relative group">
                    {form.photoUrl ? (
                      <div className="relative">
                        <img
                          src={form.photoUrl}
                          alt="Customer Portrait"
                          className="w-32 h-32 rounded-3xl object-cover border-2 border-red-500 shadow-md ring-4 ring-red-50 transition-transform group-hover:scale-[1.02]"
                        />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer transition active:scale-90"
                          title="Remove photo"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 group-hover:border-red-400 group-hover:bg-red-50/20 transition-all shadow-inner">
                        <Camera size={34} className="text-slate-400 group-hover:text-red-500 transition-colors mb-1" />
                        <span className="text-[11px] font-bold text-slate-500">Add Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Trigger Button */}
                  <label className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition cursor-pointer">
                    <Upload size={14} />
                    <span>{form.photoUrl ? "Change Photo" : "Upload Photo"}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {form.photoUrl ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Ready
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      JPG, PNG or WEBP
                    </span>
                  )}
                </div>

                {/* Core Details Column */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Full Legal Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      autoComplete="off"
                      required
                      placeholder="e.g. Sunil Perera"
                      value={form.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs font-bold transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">
                        National Identity Card (NIC) <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="nic"
                        autoComplete="off"
                        required
                        placeholder="e.g. 198512345678 or 851234567V"
                        value={form.nic}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs font-mono font-bold uppercase transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">
                        Contact Number <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        autoComplete="off"
                        required
                        placeholder="e.g. 077 123 4567"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs font-bold transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-800">Gender</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Male", "Female", "Other"] as const).map((g) => {
                        const isSelected = form.gender === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, gender: g }))}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-200"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Navigation Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
          </div>
        )}

        {/* ── STEP 2: RESIDENTIAL & EMERGENCY CONTACT ── */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. RESIDENTIAL & CONTACT DETAILS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs shrink-0">
                  <UserCheck size={18} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  Residential &amp; Additional Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Date of Birth (DOB)</label>
                  <input
                    type="date"
                    name="dob"
                    autoComplete="off"
                    value={form.dob}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="off"
                    placeholder="e.g. sunil@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    autoComplete="off"
                    placeholder="e.g. No. 45, Temple Road"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Village / Town</label>
                  <input
                    type="text"
                    name="town"
                    autoComplete="off"
                    placeholder="e.g. Nugegoda"
                    value={form.town}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">District</label>
                  <select
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  >
                    <option value="">Select District</option>
                    {[
                      "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
                      "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
                      "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
                      "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
                      "Monaragala", "Ratnapura", "Kegalle"
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. EMERGENCY CONTACT */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs shrink-0">
                  <Phone size={18} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">
                  Emergency Contact
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Contact Person Name</label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    autoComplete="off"
                    placeholder="e.g. Kamala Perera"
                    value={form.emergencyContactName}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Contact Phone Number</label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    autoComplete="off"
                    placeholder="e.g. 071 987 6543"
                    value={form.emergencyContactPhone}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Relationship</label>
                  <select
                    name="emergencyContactRelationship"
                    value={form.emergencyContactRelationship}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
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
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: NIC & DOCUMENTS ── */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* SECTION 5: NATIONAL IDENTITY CARD (NIC) IMAGES */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    National Identity Card (NIC) Images
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* NIC Front */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      NIC Front Image
                    </span>
                    {nicFrontUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
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
                          <p className="text-[10px] text-slate-500">{nicFrontFileSize || "Image file"}</p>
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

                {/* NIC Back */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      NIC Back Image
                    </span>
                    {nicBackUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
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
                          <p className="text-[10px] text-slate-500">{nicBackFileSize || "Image file"}</p>
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
                          <p className="text-[10px] text-slate-600">
                            {doc.type.replace(/_/g, " ")} · {doc.fileSize} · {doc.fileName}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition shrink-0 cursor-pointer"
                        title="Remove document"
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
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Category
                    </label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value as CustomerDocument["type"])}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
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

        {/* ── STEP 4: PRIOR LOAN & FINAL REVIEW ── */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* SECTION 7: EXISTING LOANS, OUTSTANDING BALANCES & PREVIOUS REPAYMENT HISTORY */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <CreditCard size={18} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Existing Loans &amp; Previous Repayment History
                  </h2>
                </div>

                {/* Toggle Switch */}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="hasExistingLoan"
                    checked={form.hasExistingLoan}
                    onChange={handleChange}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span>Has Existing / Prior Loan Record</span>
                </label>
              </div>

              {form.hasExistingLoan && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Existing Loan Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Existing Loan ID / No.</label>
                      <input
                        type="text"
                        name="existingLoanNo"
                        autoComplete="off"
                        value={form.existingLoanNo}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Principal Borrowed (LKR)</label>
                      <input
                        type="number"
                        name="existingLoanPrincipal"
                        autoComplete="off"
                        step="5000"
                        value={form.existingLoanPrincipal}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="existingInterestRate"
                        autoComplete="off"
                        value={form.existingInterestRate}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Duration (Months)</label>
                      <input
                        type="number"
                        name="existingDuration"
                        autoComplete="off"
                        min="1"
                        value={form.existingDuration}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Outstanding Balance & Previous Repayments */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-red-600" />
                      <h3 className="text-xs font-bold text-slate-900">
                        Repayment History Ledger &amp; Current Outstanding Balance Due
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Total Amount Previously Paid (LKR)
                        </label>
                        <input
                          type="number"
                          name="previousAmountPaid"
                          autoComplete="off"
                          step="1000"
                          value={form.previousAmountPaid}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Installments Settled Count
                        </label>
                        <input
                          type="number"
                          name="previousInstallmentsPaid"
                          autoComplete="off"
                          value={form.previousInstallmentsPaid}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Payment Mode
                        </label>
                        <select
                          name="previousPaymentMethod"
                          value={form.previousPaymentMethod}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                    </div>

                    {/* Outstanding Balance Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          Previous Repayment History Notes
                        </label>
                        <textarea
                          name="previousRepaymentNotes"
                          autoComplete="off"
                          rows={2}
                          value={form.previousRepaymentNotes}
                          onChange={handleChange}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold resize-none"
                        />
                      </div>

                      {/* Calculated Balance Callout */}
                      <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                            Current Outstanding Balance Due
                          </p>
                          <p className="text-xl font-black font-mono text-red-900 mt-0.5">
                            {MONEY(computedLoanCalculations?.outstanding || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Profile card preview */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex items-center gap-4">
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-red-500 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 font-black text-lg flex items-center justify-center shrink-0">
                      {(form.fullName || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-slate-500">Customer ID:</span>
                      <span className="font-mono text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg">
                        {customerId}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {form.fullName || "No Name Entered"}
                    </h4>
                    <p className="text-[11px] font-mono font-bold text-slate-700">
                      NIC: {form.nic || "Pending"}
                    </p>
                  </div>
                </div>

                {/* Location & Contact info */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1 text-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Contact &amp; Location
                  </p>
                  <p className="font-bold text-slate-900">Phone: {form.phone || "Not provided"}</p>
                  <p className="text-slate-600 truncate">
                    Address: {[form.address, form.village, form.town, form.district].filter(Boolean).join(", ") || "Main Road, Colombo"}
                  </p>
                  {form.emergencyContactName && (
                    <p className="text-[11px] text-slate-500 truncate">
                      Emergency: {form.emergencyContactName} ({form.emergencyContactRelationship || "Contact"})
                    </p>
                  )}
                </div>

                {/* Document and Loan status */}
                <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Verification &amp; Records
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600">NIC Images:</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        nicFrontUrl && nicBackUrl
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : nicFrontUrl || nicBackUrl
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {nicFrontUrl && nicBackUrl ? "Front & Back Uploaded" : nicFrontUrl ? "Front Only" : nicBackUrl ? "Back Only" : "Not Uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600">Other Documents:</span>
                    <span className="font-bold text-slate-800">
                      {attachedDocs.length} attached
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600">Prior Loan:</span>
                    <span className="font-bold text-slate-800">
                      {form.hasExistingLoan
                        ? `Yes (${form.existingLoanNo || "Prior"} · ${MONEY(computedLoanCalculations?.outstanding || 0)})`
                        : "None (New Borrower)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 Navigation Bar */}
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
    </div>
  );
}
