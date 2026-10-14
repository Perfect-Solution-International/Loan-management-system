/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Landmark,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  X,
  FileText,
  User,
  Phone,
  MapPin,
  Lock,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import type { Customer, CustomerDocument } from "@/types";

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

export default function RegisterPage() {
  const router = useRouter();
  const { customers, addCustomer, addDocument } = useData();

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

  React.useEffect(() => {
    setCustomerId((prev) => {
      if (!prev) return generateCustomerId();
      return prev;
    });
  }, [generateCustomerId]);

  // Form state initialized with 100% EMPTY values (no dummy text, no pre-filled data)
  const [form, setForm] = useState({
    fullName: "",
    nic: "",
    dob: "",
    gender: "" as "Male" | "Female" | "Other" | "",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    village: "",
    town: "",
    district: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    photoUrl: "",
    nicFrontUrl: "",
    nicBackUrl: "",
  });

  const [supportingDocs, setSupportingDocs] = useState<AttachedDoc[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCustomer, setSubmittedCustomer] = useState<{
    id: string;
    fullName: string;
    nic: string;
    phone: string;
    district: string;
  } | null>(null);

  // Hidden file inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const nicFrontInputRef = useRef<HTMLInputElement>(null);
  const nicBackInputRef = useRef<HTMLInputElement>(null);
  const supportingDocsInputRef = useRef<HTMLInputElement>(null);

  // Sri Lanka NIC Validator: 9 digits + V/X OR 12 digits
  const isValidNic = (nic: string): boolean => {
    const trimmed = nic.trim();
    return /^(\d{9}[vVxX]|\d{12})$/.test(trimmed);
  };

  // Sri Lanka Phone Validator: 10 digits starting with 0, or 12 digits starting with +94
  const isValidPhone = (phone: string): boolean => {
    const clean = phone.replace(/[\s-]/g, "");
    return /^(?:\+94|0)\d{9}$/.test(clean);
  };

  // Validation function
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "fullName":
        if (!value.trim()) return "Full legal name is required";
        if (value.trim().length < 3) return "Name must be at least 3 characters";
        return "";
      case "nic":
        if (!value.trim()) return "National Identity Card (NIC) is required";
        if (!isValidNic(value)) return "Enter a valid NIC (e.g. 9 digits + V/X or 12 digits)";
        return "";
      case "phone":
        if (!value.trim()) return "Primary mobile number is required";
        if (!isValidPhone(value)) return "Enter a valid 10-digit mobile number (e.g. 07XXXXXXXX)";
        return "";
      case "alternatePhone":
        if (value.trim() && !isValidPhone(value)) return "Enter a valid phone number (or leave blank)";
        return "";
      case "email":
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return "Enter a valid email address";
        }
        return "";
      case "address":
        if (!value.trim()) return "Residential address is required";
        return "";
      case "town":
        if (!value.trim()) return "Town / City is required";
        return "";
      case "district":
        if (!value) return "Please select a residential district";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, (form as any)[field] || "");
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  // Image & Document Handlers
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
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, nicFrontUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, nicBackUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSupportingDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const doc: AttachedDoc = {
          id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          type: "other",
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: file.type || "application/octet-stream",
          fileUrl: event.target?.result as string,
        };
        setSupportingDocs((prev) => [...prev, doc]);
      };
      reader.readAsDataURL(file);
    });

    if (supportingDocsInputRef.current) {
      supportingDocsInputRef.current.value = "";
    }
  };

  const removeSupportingDoc = (id: string) => {
    setSupportingDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: Record<string, string> = {
      fullName: validateField("fullName", form.fullName),
      nic: validateField("nic", form.nic),
      phone: validateField("phone", form.phone),
      alternatePhone: validateField("alternatePhone", form.alternatePhone),
      email: validateField("email", form.email),
      address: validateField("address", form.address),
      town: validateField("town", form.town),
      district: validateField("district", form.district),
    };

    // Filter out empty error strings
    const activeErrors: Record<string, string> = {};
    Object.keys(newErrors).forEach((key) => {
      if (newErrors[key]) activeErrors[key] = newErrors[key];
    });

    setTouched({
      fullName: true,
      nic: true,
      phone: true,
      alternatePhone: true,
      email: true,
      address: true,
      town: true,
      district: true,
    });

    if (Object.keys(activeErrors).length > 0) {
      setErrors(activeErrors);
      // Scroll to the first error
      const firstErrorKey = Object.keys(activeErrors)[0];
      const el = document.getElementById(`reg-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const assignedId = customerId || generateCustomerId();

      const newCustomer: Customer = {
        id: assignedId,
        name: form.fullName.trim(),
        fullName: form.fullName.trim(),
        nic: form.nic.trim().toUpperCase(),
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        village: form.village.trim() || "",
        town: form.town.trim(),
        district: form.district,
        emergencyContact: form.emergencyContactName.trim()
          ? `${form.emergencyContactName.trim()}${form.emergencyContactRelationship ? ` (${form.emergencyContactRelationship})` : ""} - ${form.emergencyContactPhone.trim()}`
          : undefined,
        monthlyIncome: 0,
        status: "Active",
        registeredAt: new Date().toISOString(),
        photoUrl: form.photoUrl || undefined,
        nicFrontUrl: form.nicFrontUrl || undefined,
        nicBackUrl: form.nicBackUrl || undefined,
      };

      // Add to universal DataProvider
      addCustomer(newCustomer);

      // Add attached documents if present
      if (form.nicFrontUrl) {
        addDocument({
          id: `DOC-NICF-${assignedId}-${Date.now()}`,
          customerId: assignedId,
          title: "National Identity Card (Front)",
          type: "nic_front",
          fileName: `${assignedId}_NIC_Front.jpg`,
          fileSize: "0.85 MB",
          fileType: "image/jpeg",
          fileUrl: form.nicFrontUrl,
          uploadedAt: new Date().toISOString(),
          uploader: "Self Registration",
        });
      }

      if (form.nicBackUrl) {
        addDocument({
          id: `DOC-NICB-${assignedId}-${Date.now()}`,
          customerId: assignedId,
          title: "National Identity Card (Back)",
          type: "nic_back",
          fileName: `${assignedId}_NIC_Back.jpg`,
          fileSize: "0.82 MB",
          fileType: "image/jpeg",
          fileUrl: form.nicBackUrl,
          uploadedAt: new Date().toISOString(),
          uploader: "Self Registration",
        });
      }

      supportingDocs.forEach((doc) => {
        addDocument({
          id: doc.id,
          customerId: assignedId,
          title: doc.title,
          type: doc.type,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          fileUrl: doc.fileUrl,
          uploadedAt: new Date().toISOString(),
          uploader: "Self Registration",
        });
      });

      setSubmittedCustomer({
        id: assignedId,
        fullName: newCustomer.fullName || newCustomer.name,
        nic: newCustomer.nic,
        phone: newCustomer.phone,
        district: newCustomer.district,
      });
    } catch (err) {
      console.error("Failed to register customer:", err);
      alert("An error occurred while saving the customer record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setForm({
      fullName: "",
      nic: "",
      dob: "",
      gender: "",
      phone: "",
      alternatePhone: "",
      email: "",
      address: "",
      village: "",
      town: "",
      district: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      photoUrl: "",
      nicFrontUrl: "",
      nicBackUrl: "",
    });
    setSupportingDocs([]);
    setErrors({});
    setTouched({});
    setSubmittedCustomer(null);
    setCustomerId(generateCustomerId());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedCustomer) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
        {/* Top Minimal Navigation */}
        <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-slate-900 font-bold text-lg hover:opacity-90 transition">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Landmark size={20} />
            </span>
            <span className="tracking-tight">
              PSI <b className="text-indigo-600">ONE</b>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium transition"
            >
              Staff Login
            </Link>
          </div>
        </header>

        {/* Success Card Body */}
        <section className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-8 md:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 border border-emerald-100 ring-8 ring-emerald-50/50">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-100/70 text-emerald-800 text-xs font-semibold rounded-full tracking-wide uppercase mb-2">
              Registration Complete
            </span>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Customer Profile Created
            </h1>
            <p className="text-slate-500 text-sm md:text-base mb-6 max-w-md mx-auto">
              The customer record has been verified and registered into the central PSI ONE directory.
            </p>

            {/* Customer Summary Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-left space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Assigned Customer ID</span>
                <span className="font-mono text-base font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                  {submittedCustomer.id}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Legal Name</span>
                <span className="font-semibold text-slate-800">{submittedCustomer.fullName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">NIC Number</span>
                <span className="font-mono font-medium text-slate-800">{submittedCustomer.nic}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Primary Contact</span>
                <span className="font-medium text-slate-800">{submittedCustomer.phone}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Residential District</span>
                <span className="font-medium text-slate-800">{submittedCustomer.district}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href={`/loans/new?customerId=${submittedCustomer.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-600/20"
              >
                Proceed to Loan Application
                <ArrowRight size={18} />
              </Link>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRegisterAnother}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition text-sm"
                >
                  <UserPlus size={16} />
                  Register Another
                </button>
                <Link
                  href="/customers"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition text-sm"
                >
                  View Directory
                </Link>
              </div>

              <Link
                href="/"
                className="inline-block text-xs text-slate-400 hover:text-slate-600 transition pt-2"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-5 text-xs text-slate-400 border-t border-slate-200">
          © 2026 PSI ONE LMS · Licensed under Financial Consumer Protection Framework
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Back to Customers"
            aria-label="Back to Customers"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />
          <Link href="/" className="flex items-center gap-2.5 text-slate-900 font-bold text-base hover:opacity-90 transition">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Landmark size={18} />
            </span>
            <span className="tracking-tight">
              PSI <b className="text-indigo-600">ONE</b>
            </span>
          </Link>
          <span className="hidden md:inline-flex items-center text-xs text-slate-400 font-medium ml-2">
            / Customer Registration
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Central Bank KYC Compliant</span>
          </div>
          <Link
            href="/login"
            className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            Staff Login →
          </Link>
        </div>
      </header>

      {/* Hero Sub-header */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <UserPlus size={12} />
                  New Borrower Onboarding
                </span>
                <span className="font-mono text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  ID: {customerId}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Customer Registration
              </h1>
              <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                Please complete the customer profile below with verified personal details and official identity documents.
              </p>
            </div>

            {/* Quick status badge */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm self-start md:self-auto">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                {customerId.replace("CUS-", "#")}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Record ID</p>
                <p className="font-mono text-sm font-bold text-slate-800">{customerId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Columns: Form Fields */}
            <div className="lg:col-span-8 space-y-8">

              {/* 1. Identity & Portrait Section */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center border border-indigo-100">
                    1
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Personal & Identity Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Official identity as reflected on the National Identity Card or Passport.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Portrait Photograph Upload Area */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                    <div className="relative group self-center sm:self-auto">
                      <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-inner">
                        {form.photoUrl ? (
                          <img
                            src={form.photoUrl}
                            alt="Customer Portrait"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <Camera size={26} className="mx-auto text-slate-400 mb-1" />
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Photo
                            </span>
                          </div>
                        )}
                      </div>
                      {form.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow hover:bg-rose-600 transition"
                          title="Remove photo"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <h4 className="text-sm font-semibold text-slate-800">
                        Borrower Photograph
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 mb-3">
                        Clear face portrait on plain background (JPG, PNG under 5MB).
                      </p>
                      <input
                        type="file"
                        ref={photoInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition shadow-sm"
                      >
                        <Camera size={14} />
                        {form.photoUrl ? "Change Photo" : "Upload Photograph"}
                      </button>
                    </div>
                  </div>

                  {/* Full Legal Name */}
                  <div>
                    <label htmlFor="reg-fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-fullName"
                      name="fullName"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      onBlur={() => handleBlur("fullName")}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                        touched.fullName && errors.fullName
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                      }`}
                    />
                    {touched.fullName && errors.fullName && (
                      <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle size={13} />
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* NIC & Date of Birth & Gender Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* NIC */}
                    <div>
                      <label htmlFor="reg-nic" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        National ID (NIC) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="reg-nic"
                        name="nic"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={form.nic}
                        onChange={(e) => handleChange("nic", e.target.value.toUpperCase())}
                        onBlur={() => handleBlur("nic")}
                        className={`w-full px-3.5 py-2.5 text-sm font-mono uppercase rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                          touched.nic && errors.nic
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                            : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                        }`}
                      />
                      {touched.nic && errors.nic ? (
                        <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle size={13} />
                          {errors.nic}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Format: 9 digits + V/X or 12 digits
                        </p>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label htmlFor="reg-dob" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Date of Birth
                      </label>
                      <input
                        id="reg-dob"
                        name="dob"
                        type="date"
                        autoComplete="off"
                        value={form.dob}
                        onChange={(e) => handleChange("dob", e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label htmlFor="reg-gender" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Gender
                      </label>
                      <select
                        id="reg-gender"
                        name="gender"
                        value={form.gender}
                        onChange={(e) => handleChange("gender", e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Contact & Residential Location */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center border border-indigo-100">
                    2
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Contact & Residential Address
                    </h2>
                    <p className="text-xs text-slate-500">
                      Primary contact channels and permanent residential dwelling.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {/* Phone Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Primary Mobile <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="reg-phone"
                          name="phone"
                          type="tel"
                          autoComplete="off"
                          spellCheck={false}
                          value={form.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          onBlur={() => handleBlur("phone")}
                          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                            touched.phone && errors.phone
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                          }`}
                        />
                      </div>
                      {touched.phone && errors.phone ? (
                        <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle size={13} />
                          {errors.phone}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Sri Lankan mobile: 10 digits starting with 07
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-alternatePhone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Alternate / WhatsApp Phone
                      </label>
                      <input
                        id="reg-alternatePhone"
                        name="alternatePhone"
                        type="tel"
                        autoComplete="off"
                        spellCheck={false}
                        value={form.alternatePhone}
                        onChange={(e) => handleChange("alternatePhone", e.target.value)}
                        onBlur={() => handleBlur("alternatePhone")}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                      {touched.alternatePhone && errors.alternatePhone && (
                        <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle size={13} />
                          {errors.alternatePhone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-slate-400 font-normal normal-case">(Optional)</span>
                    </label>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                        touched.email && errors.email
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                      }`}
                    />
                    {touched.email && errors.email && (
                      <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle size={13} />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Street Address */}
                  <div>
                    <label htmlFor="reg-address" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Street / Residential Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-address"
                      name="address"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      onBlur={() => handleBlur("address")}
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                        touched.address && errors.address
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                      }`}
                    />
                    {touched.address && errors.address && (
                      <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                        <AlertCircle size={13} />
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* Village, Town, District Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="reg-village" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Village / Area
                      </label>
                      <input
                        id="reg-village"
                        name="village"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={form.village}
                        onChange={(e) => handleChange("village", e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-town" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Town / City <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="reg-town"
                        name="town"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={form.town}
                        onChange={(e) => handleChange("town", e.target.value)}
                        onBlur={() => handleBlur("town")}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                          touched.town && errors.town
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                            : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                        }`}
                      />
                      {touched.town && errors.town && (
                        <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle size={13} />
                          {errors.town}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-district" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        District <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="reg-district"
                        name="district"
                        value={form.district}
                        onChange={(e) => handleChange("district", e.target.value)}
                        onBlur={() => handleBlur("district")}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition ${
                          touched.district && errors.district
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                            : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100"
                        }`}
                      >
                        <option value="">Select District</option>
                        {SRI_LANKA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {touched.district && errors.district && (
                        <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                          <AlertCircle size={13} />
                          {errors.district}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Emergency Contact / Next of Kin */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center border border-indigo-100">
                    3
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Emergency Contact / Next of Kin
                    </h2>
                    <p className="text-xs text-slate-500">
                      Close family member or contact person to notify in urgent situations.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="reg-emergencyName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Name
                    </label>
                    <input
                      id="reg-emergencyName"
                      name="emergencyContactName"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.emergencyContactName}
                      onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-emergencyRel" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Relationship
                    </label>
                    <input
                      id="reg-emergencyRel"
                      name="emergencyContactRelationship"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.emergencyContactRelationship}
                      onChange={(e) => handleChange("emergencyContactRelationship", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-emergencyPhone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="reg-emergencyPhone"
                      name="emergencyContactPhone"
                      type="tel"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.emergencyContactPhone}
                      onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>
              </section>

              {/* 4. Document Verification */}
              <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                  <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center border border-indigo-100">
                    4
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Identity & Supporting Document Verification
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload clear photos or scans of National Identity Card and any supporting files.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  {/* NIC Front & Back Dedicated Upload Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* NIC Front */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={14} className="text-indigo-600" />
                          NIC Front Side
                        </span>
                        {form.nicFrontUrl && (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check size={11} /> Attached
                          </span>
                        )}
                      </div>

                      {form.nicFrontUrl ? (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-1">
                          <img
                            src={form.nicFrontUrl}
                            alt="NIC Front Preview"
                            className="w-full h-32 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, nicFrontUrl: "" }))}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-md shadow hover:bg-rose-700 transition"
                            title="Remove file"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => nicFrontInputRef.current?.click()}
                          className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-lg p-5 text-center transition group"
                        >
                          <Upload size={22} className="mx-auto text-slate-400 group-hover:text-indigo-600 mb-1.5 transition" />
                          <p className="text-xs font-semibold text-slate-700">Click to upload NIC Front</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, or PDF</p>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={nicFrontInputRef}
                        onChange={handleNicFrontUpload}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                    </div>

                    {/* NIC Back */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={14} className="text-indigo-600" />
                          NIC Back Side
                        </span>
                        {form.nicBackUrl && (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <Check size={11} /> Attached
                          </span>
                        )}
                      </div>

                      {form.nicBackUrl ? (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-1">
                          <img
                            src={form.nicBackUrl}
                            alt="NIC Back Preview"
                            className="w-full h-32 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, nicBackUrl: "" }))}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-md shadow hover:bg-rose-700 transition"
                            title="Remove file"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => nicBackInputRef.current?.click()}
                          className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-lg p-5 text-center transition group"
                        >
                          <Upload size={22} className="mx-auto text-slate-400 group-hover:text-indigo-600 mb-1.5 transition" />
                          <p className="text-xs font-semibold text-slate-700">Click to upload NIC Back</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, or PDF</p>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={nicBackInputRef}
                        onChange={handleNicBackUpload}
                        accept="image/*,application/pdf"
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Other Supporting Documents */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Other Supporting Documents
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Utility bills, salary slips, proof of business, or bank statements.
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        ref={supportingDocsInputRef}
                        onChange={handleSupportingDocsUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => supportingDocsInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg transition shadow-sm"
                      >
                        <Upload size={13} />
                        Add Files
                      </button>
                    </div>

                    {supportingDocs.length > 0 ? (
                      <div className="divide-y divide-slate-200 mt-3 bg-white rounded-lg border border-slate-200">
                        {supportingDocs.map((doc) => (
                          <div key={doc.id} className="p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <span className="p-1.5 rounded bg-slate-100 text-slate-600">
                                <FileText size={15} />
                              </span>
                              <div className="truncate">
                                <p className="font-medium text-slate-800 truncate">{doc.fileName}</p>
                                <p className="text-[10px] text-slate-400">{doc.fileSize}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSupportingDoc(doc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition"
                              title="Delete file"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-xs text-slate-400 italic">
                        No additional supporting documents attached yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Form Submission Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  href="/customers"
                  className="text-sm text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 order-2 sm:order-1"
                >
                  <ArrowLeft size={16} />
                  Cancel and return
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25 order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Registering Customer...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Complete Customer Registration
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right 4 Columns: Sticky Live Profile Summary Card */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
              {/* Profile Live Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Registration Preview
                  </span>
                  <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {customerId}
                  </span>
                </div>

                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center pt-5 pb-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center mb-3 shadow-inner">
                    {form.photoUrl ? (
                      <img
                        src={form.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-slate-400 uppercase">
                        {form.fullName ? form.fullName.charAt(0) : <User size={28} className="text-slate-300" />}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                    {form.fullName || "Borrower Name"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {form.nic ? `NIC: ${form.nic}` : "NIC: Pending entry"}
                  </p>
                </div>

                {/* Live Details Matrix */}
                <div className="space-y-2.5 text-xs pt-3 border-t border-slate-100">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Record
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Mobile Phone</span>
                    <span className="font-medium text-slate-700">
                      {form.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">District</span>
                    <span className="font-medium text-slate-700">
                      {form.district || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Town</span>
                    <span className="font-medium text-slate-700">
                      {form.town || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">NIC Documents</span>
                    <span className="font-medium text-slate-700">
                      {form.nicFrontUrl && form.nicBackUrl
                        ? "Both uploaded"
                        : form.nicFrontUrl || form.nicBackUrl
                        ? "1 uploaded"
                        : "None"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Supporting Docs</span>
                    <span className="font-medium text-slate-700">
                      {supportingDocs.length} {supportingDocs.length === 1 ? "file" : "files"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security & Verification Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md">
                <div className="flex items-center gap-2.5 mb-3 text-indigo-300">
                  <ShieldCheck size={20} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Data Protection Notice
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All customer registration records and uploaded identity documents are stored in strict compliance with the Sri Lanka Personal Data Protection Act No. 9 of 2022.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>SSL 256-bit Encrypted</span>
                  <span className="text-emerald-400 font-medium">Verified Gateway</span>
                </div>
              </div>

              {/* Staff Assistance Help */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 text-xs text-slate-500">
                <p className="font-semibold text-slate-800 mb-1">Need assistance?</p>
                <p className="leading-relaxed">
                  If the applicant lacks a new 12-digit NIC or has temporary verification documents, please refer to the branch operations manual or contact loan underwriting.
                </p>
              </div>
            </div>

          </div>
        </form>
      </div>
    </main>
  );
}
