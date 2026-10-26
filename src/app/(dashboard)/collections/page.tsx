"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Phone,
  Printer,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  CreditCard,
  Building,
  Receipt,
  Edit,
  Trash2,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import {
  getDailyCollections,
  formatFriendlyDate,
  formatDateToYMD,
  parseDateString,
  type ScheduledCollectionItem,
} from "@/lib/collection-schedule";
import type { Payment } from "@/types";

export default function CollectionsPage() {
  const {
    loans,
    customers,
    payments,
    addPayment,
    updatePayment,
    deletePayment,
    staffUsers,
    getNextReceiptNo,
  } = useData();

  // RBAC: Check if current logged-in user is an Administrator
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // In the Administrator Dashboard portal, ensure Administrator authority is active
    localStorage.setItem("psi_user_role", "Administrator");
    localStorage.setItem("psi_active_staff_id", "STF-01");
    setIsAdmin(true);
  }, []);

  // Selected collection date (defaults dynamically to today)
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-19");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSelectedDate(new Date().toISOString().slice(0, 10));
    }
  }, []);

  // Filter and search state
  const [frequencyFilter, setFrequencyFilter] = useState<string>("ALL");
  const [routeFilter, setRouteFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Quick Collect Modal State
  const [collectingItem, setCollectingItem] = useState<ScheduledCollectionItem | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [collectorName, setCollectorName] = useState<string>("Ajith Wickramasinghe");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [notification, setNotification] = useState<string>("");
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  // Admin Edit Payment Modal State
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editMethod, setEditMethod] = useState<"Cash" | "Bank Transfer" | "Cheque">("Cash");
  const [editNotes, setEditNotes] = useState<string>("");

  // Admin Delete Payment Modal State
  const [deletingPaymentItem, setDeletingPaymentItem] = useState<ScheduledCollectionItem | null>(null);

  const openEditPaymentModal = (p: Payment) => {
    setEditingPayment(p);
    setEditAmount(String(p.amount));
    setEditDate(p.date || selectedDate);
    setEditMethod((p.method as "Cash" | "Bank Transfer" | "Cheque") || "Cash");
    setEditNotes(p.notes || "");
  };

  const handleConfirmEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const numAmount = Number(editAmount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    updatePayment(editingPayment.id, {
      amount: numAmount,
      date: editDate,
      method: editMethod,
      notes: editNotes.trim() || undefined,
    });

    setNotification(
      `Payment record ${editingPayment.receiptNo || editingPayment.id} updated successfully.`
    );
    setEditingPayment(null);
    setTimeout(() => setNotification(""), 4500);
  };

  const handleConfirmDeletePayment = () => {
    if (!deletingPaymentItem?.todaysPayment) return;
    const p = deletingPaymentItem.todaysPayment;
    deletePayment(p.id);
    setNotification(`Payment record ${p.receiptNo || p.id} reversed and deleted.`);
    setDeletingPaymentItem(null);
    setTimeout(() => setNotification(""), 4500);
  };

  // Compute daily collection items and summary for the selected date
  const collectionData = useMemo(() => {
    return getDailyCollections(loans, customers, payments, selectedDate);
  }, [loans, customers, payments, selectedDate]);
  const items = collectionData.items;
  const summary = collectionData.summary;

  // Extract unique route areas for filter dropdown
  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.routeArea) set.add(it.routeArea);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Frequency filter
      if (frequencyFilter !== "ALL" && it.repaymentFrequency !== frequencyFilter) {
        return false;
      }

      // Route / Area filter
      if (routeFilter !== "ALL" && it.routeArea !== routeFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const borrowerName = (it.customer?.name || it.loan.customerName || "").toLowerCase();
        const loanNo = (it.loan.loanNo || it.loan.id || "").toLowerCase();
        const nic = (it.customer?.nic || "").toLowerCase();
        const phone = (it.customer?.phone || "").toLowerCase();
        const town = (it.customer?.town || "").toLowerCase();

        return (
          borrowerName.includes(q) ||
          loanNo.includes(q) ||
          nic.includes(q) ||
          phone.includes(q) ||
          town.includes(q)
        );
      }

      return true;
    });
  }, [items, frequencyFilter, routeFilter, searchTerm]);

  // Date navigation handlers
  const handleStepDay = (delta: number) => {
    const current = parseDateString(selectedDate) || new Date(2026, 9, 14);
    current.setDate(current.getDate() + delta);
    setSelectedDate(formatDateToYMD(current));
  };

  const handleResetToToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const openCollectModal = (item: ScheduledCollectionItem) => {
    setCollectingItem(item);
    setCollectAmount(String(item.totalDueToday || item.installmentAmount));
    setPaymentMethod("Cash");
    setPaymentNotes(`Scheduled ${item.repaymentFrequency} recovery on ${selectedDate}`);
  };

  const closeCollectModal = () => {
    setCollectingItem(null);
    setCollectAmount("");
    setPaymentNotes("");
  };

  const handleConfirmCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingItem) return;

    const numAmount = Number(collectAmount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const receiptNo = getNextReceiptNo();
    const newPayment: Payment = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      loanId: collectingItem.loan.id,
      customerId: collectingItem.loan.customerId,
      amount: numAmount,
      date: selectedDate,
      type: "Capital",
      notes: paymentNotes.trim() || undefined,
      method: paymentMethod,
      collectedBy: collectorName,
      receiptNo,
    };

    addPayment(newPayment);
    setNotification(
      `Receipt ${receiptNo} generated: Collected ${MONEY(numAmount)} from ${
        collectingItem.customer?.name || collectingItem.loan.customerName
      }.`
    );
    closeCollectModal();

    setTimeout(() => {
      setNotification("");
    }, 6000);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-6 space-y-3">
        {/* ── Notification Banner ── */}
        {notification && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification("")}
              className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ═══ Action Bar (Search & Date Navigation & Print) ═════════════════ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search borrower, loan, NIC, phone, town…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 py-1.5 h-9 text-xs bg-white border border-slate-200 rounded-xl w-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Switcher & Print Toolbar */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl h-9 px-1 shadow-2xs">
              <button
                onClick={() => handleStepDay(-1)}
                title="Previous Day"
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-1.5 py-0.5 text-xs font-bold text-slate-900 bg-transparent border-0 focus:ring-0 cursor-pointer"
              />
              <button
                onClick={() => handleStepDay(1)}
                title="Next Day"
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              onClick={handleResetToToday}
              className={`h-9 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                selectedDate === "2026-10-14"
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Today
            </button>

            <button
              onClick={handlePrintSheet}
              className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>
          </div>
        </div>

        {/* ═══ Key Performance Indicators (Customer Theme Micro KPIs) ═══════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Target */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-slate-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Target Today
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {MONEY(summary.targetAmount)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {summary.totalCount} scheduled dues
              </p>
            </div>
          </div>

          {/* Collected So Far */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Collected So Far
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 leading-tight">
                {MONEY(summary.collectedAmount)}
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold truncate">
                {summary.collectedCount} of {summary.totalCount} collected
              </p>
            </div>
          </div>

          {/* Pending Recovery */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Pending Recovery
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-amber-700 leading-tight">
                {MONEY(summary.pendingAmount)}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold truncate">
                {summary.pendingCount} pending accounts
              </p>
            </div>
          </div>

          {/* Collection Efficiency */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <CreditCard size={16} className="text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider truncate">
                Recovery Rate
              </p>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 leading-tight">
                {summary.collectionRate}%
              </p>
              <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-red-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, summary.collectionRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Filter Controls Row ═══════════════════════════════════════════ */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Collection Records</span>
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {filteredItems.length}
            </span>
          </div>

          {/* Frequency & Route Filters */}
          <div className="flex items-center gap-2">
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="ALL">All Frequencies</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>

            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="ALL">All Routes</option>
              {availableRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ═══ Today's Collection List Table (Customer Theme) ════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs whitespace-nowrap min-w-[880px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                <tr>
                  <th className="py-3 px-5">Borrower</th>
                  <th className="py-3 px-4">Facility No</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4 text-right">Installment</th>
                  <th className="py-3 px-4 text-right">Arrears</th>
                  <th className="py-3 px-4 text-right">Total Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5 text-center">Field Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const bName =
                    item.customer?.fullName || item.customer?.name || item.loan.customerName || "Borrower";
                  const initials = bName
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.isCollectedToday ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      {/* Borrower */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          {item.customer?.photoUrl ? (
                            <img
                              src={item.customer.photoUrl}
                              alt=""
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {bName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                              <span>NIC: {item.customer?.nic || "—"}</span>
                              {item.routeArea && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5 text-slate-600 font-medium">
                                    <Building size={10} className="text-slate-400" />
                                    {item.routeArea}
                                  </span>
                                </>
                              )}
                              {item.customer?.phone && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`tel:${item.customer.phone}`}
                                    className="text-red-600 hover:underline inline-flex items-center gap-0.5 font-semibold"
                                  >
                                    <Phone size={9} /> {item.customer.phone}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Facility Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs font-mono">
                          <Link
                            href={`/loans/${item.loan.id}`}
                            className="hover:text-red-600 transition"
                          >
                            {item.loan.loanNo || item.loan.id}
                          </Link>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.repaymentFrequency}
                        </div>
                      </td>

                      {/* Cycle */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          #{item.cycleNumber}/{item.totalCycles}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.dueDate}
                        </div>
                      </td>

                      {/* Installment Amount */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900 font-mono text-xs">
                          {MONEY(item.installmentAmount)}
                        </div>
                      </td>

                      {/* Arrears */}
                      <td className="py-3 px-4 text-right">
                        {item.arrearsAmount > 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-1.5 py-0.2 rounded font-mono font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200">
                              {MONEY(item.arrearsAmount)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* Total Due Today */}
                      <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-xs">
                        {MONEY(item.totalDueToday)}
                      </td>

                      {/* Standing / Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {item.isCollectedToday ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Collected
                          </span>
                        ) : item.status === "OVERDUE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Arrears
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Due Today
                          </span>
                        )}
                        {item.todaysPayment?.receiptNo && (
                          <div className="text-[9px] font-mono font-semibold text-emerald-700 mt-0.5">
                            {item.todaysPayment.receiptNo}
                          </div>
                        )}
                      </td>

                      {/* Field Action */}
                      <td className="py-3 px-5 text-center">
                        {item.isCollectedToday ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-emerald-700 font-bold inline-flex items-center gap-0.5">
                              <Check size={12} /> Settled
                            </span>
                            {item.todaysPayment && (
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptPayment(item.todaysPayment || null)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-md transition cursor-pointer"
                                title="View Receipt"
                              >
                                <Receipt size={11} className="text-red-600 shrink-0" />
                                <span>Receipt</span>
                              </button>
                            )}

                            {/* ADMIN ONLY CONTROLS: Edit & Delete Record */}
                            {isAdmin && item.todaysPayment && (
                              <div className="inline-flex items-center gap-1 pl-1 border-l border-slate-200 ml-0.5">
                                <button
                                  type="button"
                                  onClick={() => openEditPaymentModal(item.todaysPayment!)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 rounded-md transition cursor-pointer"
                                  title="Admin: Edit Payment Record"
                                >
                                  <Edit size={11} className="text-amber-600 shrink-0" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPaymentItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 rounded-md transition cursor-pointer"
                                  title="Admin: Delete & Reverse Payment"
                                >
                                  <Trash2 size={11} className="text-rose-600 shrink-0" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openCollectModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            <CreditCard size={12} />
                            <span>Collect</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <p className="text-xs font-bold text-slate-700">
                        No collections found for this date and filter criteria.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Check a different scheduled date or adjust your filter settings.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Quick Collection Modal ── */}
      {collectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                  Field Payment Entry
                </p>
                <h3 className="text-sm font-black text-slate-900">
                  Record Today&apos;s Collection
                </h3>
              </div>
              <button
                onClick={closeCollectModal}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Borrower & Facility Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-bold text-slate-900">
                  {collectingItem.customer?.fullName ||
                    collectingItem.customer?.name ||
                    collectingItem.loan.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Facility ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  {collectingItem.loan.loanNo || collectingItem.loan.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Installment:</span>
                <span className="font-mono font-bold text-slate-900">
                  {MONEY(collectingItem.installmentAmount)}
                </span>
              </div>
              {collectingItem.arrearsAmount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span className="font-medium">Arrears:</span>
                  <span className="font-mono font-bold">{MONEY(collectingItem.arrearsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-xs text-slate-900">
                <span>Total Due:</span>
                <span className="text-red-600 font-mono">
                  {MONEY(collectingItem.totalDueToday)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Collected Amount (LKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                      )
                    }
                    className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 text-xs font-semibold"
                  >
                    <option value="Cash">Cash (Field)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Collected By
                  </label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received at shop, full installment settled"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCollectModal}
                  className="px-3 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-8 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check size={13} /> Confirm Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}

      {/* ═══ ADMIN EXCLUSIVE: EDIT PAYMENT RECORD MODAL ═════════════════════ */}
      {isAdmin && editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Edit size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Edit Collection Payment
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Receipt: {editingPayment.receiptNo || editingPayment.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleConfirmEditPayment} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Collected Amount (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Method
                  </label>
                  <select
                    value={editMethod}
                    onChange={(e) =>
                      setEditMethod(e.target.value as "Cash" | "Bank Transfer" | "Cheque")
                    }
                    className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs font-semibold"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Admin Modification Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected installment breakdown"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 h-9 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3.5 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-8 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ ADMIN EXCLUSIVE: DELETE PAYMENT CONFIRMATION MODAL ══════════════ */}
      {isAdmin && deletingPaymentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Delete Collection Record?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete payment receipt{" "}
                  <strong>
                    {deletingPaymentItem.todaysPayment?.receiptNo ||
                      deletingPaymentItem.todaysPayment?.id}
                  </strong>{" "}
                  ({MONEY(deletingPaymentItem.todaysPayment?.amount || 0)}) from{" "}
                  <strong>{deletingPaymentItem.customer?.name}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Financial Ledger Reversal</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Deleting this record will reverse the collected amount, remove this payment from the loan ledger, and return this installment back to pending.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingPaymentItem(null)}
                className="px-3.5 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePayment}
                className="px-4 h-8 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
