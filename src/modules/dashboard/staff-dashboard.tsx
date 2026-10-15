"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  FileText,
  Upload,
  CreditCard,
  Wallet,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  Search,
  Plus,
  Receipt,
  Download,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Printer,
  History,
  SlidersHorizontal,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { getDailyCollections, formatFriendlyDate, type ScheduledCollectionItem } from "@/lib/collection-schedule";
import type { Customer, Loan, Payment, CustomerDocument, StaffUser, StaffPermissions } from "@/types";
import { ReceiptModal } from "@/components/modals/ReceiptModal";

type ActiveTab = "overview" | "collections" | "customers" | "loans" | "repayments" | "team" | "settings";

export function StaffDashboard() {
  const {
    customers,
    loans,
    payments,
    documents,
    settings,
    staffUsers,
    addPayment,
    addDocument,
    updateSettings,
    addStaffUser,
    updateStaffUser,
  } = useData();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [successToast, setSuccessToast] = useState<string>("");

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

  // Today's collections metrics
  const [todayStr, setTodayStr] = useState<string>("2026-10-15");
  React.useEffect(() => {
    setTodayStr(new Date().toISOString().slice(0, 10));
  }, []);

  const collectionData = useMemo(
    () => getDailyCollections(loans, customers, payments, todayStr),
    [loans, customers, payments, todayStr]
  );
  const collectionSchedule = collectionData.items;
  const collectionTargetToday = collectionData.summary.targetAmount;
  const collectionCollectedToday = collectionData.summary.collectedAmount;

  const collectionRate = collectionTargetToday > 0
    ? Math.min(100, Math.round((collectionCollectedToday / collectionTargetToday) * 100))
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
      approveLoans: false,
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

  // Pre-fill payment modal for a specific collection item
  const handleQuickCollect = (item: ScheduledCollectionItem) => {
    setPaymentForm({
      customerId: item.loan.customerId,
      loanId: item.loan.id,
      amount: String(item.totalDueToday || item.installmentAmount),
      method: "Cash",
      notes: `Installment #${item.cycleNumber} collected via field route`,
    });
    setShowPaymentModal(true);
  };

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

  // Search & Filter states
  const [customerSearch, setCustomerSearch] = useState("");
  const [loanSearch, setLoanSearch] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");

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

  const filteredSchedule = useMemo(() => {
    if (routeFilter === "all") return collectionSchedule;
    if (routeFilter === "collected") return collectionSchedule.filter((i) => i.isCollectedToday);
    if (routeFilter === "overdue") return collectionSchedule.filter((i) => i.status === "OVERDUE");
    if (routeFilter === "due") return collectionSchedule.filter((i) => !i.isCollectedToday);
    return collectionSchedule;
  }, [collectionSchedule, routeFilter]);

  // ── 3. Action Handlers ────────────────────────────────────────────────────
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name?.trim() || !newStaff.email?.trim()) {
      alert("Please provide staff member's full name and email address.");
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
        approveLoans: false,
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
        approveLoans: false,
        recordRepayments: true,
        exportReports: true,
        manageSettings: false,
        manageCustomers: true,
      },
    });
    triggerToast(`Staff account for ${created.name} added successfully.`);
  };

  const handleTogglePermission = (
    staffId: string,
    perm: keyof StaffPermissions,
    currentValue: boolean
  ) => {
    const staff = staffUsers.find((s) => s.id === staffId);
    if (!staff) return;
    const updatedPerms = { ...staff.permissions, [perm]: !currentValue };
    updateStaffUser(staffId, { permissions: updatedPerms });
    triggerToast(`Updated authorization for ${staff.name}.`);
  };

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
      notes: paymentForm.notes || "Field collection voucher",
      method: paymentForm.method || "Cash",
      collectedBy: "Field Officer",
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
    triggerToast(`Collection of ${MONEY(amountNum)} recorded for ${customer?.fullName || "Borrower"}. Receipt issued.`);
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.customerId || !docForm.title.trim()) {
      alert("Please select a borrower and enter document title.");
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
      uploader: "Field Officer",
    };
    addDocument(newDoc);
    setShowDocUploadModal(false);
    setDocForm({
      customerId: "",
      title: "",
      type: "nic_front",
      fileName: "",
    });
    triggerToast(`Document '${newDoc.title}' uploaded and verified.`);
  };

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      defaultMonthlyRate: Number(pricingForm.defaultMonthlyRate),
      defaultWeeklyRate: Number(pricingForm.defaultWeeklyRate),
      defaultProcessingFee: Number(pricingForm.defaultProcessingFee),
      lateFeePercentage: Number(pricingForm.lateFeePercentage),
      gracePeriodDays: Number(pricingForm.gracePeriodDays),
    });
    triggerToast("Lending parameters saved successfully.");
  };

  const handleExportBackup = () => {
    const backupData = {
      system: "Microfinance Core - Field Operations Snapshot",
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
    downloadAnchor.setAttribute("download", `microfinance_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast("Operational database snapshot downloaded.");
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── TOAST NOTIFICATION ── */}
      {successToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top-3 duration-200">
          <div className="p-1.5 bg-emerald-500 text-white rounded-xl shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-xs font-bold">{successToast}</p>
        </div>
      )}

      {/* ── HEADER CONSOLE ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Field Operations Console
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Shift Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Borrower Management &amp; Collections
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Daily collection schedules, borrower registration, KYC verification, and repayment processing.
            </p>
          </div>

          {/* Quick Action Buttons - Fully Responsive */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <Link
              href="/customers/new"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <UserPlus size={15} />
              <span>Register Borrower</span>
            </Link>

            <Link
              href="/loans/new"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus size={15} />
              <span>Issue Loan</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Receipt size={15} />
              <span>Record Repayment</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDocUploadModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Upload size={14} className="text-slate-700" />
              <span>Upload KYC</span>
            </button>
          </div>
        </div>

        {/* ── KPI METRICS CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-5 border-t border-slate-100">
          {/* 1. Today's Target */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-bold">Today&apos;s Target</span>
              <Calendar size={16} className="text-amber-600" />
            </div>
            <div className="my-1.5">
              <p className="text-base sm:text-xl font-black text-slate-900 truncate">
                {MONEY(collectionTargetToday)}
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <span>{collectionRate}% Collected</span>
              <span>{collectionSchedule.length} Due</span>
            </div>
          </div>

          {/* 2. Active Portfolio */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-bold">Active Portfolio</span>
              <Wallet size={16} className="text-red-600" />
            </div>
            <div className="my-1.5">
              <p className="text-base sm:text-xl font-black text-slate-900 truncate">
                {MONEY(totalDisbursedCapital)}
              </p>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                {activeLoans.length} active credit facilities
              </p>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">Performing capital</span>
          </div>

          {/* 3. Overdue Risk */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-bold">Overdue Accounts</span>
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <div className="my-1.5">
              <p className="text-base sm:text-xl font-black text-slate-900">
                {overdueLoans.length}
              </p>
              <p className="text-[11px] text-rose-700 font-bold mt-0.5">
                Immediate follow-up required
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Field recovery visits</span>
          </div>

          {/* 4. Verified Borrowers */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-bold">Borrowers &amp; KYC</span>
              <Users size={16} className="text-blue-600" />
            </div>
            <div className="my-1.5">
              <p className="text-base sm:text-xl font-black text-slate-900">
                {customers.length}
              </p>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                {documents.length} verified documents
              </p>
            </div>
            <span className="text-[10px] text-blue-700 font-bold">100% Identity verified</span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <History size={14} />
          <span>Operational Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "collections"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Calendar size={14} />
          <span>Today&apos;s Field Route ({collectionSchedule.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "customers"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Users size={14} />
          <span>Borrowers &amp; KYC ({customers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("loans")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "loans"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <CreditCard size={14} />
          <span>Loan Facilities ({loans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("repayments")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "repayments"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Receipt size={14} />
          <span>Repayments Journal ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "team"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Shield size={14} />
          <span>Staff Roster ({staffUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Rates &amp; Policies</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: OPERATIONAL OVERVIEW ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Today's Collection Highlights */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Today&apos;s Field Collection Schedule
                </h2>
                <p suppressHydrationWarning className="text-xs text-slate-600 font-medium">
                  {formatFriendlyDate(todayStr)} · {collectionSchedule.length} borrowers scheduled for collection
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("collections")}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>View Full Route Sheet</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Quick table preview of today's route */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Borrower &amp; Route</th>
                    <th className="py-2.5 px-3">Facility</th>
                    <th className="py-2.5 px-3 text-right">Installment</th>
                    <th className="py-2.5 px-3 text-right">Total Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collectionSchedule.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{item.customer?.fullName || item.loan.customerName}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{item.routeArea} · {item.customer?.phone || "No phone"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-800">{item.loan.loanNo || item.loan.id}</span>
                        <span className="text-[10px] text-slate-500 block">Cycle #{item.cycleNumber} of {item.totalCycles}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {MONEY(item.installmentAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {MONEY(item.totalDueToday)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.isCollectedToday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Collected
                          </span>
                        ) : item.status === "OVERDUE" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Due Today
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.isCollectedToday ? (
                          <span className="text-[11px] font-bold text-emerald-700">Receipt Issued</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickCollect(item)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer"
                          >
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Operations Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 text-blue-700">
                <Users size={18} />
                <h3 className="font-black text-sm text-slate-900">Customer KYC &amp; Onboarding</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Verify borrower identification, check emergency references, and upload signed documentation.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{customers.length} Registered</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("customers")}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  Manage <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 text-slate-800">
                <CreditCard size={18} />
                <h3 className="font-black text-sm text-slate-900">Active Facilities &amp; Schedules</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Review installment schedules, maturity balances, interest calculations, and active terms.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{loans.length} Facilities</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("loans")}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  Directory <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <Receipt size={18} />
                <h3 className="font-black text-sm text-slate-900">Collections &amp; Receipts</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Record cash vouchers, supervise field payments, and issue official print-ready receipts.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{payments.length} Payments Recorded</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("repayments")}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  Journal <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: TODAY'S FIELD ROUTE SHEET ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "collections" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Daily Field Collection Route Sheet
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Directly record borrower payments, mark collected installments, and track daily progress.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-800 bg-white shadow-2xs focus:outline-none"
              >
                <option value="all">All Items ({collectionSchedule.length})</option>
                <option value="due">Due Today Only</option>
                <option value="overdue">Overdue Only</option>
                <option value="collected">Collected Today</option>
              </select>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Print Route</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Borrower Details</th>
                  <th className="py-3 px-3.5">Route Area</th>
                  <th className="py-3 px-3.5">Facility / Term</th>
                  <th className="py-3 px-3.5 text-right">Installment</th>
                  <th className="py-3 px-3.5 text-right">Arrears</th>
                  <th className="py-3 px-3.5 text-right">Total Due Today</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Collection Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900">{item.customer?.fullName || item.loan.customerName}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                        <Phone size={10} />
                        <span>{item.customer?.phone || "No phone listed"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        <span>{item.routeArea}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-slate-800">{item.loan.loanNo || item.loan.id}</span>
                      <span className="text-[10px] text-slate-500 block">Cycle #{item.cycleNumber} of {item.totalCycles}</span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-slate-900">
                      {MONEY(item.installmentAmount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-700">
                      {item.arrearsAmount > 0 ? MONEY(item.arrearsAmount) : "—"}
                    </td>
                    <td className="py-3 px-3.5 text-right font-black text-slate-900">
                      {MONEY(item.totalDueToday)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {item.isCollectedToday ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Collected
                        </span>
                      ) : item.status === "OVERDUE" ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Due Today
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {item.isCollectedToday ? (
                        <span className="text-xs font-bold text-emerald-700">Paid ✓</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickCollect(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                        >
                          Collect Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: BORROWERS & KYC ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "customers" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Borrower Directory &amp; KYC Verification
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Search borrowers, check emergency contacts, and upload verified identification documents.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDocUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer"
              >
                <Upload size={14} />
                <span>Upload KYC Doc</span>
              </button>
              <Link
                href="/customers/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <UserPlus size={14} />
                <span>New Borrower</span>
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by full name, NIC number, phone number, or ID..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
            />
          </div>

          {/* Borrowers table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Borrower</th>
                  <th className="py-3 px-3.5">NIC Number</th>
                  <th className="py-3 px-3.5">Contact</th>
                  <th className="py-3 px-3.5">Residential Address</th>
                  <th className="py-3 px-3.5">KYC Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        {cust.photoUrl ? (
                          <img
                            src={cust.photoUrl}
                            alt={cust.fullName || "Customer"}
                            className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {(cust.fullName || "C").slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{cust.fullName || "Unnamed Borrower"}</p>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">{cust.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800 uppercase">{cust.nic}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-700">{cust.phone}</td>
                    <td className="py-3 px-3.5 text-slate-600 font-medium max-w-[200px] truncate">{cust.address}</td>
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                        <CheckCircle2 size={11} />
                        Verified
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/customers/${cust.id}`}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          Profile
                        </Link>
                        <Link
                          href={`/customers/${cust.id}/edit`}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: LOAN FACILITIES ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "loans" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Loan Facilities &amp; Schedules
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Overview of active microfinance loans, installment terms, and repayment schedules.
              </p>
            </div>

            <Link
              href="/loans/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>Issue New Facility</span>
            </Link>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Filter by borrower name, loan number or facility ID..."
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
              />
            </div>

            <select
              value={loanStatusFilter}
              onChange={(e) => setLoanStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white text-slate-800 focus:outline-none shadow-2xs"
            >
              <option value="all">All Statuses ({loans.length})</option>
              <option value="active">Active Only ({activeLoans.length})</option>
              <option value="pending">Under Committee Review ({pendingLoans.length})</option>
              <option value="overdue">Overdue ({overdueLoans.length})</option>
            </select>
          </div>

          {/* Loans Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Loan No &amp; Borrower</th>
                  <th className="py-3 px-3.5">Disbursed Principal</th>
                  <th className="py-3 px-3.5">Rate &amp; Duration</th>
                  <th className="py-3 px-3.5">Installment</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900">{loan.customerName}</p>
                      <span className="font-mono text-[10px] text-slate-500 font-bold">{loan.loanNo}</span>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{MONEY(loan.principal)}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-700">
                      {loan.interestRate}% · {loan.duration} mos ({loan.repaymentFrequency})
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{MONEY(loan.installment)}</td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <td className="py-3 px-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
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
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 5: REPAYMENTS JOURNAL ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "repayments" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Repayment Receipts &amp; Payment Journal
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Supervise field installment collection, issue official receipts, and audit transaction records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Receipt size={14} />
              <span>Record Payment</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Receipt No &amp; Date</th>
                  <th className="py-3 px-3.5">Borrower</th>
                  <th className="py-3 px-3.5 font-mono">Amount Paid</th>
                  <th className="py-3 px-3.5">Method</th>
                  <th className="py-3 px-3.5">Collected By</th>
                  <th className="py-3 px-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.slice(0, 15).map((pmt) => {
                  const cust = customers.find((c) => c.id === pmt.customerId);
                  return (
                    <tr key={pmt.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3.5">
                        <p className="font-mono font-bold text-slate-900">{pmt.receiptNo || pmt.id}</p>
                        <span className="text-[10px] text-slate-500 font-semibold">{pmt.date}</span>
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900">{cust?.fullName || pmt.customerId}</p>
                        <span className="text-[10px] text-slate-500 font-mono">{pmt.customerId}</span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-black text-emerald-800">
                        {MONEY(pmt.amount)}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                          {pmt.method || "Cash"}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-medium">{pmt.collectedBy || "Field Officer"}</td>
                      <td className="py-3 px-3.5 text-right">
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
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 6: STAFF ROSTER & ACCESS ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Staff Roster &amp; Branch Authorizations
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Operational roster for Colombo Central branch, role limits, and system permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <UserPlus size={14} />
              <span>New Staff Account</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Staff Member</th>
                  <th className="py-3 px-3.5">Assigned Role</th>
                  <th className="py-3 px-3.5">Branch</th>
                  <th className="py-3 px-3.5">Record Repayments</th>
                  <th className="py-3 px-3.5">Customer KYC</th>
                  <th className="py-3 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffUsers.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900">{staff.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{staff.email}</span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 font-medium">{staff.branch}</td>
                    <td className="py-3 px-3.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(staff.id, "recordRepayments", staff.permissions.recordRepayments)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                          staff.permissions.recordRepayments
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {staff.permissions.recordRepayments ? "Authorized ✓" : "Disabled ✕"}
                      </button>
                    </td>
                    <td className="py-3 px-3.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(staff.id, "manageCustomers", staff.permissions.manageCustomers)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                          staff.permissions.manageCustomers
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {staff.permissions.manageCustomers ? "Authorized ✓" : "Disabled ✕"}
                      </button>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {staff.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 7: RATES & POLICIES ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">
                Lending Rates &amp; Parameter Rules
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Standard rate tiers and deduction parameters applied to new loan applications.
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Monthly Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pricingForm.defaultMonthlyRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, defaultMonthlyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Weekly Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pricingForm.defaultWeeklyRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, defaultWeeklyRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Default Processing Fee (LKR)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.defaultProcessingFee}
                    onChange={(e) => setPricingForm({ ...pricingForm, defaultProcessingFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Late Payment Penalty (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.lateFeePercentage}
                    onChange={(e) => setPricingForm({ ...pricingForm, lateFeePercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Save Lending Rules
                </button>
              </div>
            </form>
          </div>

          {/* Database Backup Box */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900">
                Operational Data Backup
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Download an offline encrypted JSON snapshot containing borrower records, facility schedules, and collections.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Download size={14} />
              <span>Download Backup (.json)</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ── MODALS ── */}
      {/* ────────────────────────────────────────────────────────────────────── */}

      {/* 1. RECORD REPAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Record Borrower Repayment</h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordRepayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Select Borrower *</label>
                <select
                  value={paymentForm.customerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">-- Choose Borrower --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} ({c.nic})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Repayment Amount (LKR) *</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment["method"] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Cash">Cash (Field Collection)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Voucher Notes</label>
                <input
                  type="text"
                  placeholder="Optional notes or receipt remarks"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Confirm &amp; Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. UPLOAD KYC DOCUMENT MODAL */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Upload Customer KYC Document</h3>
              <button
                type="button"
                onClick={() => setShowDocUploadModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Select Borrower *</label>
                <select
                  value={docForm.customerId}
                  onChange={(e) => setDocForm({ ...docForm, customerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">-- Choose Borrower --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} ({c.nic})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Document Category</label>
                <select
                  value={docForm.type}
                  onChange={(e) => setDocForm({ ...docForm, type: e.target.value as CustomerDocument["type"] })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="nic_front">National Identity Card (Front)</option>
                  <option value="nic_back">National Identity Card (Back)</option>
                  <option value="income_proof">Proof of Income / Salary Slip</option>
                  <option value="billing_proof">Utility Bill / Address Proof</option>
                  <option value="bank_statement">Bank Statement</option>
                  <option value="signed_agreement">Promissory Note / Loan Agreement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Document Title *</label>
                <input
                  type="text"
                  placeholder="e.g. NIC Copy - Verified Original"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Upload &amp; Attach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. NEW STAFF USER MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Add Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sunil Perera"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. sunil@psi.lk"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Designation</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as StaffUser["role"] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="Loan Officer">Loan Officer</option>
                    <option value="Collection Agent">Collection Agent</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Branch</label>
                  <input
                    type="text"
                    value={newStaff.branch}
                    onChange={(e) => setNewStaff({ ...newStaff, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. OFFICIAL RECEIPT MODAL */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          customer={customers.find((c) => c.id === selectedReceiptPayment.customerId)}
          loan={loans.find((l) => l.id === selectedReceiptPayment.loanId)}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  );
}
