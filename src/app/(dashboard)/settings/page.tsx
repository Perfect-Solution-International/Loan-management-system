"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Users,
  Percent,
  Sliders,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  UserPlus,
  Edit3,
  Lock,
  Building,
  Search,
  X,
  FileText,
  Calculator,
  UserX,
  Check,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { initialSettings } from "@/lib/demo-data";
import { MONEY } from "@/constants";
import type { SystemSettings, StaffUser, StaffPermissions } from "@/types";

const ROLE_PRESET_PERMISSIONS: Record<StaffUser["role"], StaffPermissions> = {
  Administrator: {
    approveLoans: true,
    recordRepayments: true,
    exportReports: true,
    manageSettings: true,
    manageCustomers: true,
  },
  "Loan Officer": {
    approveLoans: true,
    recordRepayments: true,
    exportReports: true,
    manageSettings: false,
    manageCustomers: true,
  },
  "Collection Agent": {
    approveLoans: false,
    recordRepayments: true,
    exportReports: false,
    manageSettings: false,
    manageCustomers: true,
  },
  Auditor: {
    approveLoans: false,
    recordRepayments: false,
    exportReports: true,
    manageSettings: false,
    manageCustomers: false,
  },
};

const BRANCH_OPTIONS = [
  "Colombo Central",
  "Gampaha Branch",
  "Kandy Branch",
  "Galle Branch",
  "Kurunegala Branch",
  "Kalutara Branch",
  "Head Office",
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "rules" | "staff" | "security") || "rules";

  const { settings, updateSettings, staffUsers, addStaffUser, updateStaffUser } = useData();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"rules" | "staff" | "security">(initialTab);

  // Settings form state
  const [formSettings, setFormSettings] = useState<SystemSettings>({
    systemName: settings.systemName || "PSI ONE Loan Management System",
    currency: settings.currency || "LKR",
    defaultMonthlyRate: settings.defaultMonthlyRate ?? 3.0,
    defaultWeeklyRate: settings.defaultWeeklyRate ?? 0.8,
    defaultDailyRate: settings.defaultDailyRate ?? 0.15,
    defaultCapitalDeductionRate: settings.defaultCapitalDeductionRate ?? 1.5,
    defaultInterestDeductionMethod: settings.defaultInterestDeductionMethod || "UPFRONT",
    defaultProcessingFee: settings.defaultProcessingFee ?? 1500,
    defaultAdminFee: settings.defaultAdminFee ?? 500,
    lateFeePercentage: settings.lateFeePercentage ?? 2.0,
    gracePeriodDays: settings.gracePeriodDays ?? 3,
  });

  // Simulator test inputs
  const [simPrincipal, setSimPrincipal] = useState<number>(100000);
  const [simDuration, setSimDuration] = useState<number>(6); // months

  // Notification feedback
  const [notificationMsg, setNotificationMsg] = useState("");

  // Staff search & filter
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>("ALL");

  // Staff modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<{
    id: string;
    name: string;
    email: string;
    role: StaffUser["role"];
    branch: string;
    status: "Active" | "Inactive";
    permissions: StaffPermissions;
  }>({
    id: "",
    name: "",
    email: "",
    role: "Loan Officer",
    branch: "Colombo Central",
    status: "Active",
    permissions: ROLE_PRESET_PERMISSIONS["Loan Officer"],
  });

  // Handle saving financial configuration
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setNotificationMsg("System configuration & interest rate rules saved successfully!");
    setTimeout(() => setNotificationMsg(""), 4500);
  };

  // Handle restoring factory default configuration
  const handleResetDefaults = () => {
    if (confirm("Are you sure you want to restore factory default calculation rules?")) {
      setFormSettings(initialSettings);
      updateSettings(initialSettings);
      setNotificationMsg("System settings restored to factory defaults.");
      setTimeout(() => setNotificationMsg(""), 4500);
    }
  };

  // Live calculation simulator computations
  const simCalculations = useMemo(() => {
    const principal = Number(simPrincipal) || 0;
    const months = Number(simDuration) || 1;
    const monthlyRate = Number(formSettings.defaultMonthlyRate) || 0;
    const totalInterest = (principal * (monthlyRate / 100)) * months;
    const capitalDeduction = (principal * (Number(formSettings.defaultCapitalDeductionRate) || 0)) / 100;
    const processingFee = Number(formSettings.defaultProcessingFee) || 0;
    const adminFee = Number(formSettings.defaultAdminFee) || 0;

    const totalUpfrontDeductions =
      formSettings.defaultInterestDeductionMethod === "UPFRONT"
        ? capitalDeduction + totalInterest + processingFee + adminFee
        : capitalDeduction + processingFee + adminFee;

    const netDisbursement = Math.max(0, principal - totalUpfrontDeductions);
    const totalRepayment =
      formSettings.defaultInterestDeductionMethod === "UPFRONT"
        ? principal
        : principal + totalInterest;

    const monthlyInstallment = totalRepayment / months;

    return {
      principal,
      totalInterest,
      capitalDeduction,
      processingFee,
      adminFee,
      totalUpfrontDeductions,
      netDisbursement,
      totalRepayment,
      monthlyInstallment,
    };
  }, [simPrincipal, simDuration, formSettings]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffUsers.filter((u) => {
      const matchesSearch =
        (u.name || "").toLowerCase().includes(staffSearch.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(staffSearch.toLowerCase()) ||
        (u.branch || "").toLowerCase().includes(staffSearch.toLowerCase());
      const matchesRole =
        staffRoleFilter === "ALL" || u.role.toUpperCase() === staffRoleFilter.toUpperCase();
      return matchesSearch && matchesRole;
    });
  }, [staffUsers, staffSearch, staffRoleFilter]);

  // Open modal for new staff
  const handleOpenAddStaff = () => {
    const nextNum = staffUsers.length + 1;
    const newId = `STF-${nextNum < 10 ? `0${nextNum}` : nextNum}`;
    setEditingStaffId(null);
    setStaffForm({
      id: newId,
      name: "",
      email: "",
      role: "Loan Officer",
      branch: "Colombo Central",
      status: "Active",
      permissions: { ...ROLE_PRESET_PERMISSIONS["Loan Officer"] },
    });
    setIsStaffModalOpen(true);
  };

  // Open modal for editing existing staff
  const handleOpenEditStaff = (user: StaffUser) => {
    setEditingStaffId(user.id);
    setStaffForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      status: user.status,
      permissions: { ...user.permissions },
    });
    setIsStaffModalOpen(true);
  };

  // Handle role selection with automatic permission preset
  const handleRoleChange = (role: StaffUser["role"]) => {
    setStaffForm((prev) => ({
      ...prev,
      role,
      permissions: { ...ROLE_PRESET_PERMISSIONS[role] },
    }));
  };

  // Save staff member (create or update)
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      alert("Please provide both name and email address.");
      return;
    }

    if (editingStaffId) {
      updateStaffUser(editingStaffId, {
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        branch: staffForm.branch,
        status: staffForm.status,
        permissions: staffForm.permissions,
      });
      setNotificationMsg(`Staff user "${staffForm.name}" updated successfully.`);
    } else {
      const newStaffUser: StaffUser = {
        id: staffForm.id,
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        branch: staffForm.branch,
        status: staffForm.status,
        joinedDate: new Date().toISOString().slice(0, 10),
        permissions: staffForm.permissions,
      };
      addStaffUser(newStaffUser);
      setNotificationMsg(`New staff member "${staffForm.name}" registered successfully.`);
    }

    setIsStaffModalOpen(false);
    setTimeout(() => setNotificationMsg(""), 4500);
  };

  // Toggle staff active/inactive status quickly
  const handleToggleStaffStatus = (user: StaffUser) => {
    const updatedStatus = user.status === "Active" ? "Inactive" : "Active";
    updateStaffUser(user.id, { status: updatedStatus });
    setNotificationMsg(
      `Staff member ${user.name} is now marked as ${updatedStatus}.`
    );
    setTimeout(() => setNotificationMsg(""), 3500);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            ADMINISTRATION & CONFIGURATION
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Settings & Role Management
          </h1>
          <p className="text-xs text-slate-500">
            Define default interest rates, deduction rules, fee structures, and staff user access permissions.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{notificationMsg}</span>
          </div>
          <button
            onClick={() => setNotificationMsg("")}
            className="text-emerald-500 hover:text-emerald-700 font-bold"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "rules"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sliders size={15} /> Financial Rules & Rates
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "staff"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users size={15} /> Staff & Permission Roles ({staffUsers.length})
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "security"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck size={15} /> Security & System Audit
        </button>
      </div>

      {/* TAB 1: FINANCIAL RULES & POLICIES */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertCircle size={15} className="text-blue-600" />
                <span>
                  Adjusting these parameters sets the default baseline for new loan approvals across all branches.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Reset Defaults
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Save size={14} /> Save Configuration
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Interest & Deduction Parameters */}
              <div className="lg:col-span-2 space-y-6">
                {/* Panel 1: Interest Rate Parameters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Percent size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Default Interest Rate Rules
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Baseline rates applied to loan calculations according to payment frequency.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Monthly Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formSettings.defaultMonthlyRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultMonthlyRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                          % / mo
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Default for monthly installment products.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Weekly Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formSettings.defaultWeeklyRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultWeeklyRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                          % / wk
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Default for micro weekly lending.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Daily Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formSettings.defaultDailyRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultDailyRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                          % / day
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Default for short-term daily merchant loans.</p>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Deduction Rules & Upfront Charges */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Deduction & Disbursement Policies
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Rules governing upfront capital deductions, service fees, and interest deduction mechanics.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Capital Deduction Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={formSettings.defaultCapitalDeductionRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultCapitalDeductionRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                          %
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Withheld at disbursement towards capital reserve / security deposit.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Interest Deduction Method
                      </label>
                      <select
                        value={formSettings.defaultInterestDeductionMethod}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            defaultInterestDeductionMethod: e.target.value as
                              | "UPFRONT"
                              | "COLLECTED_VIA_INSTALLMENTS",
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
                      >
                        <option value="UPFRONT">Upfront Deduction (Deduct at disbursement)</option>
                        <option value="COLLECTED_VIA_INSTALLMENTS">
                          Installment Distributed (Collect with periodic dues)
                        </option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Governs whether borrower receives Principal minus Interest upfront.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Default Processing Fee (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formSettings.defaultProcessingFee}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            defaultProcessingFee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        Documentation, loan verification, and credit assessment fee.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Default Administrative / Legal Fee (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formSettings.defaultAdminFee}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            defaultAdminFee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        Stamp duty, notary verification, and account ledger creation fee.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Delinquency & Penalty Configuration */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Late Repayment & Delinquency Rules
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Standard penalties applied when customer repayments exceed their due dates.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Late Repayment Penalty Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={formSettings.lateFeePercentage}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              lateFeePercentage: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                          % / cycle
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Calculated as a percentage of overdue installment value.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Grace Period (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={formSettings.gracePeriodDays}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            gracePeriodDays: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        Buffer period granted before an unpaid loan triggers Overdue status.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Panel 4: System Identity */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Building size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        System Identity & Currency
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Platform branding and default monetary denomination.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        System Name
                      </label>
                      <input
                        type="text"
                        value={formSettings.systemName}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, systemName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Operating Currency
                      </label>
                      <select
                        value={formSettings.currency}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, currency: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
                      >
                        <option value="LKR">LKR (Sri Lankan Rupee - Rs.)</option>
                        <option value="USD">USD (United States Dollar - $)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Calculation Simulator */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-lg space-y-5 sticky top-6">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-blue-400" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Live Policy Simulation
                      </h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
                      Real-time
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Test your configured parameters on an example loan to verify cash flow and disbursement mechanics before saving.
                  </p>

                  <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Test Loan Principal
                      </label>
                      <input
                        type="number"
                        step="10000"
                        value={simPrincipal}
                        onChange={(e) => setSimPrincipal(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Loan Duration (Months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={simDuration}
                        onChange={(e) => setSimDuration(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Computed Results */}
                  <div className="space-y-2 text-xs border-t border-slate-700/80 pt-3">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Interest ({formSettings.defaultMonthlyRate}% x {simDuration} mo)</span>
                      <span className="font-mono font-bold text-white">
                        {MONEY(simCalculations.totalInterest)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Capital Deduction ({formSettings.defaultCapitalDeductionRate}%)</span>
                      <span className="font-mono text-white">
                        -{MONEY(simCalculations.capitalDeduction)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Processing & Admin Fees</span>
                      <span className="font-mono text-white">
                        -{MONEY(simCalculations.processingFee + simCalculations.adminFee)}
                      </span>
                    </div>
                    {formSettings.defaultInterestDeductionMethod === "UPFRONT" && (
                      <div className="flex justify-between text-amber-300 text-[11px]">
                        <span>Interest Withheld Upfront</span>
                        <span className="font-mono">
                          -{MONEY(simCalculations.totalInterest)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Callouts */}
                  <div className="space-y-2.5 pt-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                        Borrower Disbursed Cash
                      </p>
                      <p className="text-xl font-black font-mono text-emerald-300">
                        {MONEY(simCalculations.netDisbursement)}
                      </p>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">
                        Total Repayment Due
                      </p>
                      <p className="text-xl font-black font-mono text-blue-300">
                        {MONEY(simCalculations.totalRepayment)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Monthly Installment: <span className="font-bold text-white font-mono">{MONEY(simCalculations.monthlyInstallment)}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Save size={14} /> Commit Settings
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: STAFF USER PERMISSION LEVELS & ROLE MANAGEMENT */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          {/* Staff Metric Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Total Personnel</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{staffUsers.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Across all branches</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Administrators</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  {staffUsers.filter((u) => u.role === "Administrator").length}
                </p>
                <p className="text-[10px] text-purple-600/80 mt-0.5">Full access & policy control</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Loan Officers</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {staffUsers.filter((u) => u.role === "Loan Officer").length}
                </p>
                <p className="text-[10px] text-emerald-600/80 mt-0.5">Appraisal & onboarding</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Field Agents & Auditors</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {staffUsers.filter((u) => u.role === "Collection Agent" || u.role === "Auditor").length}
                </p>
                <p className="text-[10px] text-amber-600/80 mt-0.5">Collections & risk audit</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Lock size={20} />
              </div>
            </div>
          </div>

          {/* Search, Filter & Add Staff Action */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, email, or branch..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white text-slate-700"
              >
                <option value="ALL">All Roles ({staffUsers.length})</option>
                <option value="ADMINISTRATOR">Administrator</option>
                <option value="LOAN OFFICER">Loan Officer</option>
                <option value="COLLECTION AGENT">Collection Agent</option>
                <option value="AUDITOR">Auditor</option>
              </select>
            </div>

            <button
              onClick={handleOpenAddStaff}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <UserPlus size={15} /> Add Staff Member
            </button>
          </div>

          {/* Staff Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Staff Member</th>
                    <th className="py-3.5 px-6">Role & Status</th>
                    <th className="py-3.5 px-6">Branch Location</th>
                    <th className="py-3.5 px-6">Assigned Permissions</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaff.map((user) => {
                    const initials = user.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("");

                    const roleBadgeColor =
                      user.role === "Administrator"
                        ? "bg-purple-100 text-purple-700 border-purple-200"
                        : user.role === "Loan Officer"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : user.role === "Collection Agent"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-indigo-100 text-indigo-700 border-indigo-200";

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">
                                {user.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>{user.email}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-500">{user.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadgeColor}`}
                            >
                              {user.role}
                            </span>
                            <span
                              className={`text-[10px] font-semibold flex items-center gap-1 ${
                                user.status === "Active" ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              {user.status}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-6 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Building size={13} className="text-slate-400" />
                            <span className="font-medium">{user.branch}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Joined {user.joinedDate}
                          </span>
                        </td>

                        <td className="py-3.5 px-6">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {user.permissions.approveLoans && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold border border-blue-200">
                                Approve Loans
                              </span>
                            )}
                            {user.permissions.recordRepayments && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-200">
                                Repayments
                              </span>
                            )}
                            {user.permissions.exportReports && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold border border-purple-200">
                                Exports
                              </span>
                            )}
                            {user.permissions.manageSettings && (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold border border-rose-200">
                                Settings
                              </span>
                            )}
                            {user.permissions.manageCustomers && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                                Customers
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditStaff(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleStaffStatus(user)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                user.status === "Active"
                                  ? "text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600"
                                  : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                              title={
                                user.status === "Active"
                                  ? "Deactivate staff member"
                                  : "Activate staff member"
                              }
                            >
                              {user.status === "Active" ? (
                                <UserX size={12} />
                              ) : (
                                <Check size={12} />
                              )}
                              <span>{user.status === "Active" ? "Disable" : "Enable"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStaff.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <Users size={32} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600 text-sm">No staff members found</p>
                  <p>Try modifying your search keywords or filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & SYSTEM AUDIT */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Security Policies */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Authentication & Access Control</h3>
                  <p className="text-[11px] text-slate-400">Session policies and security restrictions.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-slate-500">Enforce OTP verification on administrative actions</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                    Enforced
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">Idle Session Inactivity Timeout</p>
                    <p className="text-[11px] text-slate-500">Auto logout after consecutive inactivity</p>
                  </div>
                  <span className="font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                    30 Minutes
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">Password Complexity Policy</p>
                    <p className="text-[11px] text-slate-500">Min 8 chars, alphanumeric & symbol required</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Audit & Backup Policy */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Integrity & Backups</h3>
                  <p className="text-[11px] text-slate-400">Database snapshot cycles and compliance logging.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">Automated Daily Database Snapshots</p>
                    <p className="text-[11px] text-slate-500">Encrypted backup saved to secure cloud bucket</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">Audit Trail Retention</p>
                    <p className="text-[11px] text-slate-500">Financial modification and payment record logs</p>
                  </div>
                  <span className="font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                    180 Days
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">System Build Specification</p>
                    <p className="text-[11px] text-slate-500">Next.js App Router • Production Edition</p>
                  </div>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    v2.4.0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingStaffId ? "Edit Staff User & Permissions" : "Register New Staff Member"}
                </h3>
                <p className="text-xs text-slate-400">
                  Assign user details, role level, and granular authority flags.
                </p>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Staff ID</label>
                  <input
                    type="text"
                    value={staffForm.id}
                    disabled
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Account Status</label>
                  <select
                    value={staffForm.status}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        status: e.target.value as "Active" | "Inactive",
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Work Email Address</label>
                <input
                  type="email"
                  autoComplete="off"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleRoleChange(e.target.value as StaffUser["role"])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Loan Officer">Loan Officer</option>
                    <option value="Collection Agent">Collection Agent</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Branch Office</label>
                  <select
                    value={staffForm.branch}
                    onChange={(e) => setStaffForm({ ...staffForm, branch: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granular Permission Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">
                    Granular Access Permissions
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Preset by role, customizable
                  </span>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.permissions.approveLoans}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          permissions: {
                            ...staffForm.permissions,
                            approveLoans: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold block leading-tight">Approve & Disburse Loans</span>
                      <span className="text-[10px] text-slate-400">Authorize pending credit applications</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.permissions.recordRepayments}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          permissions: {
                            ...staffForm.permissions,
                            recordRepayments: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold block leading-tight">Record Repayment Collections</span>
                      <span className="text-[10px] text-slate-400">Collect installments & issue receipts</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.permissions.exportReports}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          permissions: {
                            ...staffForm.permissions,
                            exportReports: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold block leading-tight">Export Financial Reports</span>
                      <span className="text-[10px] text-slate-400">Download CSV ledger journals & aggregates</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.permissions.manageCustomers}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          permissions: {
                            ...staffForm.permissions,
                            manageCustomers: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold block leading-tight">Register & Edit Customers</span>
                      <span className="text-[10px] text-slate-400">Customer directory and document upload</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.permissions.manageSettings}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          permissions: {
                            ...staffForm.permissions,
                            manageSettings: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold block leading-tight">Modify System Settings & Rates</span>
                      <span className="text-[10px] text-slate-400">Administrative policy configurations</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {editingStaffId ? "Update Staff User" : "Save Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto text-xs text-slate-400">
          Loading system settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
