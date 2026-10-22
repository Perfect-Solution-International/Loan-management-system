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
  Phone,
  MapPin,
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
      if (!prev) return generateCustomerId();
      return prev;
    });
  }, [generateCustomerId]);
  
  // 1. Core Profile Details (Clean defaults with NO unwanted auto-fill or dummy data)
  const [form, setForm] = useState({
    // Photograph
    photoUrl: "",
    
    // Identity
    fullName: "",
    nic: "",
    dob: "",
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            PORTFOLIO / REGISTRATION
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Add Customer
          </h1>
          <p className="text-xs text-slate-500">
            Create a customer profile and organize contact details, documents, and loan history.
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

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* SECTION 1: PHOTOGRAPH & SYSTEM ID */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Camera size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Customer Photograph & Account Identity
                </h2>
                <p className="text-xs text-slate-600">
                  Upload borrower facial portrait, auto-generate Customer ID, and set customer status.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
               aria-label="status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Photo Avatar Preview */}
            <div className="relative group shrink-0">
              {form.photoUrl ? (
                <div className="relative">
                  <img
                    src={form.photoUrl}
                    alt="Customer Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-xs cursor-pointer transition"
                    title="Remove Photo"
                   aria-label="Remove Photo">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                  <Camera size={26} className="text-slate-400 mb-1" />
                  <span className="text-xs font-semibold">No Photo</span>
                </div>
              )}
            </div>

            {/* Photo Controls */}
            <div className="space-y-3 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload Customer Photograph (JPG, PNG)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition">
                    <Upload size={14} /> Browse Photo from Device
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {form.photoUrl && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Photo selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Select a clear portrait image of the customer for identity verification.
                </p>
              </div>

              {/* Customer ID Display / Edit */}
              <div className="pt-2 flex items-center gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500" htmlFor="ui-field-1">
                    Auto-generated Customer ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoComplete="off"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono font-semibold text-slate-800 w-36 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                     id="ui-field-1"/>
                    <button
                      type="button"
                      onClick={handleRegenerateId}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
                      title="Regenerate Customer ID"
                     aria-label="Regenerate Customer ID">
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
              <h2 className="text-sm font-semibold text-slate-900">
                Full Name & National Identity (NIC)
              </h2>
              <p className="text-xs text-slate-600">
                Sri Lankan National Identity Card details and birth data.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-2">
                Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                autoComplete="off"
                required
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Kasun Chamara Perera"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-2"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-3">
                NIC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nic"
                autoComplete="off"
                required
                value={form.nic}
                onChange={handleChange}
                placeholder="e.g. 198512345678 or 851234567V"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono font-semibold uppercase"
               id="ui-field-3"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-4">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold bg-white"
               id="ui-field-4">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-5">Date of Birth (DOB)</label>
              <input
                type="date"
                name="dob"
                autoComplete="off"
                value={form.dob}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-5"/>
            </div>
          </div>
        </div>

        {/* SECTION 3: RESIDENTIAL ADDRESS, VILLAGE & TOWN */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <MapPin size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Residential Address, Village & Town
              </h2>
              <p className="text-xs text-slate-600">
                Detailed permanent domicile location and administrative region.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-6">
                Residential Address (House / Street)
              </label>
              <input
                type="text"
                name="address"
                autoComplete="off"
                value={form.address}
                onChange={handleChange}
                placeholder="No. 45/2, Temple Road"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-6"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-7">
                Village / Suburb / Grama Niladhari
              </label>
              <input
                type="text"
                name="village"
                autoComplete="off"
                value={form.village}
                onChange={handleChange}
                placeholder="e.g. Mahabage, Kiribathgoda"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-7"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-8">Town / City</label>
              <input
                type="text"
                name="town"
                autoComplete="off"
                value={form.town}
                onChange={handleChange}
                placeholder="e.g. Kelaniya, Colombo 03"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-8"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-9">District</label>
              <select
                name="district"
                value={form.district}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold bg-white"
               id="ui-field-9">
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
              <h2 className="text-sm font-semibold text-slate-900">
                Contact Numbers & Emergency Contacts
              </h2>
              <p className="text-xs text-slate-600">
                Active telecommunication channels for collections and notifications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-10">
                Primary Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                autoComplete="off"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="0771234567"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-10"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-11">
                Alternative Contact Number
              </label>
              <input
                type="tel"
                name="alternatePhone"
                autoComplete="off"
                value={form.alternatePhone}
                onChange={handleChange}
                placeholder="0112345678"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-11"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-12">Email Address (Optional)</label>
              <input
                type="email"
                name="email"
                autoComplete="off"
                value={form.email}
                onChange={handleChange}
                placeholder="customer@example.lk"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-12"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-13">Emergency Contact Person</label>
              <input
                type="text"
                name="emergencyContactName"
                autoComplete="off"
                value={form.emergencyContactName}
                onChange={handleChange}
                placeholder="e.g. Malini Perera"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-13"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-14">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergencyContactPhone"
                autoComplete="off"
                value={form.emergencyContactPhone}
                onChange={handleChange}
                placeholder="0719998888"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
               id="ui-field-14"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-15">Emergency Relationship</label>
              <select
                name="emergencyContactRelationship"
                value={form.emergencyContactRelationship}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold bg-white"
               id="ui-field-15">
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Relative">Relative</option>
                <option value="Friend">Friend</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 5: NATIONAL IDENTITY CARD (NIC) IMAGES */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                National Identity Card (NIC) Images
              </h2>
              <p className="text-xs text-slate-600">
                Dedicated upload slots for clear scanned images or photos of borrower&apos;s NIC (Front &amp; Back).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* NIC Front */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  NIC Front Image
                </span>
                {nicFrontUrl && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
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
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {nicFrontFileName || "nic_front.jpg"}
                      </p>
                      <p className="text-xs text-slate-500">{nicFrontFileSize || "Image file"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNicFrontUrl("");
                        setNicFrontFileName("");
                        setNicFrontFileSize("");
                      }}
                      className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold transition cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-blue-50/30 transition text-center min-h-[160px]">
                  <Upload size={22} className="text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Upload NIC Front</span>
                  <span className="text-xs text-slate-500 mt-1">
                    Click to browse PNG, JPG or PDF
                  </span>
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
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  NIC Back Image
                </span>
                {nicBackUrl && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
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
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {nicBackFileName || "nic_back.jpg"}
                      </p>
                      <p className="text-xs text-slate-500">{nicBackFileSize || "Image file"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNicBackUrl("");
                        setNicBackFileName("");
                        setNicBackFileSize("");
                      }}
                      className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold transition cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-blue-50/30 transition text-center min-h-[160px]">
                  <Upload size={22} className="text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Upload NIC Back</span>
                  <span className="text-xs text-slate-500 mt-1">
                    Click to browse PNG, JPG or PDF
                  </span>
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
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Other Docs &amp; Supporting Documents ({attachedDocs.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Upload multiple supporting documents (utility bills, salary slips, signed lease/loan agreements, or other proofs).
                </p>
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
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-800 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-600">
                        {doc.type.replace(/_/g, " ")} · {doc.fileSize} · {doc.fileName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition shrink-0 cursor-pointer"
                    title="Remove document"
                   aria-label="Remove document">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-1">
              No additional supporting documents attached yet. Use the upload box below to attach files.
            </p>
          )}

          {/* Add Supporting Documents Inline Form */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Attach Supporting Document:</p>
              <span className="text-xs text-slate-500">Supports selecting multiple files at once</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor="ui-field-16">
                  Document Title
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Utility Bill - Water Board"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                 id="ui-field-16"/>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1" htmlFor="ui-field-17">
                  Category
                </label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as CustomerDocument["type"])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                 id="ui-field-17">
                  <option value="other">Other Supporting Document</option>
                  <option value="utility_bill">Utility Bill / Address Proof</option>
                  <option value="salary_slip">Salary Slip / Income Proof</option>
                  <option value="agreement">Signed Loan Agreement</option>
                  <option value="photo">Photograph / Portrait</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
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
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
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
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Existing Loans & Previous Repayment History
                </h2>
                <p className="text-xs text-slate-600">
                  Record previous loan contracts, outstanding balances, and repayment track records.
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
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
                  <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-18">Existing Loan ID / No.</label>
                  <input
                    type="text"
                    name="existingLoanNo"
                    value={form.existingLoanNo}
                    onChange={handleChange}
                    placeholder="e.g. LN-2026-PRIOR-01"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono font-semibold"
                   id="ui-field-18"/>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-19">Principal Borrowed (LKR)</label>
                  <input
                    type="number"
                    name="existingLoanPrincipal"
                    step="5000"
                    value={form.existingLoanPrincipal}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                   id="ui-field-19"/>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-20">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="existingInterestRate"
                    value={form.existingInterestRate}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                   id="ui-field-20"/>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-21">Duration (Months)</label>
                  <input
                    type="number"
                    name="existingDuration"
                    min="1"
                    value={form.existingDuration}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
                   id="ui-field-21"/>
                </div>
              </div>

              {/* Outstanding Balance & Previous Repayments */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-blue-600" />
                  <h3 className="text-xs font-semibold text-slate-900">
                    Repayment History Ledger & Current Outstanding Balance Due
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-22">
                      Total Amount Previously Paid (LKR)
                    </label>
                    <input
                      type="number"
                      name="previousAmountPaid"
                      step="1000"
                      value={form.previousAmountPaid}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                     id="ui-field-22"/>
                    <p className="text-xs text-slate-600">Sum of prior installments settled.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-23">
                      Installments Settled Count
                    </label>
                    <input
                      type="number"
                      name="previousInstallmentsPaid"
                      value={form.previousInstallmentsPaid}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                     id="ui-field-23"/>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-24">
                      Payment Mode
                    </label>
                    <select
                      name="previousPaymentMethod"
                      value={form.previousPaymentMethod}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                     id="ui-field-24">
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {/* Outstanding Balance Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-25">
                      Previous Repayment History Notes
                    </label>
                    <textarea
                      name="previousRepaymentNotes"
                      rows={2}
                      value={form.previousRepaymentNotes}
                      onChange={handleChange}
                      placeholder="e.g. Paid regular weekly installments on time with no delays."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold resize-none"
                     id="ui-field-25"/>
                  </div>

                  {/* Calculated Balance Callout */}
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        Current Outstanding Balance Due
                      </p>
                      <p className="text-xl font-semibold font-mono text-blue-900 mt-0.5">
                        {MONEY(computedLoanCalculations?.outstanding || 0)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
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



        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href="/customers"
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <UserPlus size={16} /> Add Customer
          </button>
        </div>
      </form>
    </div>
  );
}
