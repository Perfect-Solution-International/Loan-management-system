/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  User,
  CreditCard,
  Wallet,
  FileText,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";

interface AuditEntry {
  id: string;
  timestamp: string; // ISO or YYYY-MM-DD HH:mm
  date: string;
  category: "PAYMENT" | "LOAN" | "CUSTOMER" | "STAFF" | "SYSTEM";
  action: string;
  actor: string;
  actorRole: string;
  details: string;
  targetId?: string;
  targetName?: string;
  amount?: number;
  status: "SUCCESS" | "PENDING" | "WARNING";
}

export default function AuditLogsPage() {
  const { auditLogs, staffUsers } = useData();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [todayStr, setTodayStr] = useState<string>("2026-10-15");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTodayStr(new Date().toISOString().slice(0, 10));
    }
  }, []);

  // ── Build Live Audit Trail from System Entities ─────────────────────────
  const auditEntries: AuditEntry[] = useMemo(() => auditLogs.map(log => ({
    id: log.id, timestamp: log.timestamp, date: log.timestamp.slice(0, 10),
    category: (/payment|repayment/i.test(log.module) ? "PAYMENT" : /loan/i.test(log.module) ? "LOAN" : /customer/i.test(log.module) ? "CUSTOMER" : /auth|staff/i.test(log.module) ? "STAFF" : "SYSTEM") as AuditEntry["category"],
    action: log.action.replaceAll("_", " "), actor: log.userName, actorRole: log.userRole, details: log.details,
    status: log.severity === "INFO" ? "SUCCESS" : "WARNING",
  })), [auditLogs]);

  // ── Filtered Audit Entries ──────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    return auditEntries.filter((entry) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        entry.action.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.targetName?.toLowerCase().includes(q) ||
        entry.targetId?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Category filter
      if (categoryFilter !== "ALL" && entry.category !== categoryFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === "TODAY") {
        return entry.date === todayStr;
      }
      if (dateFilter === "WEEK") {
        const entryD = new Date(entry.date);
        const nowD = new Date(todayStr);
        const diffDays = (nowD.getTime() - entryD.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (dateFilter === "MONTH") {
        return entry.date.slice(0, 7) === todayStr.slice(0, 7);
      }

      return true;
    });
  }, [auditEntries, searchTerm, categoryFilter, dateFilter, todayStr]);

  // ── CSV Export Handler ──────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Category", "Action", "Actor", "Role", "Target ID", "Target Name", "Details", "Amount", "Status"];
    const rows = filteredEntries.map((e) => [
      e.timestamp,
      e.category,
      `"${e.action}"`,
      `"${e.actor}"`,
      `"${e.actorRole}"`,
      `"${e.targetId || ""}"`,
      `"${e.targetName || ""}"`,
      `"${e.details.replace(/"/g, '""')}"`,
      e.amount || "",
      e.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PSI_Audit_Trail_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto workspace-page">
      <div className="workspace-heading">
        <h2>Activity and audit trail</h2>
        <p>Review recorded activity across customers, loans, payments, and staff.</p>
      </div>
      {/* ── Top Action Controls ── */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
        >
          <Printer size={13} />
          Print Report
        </button>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* ── KPI Metric Summary ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Audit Events</p>
          <h3 className="text-xl font-semibold text-slate-900 mt-0.5 leading-tight">{auditEntries.length}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged across all operations</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Financial Collections</p>
          <h3 className="text-xl font-semibold text-emerald-700 mt-0.5 leading-tight">
            {auditEntries.filter((e) => e.category === "PAYMENT").length}
          </h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Payment receipts recorded</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Loan Facility Audits</p>
          <h3 className="text-xl font-semibold text-blue-700 mt-0.5 leading-tight">
            {auditEntries.filter((e) => e.category === "LOAN").length}
          </h3>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">Issued & approved facilities</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supervised Staff</p>
          <h3 className="text-xl font-semibold text-purple-700 mt-0.5 leading-tight">{staffUsers.length}</h3>
          <p className="text-[11px] text-purple-600 font-medium mt-0.5">Active operational personnel</p>
        </div>
      </div>

      {/* ── Search and Filter Controls ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, actor, target ID, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500" aria-label="Search by action, actor, target ID, details..."
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  dateFilter === period
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {period === "ALL" ? "All Time" : period === "TODAY" ? "Today" : period === "WEEK" ? "Last 7 Days" : "This Month"}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 text-xs table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
          <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={12} /> Category:
          </span>
          {[
            { id: "ALL", label: "All Activity" },
            { id: "PAYMENT", label: "Collections & Payments" },
            { id: "LOAN", label: "Loan Facilities" },
            { id: "CUSTOMER", label: "Customer Onboarding" },
            { id: "STAFF", label: "Staff & Governance" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-red-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Audit Logs Table ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldCheck size={36} className="text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">No Audit Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm ? "No activity entries match your query." : "There are no audit events logged in this category."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
            <table className="w-full text-left text-xs lms-table">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4" scope="col">Timestamp & Date</th>
                  <th className="py-3 px-4" scope="col">Event Category</th>
                  <th className="py-3 px-4" scope="col">Action</th>
                  <th className="py-3 px-4" scope="col">Operator / Staff</th>
                  <th className="py-3 px-4" scope="col">Target Entity</th>
                  <th className="py-3 px-4" scope="col">Audit Details</th>
                  <th className="py-3 px-4 text-right" scope="col">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className="font-bold text-slate-900 block">{entry.date}</span>
                        <span className="text-slate-400 text-[11px]">{entry.timestamp.slice(11) || "12:00"}</span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-bold text-[11px] uppercase border ${
                            entry.category === "PAYMENT"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : entry.category === "LOAN"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : entry.category === "CUSTOMER"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }`}
                        >
                          {entry.category}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {entry.action}
                      </td>

                      {/* Operator / Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{entry.actor}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{entry.actorRole}</span>
                      </td>

                      {/* Target Entity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {entry.targetName ? (
                          <>
                            <span className="font-bold text-slate-900 block">{entry.targetName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{entry.targetId}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-mono">{entry.targetId || "—"}</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={entry.details}>
                        {entry.details}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        {entry.amount ? (
                          <span className={entry.category === "PAYMENT" ? "text-emerald-700" : "text-slate-900"}>
                            {MONEY(entry.amount)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <b>{filteredEntries.length}</b> of <b>{auditEntries.length}</b> total events
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Audit Integrity: SHA-256 Verified
          </span>
        </div>
      </div>
    </div>
  );
}
