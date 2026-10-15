"use client";

import React, { useState, useMemo } from "react";
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
  const { loans, customers, payments, addPayment } = useData();

  // Selected collection date (defaults to system date 2026-10-14)
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-14");

  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "COLLECTED" | "OVERDUE">("ALL");
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
      // Status filter
      if (statusFilter === "PENDING" && it.isCollectedToday) return false;
      if (statusFilter === "COLLECTED" && !it.isCollectedToday) return false;
      if (statusFilter === "OVERDUE" && it.status !== "OVERDUE") return false;

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
  }, [items, statusFilter, frequencyFilter, routeFilter, searchTerm]);

  // Date navigation handlers
  const handleStepDay = (delta: number) => {
    const current = parseDateString(selectedDate) || new Date(2026, 9, 14);
    current.setDate(current.getDate() + delta);
    setSelectedDate(formatDateToYMD(current));
  };

  const handleResetToToday = () => {
    setSelectedDate("2026-10-14");
  };

  // Open Quick Collect Modal
  const openCollectModal = (item: ScheduledCollectionItem) => {
    setCollectingItem(item);
    setCollectAmount(String(item.totalDueToday || item.installmentAmount || ""));
    setPaymentNotes(`Scheduled installment #${item.cycleNumber} collected for ${item.dueDate}`);
    setPaymentMethod("Cash");
  };

  const closeCollectModal = () => {
    setCollectingItem(null);
    setCollectAmount("");
    setPaymentNotes("");
  };

  // Submit Quick Collect
  const handleConfirmCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingItem) return;

    const numAmount = Number(collectAmount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid collection amount.");
      return;
    }

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Notification Banner ── */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification("")}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Page Header & Date Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200/60 px-2.5 py-0.5 rounded-md">
              Field Operations
            </span>
            <span className="text-xs text-slate-600 font-semibold">Daily Recovery Sheet</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Today&apos;s Collection List
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Scheduled loan installments, borrower dues, and field collections for{" "}
            <span className="font-bold text-slate-800">
              {formatFriendlyDate(selectedDate)}
            </span>
          </p>
        </div>

        {/* Date Switcher & Print Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => handleStepDay(-1)}
              title="Previous Day"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer"
            />
            <button
              onClick={() => handleStepDay(1)}
              title="Next Day"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={handleResetToToday}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
              selectedDate === "2026-10-14"
                ? "bg-red-600 text-white border-red-600 shadow-sm"
                : "bg-white text-slate-900 border-slate-300 hover:bg-slate-100 hover:text-black"
            }`}
          >
            Today
          </button>

          <button
            onClick={handlePrintSheet}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Printer size={14} /> Print Field Sheet
          </button>
        </div>
      </div>

      {/* ── Key Performance Indicators (KPI Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Target */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Total Target Today
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {MONEY(summary.targetAmount)}
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-1">
              Across {summary.totalCount} scheduled facility {summary.totalCount === 1 ? "due" : "dues"}
            </p>
          </div>
        </div>

        {/* Collected So Far */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Collected So Far
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">
              {MONEY(summary.collectedAmount)}
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-1">
              {summary.collectedCount} of {summary.totalCount} accounts collected
            </p>
          </div>
        </div>

        {/* Pending Recovery */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Pending Recovery
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">
              {MONEY(summary.pendingAmount)}
            </div>
            <p className="text-[11px] text-amber-600/80 mt-1">
              {summary.pendingCount} pending field {summary.pendingCount === 1 ? "collection" : "collections"}
            </p>
          </div>
        </div>

        {/* Collection Efficiency */}
        <div className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
              Collection Rate
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {summary.collectionRate}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-600 to-rose-700 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.collectionRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search, Segment Tabs & Route Filters ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap border-b border-slate-100 pb-3">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-red-600 text-white border border-red-600 shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <span className={statusFilter === "ALL" ? "text-white font-bold" : "text-slate-800 font-bold"}>
              All Collections
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                statusFilter === "ALL"
                  ? "bg-white/25 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <span className={statusFilter === "PENDING" ? "text-white font-bold" : "text-amber-900 font-bold"}>
              Pending Collection
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                statusFilter === "PENDING"
                  ? "bg-white/25 text-white"
                  : "bg-amber-200/80 text-amber-900"
              }`}
            >
              {summary.pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("COLLECTED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "COLLECTED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            <span className={statusFilter === "COLLECTED" ? "text-white font-bold" : "text-emerald-900 font-bold"}>
              Collected Today
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                statusFilter === "COLLECTED"
                  ? "bg-white/25 text-white"
                  : "bg-emerald-200/80 text-emerald-900"
              }`}
            >
              {summary.collectedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("OVERDUE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              statusFilter === "OVERDUE"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            <span className={statusFilter === "OVERDUE" ? "text-white font-bold" : "text-rose-900 font-bold"}>
              Delinquent / Arrears
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                statusFilter === "OVERDUE"
                  ? "bg-white/25 text-white"
                  : "bg-rose-200/80 text-rose-900"
              }`}
            >
              {summary.overdueCount}
            </span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by borrower name, loan no, NIC, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Frequency Filter */}
          <div>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-700 font-medium"
            >
              <option value="ALL">All Frequencies</option>
              <option value="Daily">Daily Collections</option>
              <option value="Weekly">Weekly Collections</option>
              <option value="Monthly">Monthly Collections</option>
            </select>
          </div>

          {/* Route / Area Filter */}
          <div>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-700 font-medium"
            >
              <option value="ALL">All Field Routes / Areas</option>
              {availableRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Today's Collection List Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Scheduled Collection Items ({filteredItems.length})
            </h2>
            <p className="text-[11px] text-slate-600 font-medium">
              Showing active borrower collection obligations for {selectedDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-600 font-semibold">
              Sort by: Route / Priority
            </span>
          </div>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[880px]">
            <thead className="bg-slate-100 text-[11px] text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Borrower Dossier</th>
                <th className="py-3 px-3">Facility Details</th>
                <th className="py-3 px-3">Cycle / Term</th>
                <th className="py-3 px-3 text-right">Installment</th>
                <th className="py-3 px-3 text-right">Arrears</th>
                <th className="py-3 px-3 text-right">Total Due Today</th>
                <th className="py-3 px-3 text-center">Standing</th>
                <th className="py-3 px-4 text-center">Field Action</th>
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
                  .join("");

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition ${
                      item.isCollectedToday ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    {/* Borrower Dossier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-black text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {bName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium mt-0.5">
                            <span>NIC: {item.customer?.nic || "—"}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Building size={11} className="text-slate-500" />
                              {item.routeArea}
                            </span>
                          </div>
                          {item.customer?.phone && (
                            <a
                              href={`tel:${item.customer.phone}`}
                              className="text-[11px] text-red-600 hover:underline inline-flex items-center gap-1 font-semibold mt-0.5"
                            >
                              <Phone size={10} /> {item.customer.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Facility Details */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 text-xs">
                        <Link
                          href={`/loans/${item.loan.id}`}
                          className="hover:text-red-600 hover:underline"
                        >
                          {item.loan.loanNo || item.loan.id}
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          {item.repaymentFrequency}
                        </span>{" "}
                        facility
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total {MONEY(item.loan.totalRepayment)}
                      </div>
                    </td>

                    {/* Cycle / Term */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 text-xs">
                        Cycle #{item.cycleNumber} of {item.totalCycles}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Due {item.dueDate}
                      </div>
                    </td>

                    {/* Installment Amount */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-bold text-slate-900 text-xs">
                        {MONEY(item.installmentAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400">Scheduled</div>
                    </td>

                    {/* Arrears */}
                    <td className="py-3.5 px-3 text-right">
                      {item.arrearsAmount > 0 ? (
                        <div>
                          <div className="font-bold text-rose-700 text-xs">
                            {MONEY(item.arrearsAmount)}
                          </div>
                          <span className="text-[9px] font-bold text-rose-600 uppercase">
                            Delinquent
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-xs">—</div>
                      )}
                    </td>

                    {/* Total Due Today */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-black text-slate-900 text-sm">
                        {MONEY(item.totalDueToday)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.isCollectedToday ? "Collected" : "Expected"}
                      </div>
                    </td>

                    {/* Standing / Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      {item.isCollectedToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          Collected
                        </span>
                      ) : item.status === "OVERDUE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle size={12} className="text-rose-600" />
                          Overdue Arrears
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={12} className="text-amber-600" />
                          Due Today
                        </span>
                      )}
                      {item.todaysPayment?.receiptNo && (
                        <div className="text-[9px] font-semibold text-emerald-700 mt-1">
                          {item.todaysPayment.receiptNo}
                        </div>
                      )}
                    </td>

                    {/* Field Action */}
                    <td className="py-3.5 px-4 text-center">
                      {item.isCollectedToday ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                            <Check size={13} /> Settled
                          </span>
                          {item.todaysPayment && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptPayment(item.todaysPayment || null)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-red-600 hover:text-white text-slate-800 border-2 border-slate-300 hover:border-red-600 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                            >
                              <Receipt size={12} />
                              <span>Receipt</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => openCollectModal(item)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-xs shadow-red-600/20 transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <CreditCard size={13} className="text-white" />
                          <span className="text-white font-bold">Collect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">
                      No collections found for this date and filter criteria.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Check a different scheduled date or adjust your filter settings.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Collection Modal ── */}
      {collectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                  Field Payment Entry
                </p>
                <h3 className="text-base font-black text-slate-900">
                  Record Today&apos;s Collection
                </h3>
              </div>
              <button
                onClick={closeCollectModal}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Borrower & Facility Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">
                  {collectingItem.customer?.fullName ||
                    collectingItem.customer?.name ||
                    collectingItem.loan.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility ID:</span>
                <span className="font-bold text-slate-900">
                  {collectingItem.loan.loanNo || collectingItem.loan.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Installment:</span>
                <span className="font-bold text-slate-900">
                  {MONEY(collectingItem.installmentAmount)}
                </span>
              </div>
              {collectingItem.arrearsAmount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Arrears Overdue:</span>
                  <span className="font-bold">{MONEY(collectingItem.arrearsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200/60 font-black text-sm text-slate-900">
                <span>Total Due:</span>
                <span className="text-red-700">
                  {MONEY(collectingItem.totalDueToday)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Collected Amount (LKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "Cash" | "Bank Transfer" | "Cheque"
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800 font-medium"
                  >
                    <option value="Cash">Cash (Field)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Collected By
                  </label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Collection Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received at shop, full installment settled"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCollectModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-md shadow-red-600/20 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check size={14} /> Confirm Collection
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
    </div>
  );
}
