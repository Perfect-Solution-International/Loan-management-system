/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Building,
  CreditCard,
  FileText,
  ExternalLink,
  Edit3,
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Eye,
  PlusCircle,
  HelpCircle,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { getLoanTotalRepayment } from "@/lib/loan-financials";
import type { Customer, CustomerStatus, StaffUser, StaffPermissions, Loan, Payment, CustomerDocument } from "@/types";

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

const BRANCH_OPTIONS = [
  "Colombo Central",
  "Gampaha Branch",
  "Kandy Branch",
  "Galle Branch",
  "Kurunegala Branch",
  "Kalutara Branch",
  "Head Office",
];

function UserManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "customers" | "staff") || "customers";

  const {
    customers,
    loans,
    payments,
    documents,
    staffUsers,
    addStaffUser,
    updateStaffUser,
    updateCustomer,
    deleteCustomer,
  } = useData();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<"customers" | "staff">(initialTab);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>("ALL");

  // Notifications
  const [toastMsg, setToastMsg] = useState("");

  // Customer Details Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Customer Edit & Delete States
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<{
    id: string;
    fullName: string;
    nic: string;
    phone: string;
    alternatePhone: string;
    email: string;
    address: string;
    town: string;
    district: string;
    village: string;
    occupation: string;
    monthlyIncome: number | string;
    status: CustomerStatus;
    guarantorName: string;
    guarantorNic: string;
    guarantorPhone: string;
    guarantorRelationship: string;
  }>({
    id: "",
    fullName: "",
    nic: "",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    town: "",
    district: "",
    village: "",
    occupation: "",
    monthlyIncome: 0,
    status: "Active",
    guarantorName: "",
    guarantorNic: "",
    guarantorPhone: "",
    guarantorRelationship: "",
  });

  const handleOpenEditCustomer = (c: Customer) => {
    setCustomerForm({
      id: String(c.id),
      fullName: c.fullName || c.name || "",
      nic: c.nic || "",
      phone: c.phone || "",
      alternatePhone: c.alternatePhone || "",
      email: c.email || "",
      address: c.address || "",
      town: c.town || "",
      district: c.district || "",
      village: c.village || "",
      occupation: c.occupation || "",
      monthlyIncome: c.monthlyIncome || 0,
      status: c.status || "Active",
      guarantorName: c.guarantorName || "",
      guarantorNic: c.guarantorNic || "",
      guarantorPhone: c.guarantorPhone || "",
      guarantorRelationship: c.guarantorRelationship || "",
    });
    setIsEditCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.fullName.trim() || !customerForm.nic.trim()) {
      alert("Please provide at least a full name and NIC number.");
      return;
    }

    updateCustomer(customerForm.id, {
      fullName: customerForm.fullName.trim(),
      name: customerForm.fullName.trim(),
      nic: customerForm.nic.trim(),
      phone: customerForm.phone.trim(),
      alternatePhone: customerForm.alternatePhone.trim() || undefined,
      email: customerForm.email.trim() || undefined,
      address: customerForm.address.trim(),
      town: customerForm.town.trim(),
      district: customerForm.district.trim(),
      village: customerForm.village.trim() || undefined,
      occupation: customerForm.occupation.trim() || undefined,
      monthlyIncome: Number(customerForm.monthlyIncome) || 0,
      status: customerForm.status,
      guarantorName: customerForm.guarantorName.trim() || undefined,
      guarantorNic: customerForm.guarantorNic.trim() || undefined,
      guarantorPhone: customerForm.guarantorPhone.trim() || undefined,
      guarantorRelationship: customerForm.guarantorRelationship.trim() || undefined,
    });

    setIsEditCustomerModalOpen(false);
    setToastMsg(`Customer "${customerForm.fullName}" updated successfully.`);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!deletingCustomer) return;
    const name = deletingCustomer.fullName || deletingCustomer.name || "Customer";
    deleteCustomer(deletingCustomer.id);
    if (selectedCustomerId === deletingCustomer.id) {
      setSelectedCustomerId(null);
    }
    setDeletingCustomer(null);
    setToastMsg(`Customer "${name}" has been removed from the system.`);
    setTimeout(() => setToastMsg(""), 4500);
  };

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isRbacOpen, setIsRbacOpen] = useState(false);
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

  // Switch tab with URL reflection
  const handleTabChange = (newTab: "customers" | "staff") => {
    setActiveTab(newTab);
    setSearchQuery("");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.replaceState({}, "", url.toString());
  };

  // ── CUSTOMERS COMPUTATIONS ────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        [c.id, c.name, c.fullName, c.phone, c.nic, c.town, c.village, c.district]
          .join(" ")
          .toLowerCase()
          .includes(q);

      return matchesSearch;
    });
  }, [customers, searchQuery]);

  const activeCustomerCount = useMemo(
    () => customers.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length,
    [customers]
  );
  const inactiveCustomerCount = customers.length - activeCustomerCount;

  const totalFinanced = useMemo(
    () => loans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0),
    [loans]
  );

  // Selected Customer Deep Data for slide-over drawer
  const selectedCustomer = useMemo(
    () => (selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId) ?? null : null),
    [customers, selectedCustomerId]
  );

  const customerLoans = useMemo(
    () => (selectedCustomer ? loans.filter((l) => l.customerId === selectedCustomer.id) : []),
    [loans, selectedCustomer]
  );

  const customerPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    const loanIds = customerLoans.map((l) => l.id);
    return payments.filter((p) => p.customerId === selectedCustomer.id || loanIds.includes(p.loanId));
  }, [payments, selectedCustomer, customerLoans]);

  const customerDocs = useMemo(
    () => (selectedCustomer ? documents.filter((d) => d.customerId === selectedCustomer.id) : []),
    [documents, selectedCustomer]
  );

  const customerTotalRepayable = useMemo(
    () => customerLoans.reduce((sum, l) => sum + getLoanTotalRepayment(l), 0),
    [customerLoans]
  );

  const customerTotalPaid = useMemo(
    () => customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [customerPayments]
  );

  const customerOutstanding = Math.max(
    0,
    Math.round((customerTotalRepayable - customerTotalPaid) * 100) / 100
  );

  // ── STAFF COMPUTATIONS ────────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staffUsers.filter((u) => {
      const matchesSearch =
        !q ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.branch || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q);

      const matchesRole =
        staffRoleFilter === "ALL" || u.role.toUpperCase() === staffRoleFilter.toUpperCase();

      return matchesSearch && matchesRole;
    });
  }, [staffUsers, searchQuery, staffRoleFilter]);

  const staffRoleCounts = useMemo(() => {
    return {
      admin: staffUsers.filter((u) => u.role === "Administrator").length,
      loanOfficer: staffUsers.filter((u) => u.role === "Loan Officer").length,
      fieldOrAudit: staffUsers.filter(
        (u) => u.role === "Collection Agent" || u.role === "Auditor"
      ).length,
    };
  }, [staffUsers]);

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

  // Open modal for editing staff
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

  const handleRoleChange = (role: StaffUser["role"]) => {
    setStaffForm((prev) => ({
      ...prev,
      role,
      permissions: { ...ROLE_PRESET_PERMISSIONS[role] },
    }));
  };

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
      setToastMsg(`Staff member ${staffForm.name} updated successfully.`);
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      const newStaff: StaffUser = {
        id: staffForm.id,
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        branch: staffForm.branch,
        status: staffForm.status,
        joinedDate: todayStr,
        permissions: staffForm.permissions,
      };
      addStaffUser(newStaff);
      setToastMsg(`New staff member ${staffForm.name} registered.`);
    }

    setIsStaffModalOpen(false);
    setTimeout(() => setToastMsg(""), 4500);
  };

  const handleToggleStaffStatus = (user: StaffUser) => {
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    updateStaffUser(user.id, { status: newStatus });
    setToastMsg(`Staff member ${user.name} is now ${newStatus}.`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  return (
    <main className="min-h-screen bg-slate-50/80 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-8 space-y-3.5">
        {/* Toast Feedback */}
        {toastMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button
              onClick={() => setToastMsg("")}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* ═══ TOP EXECUTIVE BAR: TITLE & SEGMENTED SWITCHER ══════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Left: Section Header & Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <div className="border-r-0 sm:border-r border-slate-200 sm:pr-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 block leading-tight">
                ACCESS &amp; IDENTITY HUB
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                User Management
              </h1>
            </div>

            {/* Segmented Switcher Controls */}
            <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTabChange("customers")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "customers"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Users size={14} className={activeTab === "customers" ? "text-red-600" : "text-slate-400"} />
                <span>Customer</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "customers"
                      ? "bg-red-50 text-red-700 border border-red-200/80"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {customers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("staff")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "staff"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <ShieldCheck size={14} className={activeTab === "staff" ? "text-red-600" : "text-slate-400"} />
                <span>Staff &amp; Roles</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "staff"
                      ? "bg-red-50 text-red-700 border border-red-200/80"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {staffUsers.length}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Contextual Primary Action Button */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {activeTab === "customers" ? (
              <button
                type="button"
                onClick={() => router.push(`/customers/new?fresh=${Date.now()}`)}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-red-600/20 transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Register Customer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddStaff}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-red-600/20 transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══ COMPACT HIGH-DENSITY METRICS STRIP ═════════════════════════════ */}
        {activeTab === "customers" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Users size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Customers
                </p>
                <p className="text-lg font-black text-slate-900 leading-tight font-mono">
                  {customers.length}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">Client directory registry</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Active Customers
                </p>
                <p className="text-lg font-black text-emerald-600 leading-tight font-mono">
                  {activeCustomerCount}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold truncate">Performing accounts</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <UserX size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Inactive / Settled
                </p>
                <p className="text-lg font-black text-slate-700 leading-tight font-mono">
                  {inactiveCustomerCount}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">No active dues</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CreditCard size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Gross Portfolio
                </p>
                <p className="text-lg font-black text-slate-900 leading-tight font-mono truncate">
                  {MONEY(totalFinanced)}
                </p>
                <p className="text-[10px] text-blue-700 font-medium truncate">{loans.length} issued facilities</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Total Staff
                </p>
                <p className="text-lg font-black text-slate-900 leading-tight font-mono">
                  {staffUsers.length}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate">Internal operators</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Shield size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Administrators
                </p>
                <p className="text-lg font-black text-purple-700 leading-tight font-mono">
                  {staffRoleCounts.admin}
                </p>
                <p className="text-[10px] text-purple-700 font-semibold truncate">Tier 1 · Full access</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Loan Officers
                </p>
                <p className="text-lg font-black text-emerald-700 leading-tight font-mono">
                  {staffRoleCounts.loanOfficer}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold truncate">Tier 2 · Credit &amp; Onboarding</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Lock size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  Field &amp; Audit
                </p>
                <p className="text-lg font-black text-amber-700 leading-tight font-mono">
                  {staffRoleCounts.fieldOrAudit}
                </p>
                <p className="text-[10px] text-amber-700 font-semibold truncate">Collections &amp; Verification</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ACTION & FILTER TOOLBAR ═══════════════════════════════════════ */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Dynamic Search Box */}
          <div className="relative flex-1 sm:max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "customers"
                  ? "Search customer by name, NIC, phone, town or ID…"
                  : "Search staff personnel by name, email, branch or ID…"
              }
              className="pl-8 pr-8 py-1.5 h-9 text-xs bg-slate-50/60 border border-slate-200 rounded-xl w-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Dynamic Filter Controls (Staff Tab Only) */}
          {activeTab === "staff" && (
            <div className="flex items-center gap-2">
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="h-8 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="ALL">All Roles ({staffUsers.length})</option>
                <option value="ADMINISTRATOR">Administrator ({staffRoleCounts.admin})</option>
                <option value="LOAN OFFICER">Loan Officer ({staffRoleCounts.loanOfficer})</option>
                <option value="COLLECTION AGENT">Collection Agent</option>
                <option value="AUDITOR">Auditor</option>
              </select>

              <button
                type="button"
                onClick={() => setIsRbacOpen(!isRbacOpen)}
                className="h-8 px-2.5 inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <HelpCircle size={13} className="text-slate-500" />
                <span>RBAC Guide</span>
                {isRbacOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* ═══ COLLAPSIBLE RBAC POLICY GUIDE (FOR STAFF TAB) ══════════════════ */}
        {activeTab === "staff" && isRbacOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-red-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Role-Based Access Control Architecture
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500">Security Policies Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200/70 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                  Tier 1 · Administrator
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">Full System Authority</p>
                <p className="text-[11px] text-slate-600">
                  Loan approval, interest configuration, fee rules, audit trail, user permission overrides.
                </p>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/70 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Tier 2 · Loan Officer
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">Credit &amp; Collections</p>
                <p className="text-[11px] text-slate-600">
                  Borrower registration, loan appraisal, document uploads, repayment collections &amp; receipts.
                </p>
              </div>

              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/70 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Tier 3 · Field &amp; Auditor
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">Operations &amp; Verification</p>
                <p className="text-[11px] text-slate-600">
                  Field collections, receipt issuance, audit trail inspection, compliance reporting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ VIEW 1: CUSTOMERS (BORROWERS) DIRECTORY TABLE ══════════════════ */}
        {activeTab === "customers" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left text-xs whitespace-nowrap min-w-[860px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-5">Customer Profile</th>
                    <th className="py-3 px-4">Customer ID</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">NIC Number</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCustomers.map((c) => {
                    const displayName = c.fullName || c.name || "Client";
                    const initials = displayName
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const isActive = (c.status || "").toUpperCase() === "ACTIVE";

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Avatar & Name */}
                        <td className="py-2.5 px-5">
                          <div className="flex items-center gap-2.5">
                            {c.photoUrl ? (
                              <img
                                src={c.photoUrl}
                                alt=""
                                className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs leading-tight truncate">
                                {displayName}
                              </p>
                              {c.occupation ? (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {c.occupation}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Customer ID */}
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {c.id}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                          {c.phone ? (
                            <a
                              href={`tel:${c.phone}`}
                              className="text-slate-800 hover:text-red-600 transition inline-flex items-center gap-1"
                            >
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <span>{c.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* NIC */}
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                          {c.nic || "—"}
                        </td>

                        {/* Address */}
                        <td className="py-2.5 px-4 text-slate-700 font-medium">
                          <span>{c.address || c.town || "—"}</span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? "bg-emerald-600" : "bg-slate-400"
                              }`}
                            />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(c.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition cursor-pointer"
                              title="Quick Overview"
                            >
                              Quick View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCustomer(c)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Edit Customer Details"
                            >
                              <Edit size={13} />
                            </button>
                            <Link
                              href={`/loans/new?customerId=${c.id}`}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Issue New Loan"
                            >
                              <PlusCircle size={13} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Customer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCustomers.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs space-y-2">
                  <Users size={28} className="mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">No customer records found</p>
                  <p>Try modifying your search criteria or register a new customer.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ VIEW 2: STAFF & ROLES DIRECTORY TABLE ═════════════════════════ */}
        {activeTab === "staff" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left text-xs whitespace-nowrap min-w-[860px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-4">Role &amp; Status</th>
                    <th className="py-3 px-4">Branch Office</th>
                    <th className="py-3 px-4">System Authority Flags</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaff.map((u) => {
                    const initials = u.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const roleBadgeColor =
                      u.role === "Administrator"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : u.role === "Loan Officer"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : u.role === "Collection Agent"
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-red-50 text-red-800 border-red-200";

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Staff Profile */}
                        <td className="py-2.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-xs leading-tight truncate">
                                {u.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-medium">
                                <span>{u.email}</span>
                                <span>•</span>
                                <span className="font-mono font-semibold text-slate-700">{u.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Status */}
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleBadgeColor}`}>
                              {u.role}
                            </span>
                            <span
                              className={`text-[9px] font-bold flex items-center gap-1 ${
                                u.status === "Active" ? "text-emerald-700" : "text-slate-500"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === "Active" ? "bg-emerald-600" : "bg-slate-400"
                                }`}
                              />
                              {u.status}
                            </span>
                          </div>
                        </td>

                        {/* Branch Office */}
                        <td className="py-2.5 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            <Building size={12} className="text-slate-400 shrink-0" />
                            <span>{u.branch}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Joined {u.joinedDate}</span>
                        </td>

                        {/* Permissions Chips */}
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.permissions.approveLoans && (
                              <span className="px-1.5 py-0.2 bg-red-50 text-red-800 rounded text-[9px] font-bold border border-red-200">
                                Approve Loans
                              </span>
                            )}
                            {u.permissions.recordRepayments && (
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 rounded text-[9px] font-bold border border-emerald-200">
                                Repayments
                              </span>
                            )}
                            {u.permissions.exportReports && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-800 rounded text-[9px] font-bold border border-purple-200">
                                Exports
                              </span>
                            )}
                            {u.permissions.manageCustomers && (
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-800 rounded text-[9px] font-bold border border-slate-200">
                                Customers
                              </span>
                            )}
                            {u.permissions.manageSettings && (
                              <span className="px-1.5 py-0.2 bg-rose-50 text-rose-800 rounded text-[9px] font-bold border border-rose-200">
                                Settings
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 size={11} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer border ${
                                u.status === "Active"
                                  ? "text-slate-700 bg-slate-100 border-slate-300 hover:bg-rose-50 hover:text-rose-700"
                                  : "text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
                              }`}
                            >
                              {u.status === "Active" ? <UserX size={11} /> : <Check size={11} />}
                              <span>{u.status === "Active" ? "Disable" : "Enable"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStaff.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-xs space-y-2">
                  <ShieldCheck size={28} className="mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700 text-sm">No staff personnel found</p>
                  <p>Try modifying your search or role filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ CUSTOMER QUICK PROFILE DRAWER / MODAL ═════════════════════════ */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  {selectedCustomer.photoUrl ? (
                    <img
                      src={selectedCustomer.photoUrl}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 font-black text-sm flex items-center justify-center shrink-0">
                      {(selectedCustomer.fullName || selectedCustomer.name || "C").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      {selectedCustomer.fullName || selectedCustomer.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Borrower ID: <span className="font-mono font-bold text-slate-700">{selectedCustomer.id}</span>
                      {selectedCustomer.nic && (
                        <span> · NIC: <span className="font-mono font-bold text-slate-700">{selectedCustomer.nic}</span></span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Borrowed</span>
                  <span className="text-sm font-black font-mono text-slate-900 mt-0.5 block">
                    {MONEY(customerTotalRepayable)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Repaid</span>
                  <span className="text-sm font-black font-mono text-emerald-600 mt-0.5 block">
                    {MONEY(customerTotalPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Outstanding</span>
                  <span className="text-sm font-black font-mono text-rose-600 mt-0.5 block">
                    {MONEY(customerOutstanding)}
                  </span>
                </div>
              </div>

              {/* Active Facilities Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Loan Facilities ({customerLoans.length})
                  </h3>
                  <Link
                    href={`/loans/new?customerId=${selectedCustomer.id}`}
                    className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                  >
                    <span>+ Issue Facility</span>
                  </Link>
                </div>

                {customerLoans.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {customerLoans.map((l) => (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {l.loanNo || l.id}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Disbursed: {MONEY(l.principal || l.amount || 0)} · {l.repaymentFrequency || "Monthly"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (l.status || "").toLowerCase() === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : (l.status || "").toLowerCase() === "completed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {l.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                    No credit facilities recorded for this client.
                  </div>
                )}
              </div>

              {/* KYC Documents Preview */}
              {customerDocs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    KYC &amp; Verification Documents ({customerDocs.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {customerDocs.slice(0, 4).map((d) => (
                      <div
                        key={d.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs"
                      >
                        <FileText size={14} className="text-red-600 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">{d.title || d.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEditCustomer(selectedCustomer);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit size={12} />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingCustomer(selectedCustomer);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/customers/${selectedCustomer.id}`}
                    className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                  >
                    <span>Full Profile</span>
                    <ArrowRight size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CUSTOMER EDIT MODAL ════════════════════════════════════════════ */}
        {isEditCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <Edit size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Edit Customer Profile
                    </h3>
                    <p className="text-xs text-slate-500 font-medium font-mono">
                      {customerForm.id} · {customerForm.nic}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditCustomerModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.fullName}
                      onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                      placeholder="e.g. Sunil Perera"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">NIC Number *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.nic}
                      onChange={(e) => setCustomerForm({ ...customerForm, nic: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono"
                      placeholder="e.g. 198512345678"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Primary Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono"
                      placeholder="e.g. 0771234567"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Alternate Phone</label>
                    <input
                      type="text"
                      value={customerForm.alternatePhone}
                      onChange={(e) => setCustomerForm({ ...customerForm, alternatePhone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono"
                      placeholder="e.g. 0719876543"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Residential Address</label>
                    <input
                      type="text"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                      placeholder="Street address"
                    />
                  </div>

                  

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Occupation / Business</label>
                    <input
                      type="text"
                      value={customerForm.occupation}
                      onChange={(e) => setCustomerForm({ ...customerForm, occupation: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                      placeholder="e.g. Retail Trader"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Customer Status</label>
                    <select
                      value={customerForm.status}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          status: e.target.value as CustomerStatus,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-bold"
                    >
                      <option value="Active">Active (Eligible for Loans)</option>
                      <option value="Inactive">Inactive</option>
                      <option value="SUSPENDED">Suspended / Blacklisted</option>
                    </select>
                  </div>

                  {/* Guarantor Info */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Guarantor Name</label>
                    <input
                      type="text"
                      value={customerForm.guarantorName}
                      onChange={(e) => setCustomerForm({ ...customerForm, guarantorName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                      placeholder="Guarantor name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Guarantor Contact</label>
                    <input
                      type="text"
                      value={customerForm.guarantorPhone}
                      onChange={(e) => setCustomerForm({ ...customerForm, guarantorPhone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white font-mono"
                      placeholder="07xxxxxxxx"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Link
                    href={`/customers/${customerForm.id}/edit`}
                    className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Upload Documents &amp; Photos</span>
                    <ExternalLink size={12} />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditCustomerModalOpen(false)}
                      className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs shadow-red-600/20 transition cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ CUSTOMER DELETE CONFIRMATION MODAL ═════════════════════════════ */}
        {deletingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Delete Customer Profile?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to remove <strong>{deletingCustomer.fullName || deletingCustomer.name}</strong> ({deletingCustomer.id}) from the system?
                  </p>
                </div>
              </div>

              {loans.filter((l) => l.customerId === deletingCustomer.id).length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>Active Records Detected</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    This customer currently has {loans.filter((l) => l.customerId === deletingCustomer.id).length} recorded loan facility/facilities. Deleting will remove them from the active customer directory.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCustomer}
                  className="px-5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs shadow-rose-600/20 transition cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingStaffId ? "Edit Staff User Authority" : "Register New Staff Personnel"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure staff identity, operational role, and access rights.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveStaff} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Staff ID</label>
                    <input
                      type="text"
                      value={staffForm.id}
                      disabled
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold"
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
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Full Legal Name</label>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Corporate Email</label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => handleRoleChange(e.target.value as StaffUser["role"])}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
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
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
                    >
                      {BRANCH_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Granular Permissions */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-800 block">
                    Granular Authorization Permissions
                  </span>
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    {[
                      { key: "approveLoans" as const, title: "Approve & Disburse Loans", desc: "Authorize pending credit lines" },
                      { key: "recordRepayments" as const, title: "Record Collections", desc: "Accept payments & generate receipts" },
                      { key: "exportReports" as const, title: "Export Financial Reports", desc: "Download CSV journals & audits" },
                      { key: "manageCustomers" as const, title: "Manage Borrowers", desc: "Register & edit customer details" },
                      { key: "manageSettings" as const, title: "System Configurations", desc: "Modify policy interest rates" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffForm.permissions[item.key]}
                          onChange={(e) =>
                            setStaffForm({
                              ...staffForm,
                              permissions: {
                                ...staffForm.permissions,
                                [item.key]: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="leading-tight">
                          <span className="font-bold text-slate-900 block">{item.title}</span>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs shadow-red-600/20 transition cursor-pointer"
                  >
                    {editingStaffId ? "Update Staff User" : "Save Staff Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function UserManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto text-xs text-slate-400">
          Loading User Management Hub...
        </div>
      }
    >
      <UserManagementContent />
    </Suspense>
  );
}

