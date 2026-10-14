/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  RefreshCw,
  Upload,
  Shield,
  Phone,
  MapPin,
  Briefcase,
  UserCheck,
  FileText,
  CreditCard,
  History,
  X,
  Camera,
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

const PHOTO_PRESETS = [
  {
    label: "Male Professional 1",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Male Professional 2",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Female Professional 1",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Female Professional 2",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  },
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

  // Keep customerId in sync if customers load asynchronously or change
  React.useEffect(() => {
    setCustomerId((prev) => {
      // If prev is not yet set or is a placeholder, initialize it
      if (!prev) return generateCustomerId();
      return prev;
    });
  }, [generateCustomerId]);
  
  // 1. Core Profile Details
  const [form, setForm] = useState({
    // Photograph
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    
    // Identity
    fullName: "",
    nic: "",
    dob: "1990-05-15",
    gender: "Male",
    
    // Residential address & Location
    address: "",
    village: "",
    town: "",
    district: "Colombo",
    
    // Contact
    phone: "",
    alternatePhone: "",
    email: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "Spouse",
    
    // Occupation
    occupation: "",
    monthlyIncome: "65000",
    
    // Customer Status
    status: "Active" as CustomerStatus,

    // Guarantor
    guarantorName: "",
    guarantorNic: "",
    guarantorPhone: "",
    guarantorRelationship: "Relative",

    // Existing Loan Details
    hasExistingLoan: false,
    existingLoanNo: "",
    existingLoanPrincipal: "100000",
    existingInterestRate: "3.0",
    existingDuration: "6",
    existingFrequency: "Monthly" as "Daily" | "Weekly" | "Monthly",
    existingIssueDate: () => new Date().toISOString().slice(0, 10),
    existingPurpose: "Prior business expansion credit",
    
    // Outstanding balance & Previous Repayment History
    previousAmountPaid: "35000",
    previousInstallmentsPaid: "2",
    previousLastPaymentDate: () => new Date().toISOString().slice(0, 10),
    previousPaymentMethod: "Cash" as "Cash" | "Bank Transfer" | "Cheque",
    previousRepaymentNotes: "On-time repayments recorded under previous schedule",
    customOutstandingBalance: "",
  });

  // 2. Uploaded Identity Documents List
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([
    {
      id: "init-nic-front",
      title: "NIC Card Front",
      type: "nic_front",
      fileName: "nic_front_scanned.jpg",
      fileSize: "1.4 MB",
      fileType: "image/jpeg",
      fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    },
    {
      id: "init-nic-back",
      title: "NIC Card Back",
      type: "nic_back",
      fileName: "nic_back_scanned.jpg",
      fileSize: "1.1 MB",
      fileType: "image/jpeg",
      fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    },
  ]);

  // Document add sub-modal / fields
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<CustomerDocument["type"]>("salary_slip");
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

  // Handle local file selection for Identity Document attachment
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDocFileName(file.name);
      setNewDocFileType(file.type || "application/pdf");
      setNewDocFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewDocFileUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
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
      return;
    }
    if (!form.nic.trim()) {
      setErrorMsg("Please enter a valid NIC Number.");
      return;
    }
    if (!form.phone.trim()) {
      setErrorMsg("Please enter a primary contact phone number.");
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
      gender: form.gender,
      address: form.address.trim() || "Main Road",
      village: form.village.trim() || form.town.trim() || "Village Area",
      town: form.town.trim() || "Colombo",
      district: form.district,
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,
      email: form.email.trim() || undefined,
      occupation: form.occupation.trim() || "Self-Employed",
      monthlyIncome: Number(form.monthlyIncome) || 50000,
      emergencyContact: emergencyContactStr,
      guarantor: form.guarantorName.trim() || undefined,
      guarantorName: form.guarantorName.trim() || undefined,
      guarantorNic: form.guarantorNic.trim() || undefined,
      guarantorPhone: form.guarantorPhone.trim() || undefined,
      guarantorRelationship: form.guarantorRelationship || undefined,
      status: form.status,
      registeredAt: new Date().toISOString().slice(0, 10),
      photoUrl: form.photoUrl,
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
        issueDate:
          typeof form.existingIssueDate === "function"
            ? form.existingIssueDate()
            : String(form.existingIssueDate),
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
          date:
            typeof form.previousLastPaymentDate === "function"
              ? form.previousLastPaymentDate()
              : String(form.previousLastPaymentDate),
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            PORTFOLIO / REGISTRATION
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Advanced Customer Registration
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive borrower profile onboarding with photograph, identity verification, existing loans, and repayment history.
          </p>
        </div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
        >
          <ArrowLeft size={14} /> Back to Directory
        </Link>
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: PHOTOGRAPH & SYSTEM ID */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Camera size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Customer Photograph & Account Identity
                </h2>
                <p className="text-[11px] text-slate-600">
                  Upload borrower facial portrait, auto-generate Customer ID, and set customer status.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Photo Avatar Preview */}
            <div className="relative group shrink-0">
              <img
                src={form.photoUrl}
                alt="Customer Preview"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-100"
              />
              <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-600 text-white shadow-xs">
                Photo
              </span>
            </div>

            {/* Photo Controls */}
            <div className="space-y-3 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload Customer Photograph (JPG, PNG)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition">
                    <Upload size={14} /> Browse from Device
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-600">or select quick preset portrait:</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2">
                {PHOTO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photoUrl: preset.url }))}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                      form.photoUrl === preset.url
                        ? "bg-blue-50 border-blue-400 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Customer ID Display / Edit */}
              <div className="pt-2 flex items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">
                    Auto-generated Customer ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 w-36 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateId}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
                      title="Regenerate Customer ID"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL IDENTITY & NIC */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Full Name & National Identity (NIC)
              </h2>
              <p className="text-[11px] text-slate-600">
                Sri Lankan National Identity Card details and birth data.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Kasun Chamara Perera"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                NIC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nic"
                required
                value={form.nic}
                onChange={handleChange}
                placeholder="e.g. 198512345678 or 851234567V"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono font-bold uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Date of Birth (DOB)</label>
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: RESIDENTIAL ADDRESS, VILLAGE & TOWN */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Residential Address, Village & Town
              </h2>
              <p className="text-[11px] text-slate-600">
                Detailed permanent domicile location and administrative region.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Residential Address (House / Street)
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="No. 45/2, Temple Road"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Village / Suburb / Grama Niladhari
              </label>
              <input
                type="text"
                name="village"
                value={form.village}
                onChange={handleChange}
                placeholder="e.g. Mahabage, Kiribathgoda"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Town / City</label>
              <input
                type="text"
                name="town"
                value={form.town}
                onChange={handleChange}
                placeholder="e.g. Kelaniya, Colombo 03"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">District</label>
              <select
                name="district"
                value={form.district}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold bg-white"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: CONTACT INFORMATION */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Phone size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Contact Numbers & Emergency Contacts
              </h2>
              <p className="text-[11px] text-slate-600">
                Active telecommunication channels for collections and notifications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Primary Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="0771234567"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Alternative Contact Number
              </label>
              <input
                type="tel"
                name="alternatePhone"
                value={form.alternatePhone}
                onChange={handleChange}
                placeholder="0112345678"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="customer@example.lk"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Emergency Contact Person</label>
              <input
                type="text"
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={handleChange}
                placeholder="e.g. Malini Perera"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={form.emergencyContactPhone}
                onChange={handleChange}
                placeholder="0719998888"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Emergency Relationship</label>
              <select
                name="emergencyContactRelationship"
                value={form.emergencyContactRelationship}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold bg-white"
              >
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Relative">Relative</option>
                <option value="Friend">Friend</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 5: OCCUPATION & INCOME */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Briefcase size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Occupation, Trade & Monthly Income
              </h2>
              <p className="text-[11px] text-slate-600">
                Borrower livelihood classification and financial earning capacity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Occupation / Trade / Employer
              </label>
              <input
                type="text"
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="e.g. Retail Grocery Store Owner / Government Teacher"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Monthly Income (LKR)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="monthlyIncome"
                  step="1000"
                  value={form.monthlyIncome}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                />
                <span className="absolute right-3.5 top-2 text-xs text-slate-600 font-bold">
                  LKR
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: UPLOADED IDENTITY DOCUMENTS (IN-FORM ATTACHMENT) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Uploaded Identity Documents ({attachedDocs.length})
                </h2>
                <p className="text-[11px] text-slate-600">
                  Attach NIC front/back, salary slips, and utility proof directly to the new customer record.
                </p>
              </div>
            </div>
          </div>

          {/* Current Attached Documents List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-600">
                      {doc.type} · {doc.fileSize} · {doc.fileName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(doc.id)}
                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition shrink-0"
                  title="Remove document"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Another Document Inline Form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-700">Attach Additional Document:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salary Slip - Sep 2026"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as CustomerDocument["type"])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="salary_slip">Salary Slip / Income Proof</option>
                  <option value="utility_bill">Utility Bill / Address Proof</option>
                  <option value="agreement">Signed Loan Agreement</option>
                  <option value="nic_front">NIC Front Copy</option>
                  <option value="nic_back">NIC Back Copy</option>
                  <option value="other">Other Supporting Document</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Upload File (JPG, PNG, PDF)
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                    <Upload size={13} /> {newDocFileName ? newDocFileName.slice(0, 15) : "Browse"}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleDocFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDocumentToForm}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Attach
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: EXISTING LOANS, OUTSTANDING BALANCES & PREVIOUS REPAYMENT HISTORY */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Existing Loans & Previous Repayment History
                </h2>
                <p className="text-[11px] text-slate-600">
                  Record previous loan contracts, outstanding balances, and repayment track records.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                name="hasExistingLoan"
                checked={form.hasExistingLoan}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Has Existing / Prior Loan Record</span>
            </label>
          </div>

          {form.hasExistingLoan ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Existing Loan Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Existing Loan ID / No.</label>
                  <input
                    type="text"
                    name="existingLoanNo"
                    value={form.existingLoanNo}
                    onChange={handleChange}
                    placeholder="e.g. LN-2026-PRIOR-01"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Principal Borrowed (LKR)</label>
                  <input
                    type="number"
                    name="existingLoanPrincipal"
                    step="5000"
                    value={form.existingLoanPrincipal}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="existingInterestRate"
                    value={form.existingInterestRate}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Duration (Months)</label>
                  <input
                    type="number"
                    name="existingDuration"
                    min="1"
                    value={form.existingDuration}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                  />
                </div>
              </div>

              {/* Outstanding Balance & Previous Repayments */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Repayment History Ledger & Current Outstanding Balance Due
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
                      step="1000"
                      value={form.previousAmountPaid}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                    <p className="text-[10px] text-slate-600">Sum of prior installments settled.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Installments Settled Count
                    </label>
                    <input
                      type="number"
                      name="previousInstallmentsPaid"
                      value={form.previousInstallmentsPaid}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
                      rows={2}
                      value={form.previousRepaymentNotes}
                      onChange={handleChange}
                      placeholder="e.g. Paid regular weekly installments on time with no delays."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold resize-none"
                    />
                  </div>

                  {/* Calculated Balance Callout */}
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        Current Outstanding Balance Due
                      </p>
                      <p className="text-xl font-black font-mono text-blue-900 mt-0.5">
                        {MONEY(computedLoanCalculations?.outstanding || 0)}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Total Repayable: {MONEY(computedLoanCalculations?.totalRepayment || 0)} · Paid:{" "}
                      {MONEY(computedLoanCalculations?.paid || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 py-2">
              No prior loan records marked for this customer. Leave unchecked for first-time borrowers.
            </p>
          )}
        </div>

        {/* SECTION 8: GUARANTOR DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Guarantor Information (Optional)
              </h2>
              <p className="text-[11px] text-slate-600">
                Co-signer or guarantor identity for loan collateral security.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Guarantor Full Name</label>
              <input
                type="text"
                name="guarantorName"
                value={form.guarantorName}
                onChange={handleChange}
                placeholder="e.g. Sunil Gamini Silva"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Guarantor NIC</label>
              <input
                type="text"
                name="guarantorNic"
                value={form.guarantorNic}
                onChange={handleChange}
                placeholder="196812345678"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Guarantor Phone</label>
              <input
                type="tel"
                name="guarantorPhone"
                value={form.guarantorPhone}
                onChange={handleChange}
                placeholder="0714445555"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Relationship</label>
              <input
                type="text"
                name="guarantorRelationship"
                value={form.guarantorRelationship}
                onChange={handleChange}
                placeholder="Father / Colleague"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href="/customers"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <UserPlus size={16} /> Register & Save Customer Record
          </button>
        </div>
      </form>
    </div>
  );
}
