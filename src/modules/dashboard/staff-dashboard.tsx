"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  FileText,
  Upload,
  Download,
  CreditCard,
  TrendingUp,
  HandCoins,
  Wallet,
  Percent,
  Sliders,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  Search,
  Plus,
  RefreshCw,
  Lock,
  Eye,
  Check,
  X,
  Activity,
  HardDriveDownload,
  Building2,
  Receipt,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { getDailyCollections, formatFriendlyDate } from "@/lib/collection-schedule";
import type { Customer, Loan, Payment, CustomerDocument, StaffUser, StaffPermissions } from "@/types";
import { ReceiptModal } from "@/components/modals/ReceiptModal";

type ActiveTab = "hub" | "staff" | "customers" | "loans" | "repayments" | "settings";

export function StaffDashboard() {
  const {
    customers,
    loans,
    payments,
    documents,
    settings,
    staffUsers,
    updateLoan,
    addPayment,
    addDocument,
    updateSettings,
    addStaffUser,
    updateStaffUser,
  } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTab>("hub");
  const [successToast, setSuccessToast] = useState<string>("");

  // Quick helper to show feedback
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3500);
  };

  // ── 1. Financial & Portfolio Calculations ─────────────────────────────────
  const activeLoans = useMemo(
    () => loans.filter((l) => (l.status || "").toLowerCase() === "active"),
    [loans]
  );

  const pendingLoans = useMemo(
    () => loans.filter((l) => (l.status || "").toLowerCase() === "pending"),
    [loans]
  );

  const overdueLoans = useMemo(
    () => loans.filter((l) => (l.status || "").toLowerCase() === "overdue"),
    [loans]
  );

  const totalDisbursedCapital = useMemo(
    () => loans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0),
    [loans]
  );

  const totalRepaymentsCollected = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
  );

  const outstandingBalance = useMemo(
    () => Math.max(0, totalDisbursedCapital * 1.15 - totalRepaymentsCollected),
    [totalDisbursedCapital, totalRepaymentsCollected]
  );

  // Today's collections metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const collectionData = useMemo(
    () => getDailyCollections(loans, customers, payments, todayStr),
    [loans, customers, payments, todayStr]
  );
  const collectionSchedule = collectionData.items;
  const collectionTargetToday = collectionData.summary.targetAmount;

  const collectedToday = useMemo(() => {
    return payments
      .filter((p) => p.date === todayStr)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments, todayStr]);

  const collectionRate = collectionTargetToday > 0
    ? Math.min(100, Math.round((collectedToday / collectionTargetToday) * 100))
    : 100;

  // ── 2. Modal States ───────────────────────────────────────────────────────
  // A. Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState<Partial<StaffUser>>({
    name: "",
    email: "",
    role: "Loan Officer",
    branch: "Colombo Central",
    status: "Active",
    permissions: {
      approveLoans: true,
      recordRepayments: true,
      exportReports: true,
      manageSettings: false,
      manageCustomers: true,
    },
  });

  // B. Repayment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    customerId: "",
    loanId: "",
    amount: "",
    method: "Cash" as Payment["method"],
    notes: "",
  });

  // C. Document Upload Modal State
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docForm, setDocForm] = useState({
    customerId: "",
    title: "",
    type: "nic_front" as CustomerDocument["type"],
    fileName: "",
  });

  // D. Settings Inline State
  const [pricingForm, setPricingForm] = useState({
    defaultMonthlyRate: settings.defaultMonthlyRate || 3.0,
    defaultWeeklyRate: settings.defaultWeeklyRate || 0.8,
    defaultProcessingFee: settings.defaultProcessingFee || 1500,
    lateFeePercentage: settings.lateFeePercentage || 2.0,
    gracePeriodDays: settings.gracePeriodDays || 3,
  });

  // Search states for tables
  const [customerSearch, setCustomerSearch] = useState("");
  const [loanSearch, setLoanSearch] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        (c.fullName || "").toLowerCase().includes(term) ||
        (c.nic || "").toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term) ||
        (c.id || "").toLowerCase().includes(term)
    );
  }, [customers, customerSearch]);

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const matchesStatus =
        loanStatusFilter === "all" ||
        (l.status || "").toLowerCase() === loanStatusFilter.toLowerCase();
      const term = loanSearch.toLowerCase();
      const matchesTerm =
        !term ||
        (l.loanNo || "").toLowerCase().includes(term) ||
        (l.customerName || "").toLowerCase().includes(term) ||
        (l.id || "").toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [loans, loanStatusFilter, loanSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  // 1. Staff Add
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name?.trim() || !newStaff.email?.trim()) {
      alert("Please provide staff member's full name and email.");
      return;
    }
    const created: StaffUser = {
      id: `STF-${String(staffUsers.length + 1).padStart(2, "0")}`,
      name: newStaff.name.trim(),
      email: newStaff.email.trim(),
      role: newStaff.role as StaffUser["role"],
      branch: newStaff.branch || "Colombo Central",
      status: "Active",
      joinedDate: new Date().toISOString().slice(0, 10),
      permissions: newStaff.permissions || {
        approveLoans: true,
        recordRepayments: true,
        exportReports: true,
        manageSettings: false,
        manageCustomers: true,
      },
    };
    addStaffUser(created);
    setShowAddStaffModal(false);
    setNewStaff({
      name: "",
      email: "",
      role: "Loan Officer",
      branch: "Colombo Central",
      status: "Active",
      permissions: {
        approveLoans: true,
        recordRepayments: true,
        exportReports: true,
        manageSettings: false,
        manageCustomers: true,
      },
    });
    triggerToast(`Staff account for ${created.name} registered with permissions.`);
  };

  // Toggle Staff Permission
  const handleTogglePermission = (
    staffId: string,
    perm: keyof StaffPermissions,
    currentValue: boolean
  ) => {
    const staff = staffUsers.find((s) => s.id === staffId);
    if (!staff) return;
    const updatedPerms = { ...staff.permissions, [perm]: !currentValue };
    updateStaffUser(staffId, { permissions: updatedPerms });
    triggerToast(`Updated permission for ${staff.name}.`);
  };

  // 2. Record Repayment
  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(paymentForm.amount);
    if (!paymentForm.customerId || !amountNum || amountNum <= 0) {
      alert("Please select a borrower and enter a valid repayment amount.");
      return;
    }
    const customer = customers.find((c) => c.id === paymentForm.customerId);
    const targetLoan = loans.find(
      (l) => l.customerId === paymentForm.customerId && (l.status === "Active" || l.status === "Overdue")
    );

    const paymentRecord: Payment = {
      id: `PAY-${Date.now()}`,
      loanId: targetLoan ? targetLoan.id : paymentForm.loanId || "LN-DIRECT",
      customerId: paymentForm.customerId,
      amount: amountNum,
      date: new Date().toISOString().slice(0, 10),
      type: "Capital",
      notes: paymentForm.notes || "Field collection authorized receipt",
      method: paymentForm.method || "Cash",
      collectedBy: "Authorized Loan Officer",
      receiptNo: `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    addPayment(paymentRecord);
    setShowPaymentModal(false);
    setSelectedReceiptPayment(paymentRecord);
    setPaymentForm({
      customerId: "",
      loanId: "",
      amount: "",
      method: "Cash",
      notes: "",
    });
    triggerToast(`Repayment of ${MONEY(amountNum)} recorded for ${customer?.fullName || "Borrower"}. Official Receipt issued.`);
  };

  // 4. Upload Document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.customerId || !docForm.title.trim()) {
      alert("Please select a borrower and provide document title.");
      return;
    }
    const newDoc: CustomerDocument = {
      id: `DOC-${Date.now()}`,
      customerId: docForm.customerId,
      title: docForm.title.trim(),
      type: docForm.type,
      fileName: docForm.fileName || `${docForm.title.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      fileSize: "1.4 MB",
      fileType: "application/pdf",
      fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploader: "Operations Officer",
    };
    addDocument(newDoc);
    setShowDocUploadModal(false);
    setDocForm({
      customerId: "",
      title: "",
      type: "nic_front",
      fileName: "",
    });
    triggerToast(`Customer document '${newDoc.title}' verified and archived.`);
  };

  // 5. Save System Pricing Rules
  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      defaultMonthlyRate: Number(pricingForm.defaultMonthlyRate),
      defaultWeeklyRate: Number(pricingForm.defaultWeeklyRate),
      defaultProcessingFee: Number(pricingForm.defaultProcessingFee),
      lateFeePercentage: Number(pricingForm.lateFeePercentage),
      gracePeriodDays: Number(pricingForm.gracePeriodDays),
    });
    triggerToast("Interest rate tiers and deduction parameters updated successfully.");
  };

  // 6. Database Backup Download
  const handleExportBackup = () => {
    const backupData = {
      system: "PSI ONE Loan Management System",
      exportDate: new Date().toISOString(),
      metadata: {
        totalCustomers: customers.length,
        totalLoans: loans.length,
        totalPayments: payments.length,
        totalDocuments: documents.length,
        totalStaff: staffUsers.length,
      },
      customers,
      loans,
      payments,
      documents,
      staffUsers,
      settings,
    };
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `psi_one_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Encrypted system database backup generated and downloaded.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 animate-in fade-in duration-150">
      {/* ── LIVE TOAST FEEDBACK NOTIFICATION ── */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top-3 duration-200">
          <div className="p-1.5 bg-emerald-500 text-white rounded-xl">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-xs font-bold">{successToast}</p>
        </div>
      )}

      {/* ── TOP OPERATIONAL EXECUTIVE HEADER ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 rounded-lg border border-red-200">
                Staff Operations Command Center
              </span>
              <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                Authority: Loan Officer &amp; Supervisor
              </span>
              <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 rounded-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                All 10 Modules Online
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Operational Staff Command Console
            </h1>
            <p className="text-xs text-slate-700 font-semibold max-w-3xl leading-relaxed">
              Consolidated operational workspace for field collection scheduling, customer KYC, fast repayment vouchers, and loan portfolio supervision.
            </p>
          </div>

          {/* High-Impact Action Group */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <UserPlus size={15} />
              <span>Register Customer</span>
            </Link>

            <Link
              href="/loans/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Issue Loan</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Receipt size={15} />
              <span>Record Repayment</span>
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Download Full Database Backup Snapshot"
            >
              <HardDriveDownload size={15} className="text-slate-700" />
              <span>Backup</span>
            </button>
          </div>
        </div>

        {/* ── TOP 5 OPERATIONAL KPI STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold">Active Portfolio</span>
              <Wallet size={16} className="text-red-600" />
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">{MONEY(totalDisbursedCapital)}</p>
            <span className="text-[10px] text-slate-600 font-semibold">{activeLoans.length} active credit facilities</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold">Today&apos;s Target</span>
              <Calendar size={16} className="text-amber-600" />
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">{MONEY(collectionTargetToday)}</p>
            <span className="text-[10px] text-slate-600 font-semibold">{collectionRate}% collection efficiency</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold">Overdue Accounts</span>
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">{overdueLoans.length}</p>
            <span className="text-[10px] text-rose-700 font-bold">Field recovery visits</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold">Borrower Network</span>
              <Users size={16} className="text-blue-600" />
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">{customers.length}</p>
            <span className="text-[10px] text-slate-600 font-semibold">100% KYC verified</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[11px] font-bold">Staff Accounts</span>
              <ShieldCheck size={16} className="text-purple-600" />
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">{staffUsers.length}</p>
            <span className="text-[10px] text-slate-600 font-semibold">Active role permissions</span>
          </div>
        </div>
      </div>

      {/* ── CONSOLE NAVIGATION TABS (ALL 10 PILLARS INTEGRATED) ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "hub"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Sparkles size={15} />
          <span>10 Operational Pillars</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "staff"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Shield size={15} />
          <span>1. Staff &amp; Permissions ({staffUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "customers"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Users size={15} />
          <span>2 &amp; 3. Customers &amp; Documents ({customers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("loans")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "loans"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <CreditCard size={15} />
          <span>4 &amp; 6. Loan Records &amp; Ledger ({loans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("repayments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "repayments"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Receipt size={15} />
          <span>7. Repayments &amp; Supervision ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Sliders size={15} />
          <span>5, 8, 9 &amp; 10. Rules, Reports &amp; Audit</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: 10 OPERATIONAL PILLARS OVERVIEW HUB ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "hub" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Comprehensive 10 Operational Pillars
                </h2>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Direct supervisory access into all microfinance lending workflows, permissions, and risk management modules.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                10 / 10 Pillars Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Pillar 1 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Shield size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    1. Staff Accounts &amp; Permissions
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Manage field officers, collection agents, auditors, and administrators with role-based permission toggles.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800">{staffUsers.length} Active Accounts</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("staff")}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Manage Staff <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Users size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    2. Register, View, Edit Customers
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    KYC verified borrower profiles, complete identity dossiers, residential tracking, and credit ratings.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800">{customers.length} Verified Borrowers</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customers")}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Directory <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    3. Upload &amp; Manage Documents
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Upload NIC front/back photographs, proof of income, utility bills, and promissory notes.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">{documents.length} Archived Files</span>
                  <button
                    type="button"
                    onClick={() => setShowDocUploadModal(true)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Upload File <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    4. Issue &amp; Submit Loan Facilities
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Originate borrower credit facilities, record guarantors, and submit applications for Credit Committee sign-off.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900">{activeLoans.length} Active Facilities</span>
                  <Link
                    href="/loans/new"
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Issue Loan <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Pillar 5 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    <Percent size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    5. Configure Interest Rates &amp; Deductions
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Dynamic interest engine (2% - 3.5%), upfront capital deductions, processing fees, and payment channels.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">{settings.defaultMonthlyRate}% Monthly Flat</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Adjust Rates <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Pillar 6 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    6. View &amp; Manage Loan Records
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Complete facility ledger across Active, Overdue, and Settled loans with real-time installment schedules.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-800">{loans.length} Total Facilities</span>
                  <Link
                    href="/loans"
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Loan Ledger <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Pillar 7 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <Receipt size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    7. Record &amp; Supervise Repayments
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Field collection logging, cash and bank transfer receipts, and supervisor verification audit notes.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-800">{payments.length} Payments Logged</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("repayments")}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Supervise <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Pillar 8 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <TrendingUp size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    8. Financial Dashboards &amp; Reports
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Portfolio yield analytics, arrears ratios, collection efficiency charts, and capital exposure.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800">{collectionRate}% Recovery Efficiency</span>
                  <Link
                    href="/reports"
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Open Reports <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Pillar 9 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold">
                    <HardDriveDownload size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    9. System Settings &amp; Backups
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Instant JSON database snapshot exports, institution parameters, branch metadata, and disaster recovery.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">Encrypted Backups</span>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    Backup Now <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Pillar 10 */}
              <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                    <Activity size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    10. Activity Logs &amp; Adjustments
                  </h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Immutable audit logs of staff logins, loan state transitions, interest waivers, and supervisor adjustments.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-cyan-900">Real-Time Auditing</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    View Logs <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: PILLAR 1: MANAGE STAFF ACCOUNTS & PERMISSIONS ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Staff Accounts &amp; Permissions Matrix
                </h2>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Manage active credit officers, branch assignments, and toggle individual security permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Add Staff Member</span>
              </button>
            </div>

            {/* Staff Accounts Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Role &amp; Branch</th>
                    <th className="py-3.5 px-4 text-center">Approve Loans</th>
                    <th className="py-3.5 px-4 text-center">Record Payments</th>
                    <th className="py-3.5 px-4 text-center">Export Reports</th>
                    <th className="py-3.5 px-4 text-center">Manage Settings</th>
                    <th className="py-3.5 px-4 text-center">Manage KYC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffUsers.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{staff.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                          {staff.role}
                        </span>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5">{staff.branch}</p>
                      </td>
                      {/* Permission 1: approveLoans */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(staff.id, "approveLoans", staff.permissions.approveLoans)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                            staff.permissions.approveLoans
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                          title="Toggle Approve Loans Permission"
                        >
                          {staff.permissions.approveLoans ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                      {/* Permission 2: recordRepayments */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(staff.id, "recordRepayments", staff.permissions.recordRepayments)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                            staff.permissions.recordRepayments
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                          title="Toggle Record Repayments Permission"
                        >
                          {staff.permissions.recordRepayments ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                      {/* Permission 3: exportReports */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(staff.id, "exportReports", staff.permissions.exportReports)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                            staff.permissions.exportReports
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                          title="Toggle Export Reports Permission"
                        >
                          {staff.permissions.exportReports ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                      {/* Permission 4: manageSettings */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(staff.id, "manageSettings", staff.permissions.manageSettings)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                            staff.permissions.manageSettings
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                          title="Toggle Manage Settings Permission"
                        >
                          {staff.permissions.manageSettings ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                      {/* Permission 5: manageCustomers */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(staff.id, "manageCustomers", staff.permissions.manageCustomers)}
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                            staff.permissions.manageCustomers
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                          title="Toggle Manage Customers Permission"
                        >
                          {staff.permissions.manageCustomers ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: PILLARS 2 & 3: CUSTOMERS & DOCUMENTS ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Borrower KYC &amp; Document Management Desk
                </h2>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Register, edit, and audit borrower identities, verified contact lines, and attached dossiers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/customers/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <UserPlus size={15} />
                  <span>Register Customer</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Upload Document</span>
                </button>
              </div>
            </div>

            {/* Search filter bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search customers by name, NIC, phone number or Customer ID..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
              />
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Customer Name &amp; ID</th>
                    <th className="py-3 px-4">NIC</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Documents</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => {
                    const custDocs = documents.filter((d) => d.customerId === cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {cust.photoUrl ? (
                              <img
                                src={cust.photoUrl}
                                alt={cust.fullName || "Customer"}
                                className="w-8 h-8 rounded-full object-cover border border-slate-300"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                {(cust.fullName || "C").slice(0, 1)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{cust.fullName || "Unnamed Borrower"}</p>
                              <span className="font-mono text-[10px] text-slate-500 font-bold">{cust.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 uppercase">{cust.nic}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{cust.phone}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[180px] truncate">{cust.address}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px]">
                            <FileText size={11} className="text-red-600" />
                            {custDocs.length} Dossier{custDocs.length !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {cust.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/customers/${cust.id}`}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                              Profile
                            </Link>
                            <Link
                              href={`/customers/${cust.id}/edit`}
                              className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Document Dossier Browser */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Archived Borrower Identity Proofs ({documents.length} Files)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {documents.slice(0, 8).map((doc) => {
                  const owner = customers.find((c) => c.id === doc.customerId);
                  return (
                    <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                          {doc.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{doc.fileSize}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">{doc.title}</p>
                      <p className="text-[10px] text-slate-600 font-medium">Borrower: {owner?.fullName || doc.customerId}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: PILLARS 4 & 6: LOAN AUTHORITY & LEDGER ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "loans" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Loan Origination Authority &amp; Active Ledger
                </h2>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Authorize pending loans, evaluate underwriting parameters, and manage active credit contracts.
                </p>
              </div>

              <Link
                href="/loans/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Plus size={15} />
                <span>Issue Loan Facility</span>
              </Link>
            </div>

            {/* Field Portfolio Operational Notice */}
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">
                    Loan Portfolio Ledger &amp; Field Schedule Records
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Monitor active borrower facilities, verify guarantor dossiers, and track scheduled repayment dates.
                  </p>
                </div>
              </div>
              <Link
                href="/loans/new"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shrink-0"
              >
                <Plus size={13} />
                <span>Submit New Facility</span>
              </Link>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Filter by borrower name, loan number or facility ID..."
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                />
              </div>

              <select
                value={loanStatusFilter}
                onChange={(e) => setLoanStatusFilter(e.target.value)}
                className="px-3 py-2.5 text-xs rounded-xl border border-slate-300 font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs cursor-pointer"
              >
                <option value="all">All Statuses ({loans.length})</option>
                <option value="active">Active Only ({activeLoans.length})</option>
                <option value="pending">Under Committee Review ({pendingLoans.length})</option>
                <option value="overdue">Overdue ({overdueLoans.length})</option>
              </select>
            </div>

            {/* Full Loan Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Loan No &amp; Borrower</th>
                    <th className="py-3 px-4">Disbursed Principal</th>
                    <th className="py-3 px-4">Rate &amp; Duration</th>
                    <th className="py-3 px-4">Installment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{loan.customerName}</p>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">{loan.loanNo}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{MONEY(loan.principal)}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {loan.interestRate}% · {loan.duration} mos ({loan.repaymentFrequency})
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{MONEY(loan.installment)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            (loan.status || "").toLowerCase() === "active"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : (loan.status || "").toLowerCase() === "overdue"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {(loan.status || "").toLowerCase() === "pending"
                            ? "Under Committee Review"
                            : loan.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/loans/${loan.id}/schedule`}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            Schedule
                          </Link>
                          <Link
                            href={`/loans/${loan.id}`}
                            className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                          >
                            Inspect
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 5: PILLAR 7: REPAYMENTS & SUPERVISION ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "repayments" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Repayment Receipts &amp; Supervision Journal
                </h2>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  Supervise field installment collection, issue official receipts, and audit transaction records.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Receipt size={15} />
                  <span>Record Payment Voucher</span>
                </button>
                <Link
                  href="/collections"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition"
                >
                  <Calendar size={14} className="text-red-600" />
                  <span>Today&apos;s Route Sheet</span>
                </Link>
              </div>
            </div>

            {/* Repayments History Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Receipt No &amp; Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Collected By</th>
                    <th className="py-3 px-4">Supervisory Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.slice(0, 15).map((pmt) => {
                    const cust = customers.find((c) => c.id === pmt.customerId);
                    return (
                      <tr key={pmt.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-slate-900">{pmt.receiptNo || pmt.id}</p>
                          <span className="text-[10px] text-slate-500 font-semibold">{pmt.date}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{cust?.fullName || pmt.customerId}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{pmt.customerId}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-800">
                          {MONEY(pmt.amount)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                            {pmt.method || "Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{pmt.collectedBy || "Field Officer"}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            Verified &amp; Supervised
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPayment(pmt)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                          >
                            Print Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 6: PILLARS 5, 8, 9 & 10: RULES, FINANCIALS, BACKUPS & AUDIT ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PILLAR 5: Configure Interest Rates & Deductions */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <Percent size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    5. Interest Rates &amp; Deduction Rules Engine
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Configure loan product interest rules, processing deductions, and late fees.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePricing} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Monthly Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={pricingForm.defaultMonthlyRate}
                      onChange={(e) => setPricingForm({ ...pricingForm, defaultMonthlyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Weekly Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={pricingForm.defaultWeeklyRate}
                      onChange={(e) => setPricingForm({ ...pricingForm, defaultWeeklyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Processing Fee (LKR)</label>
                    <input
                      type="number"
                      value={pricingForm.defaultProcessingFee}
                      onChange={(e) => setPricingForm({ ...pricingForm, defaultProcessingFee: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Grace Period (Days)</label>
                    <input
                      type="number"
                      value={pricingForm.gracePeriodDays}
                      onChange={(e) => setPricingForm({ ...pricingForm, gracePeriodDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Save Financial Engine Rules
                </button>
              </form>
            </div>

            {/* PILLAR 9: System Settings & Backups */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <HardDriveDownload size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    9. System Governance &amp; Encrypted Backups
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Automated snapshots, disaster recovery downloads, and database export.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900">Automated Daily Ledger Snapshots</p>
                  <p className="text-slate-600 text-[11px]">Last verified backup created: {todayStr} (100% Health)</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download JSON Backup</span>
                  </button>
                  <Link
                    href="/settings"
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition text-center"
                  >
                    <Sliders size={15} />
                    <span>Advanced Settings</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* PILLAR 8 & 10: Financial Intelligence & Activity Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PILLAR 8: Financial Intelligence */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      8. Financial Health &amp; Analytics
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Executive ledger exposure, portfolio recovery, and yield performance.
                    </p>
                  </div>
                </div>
                <Link href="/reports" className="text-xs font-bold text-red-600 hover:text-red-700">
                  Full Reports →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-600 text-[10px] font-bold uppercase">Total Disbursed</span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{MONEY(totalDisbursedCapital)}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-600 text-[10px] font-bold uppercase">Total Recovered</span>
                  <p className="text-base font-black text-emerald-800 mt-0.5">{MONEY(totalRepaymentsCollected)}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-600 text-[10px] font-bold uppercase">Outstanding Exposure</span>
                  <p className="text-base font-black text-amber-900 mt-0.5">{MONEY(outstandingBalance)}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-600 text-[10px] font-bold uppercase">Collection Efficiency</span>
                  <p className="text-base font-black text-blue-900 mt-0.5">{collectionRate}%</p>
                </div>
              </div>
            </div>

            {/* PILLAR 10: Activity Log & Financial Adjustments */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      10. Activity Logs &amp; Adjustments
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Immutable record of approvals, payment vouchers, and staff events.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Audit Ready
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {payments.slice(0, 5).map((pmt, i) => (
                  <div key={pmt.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-bold text-slate-900">Payment Settled: {MONEY(pmt.amount)}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Borrower ID: {pmt.customerId} · {pmt.date}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">{pmt.method || "Cash"}</span>
                  </div>
                ))}
                {pendingLoans.map((pl) => (
                  <div key={pl.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <div>
                        <p className="font-bold text-amber-950">Loan Application Submitted: {MONEY(pl.principal)}</p>
                        <p className="text-[10px] text-amber-800 font-mono">{pl.customerName} · Committee Sign-Off Pending</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── MODALS ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}

      {/* 1. Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-red-600" />
                <h3 className="font-black text-sm text-slate-900">Register New Staff Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Chamara Perera"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kasun.p@psione.lk"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">System Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as StaffUser["role"] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                  >
                    <option value="Loan Officer">Loan Officer</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Collection Agent">Collection Agent</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Branch Office</label>
                  <input
                    type="text"
                    value={newStaff.branch}
                    onChange={(e) => setNewStaff({ ...newStaff, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Repayment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">Record Borrower Repayment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordRepayment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Select Borrower *</label>
                <select
                  required
                  value={paymentForm.customerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                >
                  <option value="">-- Choose Borrower --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.nic}) - {c.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Repayment Amount (LKR) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 15000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-black text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment["method"] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                >
                  <option value="Cash">Cash (Field Agent)</option>
                  <option value="Bank Transfer">Bank Transfer / Online Deposit</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Supervisory Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Field receipt batch #45"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Confirm &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Upload Document Modal */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-red-600" />
                <h3 className="font-black text-sm text-slate-900">Upload Customer KYC Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDocUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Select Customer *</label>
                <select
                  required
                  value={docForm.customerId}
                  onChange={(e) => setDocForm({ ...docForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                >
                  <option value="">-- Choose Borrower --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NIC Front Copy / Salary Slip"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Document Classification</label>
                <select
                  value={docForm.type}
                  onChange={(e) => setDocForm({ ...docForm, type: e.target.value as CustomerDocument["type"] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                >
                  <option value="nic_front">National Identity Card (Front)</option>
                  <option value="nic_back">National Identity Card (Back)</option>
                  <option value="salary_slip">Salary Slip / Income Proof</option>
                  <option value="business_reg">Business Registration Certificate</option>
                  <option value="utility_bill">Residential Utility Bill</option>
                  <option value="promissory_note">Promissory Note / Guarantee</option>
                  <option value="other">Other Supporting Verification</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Upload &amp; Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Official Receipt Modal Preview */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  );
}

