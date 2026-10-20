"use client";

import React, { useState, useMemo, Suspense } from "react";
import {
  Shield,
  ShieldCheck,
  Users,
  CheckCircle2,
  UserPlus,
  Edit3,
  Lock,
  Building,
  Search,
  X,
  FileText,
  UserX,
  Check,
  UserCheck,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import type { StaffUser, StaffPermissions } from "@/types";

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

function StaffContent() {
  const { staffUsers, addStaffUser, updateStaffUser } = useData();

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
      setNotificationMsg(`Staff member ${staffForm.name} updated successfully.`);
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
      setNotificationMsg(`New staff member ${staffForm.name} registered successfully.`);
    }

    setIsStaffModalOpen(false);
    setTimeout(() => setNotificationMsg(""), 4500);
  };

  // Toggle staff active/inactive status
  const handleToggleStaffStatus = (user: StaffUser) => {
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    updateStaffUser(user.id, { status: newStatus });
    setNotificationMsg(
      `Staff user ${user.name} has been marked as ${newStatus}.`
    );
    setTimeout(() => setNotificationMsg(""), 3500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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

      {/* Staff Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase">Total Personnel</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{staffUsers.length}</p>
            <p className="text-[10px] text-slate-600 font-medium mt-0.5">Across all branches</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase">Administrators</p>
            <p className="text-2xl font-black text-purple-700 mt-1">
              {staffUsers.filter((u) => u.role === "Administrator").length}
            </p>
            <p className="text-[10px] text-purple-800 font-semibold mt-0.5">Full access & policy control</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase">Loan Officers</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {staffUsers.filter((u) => u.role === "Loan Officer").length}
            </p>
            <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">Appraisal & onboarding</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase">Field Agents & Auditors</p>
            <p className="text-2xl font-black text-amber-700 mt-1">
              {staffUsers.filter((u) => u.role === "Collection Agent" || u.role === "Auditor").length}
            </p>
            <p className="text-[10px] text-amber-800 font-semibold mt-0.5">Collections & risk audit</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock size={20} />
          </div>
        </div>
      </div>

      {/* System Users and Access Levels Policy Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest">
              ACCESS CONTROL ARCHITECTURE &amp; RBAC
            </p>
            <h3 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
              System Users and Access Levels
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Configured roles, operational boundaries, and system privileges across internal personnel and borrower accounts.
            </p>
          </div>

          <span className="text-[11px] font-bold px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl self-start sm:self-auto">
            Role-Based Access Control (RBAC) Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Level 1: Administrator */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wider">
                  Tier 1 · Full Authority
                </span>
                <Shield size={16} className="text-purple-700" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Administrator</h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                  Full access to all authorized system management functions and regulatory controls.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-800 pt-1">
                {[
                  "Manage staff accounts and permissions",
                  "Register, view, edit, and manage customers",
                  "Upload and manage customer documents",
                  "Create and approve loans according to assigned authority",
                  "Configure interest rates, deduction rules, and repayment methods",
                  "View and manage loan records",
                  "Record and supervise repayments",
                  "View financial dashboards and reports",
                  "Manage system settings and backups",
                  "Review activity logs and financial adjustments",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="font-semibold text-slate-800 leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-bold flex items-center justify-between">
              <span>Assigned Personnel:</span>
              <span className="font-mono text-purple-800">{staffUsers.filter((u) => u.role === "Administrator").length} Users</span>
            </div>
          </div>

          {/* Level 2: Loan Officer / Staff */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider">
                  Tier 2 · Operational Staff
                </span>
                <UserCheck size={16} className="text-emerald-700" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Loan Officer / Staff</h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                  Operational functions permitted by the administrator for daily credit &amp; collection workflows.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-800 pt-1">
                {[
                  "Register new customers",
                  "Update customer details where permitted",
                  "Upload customer photographs and documents",
                  "Search and view customer profiles",
                  "Create loan applications",
                  "View loan calculations and repayment schedules",
                  "Record customer payments when authorized",
                  "Generate payment receipts",
                  "View assigned reports and customer histories",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="font-semibold text-slate-800 leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-bold flex items-center justify-between">
              <span>Assigned Personnel:</span>
              <span className="font-mono text-emerald-800">{staffUsers.filter((u) => u.role === "Loan Officer" || u.role === "Collection Agent").length} Users</span>
            </div>
          </div>

          {/* Level 3: Customer Account */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 uppercase tracking-wider">
                  Tier 3 · Borrower Portal
                </span>
                <Users size={16} className="text-blue-700" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Customer Account</h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                  Customer portal allowing borrowers self-service access to view their portfolio and make payments.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-800 pt-1">
                {[
                  "Log in securely via NIC or mobile",
                  "View their own active loan facilities",
                  "Check installment due dates & amounts",
                  "View repayment transaction history",
                  "Check live outstanding balances",
                  "Download official payment receipts",
                  "Upload bank slips or pay online via gateway",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                    <span className="font-semibold text-slate-800 leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                <span>Customer Self-Service Only (Restricted)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Add Staff Action */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search staff by name, email, or branch..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <select
            value={staffRoleFilter}
            onChange={(e) => setStaffRoleFilter(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white text-slate-700"
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
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-600/25 cursor-pointer"
        >
          <UserPlus size={15} className="text-white shrink-0" />
          <span className="text-white font-bold">Add Staff Member</span>
        </button>
      </div>

      {/* Staff Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 text-xs text-slate-700 font-black uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Staff Member</th>
                <th className="py-3.5 px-6">Role &amp; Status</th>
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
                    ? "bg-purple-100 text-purple-800 border-purple-300"
                    : user.role === "Loan Officer"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : user.role === "Collection Agent"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-red-100 text-red-800 border-red-300";

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {user.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-600 font-medium">
                            <span>{user.email}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-700 font-semibold">{user.id}</span>
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
                          className={`text-[10px] font-bold flex items-center gap-1 ${
                            user.status === "Active" ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "Active" ? "bg-emerald-600" : "bg-slate-400"
                            }`}
                          />
                          {user.status}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Building size={13} className="text-slate-500" />
                        <span>{user.branch}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Joined {user.joinedDate}
                      </span>
                    </td>

                    <td className="py-3.5 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.permissions.approveLoans && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-800 rounded text-[10px] font-bold border border-red-200">
                            Approve Loans
                          </span>
                        )}
                        {user.permissions.recordRepayments && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-bold border border-emerald-200">
                            Repayments
                          </span>
                        )}
                        {user.permissions.exportReports && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded text-[10px] font-bold border border-purple-200">
                            Exports
                          </span>
                        )}
                        {user.permissions.manageSettings && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded text-[10px] font-bold border border-rose-200">
                            Settings
                          </span>
                        )}
                        {user.permissions.manageCustomers && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold border border-slate-300">
                            Customers
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditStaff(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleToggleStaffStatus(user)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer border ${
                            user.status === "Active"
                              ? "text-slate-700 bg-slate-100 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              : "text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
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
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <Users size={32} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-700 text-sm">No staff members found</p>
              <p>Try modifying your search keywords or filter criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingStaffId ? "Edit Staff User & Permissions" : "Register New Staff Member"}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Assign user details, role level, and granular authority flags.
                </p>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono font-semibold"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
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
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
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
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleRoleChange(e.target.value as StaffUser["role"])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
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
                  <span className="text-[10px] text-slate-600 font-medium">
                    Preset by role, customizable
                  </span>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
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
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-bold block leading-tight text-slate-900">Approve &amp; Disburse Loans</span>
                      <span className="text-[10px] text-slate-600 font-medium">Authorize pending credit applications</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
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
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-bold block leading-tight text-slate-900">Record Repayment Collections</span>
                      <span className="text-[10px] text-slate-600 font-medium">Collect installments &amp; issue receipts</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
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
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-bold block leading-tight text-slate-900">Export Financial Reports</span>
                      <span className="text-[10px] text-slate-600 font-medium">Download CSV ledger journals &amp; aggregates</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
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
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-bold block leading-tight text-slate-900">Register &amp; Edit Customers</span>
                      <span className="text-[10px] text-slate-600 font-medium">Customer directory and document upload</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
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
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="font-bold block leading-tight text-slate-900">Modify System Settings &amp; Rates</span>
                      <span className="text-[10px] text-slate-600 font-medium">Administrative policy configurations</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-md shadow-red-600/25 cursor-pointer"
                >
                  <span className="text-white font-bold">{editingStaffId ? "Update Staff User" : "Save Staff Member"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto text-xs text-slate-400">
          Loading staff personnel...
        </div>
      }
    >
      <StaffContent />
    </Suspense>
  );
}
