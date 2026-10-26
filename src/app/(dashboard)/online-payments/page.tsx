"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  FileText,
  Building,
  Hash,
  Calendar,
  User,
  Receipt,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type { OnlinePayment, OnlinePaymentStatus, Loan, Payment } from "@/types";

export default function OnlinePaymentsPage() {
  const {
    onlinePayments,
    customers,
    loans,
    payments,
    approveOnlinePayment,
    rejectOnlinePayment,
    addOnlinePayment,
    getNextReceiptNo,
  } = useData();

  // Active filter tab: "ALL" | "PENDING" | "COMPLETED" | "REJECTED"
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "COMPLETED" | "REJECTED">("ALL");

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("ALL");
  const [notificationMsg, setNotificationMsg] = useState("");

  // Slip Image Modal State & Error Tracking
  const [selectedSlip, setSelectedSlip] = useState<OnlinePayment | null>(null);
  const [slipImgError, setSlipImgError] = useState(false);

  // Safe Slip URL formatter (handles unencoded SVG, data URLs, etc.)
  const getSafeSlipUrl = (slip: OnlinePayment | null): string => {
    if (!slip || !slip.slipUrl) return "";
    if (slip.slipUrl.startsWith("data:image/svg+xml;utf8,")) {
      const raw = slip.slipUrl.replace("data:image/svg+xml;utf8,", "");
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw);
    }
    return slip.slipUrl;
  };

  // Approval Modal State
  const [approvingPayment, setApprovingPayment] = useState<OnlinePayment | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Rejection Modal State
  const [rejectingPayment, setRejectingPayment] = useState<OnlinePayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Receipt Modal State (for viewing reconciled payments)
  const [receiptToView, setReceiptToView] = useState<Payment | null>(null);

  // Bank Options
  const SRI_LANKAN_BANKS = [
    "Commercial Bank of Ceylon",
    "Bank of Ceylon (BOC)",
    "People's Bank",
    "Sampath Bank",
    "Hatton National Bank (HNB)",
    "Nations Trust Bank (NTB)",
    "Seylan Bank",
    "DFCC Bank",
    "National Savings Bank (NSB)",
    "Other / Digital Wallet",
  ];

  // Tab counts
  const counts = useMemo(() => {
    const all = onlinePayments.length;
    const pending = onlinePayments.filter((p) => p.status === "PENDING").length;
    const completed = onlinePayments.filter((p) => p.status === "COMPLETED").length;
    const rejected = onlinePayments.filter((p) => p.status === "REJECTED").length;
    return { all, pending, completed, rejected };
  }, [onlinePayments]);

  // Financial summary metrics
  const summaryMetrics = useMemo(() => {
    const pendingTotal = onlinePayments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const completedTotal = onlinePayments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalSubmitted = onlinePayments.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    return { pendingTotal, completedTotal, totalSubmitted };
  }, [onlinePayments]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return onlinePayments.filter((item) => {
      // Tab matching
      if (activeTab === "PENDING" && item.status !== "PENDING") return false;
      if (activeTab === "COMPLETED" && item.status !== "COMPLETED") return false;
      if (activeTab === "REJECTED" && item.status !== "REJECTED") return false;

      // Bank filter
      if (bankFilter !== "ALL" && !item.bankName.toLowerCase().includes(bankFilter.toLowerCase())) {
        return false;
      }

      // Search matching (Customer name, NIC, phone, loan ID, reference number, slip ID)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = item.customerName.toLowerCase().includes(query);
        const matchesNic = (item.customerNic || "").toLowerCase().includes(query);
        const matchesPhone = (item.customerPhone || "").includes(query);
        const matchesLoan = (item.loanNo || item.loanId).toLowerCase().includes(query);
        const matchesRef = (item.referenceNumber || "").toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesBank = item.bankName.toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesNic &&
          !matchesPhone &&
          !matchesLoan &&
          !matchesRef &&
          !matchesId &&
          !matchesBank
        ) {
          return false;
        }
      }

      return true;
    });
  }, [onlinePayments, activeTab, bankFilter, searchQuery]);

  // Handle Approve Confirmation
  const handleConfirmApproval = () => {
    if (!approvingPayment) return;

    approveOnlinePayment(
      approvingPayment.id,
      approvalNotes.trim() || undefined,
      "Super Admin"
    );

    setNotificationMsg(
      `Online payment ${approvingPayment.id} for ${MONEY(
        approvingPayment.amount
      )} approved successfully. Repayment credited to loan ${approvingPayment.loanNo || approvingPayment.loanId}.`
    );

    setApprovingPayment(null);
    setApprovalNotes("");
    setTimeout(() => setNotificationMsg(""), 5000);
  };

  // Handle Reject Confirmation
  const handleConfirmRejection = () => {
    if (!rejectingPayment) return;

    if (!rejectionReason.trim()) {
      alert("Please provide a reason for declining this payment slip.");
      return;
    }

    rejectOnlinePayment(
      rejectingPayment.id,
      rejectionReason.trim(),
      "Super Admin"
    );

    setNotificationMsg(
      `Payment slip ${rejectingPayment.id} has been declined. Customer notified.`
    );

    setRejectingPayment(null);
    setRejectionReason("");
    setTimeout(() => setNotificationMsg(""), 5000);
  };

  return (
    <div className="mx-auto workspace-page">
      <div className="workspace-heading">
        <h2>Online payment slips</h2>
        <p>Review submitted bank slips and track approval decisions.</p>
      </div>
      {/* ── Notification Feedback Toast ────────────────────────────────────── */}
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900 shadow-2xs animate-in fade-in duration-200" role="status">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button
            onClick={() => setNotificationMsg("")}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer" aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Top Action ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <Link
          href="/repayments"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs"
        >
          <Receipt size={13} />
          <span>Repayment Ledger</span>
        </Link>
      </div>

      {/* ── Summary KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Pending Card */}
        <div className="bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border border-amber-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={12} className="text-amber-700" />
              Pending Review
            </span>
            <span className="font-mono font-bold text-amber-900 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200">
              {counts.pending} Pending
            </span>
          </div>
          <p className="text-lg sm:text-xl font-semibold text-slate-950 font-mono tracking-tight leading-tight mt-1">
            {MONEY(summaryMetrics.pendingTotal)}
          </p>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-amber-200/60 text-[11px]">
            <span className="text-slate-500">Slips Awaiting Sign-Off</span>
            <span className="font-bold text-amber-800">Awaiting Action</span>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 border border-emerald-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-700" />
              Approved &amp; Reconciled
            </span>
            <span className="font-mono font-bold text-emerald-900 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
              {counts.completed} Approved
            </span>
          </div>
          <p className="text-lg sm:text-xl font-semibold text-slate-950 font-mono tracking-tight leading-tight mt-1">
            {MONEY(summaryMetrics.completedTotal)}
          </p>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/60 text-[11px]">
            <span className="text-slate-500">Credited to Loan Accounts</span>
            <span className="font-bold text-emerald-700">Reconciled</span>
          </div>
        </div>

        {/* Total Submitted */}
        <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={12} className="text-slate-600" />
              Total Online Volume
            </span>
            <span className="font-mono font-bold text-slate-800 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              {counts.all} Total
            </span>
          </div>
          <p className="text-lg sm:text-xl font-semibold text-slate-950 font-mono tracking-tight leading-tight mt-1">
            {MONEY(summaryMetrics.totalSubmitted)}
          </p>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Total Online Slip Records</span>
            <span className="font-bold text-slate-700">All Slips</span>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ───────────────────────────────────────── */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "ALL"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>All Slips</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                activeTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "PENDING"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
            }`}
          >
            <span>Pending Review</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                activeTab === "PENDING"
                  ? "bg-white/25 text-white"
                  : "bg-amber-200/80 text-amber-950 font-semibold"
              }`}
            >
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "COMPLETED"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200"
            }`}
          >
            <span>Complete / Approved</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                activeTab === "COMPLETED"
                  ? "bg-white/25 text-white"
                  : "bg-emerald-200/80 text-emerald-950 font-semibold"
              }`}
            >
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REJECTED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "REJECTED"
                ? "bg-rose-700 text-white shadow-md shadow-rose-700/20"
                : "bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200"
            }`}
          >
            <span>Declined</span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                activeTab === "REJECTED"
                  ? "bg-white/25 text-white"
                  : "bg-rose-200/80 text-rose-950 font-semibold"
              }`}
            >
              {counts.rejected}
            </span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, NIC, phone, loan ID, or bank ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium" aria-label="Search by customer name, NIC, phone, loan ID, or bank ref..."
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold bg-white text-slate-700"
            >
              <option value="ALL">All Banks</option>
              {SRI_LANKAN_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Payments List Table / Cards ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <CreditCard size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No payment slips match your filters</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || bankFilter !== "ALL" || activeTab !== "ALL"
                ? "No payment slips match your active search or filter criteria. Try adjusting your filters."
                : "No customer online payment slips have been submitted yet. When customers transfer funds and submit deposit slips, they will appear here for review."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
            <table className="w-full text-left border-collapse text-xs lms-table">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4" scope="col">Slip ID & Date</th>
                  <th className="py-3 px-4" scope="col">Borrower Details</th>
                  <th className="py-3 px-4" scope="col">Loan Reference</th>
                  <th className="py-3 px-4" scope="col">Bank & Transaction Ref</th>
                  <th className="py-3 px-4 text-right" scope="col">Amount Paid</th>
                  <th className="py-3 px-4 text-center" scope="col">Slip Proof</th>
                  <th className="py-3 px-4 text-center" scope="col">Status</th>
                  <th className="py-3 px-4 text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((item) => {
                  const targetLoan = loans.find((l) => l.id === item.loanId);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition group items-center"
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {item.id}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {item.paymentDate}
                        </span>
                      </td>

                      {/* Borrower */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/customers/${item.customerId}`}
                          className="font-bold text-slate-900 hover:text-red-600 block transition"
                        >
                          {item.customerName}
                        </Link>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {item.customerNic && <span>NIC: {item.customerNic}</span>}
                          {item.customerPhone && <span>· Tel: {item.customerPhone}</span>}
                        </div>
                      </td>

                      {/* Loan Reference */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/loans/${item.loanId}`}
                          className="font-mono font-bold text-red-700 hover:underline block"
                        >
                          {item.loanNo || item.loanId}
                        </Link>
                        {targetLoan && (
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Facility: {MONEY(targetLoan.principal || targetLoan.amount || 0)}
                          </span>
                        )}
                      </td>

                      {/* Bank & Ref */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block flex items-center gap-1">
                          <Building size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{item.bankName}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-slate-200">
                          Ref: {item.referenceNumber}
                        </span>
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-semibold text-sm text-slate-950 block">
                          {MONEY(item.amount)}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 block">
                          Bank Transfer
                        </span>
                      </td>

                      {/* Pay Slip Preview Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => { setSelectedSlip(item); setSlipImgError(false); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200/80 shadow-2xs"
                          title="Click to view bank deposit slip"
                        >
                          <Eye size={13} className="text-red-600" />
                          <span>View Slip</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock size={11} /> Pending Review
                          </span>
                        )}
                        {item.status === "COMPLETED" && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 size={11} /> Complete
                            </span>
                            {item.receiptNo && (
                              <span className="font-mono text-[11px] text-slate-600 block">
                                {item.receiptNo}
                              </span>
                            )}
                          </div>
                        )}
                        {item.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            <XCircle size={11} /> Declined
                          </span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {item.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setApprovingPayment(item);
                                setApprovalNotes("");
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                              title="Approve slip & credit loan"
                            >
                              <Check size={13} /> Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingPayment(item);
                                setRejectionReason("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                              title="Decline slip"
                            >
                              <X size={13} /> Decline
                            </button>
                          </div>
                        )}

                        {item.status === "COMPLETED" && (
                          <div className="flex items-center justify-end gap-1">
                            {item.receiptNo && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Locate payment record to print
                                  const foundPayment = payments.find(
                                    (p) => p.receiptNo === item.receiptNo
                                  );
                                  if (foundPayment) {
                                    setReceiptToView(foundPayment);
                                  } else {
                                    setReceiptToView({
                                      id: `PAY-${item.id}`,
                                      loanId: item.loanId,
                                      customerId: item.customerId,
                                      amount: item.amount,
                                      date: item.paymentDate,
                                      type: "Capital",
                                      method: "Bank Transfer",
                                      receiptNo: item.receiptNo,
                                      collectedBy: item.reviewedBy || "Admin Officer",
                                      notes: `Bank Transfer Slip Verified: Ref ${item.referenceNumber}`,
                                    });
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200"
                              >
                                <Receipt size={12} className="text-red-600" />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>
                        )}

                        {item.status === "REJECTED" && (
                          <span
                            className="text-[11px] text-slate-500 italic max-w-[140px] truncate block ml-auto"
                            title={item.reviewNotes}
                          >
                            {item.reviewNotes || "Declined by admin"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: VIEW FULL BANK SLIP ───────────────────────────────────── */}
      {selectedSlip && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 lms-overlay"
          onClick={() => setSelectedSlip(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col lms-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Bank Transfer Deposit Slip
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedSlip.id} · Ref: {selectedSlip.referenceNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition" aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Slip Details Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase block">
                  Borrower
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {selectedSlip.customerName}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase block">
                  Amount Paid
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {MONEY(selectedSlip.amount)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase block">
                  Bank Name
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {selectedSlip.bankName}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase block">
                  Transfer Date
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedSlip.paymentDate}
                </span>
              </div>
            </div>

            {/* Slip Image Preview Area */}
            <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl p-3 min-h-[320px] max-h-[480px] flex items-center justify-center border border-slate-800">
              {(() => {
                const safeUrl = getSafeSlipUrl(selectedSlip);
                const isPdf = safeUrl.startsWith("data:application/pdf") || (selectedSlip.slipFileName || "").toLowerCase().endsWith(".pdf");

                if (slipImgError || !safeUrl) {
                  return (
                    <div className="w-full max-w-md bg-white rounded-2xl p-5 border border-slate-200 shadow-xl space-y-3.5 text-left text-slate-800 animate-in zoom-in-95 duration-150 lms-dialog">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                            <Building size={20} />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 block">
                              Bank Deposit Slip
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                              {selectedSlip.bankName}
                            </h4>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {selectedSlip.referenceNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Borrower</span>
                          <span className="font-bold text-slate-900 truncate block">{selectedSlip.customerName}</span>
                          {selectedSlip.customerNic && <span className="text-[11px] text-slate-500 block">NIC: {selectedSlip.customerNic}</span>}
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Facility ID</span>
                          <span className="font-mono font-bold text-red-600">{selectedSlip.loanNo || selectedSlip.loanId}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Transfer Date</span>
                          <span className="font-mono text-slate-700">{selectedSlip.paymentDate}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Submitted At</span>
                          <span className="text-slate-600 text-[11px]">
                            {selectedSlip.submittedAt ? new Date(selectedSlip.submittedAt).toLocaleTimeString() : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 uppercase block">Amount Paid</span>
                          <span className="text-xl font-semibold font-mono text-emerald-700">{MONEY(selectedSlip.amount)}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Electronic Slip
                        </span>
                      </div>

                      {selectedSlip.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          &ldquo;{selectedSlip.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={safeUrl}
                      title="Bank Slip Document"
                      className="w-full h-96 rounded-xl border border-slate-700 bg-white"
                    />
                  );
                }

                return (
                  <img
                    src={safeUrl}
                    alt="Bank Transfer Slip"
                    onError={() => setSlipImgError(true)}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                  />
                );
              })()}
            </div>

            {/* Modal Footer & Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href={getSafeSlipUrl(selectedSlip)}
                download={selectedSlip.slipFileName || `Slip_${selectedSlip.id}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <Download size={14} /> Download Slip
              </a>

              {selectedSlip.status === "PENDING" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedSlip;
                      setSelectedSlip(null);
                      setRejectingPayment(item);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedSlip;
                      setSelectedSlip(null);
                      setApprovingPayment(item);
                    }}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} /> Accept & Credit Loan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="px-5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONFIRM APPROVAL MODAL ────────────────────────────────── */}
      {approvingPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 lms-overlay"
          onClick={() => setApprovingPayment(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 lms-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Accept & Reconcile Payment Slip
                </h3>
                <p className="text-xs text-slate-500">
                  Official receipt will be generated and loan ledger will be updated.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Borrower:</span>
                <span className="font-bold text-slate-950">{approvingPayment.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Loan Facility:</span>
                <span className="font-mono font-bold text-red-700">
                  {approvingPayment.loanNo || approvingPayment.loanId}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Amount to Credit:</span>
                <span className="font-mono font-semibold text-sm text-emerald-800">
                  {MONEY(approvingPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Bank & Ref:</span>
                <span className="font-mono font-bold text-slate-800">
                  {approvingPayment.bankName} ({approvingPayment.referenceNumber})
                </span>
              </div>
              <div className="flex justify-between text-slate-700 pt-2 border-t border-emerald-200">
                <span>Next Official Receipt:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {getNextReceiptNo()}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block" htmlFor="field-app-dashboard-online-payments-page-1">
                Verification Remarks / Sign-off Note (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Bank statement confirmed. Transfer matched to company BOC account."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold" id="field-app-dashboard-online-payments-page-1"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingPayment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} /> Confirm & Credit Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: REJECT/DECLINE MODAL ──────────────────────────────────── */}
      {rejectingPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 lms-overlay"
          onClick={() => setRejectingPayment(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 lms-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Decline Payment Slip
                </h3>
                <p className="text-xs text-slate-500">
                  Mark this slip as rejected. Please provide a reason for the borrower.
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block" htmlFor="field-app-dashboard-online-payments-page-2">
                Decline Reason / Remarks (Required):
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Bank slip image is blurry or unreadable. Amount does not match bank deposit transaction."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs font-semibold"
                required id="field-app-dashboard-online-payments-page-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/25 cursor-pointer flex items-center gap-1.5"
              >
                <X size={14} /> Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── MODAL 5: OFFICIAL RECEIPT MODAL ────────────────────────────────── */}
      {receiptToView && (
        <ReceiptModal
          payment={receiptToView}
          onClose={() => setReceiptToView(null)}
        />
      )}
    </div>
  );
}

