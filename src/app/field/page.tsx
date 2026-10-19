/* eslint-disable @next/next/no-img-element */
// Field Staff Portal - Today's Collections & Rapid Repayment Desk
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  MessageSquare,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Search,
  Receipt,
  Printer,
  Building,
  Check,
  X,
  Send,
  Coins,
  MapPin,
  ChevronRight,
  ShieldCheck,
  User,
  ArrowRight,
  LogOut,
  RefreshCw,
  SlidersHorizontal,
  FileCheck,
  AlertOctagon,
  Sparkles,
  Info,
  History,
  PhoneCall,
  UserCheck,
  Eye,
  ChevronDown,
  UserPlus,
  PlusCircle,
  DollarSign,
  FileText,
  Calculator,
  Image as ImageIcon,
  Menu,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import {
  getDailyCollections,
  formatFriendlyDate,
  type ScheduledCollectionItem,
} from "@/lib/collection-schedule";
import type { Customer, Loan, Payment, StaffUser, OnlinePayment } from "@/types";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import { NewLoanForm } from "@/components/forms/NewLoanForm";
import { BrandLogo } from "@/components/brand-logo";

interface PtpRecord {
  promiseDate: string;
  note: string;
  updatedAt: string;
}

export default function FieldStaffPortal() {
  const {
    customers,
    loans,
    payments,
    addPayment,
    staffUsers,
    getNextReceiptNo,
    addCustomer,
    addLoan,
    onlinePayments,
    approveOnlinePayment,
    rejectOnlinePayment,
  } = useData();

  // ── 1. Active Officer Session & Isolation ─────────────────────────────────
  const fieldStaffList = useMemo(() => {
    const fieldOnly = staffUsers.filter(
      (s) =>
        s.role === "Loan Officer" ||
        s.role === "Collection Agent" ||
        (s.role as string) === "Staff" ||
        (s.role as string) === "Field Officer"
    );
    if (fieldOnly.length > 0) return fieldOnly;
    return staffUsers.map((s) =>
      s.role === "Administrator"
        ? { ...s, name: "Staff Officer", role: "Loan Officer" as const }
        : s
    );
  }, [staffUsers]);

  const [activeOfficerId, setActiveOfficerId] = useState<string>("");
  const [loggedStaffName, setLoggedStaffName] = useState<string>("");
  const [showOfficerModal, setShowOfficerModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("psi_logged_staff_name");
      if (storedName) {
        setLoggedStaffName(storedName);
      }

      const saved = localStorage.getItem("psi_active_staff_id");
      // If saved is STF-01 (Admin) but field staff exist, prefer field staff in the field portal
      const fieldStaff = fieldStaffList.find((s) => s.id !== "STF-01");
      if (saved && saved !== "STF-01" && fieldStaffList.some((s) => s.id === saved)) {
        setActiveOfficerId(saved);
      } else if (fieldStaff) {
        setActiveOfficerId(fieldStaff.id);
        localStorage.setItem("psi_active_staff_id", fieldStaff.id);
      } else if (fieldStaffList.length > 0) {
        setActiveOfficerId(fieldStaffList[0].id);
        localStorage.setItem("psi_active_staff_id", fieldStaffList[0].id);
      }
    }
  }, [fieldStaffList]);

  const currentOfficer: StaffUser | undefined = useMemo(() => {
    return fieldStaffList.find((s) => s.id === activeOfficerId) || fieldStaffList[0];
  }, [fieldStaffList, activeOfficerId]);

  const staffDisplayName = useMemo(() => {
    if (loggedStaffName && loggedStaffName !== "System Administrator") {
      return loggedStaffName;
    }
    if (currentOfficer && currentOfficer.name !== "System Administrator") {
      return currentOfficer.name;
    }
    return "Staff Officer";
  }, [loggedStaffName, currentOfficer]);

  const handleSelectOfficer = (officerId: string) => {
    setActiveOfficerId(officerId);
    if (typeof window !== "undefined") {
      localStorage.setItem("psi_active_staff_id", officerId);
      const officer = fieldStaffList.find((s) => s.id === officerId);
      if (officer) {
        localStorage.setItem("psi_logged_staff_name", officer.name);
        setLoggedStaffName(officer.name);
      }
    }
    setShowOfficerModal(false);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("psi_active_staff_id");
      localStorage.removeItem("staff_token");
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  // ── 2. Today's Date & System Clock ────────────────────────────────────────
  const [todayStr, setTodayStr] = useState<string>("2026-10-15");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setTodayStr(new Date().toISOString().slice(0, 10));
    }
  }, []);

  // ── 3. Navigation Tabs ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "route" | "quickpay" | "receipts" | "online_slips"
  >("route");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Staff Extended Modals & View States
  const [showNewLoanModal, setShowNewLoanModal] = useState<boolean>(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState<boolean>(false);
  const [preselectedCustomerForLoan, setPreselectedCustomerForLoan] = useState<string | undefined>(undefined);

  // Full Repayments Ledger View Controls
  const [receiptsViewMode, setReceiptsViewMode] = useState<"my_today" | "all_system">("my_today");
  const [allPaymentsSearch, setAllPaymentsSearch] = useState<string>("");
  const [allPaymentsTypeFilter, setAllPaymentsTypeFilter] = useState<string>("ALL");

  // Online Payment Slips Controls
  const [onlineSlipsFilter, setOnlineSlipsFilter] = useState<
    "ALL" | "PENDING" | "COMPLETED" | "REJECTED"
  >("ALL");
  const [onlineSlipsSearch, setOnlineSlipsSearch] = useState<string>("");
  const [selectedSlipImage, setSelectedSlipImage] = useState<OnlinePayment | null>(null);

  // New Customer Registration Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustFullName, setNewCustFullName] = useState("");
  const [newCustNic, setNewCustNic] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAltPhone, setNewCustAltPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustTown, setNewCustTown] = useState("");
  const [newCustVillage, setNewCustVillage] = useState("");
  const [newCustDistrict, setNewCustDistrict] = useState("Colombo");
  const [newCustIncome, setNewCustIncome] = useState("");
  const [newCustOccupation, setNewCustOccupation] = useState("");
  const [newCustGuarantorName, setNewCustGuarantorName] = useState("");
  const [newCustGuarantorNic, setNewCustGuarantorNic] = useState("");
  const [newCustGuarantorPhone, setNewCustGuarantorPhone] = useState("");
  const [newCustGuarantorRel, setNewCustGuarantorRel] = useState("Spouse");

  const pendingOnlineCount = useMemo(() => {
    return onlinePayments.filter((p) => p.status === "PENDING").length;
  }, [onlinePayments]);

  const filteredOnlineSlips = useMemo(() => {
    return onlinePayments.filter((op) => {
      if (onlineSlipsFilter !== "ALL" && op.status !== onlineSlipsFilter) return false;
      if (!onlineSlipsSearch.trim()) return true;
      const q = onlineSlipsSearch.toLowerCase().trim();
      return (
        op.id.toLowerCase().includes(q) ||
        op.customerName.toLowerCase().includes(q) ||
        (op.customerNic && op.customerNic.toLowerCase().includes(q)) ||
        (op.customerPhone && op.customerPhone.toLowerCase().includes(q)) ||
        op.loanId.toLowerCase().includes(q) ||
        (op.loanNo && op.loanNo.toLowerCase().includes(q)) ||
        op.bankName.toLowerCase().includes(q) ||
        (op.referenceNumber && op.referenceNumber.toLowerCase().includes(q))
      );
    });
  }, [onlinePayments, onlineSlipsFilter, onlineSlipsSearch]);

  const allFilteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (allPaymentsTypeFilter !== "ALL" && p.type !== allPaymentsTypeFilter) return false;
      if (!allPaymentsSearch.trim()) return true;
      const q = allPaymentsSearch.toLowerCase().trim();
      const cust = customers.find((c) => c.id === p.customerId);
      const custName = cust?.fullName || cust?.name || "";
      return (
        p.id.toLowerCase().includes(q) ||
        (p.receiptNo && p.receiptNo.toLowerCase().includes(q)) ||
        p.loanId.toLowerCase().includes(q) ||
        custName.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.collectedBy && p.collectedBy.toLowerCase().includes(q))
      );
    });
  }, [payments, allPaymentsSearch, allPaymentsTypeFilter, customers]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustFullName.trim() || !newCustNic.trim() || !newCustPhone.trim()) {
      showToast("Please fill in required fields: Full Name, NIC, and Phone");
      return;
    }

    const newId = `CUS-${String(customers.length + 1).padStart(3, "0")}`;
    const newCustomer: Customer = {
      id: newId,
      name: newCustName.trim() || newCustFullName.trim().split(" ")[0],
      fullName: newCustFullName.trim(),
      nic: newCustNic.trim().toUpperCase(),
      phone: newCustPhone.trim(),
      alternatePhone: newCustAltPhone.trim() || undefined,
      address: newCustAddress.trim() || "Local Residential Address",
      town: newCustTown.trim() || "Colombo",
      village: newCustVillage.trim() || newCustTown.trim() || "Colombo",
      district: newCustDistrict.trim() || "Colombo",
      monthlyIncome: parseFloat(newCustIncome) || 45000,
      occupation: newCustOccupation.trim() || "Self Employed",
      guarantorName: newCustGuarantorName.trim() || undefined,
      guarantorNic: newCustGuarantorNic.trim() || undefined,
      guarantorPhone: newCustGuarantorPhone.trim() || undefined,
      guarantorRelationship: newCustGuarantorRel || undefined,
      status: "Active",
      registeredAt: todayStr,
      hasExistingLoan: false,
      initialOutstandingBalance: 0,
    };

    addCustomer(newCustomer);
    setShowNewCustomerModal(false);

    // Reset Form
    setNewCustName("");
    setNewCustFullName("");
    setNewCustNic("");
    setNewCustPhone("");
    setNewCustAltPhone("");
    setNewCustAddress("");
    setNewCustTown("");
    setNewCustVillage("");
    setNewCustIncome("");
    setNewCustOccupation("");
    setNewCustGuarantorName("");
    setNewCustGuarantorNic("");
    setNewCustGuarantorPhone("");

    showToast(`Customer ${newCustomer.fullName} (${newCustomer.id}) registered successfully!`);
  };

  // ── 4. Toast notification feedback ────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string>("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // ── 5. PTP Notes State ────────────────────────────────────────────────────
  const [ptpNotes, setPtpNotes] = useState<Record<string, PtpRecord>>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem("psi_field_ptp_notes");
      if (stored) {
        setPtpNotes(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load PTP notes", e);
    }
  }, []);

  const savePtpNote = (loanId: string, promiseDate: string, note: string) => {
    const updated = {
      ...ptpNotes,
      [loanId]: {
        promiseDate,
        note,
        updatedAt: new Date().toISOString(),
      },
    };
    setPtpNotes(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("psi_field_ptp_notes", JSON.stringify(updated));
    }
  };

  // ── 6. Officer Scoped Payments & Cash In Hand ─────────────────────────────
  const myTodayPayments = useMemo(() => {
    if (!currentOfficer) return [];
    return payments.filter(
      (p) =>
        p.date === todayStr &&
        (p.collectedBy === currentOfficer.name ||
          p.collectedBy === currentOfficer.id ||
          !p.collectedBy)
    );
  }, [payments, todayStr, currentOfficer]);

  const myCashInHand = useMemo(() => {
    return myTodayPayments
      .filter((p) => (p.method || "Cash").toLowerCase() === "cash")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [myTodayPayments]);

  const myBankTransfersToday = useMemo(() => {
    return myTodayPayments
      .filter((p) => (p.method || "").toLowerCase() !== "cash")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [myTodayPayments]);

  const totalMyCollectedToday = useMemo(() => {
    return myTodayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [myTodayPayments]);

  // ── 8. Route Data & Loan Calculations ─────────────────────────────────────
  const collectionData = useMemo(() => {
    return getDailyCollections(loans, customers, payments, todayStr);
  }, [loans, customers, payments, todayStr]);

  const routeItems = collectionData.items;

  // Pre-calculate per-loan financials (Total paid, remaining balance, last payment)
  const loanStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { totalPaid: number; remainingBalance: number; lastPayment?: Payment }
    >();

    const paymentsByLoanId = new Map<string, Payment[]>();
    for (const p of payments) {
      const key = p.loanId || "";
      let list = paymentsByLoanId.get(key);
      if (!list) {
        list = [];
        paymentsByLoanId.set(key, list);
      }
      list.push(p);
    }

    for (const loan of loans) {
      const loanPayments = paymentsByLoanId.get(loan.id) || [];
      const totalPaid = loanPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );
      const totalLiability = Number(loan.totalRepayment) || Number(loan.principal) || 0;
      const remainingBalance = Math.max(0, totalLiability - totalPaid);

      const sorted = [...loanPayments].sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      );
      const lastPayment = sorted[0];

      map.set(loan.id, { totalPaid, remainingBalance, lastPayment });
    }

    return map;
  }, [loans, payments]);

  // Search & Status Filters for Route
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "collected" | "overdue">("all");

  const filteredRouteItems = useMemo(() => {
    return routeItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const custName =
        item.customer?.fullName || item.customer?.name || item.loan.customerName || "";
      const matchSearch =
        !q ||
        item.loan.loanNo?.toLowerCase().includes(q) ||
        custName.toLowerCase().includes(q) ||
        item.customer?.nic?.toLowerCase().includes(q) ||
        item.customer?.phone?.toLowerCase().includes(q) ||
        item.customer?.address?.toLowerCase().includes(q) ||
        item.routeArea?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterTab === "pending") return !item.isCollectedToday;
      if (filterTab === "collected") return item.isCollectedToday;
      if (filterTab === "overdue") return item.hasArrears || item.status === "OVERDUE";
      return true;
    });
  }, [routeItems, searchQuery, filterTab]);

  const totalTargetToday = useMemo(() => {
    return routeItems.reduce((sum, it) => sum + (it.totalDueToday || 0), 0);
  }, [routeItems]);

  const routeCompletedCount = useMemo(() => {
    return routeItems.filter((it) => it.isCollectedToday).length;
  }, [routeItems]);

  // ── 9. View Details Sheet Modal (Mobile) & Desktop Active Item Selection ──
  const [viewItem, setViewItem] = useState<ScheduledCollectionItem | null>(null);
  const [selectedDesktopItemId, setSelectedDesktopItemId] = useState<string>("");

  const activeDesktopItem: ScheduledCollectionItem | null = useMemo(() => {
    if (selectedDesktopItemId) {
      const found = filteredRouteItems.find((i) => i.id === selectedDesktopItemId);
      if (found) return found;
    }
    return filteredRouteItems[0] || null;
  }, [filteredRouteItems, selectedDesktopItemId]);

  // ── 10. Collection Modal State ────────────────────────────────────────────
  const [collectItem, setCollectItem] = useState<ScheduledCollectionItem | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectMethod, setCollectMethod] = useState<"Cash" | "Bank Transfer">("Cash");
  const [collectNotes, setCollectNotes] = useState<string>("");

  const openCollectModal = (item: ScheduledCollectionItem) => {
    setCollectItem(item);
    setCollectAmount(
      String(item.totalDueToday > 0 ? item.totalDueToday : item.installmentAmount)
    );
    setCollectMethod("Cash");
    setCollectNotes("");
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectItem) return;

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Please enter a valid payment amount");
      return;
    }

    const receiptNum = getNextReceiptNo();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      loanId: collectItem.loan.id,
      customerId: collectItem.loan.customerId,
      amount: amountNum,
      date: todayStr,
      type: "Capital",
      method: collectMethod,
      collectedBy: currentOfficer ? currentOfficer.name : "Field Officer",
      receiptNo: receiptNum,
      notes: collectNotes.trim()
        ? `[Field App - ${currentOfficer?.name || "Officer"}] ${collectNotes.trim()}`
        : `[Field App - ${currentOfficer?.name || "Officer"}] Route collection`,
    };

    addPayment(newPayment);
    setCollectItem(null);
    setViewItem(null);
    showToast(
      `Collected ${MONEY(amountNum)} from ${collectItem.customer?.fullName || collectItem.customer?.name || collectItem.loan.customerName || "Customer"}. Receipt: ${receiptNum}`
    );
    setSelectedReceipt(newPayment);
  };

  // ── 11. PTP Modal State ───────────────────────────────────────────────────
  const [ptpItem, setPtpItem] = useState<ScheduledCollectionItem | null>(null);
  const [ptpDate, setPtpDate] = useState<string>("");
  const [ptpNoteText, setPtpNoteText] = useState<string>("");

  const openPtpModal = (item: ScheduledCollectionItem) => {
    setPtpItem(item);
    const existing = ptpNotes[item.loan.id];
    setPtpDate(existing?.promiseDate || todayStr);
    setPtpNoteText(existing?.note || "");
  };

  const handleSavePtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptpItem) return;
    savePtpNote(ptpItem.loan.id, ptpDate, ptpNoteText);
    setPtpItem(null);
    showToast(`Promise to Pay saved for ${ptpItem.customer?.fullName || ptpItem.customer?.name || ptpItem.loan.customerName || "Customer"}`);
  };

  // ── 12. Printable Receipt Modal State ─────────────────────────────────────
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans pb-20 lg:pb-0 antialiased">
      {/* ── Mobile Off-Canvas Sidebar Drawer ────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="w-64 max-w-[85vw] bg-[#0b0f19] text-slate-200 h-full shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200 border-r border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brand Header */}
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800/80">
              <BrandLogo href="/field" size="md" theme="dark" />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {/* Core Operations */}
              <div className="space-y-1">
                <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  CORE OPERATIONS
                </p>
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("route");
                      setSidebarOpen(false);
                    }}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                      activeTab === "route"
                        ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar
                        size={18}
                        className={`shrink-0 transition-colors ${
                          activeTab === "route" ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="truncate">Today&apos;s Collections</span>
                    </div>
                    {routeItems.length > 0 && (
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                          activeTab === "route"
                            ? "bg-white/25 text-white"
                            : "bg-slate-700 text-white border border-slate-600"
                        }`}
                      >
                        {routeItems.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("quickpay");
                      setSidebarOpen(false);
                    }}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                      activeTab === "quickpay"
                        ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Coins
                        size={18}
                        className={`shrink-0 transition-colors ${
                          activeTab === "quickpay" ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="truncate">Quick Pay Desk</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Finance & Approvals */}
              <div className="space-y-1">
                <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  FINANCE & APPROVALS
                </p>
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("receipts");
                      setSidebarOpen(false);
                    }}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                      activeTab === "receipts"
                        ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt
                        size={18}
                        className={`shrink-0 transition-colors ${
                          activeTab === "receipts" ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="truncate">Repayments Ledger</span>
                    </div>
                    {myTodayPayments.length > 0 && (
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                          activeTab === "receipts"
                            ? "bg-white/25 text-white"
                            : "bg-red-600 text-white border border-red-500"
                        }`}
                      >
                        {myTodayPayments.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("online_slips");
                      setSidebarOpen(false);
                    }}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                      activeTab === "online_slips"
                        ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CreditCard
                        size={18}
                        className={`shrink-0 transition-colors ${
                          activeTab === "online_slips" ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      <span className="truncate">Online Slips</span>
                    </div>
                    {pendingOnlineCount > 0 && (
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                          activeTab === "online_slips"
                            ? "bg-white/25 text-white"
                            : "bg-amber-400 text-slate-950 font-black border border-amber-300"
                        }`}
                      >
                        {pendingOnlineCount}
                      </span>
                    )}
                  </button>
                </nav>
              </div>
            </div>

            {/* Footer Officer Profile & Status */}
            <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2 shrink-0">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 ring-1 ring-white/10">
                    {staffDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {staffDisplayName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                      <span className="text-rose-400 font-bold uppercase tracking-wider">Staff</span>
                      <span>•</span>
                      <span>{currentOfficer?.branch || "Colombo Central"}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOfficerModal(true);
                    setSidebarOpen(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
                  title="Switch Officer Profile"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold text-white">Field Sync: Online</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop Fixed Sidebar (w-64) ────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-30 bg-[#0b0f19] text-slate-200 border-r border-slate-800/80 p-4 shadow-xl justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800/80">
            <BrandLogo href="/field" size="md" theme="dark" />
          </div>

          {/* Navigation Groups */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {/* Core Operations */}
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                CORE OPERATIONS
              </p>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("route")}
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                    activeTab === "route"
                      ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar
                      size={18}
                      className={`shrink-0 transition-colors ${
                        activeTab === "route" ? "text-white" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span className="truncate">Today&apos;s Collections</span>
                  </div>
                  {routeItems.length > 0 && (
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                        activeTab === "route"
                          ? "bg-white/25 text-white"
                          : "bg-slate-700 text-white border border-slate-600"
                      }`}
                    >
                      {routeItems.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("quickpay")}
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                    activeTab === "quickpay"
                      ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Coins
                      size={18}
                      className={`shrink-0 transition-colors ${
                        activeTab === "quickpay" ? "text-white" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span className="truncate">Quick Pay Desk</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Finance & Approvals */}
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                FINANCE & APPROVALS
              </p>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("receipts")}
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                    activeTab === "receipts"
                      ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt
                      size={18}
                      className={`shrink-0 transition-colors ${
                        activeTab === "receipts" ? "text-white" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span className="truncate">Repayments Ledger</span>
                  </div>
                  {myTodayPayments.length > 0 && (
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                        activeTab === "receipts"
                          ? "bg-white/25 text-white"
                          : "bg-red-600 text-white border border-red-500"
                      }`}
                    >
                      {myTodayPayments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("online_slips")}
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all duration-150 cursor-pointer ${
                    activeTab === "online_slips"
                      ? "bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CreditCard
                      size={18}
                      className={`shrink-0 transition-colors ${
                        activeTab === "online_slips" ? "text-white" : "text-slate-400 group-hover:text-white"
                      }`}
                    />
                    <span className="truncate">Online Slips</span>
                  </div>
                  {pendingOnlineCount > 0 && (
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                        activeTab === "online_slips"
                          ? "bg-white/25 text-white"
                          : "bg-amber-400 text-slate-950 font-black border border-amber-300"
                      }`}
                    >
                      {pendingOnlineCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Footer Officer Profile & Status */}
        <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 ring-1 ring-white/10">
                {staffDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {staffDisplayName}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                  <span className="text-rose-400 font-bold uppercase tracking-wider">Staff</span>
                  <span>•</span>
                  <span>{currentOfficer?.branch || "Colombo Central"}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOfficerModal(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
              title="Switch Officer Profile"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2 text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-bold text-white">Field Sync: Online</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Layout Column (Offset on Desktop by lg:pl-64) ──────────────── */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200/90 shadow-2xs">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Open Sidebar"
                aria-label="Open Sidebar Menu"
              >
                <Menu size={20} />
              </button>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-600 font-mono">
                  <span>FIELD PORTAL</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-bold">{todayStr}</span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {activeTab === "route" && "Today's Collections"}
                  {activeTab === "quickpay" && "Rapid Cash Collection Desk"}
                  {activeTab === "receipts" && "Repayments Ledger & Receipts"}
                  {activeTab === "online_slips" && "Customer Online Slips Verification"}
                </h1>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreselectedCustomerForLoan(undefined);
                  setShowNewLoanModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                title="Create a new loan facility"
              >
                <PlusCircle size={14} />
                <span>+ Issue Loan</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                title="Register a new customer"
              >
                <UserPlus size={14} />
                <span>+ Customer</span>
              </button>
            </div>
          </div>
        </header>

      {/* ── Officer Switcher Bottom Sheet / Modal ──────────────────────────── */}
      {showOfficerModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowOfficerModal(false)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Select Field Officer</h3>
                <p className="text-xs text-slate-500">
                  Switch officer profile to view their isolated route & cash in hand
                </p>
              </div>
              <button
                onClick={() => setShowOfficerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {fieldStaffList.map((staff) => {
                const isSelected = staff.id === activeOfficerId;
                return (
                  <button
                    key={staff.id}
                    onClick={() => handleSelectOfficer(staff.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-red-50/70 border-red-500 text-slate-900 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isSelected
                            ? "bg-red-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {staff.name}
                          {isSelected && (
                            <span className="text-[10px] font-mono bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-md">
                              Active
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {staff.role} • {staff.branch}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      {staff.id}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-slate-400 text-[11px]">
                  Scoping: <b className="text-emerald-700">Strictly Isolated</b>
                </span>
                <button
                  onClick={() => setShowOfficerModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Responsive Content Container (Mobile, Tablet, Desktop) ────── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 space-y-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-16 left-4 right-4 z-50 max-w-lg mx-auto bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-in slide-in-from-top duration-200">
            <CheckCircle2 size={18} className="shrink-0 text-white" />
            <p className="text-xs font-bold leading-snug flex-1">{toastMessage}</p>
            <button onClick={() => setToastMessage("")} className="cursor-pointer">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Officer Shift & Cash Summary Grid (Responsive 4-Cards Grid) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Cash In Hand */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Wallet size={14} className="text-emerald-600" />
                Physical Cash In Hand
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="my-2">
              <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {MONEY(myCashInHand)}
              </h2>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {myTodayPayments.length} receipts logged
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Physical Cash
              </span>
            </div>
          </div>

          {/* Card 2: Today's Route Target */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-600" />
                Route Target Today
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {todayStr}
              </span>
            </div>

            <div className="my-2">
              <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {MONEY(totalTargetToday)}
              </h2>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Branch</span>
              <span className="font-bold text-slate-800 font-mono">
                {currentOfficer?.branch || "Colombo Central"}
              </span>
            </div>
          </div>

          {/* Card 3: Collected Today */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Collected Today
              </span>
              <span className="text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {totalTargetToday > 0
                  ? `${Math.round((totalMyCollectedToday / totalTargetToday) * 100)}%`
                  : "0%"}
              </span>
            </div>

            <div className="my-2">
              <h2 className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                {MONEY(totalMyCollectedToday)}
              </h2>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Bank/Online</span>
              <span className="font-mono font-bold text-blue-700">
                {MONEY(myBankTransfersToday)}
              </span>
            </div>
          </div>

          {/* Card 4: Route Visits Progress */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-slate-600" />
                Borrower Visits
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500">
                {routeItems.length} Total
              </span>
            </div>

            <div className="my-2">
              <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {routeCompletedCount}{" "}
                <span className="text-sm text-slate-400 font-normal">/ {routeItems.length}</span>
              </h2>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      routeItems.length > 0
                        ? Math.min(100, Math.round((routeCompletedCount / routeItems.length) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Remaining</span>
              <span className="font-bold text-amber-700">
                {routeItems.length - routeCompletedCount} pending
              </span>
            </div>
          </div>
        </section>

        {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}

        {/* TAB 1: ROUTE (RESPONSIVE MASTER-DETAIL SPLIT VIEW ON DESKTOP/TABLET) */}
        {activeTab === "route" && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80 md:w-96">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search customer name, NIC, phone, town..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-2xs transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    filterTab === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  All Route ({routeItems.length})
                </button>
                <button
                  onClick={() => setFilterTab("pending")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    filterTab === "pending"
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  Pending ({routeItems.filter((i) => !i.isCollectedToday).length})
                </button>
                <button
                  onClick={() => setFilterTab("collected")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    filterTab === "collected"
                      ? "bg-emerald-600 text-white font-black"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  Collected ({routeCompletedCount})
                </button>
                <button
                  onClick={() => setFilterTab("overdue")}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                    filterTab === "overdue"
                      ? "bg-red-600 text-white font-black"
                      : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  Arrears ({routeItems.filter((i) => i.hasArrears).length})
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredRouteItems.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">No Records Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? "No records matched your search terms."
                      : "There are no scheduled collections in this category for today."}
                  </p>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}

            {/* ── RESPONSIVE ROUTE WORKSPACE (SPLIT VIEW ON DESKTOP) ──────── */}
            {filteredRouteItems.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Route List Manifest (Scrollable Tiles) */}
                <div className="lg:col-span-6 space-y-2.5">
                  {filteredRouteItems.map((item) => {
                    const customer = item.customer;
                    const loan = item.loan;
                    const customerName =
                      customer?.fullName ||
                      customer?.name ||
                      loan.customerName ||
                      "Customer";
                    const isSelectedOnDesktop =
                      activeDesktopItem?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedDesktopItemId(item.id);
                          // On mobile and small tablets, open the sheet modal
                          if (typeof window !== "undefined" && window.innerWidth < 1024) {
                            setViewItem(item);
                          }
                        }}
                        className={`bg-white border rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition cursor-pointer ${
                          isSelectedOnDesktop
                            ? "ring-2 ring-red-600 border-red-500 bg-red-50/10"
                            : item.isCollectedToday
                            ? "border-emerald-200 bg-emerald-50/20"
                            : item.hasArrears
                            ? "border-red-200 bg-red-50/20"
                            : "border-slate-200/90 hover:border-slate-300"
                        }`}
                      >
                        {/* Left: Avatar & Customer Basics */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Status Avatar */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              item.isCollectedToday
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : item.hasArrears
                                ? "bg-red-100 text-red-700 border border-red-300"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {item.isCollectedToday ? (
                              <CheckCircle2 size={18} className="text-emerald-700" />
                            ) : item.hasArrears ? (
                              <AlertOctagon size={18} className="text-red-600" />
                            ) : (
                              customerName.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* Name & Route Location */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {customerName}
                              </p>
                              {item.hasArrears && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-sm bg-red-100 text-red-700 font-mono shrink-0">
                                  Arrears
                                </span>
                              )}
                              {item.isCollectedToday && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 font-mono shrink-0">
                                  Paid
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="shrink-0 text-slate-400" />
                              <span className="truncate">
                                {customer?.village || customer?.town || customer?.address || "Route Area"}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-[10px] text-slate-600 font-bold shrink-0">
                                {loan.loanNo || loan.id}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Right: Total Due & Quick Pay Pill */}
                        <div className="text-right shrink-0 flex items-center gap-2.5">
                          <div>
                            <span className="text-xs sm:text-sm font-black text-slate-900 font-mono block">
                              {MONEY(item.totalDueToday)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold block capitalize">
                              Cycle #{item.cycleNumber}/{item.totalCycles}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCollectModal(item);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1 shrink-0 ${
                              item.isCollectedToday
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            <Wallet size={13} />
                            {item.isCollectedToday ? "Paid" : "Pay"}
                          </button>

                          <ChevronRight
                            size={16}
                            className={`transition ${
                              isSelectedOnDesktop
                                ? "text-red-600 translate-x-0.5"
                                : "text-slate-400"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Desktop/Tablet Active Borrower Detail Panel */}
                <div className="hidden lg:block lg:col-span-6 sticky top-20">
                  {activeDesktopItem ? (
                    (() => {
                      const item = activeDesktopItem;
                      const customer = item.customer;
                      const loan = item.loan;
                      const customerName =
                        customer?.fullName ||
                        customer?.name ||
                        loan.customerName ||
                        "Customer";
                      const stats = loanStatsMap.get(loan.id) || {
                        totalPaid: 0,
                        remainingBalance: Number(loan.totalRepayment) || 0,
                      };
                      const ptp = ptpNotes[loan.id];
                      const guarantorName =
                        loan.guarantorName ||
                        customer?.guarantorName ||
                        customer?.guarantor;
                      const guarantorPhone =
                        loan.guarantorPhone || customer?.guarantorPhone;

                      return (
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-xs animate-in fade-in duration-150">
                          {/* Header */}
                          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900">
                                  {customerName}
                                </h3>
                                {item.isCollectedToday && (
                                  <span className="text-xs font-black uppercase font-mono px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Paid Today
                                  </span>
                                )}
                                {item.hasArrears && (
                                  <span className="text-xs font-black uppercase font-mono px-2.5 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-200">
                                    Arrears
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-mono mt-1">
                                Loan Facility: <b className="text-slate-900">{loan.loanNo || loan.id}</b> • NIC:{" "}
                                <span className="font-semibold text-slate-800">{customer?.nic || "N/A"}</span>
                              </p>
                            </div>

                            <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800">
                              Cycle #{item.cycleNumber} / {item.totalCycles}
                            </span>
                          </div>

                          {/* Prominent Total Due Box */}
                          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                                Total To Collect Now
                              </span>
                              <span className="text-xs text-slate-600 font-medium">
                                Frequency: {loan.repaymentFrequency || "Daily"} • Due Today
                              </span>
                            </div>
                            <span className="text-3xl font-black text-emerald-700 font-mono tracking-tight">
                              {MONEY(item.totalDueToday)}
                            </span>
                          </div>

                          {/* Financial Breakdown Table */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Daily Scheduled Installment</span>
                              <span className="font-bold text-slate-900 font-mono text-sm">
                                {MONEY(item.installmentAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Past Due Arrears</span>
                              {item.arrearsAmount > 0 ? (
                                <span className="font-black text-red-600 font-mono text-sm">
                                  + {MONEY(item.arrearsAmount)}
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-700">None</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Remaining Loan Balance</span>
                              <span className="font-bold text-slate-900 font-mono">
                                {MONEY(stats.remainingBalance)}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-slate-600">
                              <span>Last Payment Recorded</span>
                              {stats.lastPayment ? (
                                <span className="font-bold text-slate-900 font-mono">
                                  {MONEY(stats.lastPayment.amount)} on {stats.lastPayment.date}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No prior records</span>
                              )}
                            </div>
                          </div>

                          {/* Location & Address Box */}
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                            <div className="flex items-start gap-2.5 text-slate-700">
                              <MapPin size={17} className="text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-slate-900 text-sm">
                                  {customer?.address || "No address entered"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {customer?.village ? `${customer.village}, ` : ""}
                                  {customer?.town || customer?.district || "Route Area"}
                                </p>
                              </div>
                            </div>

                            {/* Guarantor Details */}
                            {guarantorName && (
                              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0 text-slate-700">
                                  <UserCheck size={15} className="text-blue-600 shrink-0" />
                                  <span className="truncate">
                                    Guarantor: <b>{guarantorName}</b>
                                  </span>
                                </div>
                                {guarantorPhone && (
                                  <a
                                    href={`tel:${guarantorPhone}`}
                                    className="text-blue-600 hover:text-blue-800 font-bold font-mono shrink-0 ml-2 flex items-center gap-1.5"
                                  >
                                    <Phone size={12} />
                                    {guarantorPhone}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* PTP Note if logged */}
                          {ptp && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs text-amber-900 flex items-center justify-between">
                              <span className="truncate">
                                <b>PTP Note:</b> {ptp.note}
                              </span>
                              <span className="font-mono text-xs font-bold text-amber-700 shrink-0 ml-2">
                                Promised: {ptp.promiseDate}
                              </span>
                            </div>
                          )}

                          {/* Desktop Action Buttons */}
                          <div className="space-y-2.5 pt-1">
                            <div className="grid grid-cols-2 gap-2.5">
                              {/* Call Customer */}
                              {customer?.phone ? (
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
                                >
                                  <Phone size={15} className="text-emerald-700" />
                                  Call Customer
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="py-3 px-4 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  <Phone size={15} />
                                  No Phone
                                </button>
                              )}

                              {/* WhatsApp Reminder */}
                              {customer?.phone ? (
                                <a
                                  href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                    `*PSI ONE Microfinance - Collection Notice*\n\n` +
                                      `Dear ${customerName},\n` +
                                      `Field Officer (${currentOfficer?.name || "Officer"}) is visiting your area today for Loan ${loan.loanNo || loan.id}.\n\n` +
                                      `• Regular Installment: ${MONEY(item.installmentAmount)}\n` +
                                      (item.arrearsAmount > 0 ? `• Past Arrears: ${MONEY(item.arrearsAmount)}\n` : "") +
                                      `• *Total Due Today: ${MONEY(item.totalDueToday)}*\n` +
                                      `• Remaining Loan Balance: ${MONEY(stats.remainingBalance)}\n\n` +
                                      `Please keep cash ready. Thank you!`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
                                >
                                  <MessageSquare size={15} className="text-emerald-600" />
                                  WhatsApp Notice
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="py-3 px-4 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  <MessageSquare size={15} />
                                  No WhatsApp
                                </button>
                              )}
                            </div>

                            {/* Collect Cash Button */}
                            <button
                              onClick={() => openCollectModal(item)}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Wallet size={17} />
                              Collect Cash Now ({MONEY(item.totalDueToday)})
                            </button>

                            {/* Log PTP Note */}
                            <div className="text-center pt-1">
                              <button
                                onClick={() => openPtpModal(item)}
                                className="text-xs text-slate-600 hover:text-amber-700 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Clock size={14} className="text-amber-600" />
                                {ptp ? "Edit Promise to Pay (PTP)" : "+ Log Promise to Pay (PTP) / Note"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                      <User size={32} className="mx-auto text-slate-300" />
                      <p className="text-sm font-bold text-slate-600">Select a borrower from the list</p>
                      <p className="text-xs text-slate-400">View financial details, location, and collection actions</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUICK PAY (Responsive Grid on Tablet/Desktop) */}
        {activeTab === "quickpay" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Coins size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Quick Cash Entry
                </h2>
                <p className="text-xs text-slate-500">
                  Select customer to record cash collection instantly.
                </p>
              </div>
            </div>

            {/* Fast Selector Grid: 1 col on mobile, 2 col on tablet, 3 col on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {routeItems.map((item) => {
                const customerName =
                  item.customer?.fullName ||
                  item.customer?.name ||
                  item.loan.customerName ||
                  "Customer";

                return (
                  <button
                    key={item.id}
                    onClick={() => openCollectModal(item)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition cursor-pointer shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {customerName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.loan.loanNo} • {item.customer?.phone || "No phone"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-700 block font-mono">
                        {MONEY(item.totalDueToday)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">
                        Tap to Collect
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: REPAYMENTS & RECEIPTS LEDGER */}
        {activeTab === "receipts" && (
          <div className="space-y-4">
            {/* Header & View Mode Switcher */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {receiptsViewMode === "my_today" ? "My Route Receipts Today" : "All System Repayments Ledger"}
                </h2>
                <p className="text-xs text-slate-500">
                  {receiptsViewMode === "my_today"
                    ? `Payments recorded by ${currentOfficer?.name || "Officer"} during today's field run`
                    : "Complete organization-wide collections ledger with real-time receipt verification"}
                </p>
              </div>

              {/* Segmented View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setReceiptsViewMode("my_today")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    receiptsViewMode === "my_today"
                      ? "bg-white text-red-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  My Collections ({myTodayPayments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptsViewMode("all_system")}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    receiptsViewMode === "all_system"
                      ? "bg-white text-red-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All System Repayments ({payments.length})
                </button>
              </div>
            </div>

            {/* VIEW MODE 1: MY ROUTE COLLECTIONS TODAY */}
            {receiptsViewMode === "my_today" ? (
              myTodayPayments.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2 shadow-2xs">
                  <Receipt size={36} className="text-slate-400 mx-auto" />
                  <h3 className="text-base font-black text-slate-900">No Receipts Issued Today Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When you collect installments on your route, official receipts will be stored here with instant reprint and WhatsApp share.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {myTodayPayments.map((p) => {
                    const cust = customers.find((c) => c.id === p.customerId);
                    const ln = loans.find((l) => l.id === p.loanId);
                    const custName = cust?.fullName || cust?.name || ln?.customerName || "Customer";

                    return (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {custName}
                            </p>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                              {p.method || "Cash"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {p.receiptNo || p.id} • Loan: {ln?.loanNo || p.loanId}
                          </p>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2.5">
                          <div>
                            <p className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                              {MONEY(Number(p.amount) || 0)}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {p.date}
                            </p>
                          </div>

                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer border border-slate-200"
                            title="View Official Receipt"
                          >
                            <Receipt size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* VIEW MODE 2: ALL SYSTEM REPAYMENTS LEDGER */
              <div className="space-y-3">
                {/* Search & Filter Toolbar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search receipt #, customer, loan, notes..."
                      value={allPaymentsSearch}
                      onChange={(e) => setAllPaymentsSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    {(["ALL", "Capital", "Interest", "Other"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAllPaymentsTypeFilter(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          allPaymentsTypeFilter === t
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All Repayments Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-4">Receipt / Payment ID</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Borrower & Loan</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4">Collected By</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allFilteredPayments.map((p) => {
                          const cust = customers.find((c) => c.id === p.customerId);
                          const ln = loans.find((l) => l.id === p.loanId);

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                {p.receiptNo || p.id}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium">
                                {p.date}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900 block truncate max-w-[160px]">
                                  {cust?.fullName || cust?.name || "Customer"}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Loan: {ln?.loanNo || p.loanId}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {p.type || "Capital"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                {p.method || "Cash"}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {p.collectedBy || "Officer"}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-black text-slate-950 text-xs">
                                {MONEY(p.amount)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceipt(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg transition cursor-pointer"
                                >
                                  <Receipt size={12} className="text-red-600" />
                                  <span>Receipt</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {allFilteredPayments.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                              No repayments recorded matching criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ONLINE PAYMENT SLIPS (STAFF RECONCILIATION) */}
        {activeTab === "online_slips" && (
          <div className="space-y-4">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 p-4 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Pending Review
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                    <Clock size={16} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-950 font-mono mt-1">
                  {MONEY(
                    onlinePayments
                      .filter((o) => o.status === "PENDING")
                      .reduce((s, o) => s + (Number(o.amount) || 0), 0)
                  )}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/60 text-[11px]">
                  <span className="text-slate-600 font-medium">Slips Awaiting Verification</span>
                  <span className="font-mono font-bold text-amber-900 px-2 py-0.5 rounded-full bg-amber-200/80">
                    {pendingOnlineCount} Pending
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300/80 p-4 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                    Approved & Credited
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-950 font-mono mt-1">
                  {MONEY(
                    onlinePayments
                      .filter((o) => o.status === "COMPLETED")
                      .reduce((s, o) => s + (Number(o.amount) || 0), 0)
                  )}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                  <span className="text-slate-600 font-medium">Reconciled to Borrowers</span>
                  <span className="font-mono font-bold text-emerald-900 px-2 py-0.5 rounded-full bg-emerald-200/80">
                    {onlinePayments.filter((o) => o.status === "COMPLETED").length} Approved
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Total Online Records
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <CreditCard size={16} />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-950 font-mono mt-1">
                  {MONEY(
                    onlinePayments.reduce((s, o) => s + (Number(o.amount) || 0), 0)
                  )}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-600 font-medium">All Slips Submitted</span>
                  <span className="font-mono font-bold text-slate-800 px-2 py-0.5 rounded-full bg-slate-100">
                    {onlinePayments.length} Total
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto">
                {(["ALL", "PENDING", "COMPLETED", "REJECTED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOnlineSlipsFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                      onlineSlipsFilter === st
                        ? st === "PENDING"
                          ? "bg-amber-600 text-white shadow-2xs"
                          : st === "COMPLETED"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : st === "REJECTED"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-red-600 text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {st === "ALL" ? "All Slips" : st === "PENDING" ? "Pending Review" : st === "COMPLETED" ? "Approved" : "Declined"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, NIC, phone, loan ID, or bank reference..."
                  value={onlineSlipsSearch}
                  onChange={(e) => setOnlineSlipsSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Online Slips Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Slip ID & Date</th>
                      <th className="py-3 px-4">Borrower Details</th>
                      <th className="py-3 px-4">Loan Reference</th>
                      <th className="py-3 px-4">Bank & Transaction Ref</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-center">Slip Proof</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOnlineSlips.map((item) => {
                      const targetLoan = loans.find((l) => l.id === item.loanId);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 block">{item.id}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} /> {item.paymentDate}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{item.customerName}</p>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              {item.customerNic && <span>NIC: {item.customerNic}</span>}
                              {item.customerPhone && <span>• {item.customerPhone}</span>}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-red-700 block">
                              {item.loanNo || item.loanId}
                            </span>
                            {targetLoan && (
                              <span className="text-[10px] text-slate-500">
                                Facility: {MONEY(targetLoan.principal || targetLoan.amount || 0)}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 block truncate max-w-[150px]">
                              {item.bankName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5 border border-slate-200">
                              Ref: {item.referenceNumber || "N/A"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-black text-slate-950 text-xs">
                            {MONEY(item.amount)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedSlipImage(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg transition cursor-pointer"
                            >
                              <ImageIcon size={13} />
                              <span>View Slip</span>
                            </button>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            {item.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    approveOnlinePayment(item.id, "Verified by Staff Officer", currentOfficer?.name);
                                    showToast(`Slip ${item.id} approved and credited to loan!`);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                                  title="Approve slip & credit loan"
                                >
                                  <Check size={12} /> Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason = prompt("Enter reason for declining slip:") || "Declined by officer";
                                    rejectOnlinePayment(item.id, reason, currentOfficer?.name);
                                    showToast(`Slip ${item.id} declined.`);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                  title="Decline slip"
                                >
                                  <X size={12} /> Decline
                                </button>
                              </div>
                            )}

                            {item.status === "COMPLETED" && (
                              <span className="text-[11px] text-emerald-700 font-bold font-mono">
                                {item.receiptNo || "Reconciled"}
                              </span>
                            )}

                            {item.status === "REJECTED" && (
                              <span className="text-[10px] text-slate-500 italic truncate max-w-[120px] block ml-auto" title={item.reviewNotes}>
                                {item.reviewNotes || "Declined"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredOnlineSlips.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          No customer online payment slips found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
      </div>

      {/* ── Fixed Bottom App Navigation (Visible on Mobile Only, Hidden on Tablet & Desktop) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 shadow-lg md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab("route")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === "route"
                ? "text-red-600 font-black bg-red-50"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <Calendar size={18} />
            <span className="text-[10px] tracking-tight mt-1">Collections</span>
          </button>

          <button
            onClick={() => setActiveTab("quickpay")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
              activeTab === "quickpay"
                ? "text-red-600 font-black bg-red-50"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <Coins size={18} />
            <span className="text-[10px] tracking-tight mt-1">Quick Pay</span>
          </button>

          <button
            onClick={() => setActiveTab("receipts")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer relative ${
              activeTab === "receipts"
                ? "text-red-600 font-black bg-red-50"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <Receipt size={18} />
            <span className="text-[10px] tracking-tight mt-1">Receipts</span>
            {myTodayPayments.length > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center">
                {myTodayPayments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("online_slips")}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer relative ${
              activeTab === "online_slips"
                ? "text-red-600 font-black bg-red-50"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <ImageIcon size={18} />
            <span className="text-[10px] tracking-tight mt-1">Slips</span>
            {pendingOnlineCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {pendingOnlineCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ── MODAL: Mobile Detailed View Sheet ───────────────────────────────── */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 lg:hidden"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-8 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 sm:hidden" />

            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    {viewItem.customer?.fullName || viewItem.customer?.name || viewItem.loan.customerName || "Customer"}
                  </h3>
                  {viewItem.isCollectedToday && (
                    <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Paid Today
                    </span>
                  )}
                  {viewItem.hasArrears && (
                    <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">
                      Arrears
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Loan: <b className="text-slate-900">{viewItem.loan.loanNo || viewItem.loan.id}</b> • NIC:{" "}
                  {viewItem.customer?.nic || "N/A"}
                </p>
              </div>

              <button
                onClick={() => setViewItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Financial Breakdown High Contrast Box */}
            {(() => {
              const stats = loanStatsMap.get(viewItem.loan.id) || {
                totalPaid: 0,
                remainingBalance: Number(viewItem.loan.totalRepayment) || 0,
              };
              const ptp = ptpNotes[viewItem.loan.id];
              const guarantorName =
                viewItem.loan.guarantorName ||
                viewItem.customer?.guarantorName ||
                viewItem.customer?.guarantor;
              const guarantorPhone =
                viewItem.loan.guarantorPhone || viewItem.customer?.guarantorPhone;
              const custName =
                viewItem.customer?.fullName ||
                viewItem.customer?.name ||
                viewItem.loan.customerName ||
                "Customer";

              return (
                <div className="space-y-3.5">
                  {/* Big Total Due Box */}
                  <div className="bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        Total To Collect Now
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        Cycle #{viewItem.cycleNumber} / {viewItem.totalCycles} ({viewItem.loan.repaymentFrequency || "Daily"})
                      </span>
                    </div>
                    <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                      {MONEY(viewItem.totalDueToday)}
                    </span>
                  </div>

                  {/* Financial Metrics Grid */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Scheduled Daily Installment</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {MONEY(viewItem.installmentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Past Due / Arrears</span>
                      {viewItem.arrearsAmount > 0 ? (
                        <span className="font-black text-red-600 font-mono">
                          + {MONEY(viewItem.arrearsAmount)}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700">None</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Remaining Loan Balance</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {MONEY(stats.remainingBalance)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-slate-600">
                      <span>Last Payment Made</span>
                      {stats.lastPayment ? (
                        <span className="font-bold text-slate-900 font-mono">
                          {MONEY(stats.lastPayment.amount)} on {stats.lastPayment.date}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No prior records</span>
                      )}
                    </div>
                  </div>

                  {/* Location & Address Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin size={15} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">
                          {viewItem.customer?.address || "No address entered"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {viewItem.customer?.village ? `${viewItem.customer.village}, ` : ""}
                          {viewItem.customer?.town || viewItem.customer?.district || "Route Area"}
                        </p>
                      </div>
                    </div>

                    {/* Guarantor Details */}
                    {guarantorName && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-slate-700">
                          <UserCheck size={13} className="text-blue-600 shrink-0" />
                          <span className="truncate">
                            Guarantor: <b>{guarantorName}</b>
                          </span>
                        </div>
                        {guarantorPhone && (
                          <a
                            href={`tel:${guarantorPhone}`}
                            className="text-blue-600 hover:text-blue-800 font-bold font-mono shrink-0 ml-2 flex items-center gap-1"
                          >
                            <Phone size={11} />
                            {guarantorPhone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* PTP Note if logged */}
                  {ptp && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900 flex items-center justify-between">
                      <span className="truncate">
                        <b>PTP Note:</b> {ptp.note}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-amber-700 shrink-0 ml-2">
                        {ptp.promiseDate}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons Inside Sheet */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Call Customer */}
                    {viewItem.customer?.phone ? (
                      <a
                        href={`tel:${viewItem.customer.phone}`}
                        className="py-3 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Phone size={14} className="text-emerald-700" />
                        Call Customer
                      </a>
                    ) : (
                      <button
                        disabled
                        className="py-3 px-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Phone size={14} />
                        No Phone
                      </button>
                    )}

                    {/* WhatsApp */}
                    {viewItem.customer?.phone ? (
                      <a
                        href={`https://wa.me/${viewItem.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          `*PSI ONE Microfinance - Collection Notice*\n\n` +
                            `Dear ${custName},\n` +
                            `Field Officer (${currentOfficer?.name || "Officer"}) is visiting your area today for Loan ${viewItem.loan.loanNo || viewItem.loan.id}.\n\n` +
                            `• Regular Installment: ${MONEY(viewItem.installmentAmount)}\n` +
                            (viewItem.arrearsAmount > 0 ? `• Past Arrears: ${MONEY(viewItem.arrearsAmount)}\n` : "") +
                            `• *Total Due Today: ${MONEY(viewItem.totalDueToday)}*\n` +
                            `• Remaining Loan Balance: ${MONEY(stats.remainingBalance)}\n\n` +
                            `Please keep cash ready. Thank you!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <MessageSquare size={14} className="text-emerald-600" />
                        WhatsApp
                      </a>
                    ) : (
                      <button
                        disabled
                        className="py-3 px-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={14} />
                        No WA
                      </button>
                    )}
                  </div>

                  {/* Primary Collect Button */}
                  <button
                    onClick={() => {
                      const it = viewItem;
                      setViewItem(null);
                      openCollectModal(it);
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Wallet size={16} />
                    Collect Cash Now ({MONEY(viewItem.totalDueToday)})
                  </button>

                  {/* PTP Trigger Button */}
                  <div className="text-center pt-1">
                    <button
                      onClick={() => {
                        const it = viewItem;
                        setViewItem(null);
                        openPtpModal(it);
                      }}
                      className="text-xs text-slate-600 hover:text-amber-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Clock size={13} className="text-amber-600" />
                      {ptp ? "Edit Promise to Pay (PTP)" : "+ Log Promise to Pay (PTP) / Note"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── MODAL: Collect Cash Modal (Responsive Light Bottom Sheet / Modal) ── */}
      {collectItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setCollectItem(null)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-8 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Record Collection</h3>
                <p className="text-xs text-slate-500">
                  {collectItem.customer?.fullName || collectItem.customer?.name || collectItem.loan.customerName || "Customer"} • Loan {collectItem.loan.loanNo}
                </p>
              </div>
              <button
                onClick={() => setCollectItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                  Amount to Collect (LKR)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-2xl font-black text-emerald-700 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono shadow-2xs"
                  placeholder="0.00"
                />

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCollectAmount(
                        String(
                          collectItem.totalDueToday > 0
                            ? collectItem.totalDueToday
                            : collectItem.installmentAmount
                        )
                      )
                    }
                    className="py-2 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-[11px] font-bold text-center cursor-pointer shadow-2xs"
                  >
                    Total Due ({MONEY(collectItem.totalDueToday)})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCollectAmount(
                        String(
                          Math.round(
                            (collectItem.totalDueToday > 0
                              ? collectItem.totalDueToday
                              : collectItem.installmentAmount) / 2
                          )
                        )
                      )
                    }
                    className="py-2 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-[11px] font-bold text-center cursor-pointer shadow-2xs"
                  >
                    Half Due
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectAmount(String(collectItem.installmentAmount))}
                    className="py-2 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-[11px] font-bold text-center cursor-pointer shadow-2xs"
                  >
                    1 Installment
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCollectMethod("Cash")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                      collectMethod === "Cash"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Wallet size={14} />
                    Cash (Physical)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectMethod("Bank Transfer")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                      collectMethod === "Bank Transfer"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <CreditCard size={14} />
                    Bank / Online
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                  Field Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Paid at shop, next visit Monday"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs sm:text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Confirm Collection & Issue Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Promise to Pay (PTP) ─────────────────────────────────────── */}
      {ptpItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setPtpItem(null)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-8 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Log Promise to Pay</h3>
                <p className="text-xs text-slate-500">
                  {ptpItem.customer?.fullName || ptpItem.customer?.name || ptpItem.loan.customerName || "Customer"}
                </p>
              </div>
              <button
                onClick={() => setPtpItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                  Promised Date
                </label>
                <input
                  type="date"
                  required
                  value={ptpDate}
                  onChange={(e) => setPtpDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                  Visit Notes / Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={ptpNoteText}
                  onChange={(e) => setPtpNoteText(e.target.value)}
                  placeholder="e.g. Borrower was out of town, promised full settlement on Friday 10 AM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Save PTP Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Official Printable Receipt Modal ─────────────────────────────────── */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* ── MODAL: Originate New Loan Facility ─────────────────────────────── */}
      {showNewLoanModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setShowNewLoanModal(false)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Originate New Loan Facility (Staff Portal)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Issue microfinance facility, set deductions, repayment frequency and guarantors.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewLoanModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <NewLoanForm
              isModal={true}
              initialCustomerId={preselectedCustomerForLoan}
              onSuccess={(loanId) => {
                setShowNewLoanModal(false);
                setPreselectedCustomerForLoan(undefined);
                showToast(`Loan ${loanId} originated successfully!`);
              }}
              onCancel={() => {
                setShowNewLoanModal(false);
                setPreselectedCustomerForLoan(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* ── MODAL: Register New Borrower ──────────────────────────────────── */}
      {showNewCustomerModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setShowNewCustomerModal(false)}
        >
          <div
            className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Register New Borrower
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Fast-track field onboarding for borrowers in your route cluster.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustFullName}
                    onChange={(e) => setNewCustFullName(e.target.value)}
                    placeholder="e.g. Sunil Shantha Perera"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Display / Calling Name
                  </label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Sunil"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    NIC Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustNic}
                    onChange={(e) => setNewCustNic(e.target.value)}
                    placeholder="e.g. 198512345678 or 851234567V"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Primary Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 077 123 4567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Secondary / Landline Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustAltPhone}
                    onChange={(e) => setNewCustAltPhone(e.target.value)}
                    placeholder="e.g. 011 234 5678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Monthly Income (LKR)
                  </label>
                  <input
                    type="number"
                    value={newCustIncome}
                    onChange={(e) => setNewCustIncome(e.target.value)}
                    placeholder="e.g. 65000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="Street number, road, lane"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Town / City
                  </label>
                  <input
                    type="text"
                    value={newCustTown}
                    onChange={(e) => setNewCustTown(e.target.value)}
                    placeholder="e.g. Maharagama"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Guarantor Details Accordion / Sub-card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                  <UserCheck size={14} className="text-red-600" />
                  <span>Guarantor Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">
                      Guarantor Name
                    </label>
                    <input
                      type="text"
                      value={newCustGuarantorName}
                      onChange={(e) => setNewCustGuarantorName(e.target.value)}
                      placeholder="Guarantor Full Name"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">
                      Guarantor Phone
                    </label>
                    <input
                      type="tel"
                      value={newCustGuarantorPhone}
                      onChange={(e) => setNewCustGuarantorPhone(e.target.value)}
                      placeholder="07X XXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">
                      Guarantor NIC
                    </label>
                    <input
                      type="text"
                      value={newCustGuarantorNic}
                      onChange={(e) => setNewCustGuarantorNic(e.target.value)}
                      placeholder="NIC Number"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Complete Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: View Full Bank Slip (Staff Verification) ───────────────── */}
      {selectedSlipImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedSlipImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Customer Deposit Slip Proof
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Slip ID: {selectedSlipImage.id} · Ref: {selectedSlipImage.referenceNumber || "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlipImage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Slip Details Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Borrower
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {selectedSlipImage.customerName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Amount
                </span>
                <span className="font-mono font-black text-emerald-700">
                  {MONEY(selectedSlipImage.amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Bank Name
                </span>
                <span className="font-bold text-slate-900 truncate block">
                  {selectedSlipImage.bankName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Transfer Date
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedSlipImage.paymentDate}
                </span>
              </div>
            </div>

            {/* Slip Image Preview */}
            <div className="flex-1 overflow-auto bg-slate-900 rounded-2xl p-2 min-h-[260px] max-h-[440px] flex items-center justify-center border border-slate-800">
              {selectedSlipImage.slipUrl ? (
                <img
                  src={selectedSlipImage.slipUrl}
                  alt="Customer Bank Deposit Slip"
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="text-center text-slate-400 p-6">
                  <ImageIcon size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No direct image file attached.</p>
                  <p className="text-[10px] font-mono mt-1 text-slate-500">
                    Ref: {selectedSlipImage.referenceNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Action Bar inside Slip Modal */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedSlipImage.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800"
                      : selectedSlipImage.status === "REJECTED"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  Status: {selectedSlipImage.status}
                </span>
              </div>

              {selectedSlipImage.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const reason = prompt("Enter reason for declining slip:") || "Declined by field officer";
                      rejectOnlinePayment(selectedSlipImage.id, reason, currentOfficer?.name);
                      setSelectedSlipImage(null);
                      showToast(`Slip ${selectedSlipImage.id} declined.`);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Decline Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      approveOnlinePayment(
                        selectedSlipImage.id,
                        "Verified by Field Staff",
                        currentOfficer?.name
                      );
                      setSelectedSlipImage(null);
                      showToast(`Slip ${selectedSlipImage.id} approved and credited to loan!`);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} /> Accept & Credit Loan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
