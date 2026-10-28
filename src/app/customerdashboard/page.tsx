/* eslint-disable @next/next/no-img-element */
"use client";
import { clearSession } from "@/lib/api-client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  Clock,
  Printer,
  CheckCircle2,
  FileText,
  Receipt,
  X,
  LogOut,
  ShieldCheck,
  AlertCircle,
  Building,
  Phone,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Eye,
  Coins,
  ExternalLink,
  Wallet,
  Check,
  Upload,
  Image as ImageIcon,
  FileCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";
import { CustomerPaymentGatewayModal } from "@/components/payment/CustomerPaymentGatewayModal";
import { getLoanTotalRepayment } from "@/lib/loan-financials";
import type { Payment, OnlinePayment, Loan } from "@/types";

export interface LoanDueInfo {
  isSettled: boolean;
  isTodayPaid: boolean;
  hasPendingSlip?: boolean;
  cycle: number;
  totalCycles: number;
  dueDate: string;
  diffDays: number;
  status: "PAID" | "OVERDUE" | "DUE_TODAY" | "DUE_TOMORROW" | "UPCOMING";
  badgeText: string;
  installmentAmount: number;
  remainingForCycle: number;
}

function parseDateString(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr || dateStr === "-") return "-";
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  try {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function getLoanNextDueInfo(
  loan: Loan,
  allRepayments: Payment[],
  todayStr: string,
  onlinePaymentsList: OnlinePayment[] = []
): LoanDueInfo {
  const payable = getLoanTotalRepayment(loan);
  const loanPayments = allRepayments.filter(
    (p) => p.loanId === loan.id || (loan.customerId && p.customerId === loan.customerId && !p.loanId)
  );

  // Check for completed online slips (already approved)
  const completedOnlineSlips = (onlinePaymentsList || []).filter(
    (op) =>
      (op.loanId === loan.id || (loan.customerId && op.customerId === loan.customerId)) &&
      op.status === "COMPLETED"
  );

  // Check for pending online slips awaiting admin verification
  const pendingOnlineSlips = (onlinePaymentsList || []).filter(
    (op) =>
      (op.loanId === loan.id || (loan.customerId && op.customerId === loan.customerId)) &&
      op.status === "PENDING"
  );
  const hasPendingSlip = pendingOnlineSlips.length > 0;

  const existingKeys = new Set(
    loanPayments.map((p) => `${(p.date || "").slice(0, 10)}_${Number(p.amount) || 0}`)
  );
  const totalPaidFromPayments = loanPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaidFromSlips = completedOnlineSlips
    .filter((op) => {
      const pDate = (op.paymentDate || op.submittedAt || todayStr).slice(0, 10);
      const amt = Number(op.amount) || 0;
      return !existingKeys.has(`${pDate}_${amt}`);
    })
    .reduce((s, op) => s + (Number(op.amount) || 0), 0);

  // Only approved / confirmed payments count towards loan totalPaid
  const totalPaid = totalPaidFromPayments + totalPaidFromSlips;
  const outstanding = Math.max(0, Math.round((payable - totalPaid) * 100) / 100);

  const duration = Math.max(1, loan.duration || 1);

  if ((loan.status || "").toLowerCase() === "completed" || outstanding <= 0) {
    return {
      isSettled: true,
      isTodayPaid: false,
      hasPendingSlip: false,
      cycle: duration,
      totalCycles: duration,
      dueDate: "-",
      diffDays: 0,
      status: "PAID",
      badgeText: "Fully Settled",
      installmentAmount: 0,
      remainingForCycle: 0,
    };
  }

  const gross = Number(loan.principal || loan.amount || 0);
  const remainingGross = Math.max(0, gross - Number(loan.capitalDeduction || 0));
  const totalInt =
    typeof loan.interest === "number" && loan.interest >= 0
      ? Math.max(0, loan.interest - Number(loan.interestDeduction || 0))
      : Math.max(0, payable - remainingGross);
  const frequency = loan.repaymentFrequency || "Monthly";
  const repaymentType = loan.repaymentType || "Capital + Interest";
  const startDate = parseDateString(loan.firstPaymentDate || loan.issueDate) || parseDateString(todayStr) || new Date();

  let runningBalance = payable;
  let accumulatedPaid = totalPaid;

  const hasPaymentToday =
    loanPayments.some(
      (p) => (p.date || "").slice(0, 10) === todayStr && (Number(p.amount) || 0) > 0
    ) ||
    completedOnlineSlips.some((op) => {
      const pDate = (op.paymentDate || op.submittedAt || todayStr).slice(0, 10);
      return pDate === todayStr && (Number(op.amount) || 0) > 0;
    });

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date(startDate.getTime());
    if (frequency === "Daily") {
      dueDate.setDate(dueDate.getDate() + (i - 1));
    } else if (frequency === "Weekly") {
      dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
    } else {
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
    }
    const dueDateStr = formatDateToYMD(dueDate);

    let installmentAmt = 0;
    if (repaymentType === "Interest Only") {
      if (i === duration) {
        installmentAmt = runningBalance;
      } else {
        installmentAmt = Math.round((totalInt / duration) * 100) / 100;
      }
    } else {
      if (i === duration) {
        installmentAmt = runningBalance;
      } else {
        installmentAmt = Math.round((payable / duration) * 100) / 100;
      }
    }

    if (installmentAmt <= 0) {
      installmentAmt = Math.round((loan.installment || 0) * 100) / 100;
    }

    runningBalance = Math.max(0, runningBalance - installmentAmt);

    if (accumulatedPaid >= installmentAmt - 1.0) {
      accumulatedPaid -= installmentAmt;
      continue;
    }

    // Earliest unpaid cycle found!
    const dueTime = new Date(`${dueDateStr}T00:00:00Z`).getTime();
    const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
    const diffDays = Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));

    const isDaily = frequency.toLowerCase() === "daily";
    const isTodayPaid = hasPaymentToday || (isDaily && diffDays === 1 && i > 1);

    let status: "OVERDUE" | "DUE_TODAY" | "DUE_TOMORROW" | "UPCOMING" = "UPCOMING";
    let badgeText = "";

    if (diffDays < 0) {
      status = "OVERDUE";
      const absDays = Math.abs(diffDays);
      badgeText = hasPendingSlip ? "Slip Under Review" : `Overdue by ${absDays} ${absDays === 1 ? "day" : "days"}`;
    } else if (diffDays === 0) {
      if (isTodayPaid) {
        status = "DUE_TOMORROW";
        badgeText = "PAID FOR TODAY";
      } else if (hasPendingSlip) {
        status = "DUE_TODAY";
        badgeText = "Slip Under Review";
      } else {
        status = "DUE_TODAY";
        badgeText = "Due Today";
      }
    } else if (diffDays === 1) {
      status = "DUE_TOMORROW";
      badgeText = isTodayPaid ? "PAID FOR TODAY" : (hasPendingSlip ? "Slip Under Review" : "Due Tomorrow");
    } else {
      status = "UPCOMING";
      badgeText = isTodayPaid ? "PAID FOR TODAY" : (hasPendingSlip ? "Slip Under Review" : `Due in ${diffDays} days`);
    }

    return {
      isSettled: false,
      isTodayPaid,
      hasPendingSlip,
      cycle: i,
      totalCycles: duration,
      dueDate: dueDateStr,
      diffDays,
      status,
      badgeText,
      installmentAmount: installmentAmt,
      remainingForCycle: Math.max(0, Math.round((installmentAmt - accumulatedPaid) * 100) / 100),
    };
  }

  return {
    isSettled: true,
    isTodayPaid: false,
    cycle: duration,
    totalCycles: duration,
    dueDate: "-",
    diffDays: 0,
    status: "PAID",
    badgeText: "Fully Settled",
    installmentAmount: 0,
    remainingForCycle: 0,
  };
}

export default function CustomerDashboardPage() {
  const { currentCustomer: authenticatedCustomer, customers, loans, repayments, onlinePayments, addOnlinePayment } = useData();

  // Session customer state & today's date
  const [sessionCustomerId, setSessionCustomerId] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new Date().toISOString().slice(0, 10);
    }
    return "2026-10-21";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTodayStr(new Date().toISOString().slice(0, 10));
      const params = new URLSearchParams(window.location.search);
      const urlId = authenticatedCustomer?.id || params.get("customerId");
      const stored = sessionStorage.getItem("customerSessionId");
      if (urlId) {
        setSessionCustomerId(urlId);
        sessionStorage.setItem("customerSessionId", urlId);
      } else if (stored) {
        setSessionCustomerId(stored);
      }
      const urlLoanId = params.get("loanId");
      if (urlLoanId) {
        setActiveLoanId(urlLoanId);
      }
    }
  }, [authenticatedCustomer]);

  const [lookupQuery, setLookupQuery] = useState<string>("");
  const [lookupError, setLookupError] = useState<string>("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    const term = lookupQuery.trim().toLowerCase();
    if (!term) {
      setLookupError("Please enter your NIC number or Registered Mobile Phone.");
      return;
    }
    const found = customers.find(
      (c) =>
        c.id.toLowerCase() === term ||
        c.nic.toLowerCase() === term ||
        c.phone.replace(/[^0-9]/g, "") === term.replace(/[^0-9]/g, "") ||
        (c.email && c.email.toLowerCase() === term)
    );
    if (found) {
      setSessionCustomerId(found.id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customerSessionId", found.id);
      }
    } else {
      setLookupError("No borrower account found with the provided NIC or Phone number.");
    }
  };

  // Current customer record (authenticated borrower)
  const currentCustomer = useMemo(() => {
    if (sessionCustomerId) {
      const found = customers.find(
        (c) =>
          c.id.toLowerCase() === sessionCustomerId.toLowerCase() ||
          c.nic.toLowerCase() === sessionCustomerId.toLowerCase()
      );
      if (found) return found;
    }
    return null;
  }, [customers, sessionCustomerId]);

  // Loans belonging to current customer
  const customerLoans = useMemo(() => {
    if (!currentCustomer?.id) return [];
    return loans.filter(
      (l) => l.customerId === currentCustomer.id || l.customerName === currentCustomer.name
    );
  }, [loans, currentCustomer]);

  // Active primary loan (empty string by default to show Loans List first)
  const [activeLoanId, setActiveLoanId] = useState<string>("");

  const currentLoan = useMemo(() => {
    if (activeLoanId) {
      const match = customerLoans.find((l) => l.id === activeLoanId);
      if (match) return match;
    }
    return null;
  }, [customerLoans, activeLoanId]);

  // ── Combine official repayments with uploaded customer online payment slips ──
  const effectiveRepayments = useMemo(() => {
    const list = [...repayments];
    const existingKeys = new Set(
      repayments.map((p) => `${(p.date || "").slice(0, 10)}_${p.loanId || ""}_${Number(p.amount) || 0}`)
    );
    for (const op of onlinePayments || []) {
      if (op.status !== "COMPLETED") continue;
      const opDate = (op.paymentDate || op.submittedAt || todayStr).slice(0, 10);
      const opAmt = Number(op.amount) || 0;
      const key = `${opDate}_${op.loanId || ""}_${opAmt}`;
      if (!existingKeys.has(key)) {
        list.push({
          id: op.id,
          loanId: op.loanId,
          customerId: op.customerId,
          amount: opAmt,
          date: opDate,
          type: "Capital",
          method: op.paymentMethod === "CARD" ? "Card" : "Bank Transfer",
          collectedBy: "Customer Online Portal (Slip)",
          receiptNo: op.receiptNo || op.id,
          notes: `Online Slip: ${op.bankName || "Bank Transfer"} (Ref: ${op.referenceNumber || op.id})`,
        });
        existingKeys.add(key);
      }
    }
    return list;
  }, [repayments, onlinePayments, todayStr]);

  // Pre-calculate statistics for each customer loan
  const loanStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        paid: number;
        payable: number;
        outstanding: number;
        percent: number;
        paymentsCount: number;
      }
    >();

    customerLoans.forEach((loan) => {
      const payable = getLoanTotalRepayment(loan);

      const loanPayments = effectiveRepayments.filter(
        (p) =>
          p.loanId === loan.id ||
          (currentCustomer?.id && p.customerId === currentCustomer.id && !p.loanId)
      );
      const paid = loanPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const outstanding = Math.max(0, Math.round((payable - paid) * 100) / 100);
      const percent = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 0;

      statsMap.set(loan.id, {
        paid,
        payable,
        outstanding,
        percent,
        paymentsCount: loanPayments.length,
      });
    });

    return statsMap;
  }, [customerLoans, effectiveRepayments, currentCustomer?.id]);

  // Portfolio overview totals across all facilities
  const portfolioSummary = useMemo(() => {
    let totalBorrowing = 0;
    let totalPayableSum = 0;
    let totalPaidSum = 0;
    let totalOutstandingSum = 0;

    customerLoans.forEach((loan) => {
      const principal = loan.principal || loan.amount || 0;
      totalBorrowing += principal;
      const stat = loanStats.get(loan.id);
      if (stat) {
        totalPayableSum += stat.payable;
        totalPaidSum += stat.paid;
        totalOutstandingSum += stat.outstanding;
      }
    });

    return {
      activeCount: customerLoans.filter((l) => (l.status || "").toLowerCase() === "active").length,
      totalCount: customerLoans.length,
      totalBorrowing: Math.round(totalBorrowing * 100) / 100,
      totalPayableSum: Math.round(totalPayableSum * 100) / 100,
      totalPaidSum: Math.round(totalPaidSum * 100) / 100,
      totalOutstandingSum: Math.round(totalOutstandingSum * 100) / 100,
    };
  }, [customerLoans, loanStats]);

  // Payments / Repayments for current customer's loans
  const customerPayments = useMemo(() => {
    if (!currentCustomer?.id) return [];
    if (!currentLoan) {
      return effectiveRepayments.filter((p) => p.customerId === currentCustomer.id);
    }
    return effectiveRepayments.filter(
      (p) => p.loanId === currentLoan.id || p.customerId === currentCustomer.id
    );
  }, [effectiveRepayments, currentLoan, currentCustomer?.id]);

  // Calculate financial totals
  const totalPrincipal = currentLoan ? currentLoan.principal || currentLoan.amount || 0 : 0;
  const totalPayable = currentLoan ? getLoanTotalRepayment(currentLoan) : 0;
  const remainingGross = currentLoan ? Math.max(0, totalPrincipal - Number(currentLoan.capitalDeduction || 0)) : 0;
  const totalInterest = currentLoan
    ? typeof currentLoan.interest === "number" && currentLoan.interest >= 0
      ? Math.max(0, currentLoan.interest - Number(currentLoan.interestDeduction || 0))
      : Math.max(0, totalPayable - remainingGross)
    : 0;

  const totalPaid = useMemo(() => {
    return customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [customerPayments]);

  const outstandingBalance = Math.max(0, Math.round((totalPayable - totalPaid) * 100) / 100);
  const percentSettled = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 0;

  // Pre-calculate next due info for each customer loan
  const loanDueMap = useMemo(() => {
    const map = new Map<string, LoanDueInfo>();
    customerLoans.forEach((loan) => {
      map.set(loan.id, getLoanNextDueInfo(loan, effectiveRepayments, todayStr, onlinePayments));
    });
    return map;
  }, [customerLoans, effectiveRepayments, onlinePayments, todayStr]);

  // Next Due Info for currently selected loan (if any)
  const currentLoanDue = useMemo(() => {
    if (!currentLoan) return null;
    return (
      loanDueMap.get(currentLoan.id) ||
      getLoanNextDueInfo(currentLoan, effectiveRepayments, todayStr, onlinePayments)
    );
  }, [currentLoan, loanDueMap, effectiveRepayments, onlinePayments, todayStr]);

  // Upcoming installment calculations
  const nextInstallmentAmount = currentLoanDue?.installmentAmount || currentLoan?.installment || (totalPayable > 0 ? Math.round((totalPayable / (currentLoan?.duration || 1)) * 100) / 100 : 0);
  const nextDueDate = currentLoanDue?.dueDate && currentLoanDue.dueDate !== "-" ? currentLoanDue.dueDate : (currentLoan?.firstPaymentDate || currentLoan?.issueDate || todayStr);

  // Overall most urgent upcoming due across all loans
  const urgentDueInfo = useMemo(() => {
    const activeDueList = customerLoans
      .map((loan) => ({
        loan,
        due: loanDueMap.get(loan.id)!,
      }))
      .filter((item) => item.due && !item.due.isSettled);

    if (activeDueList.length === 0) return null;

    // Sort: overdue first (lowest diffDays), then today (0), tomorrow (1), etc.
    activeDueList.sort((a, b) => a.due.diffDays - b.due.diffDays);
    return activeDueList[0];
  }, [customerLoans, loanDueMap]);

  // Tab state: 'schedule' (Installment Due Dates) | 'history' (Repayment History) | 'slips' (Bank Slips & Online)
  const [activeTab, setActiveTab] = useState<"schedule" | "history" | "slips">("schedule");

  // Receipt & Statement Modal States
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Secure Payment Gateway Modal States
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayLoanId, setGatewayLoanId] = useState<string>("");

  const handleOpenGateway = (targetLoanId?: string) => {
    const loanIdToUse = targetLoanId || activeLoanId || customerLoans[0]?.id || "";
    const loanStat = loanIdToUse ? loanStats.get(loanIdToUse) : null;
    const targetLoan = customerLoans.find((l) => l.id === loanIdToUse);
    const due = loanStat ? loanStat.outstanding : portfolioSummary.totalOutstandingSum;
    if (due <= 0 || targetLoan?.status === "Completed") {
      return;
    }
    setGatewayLoanId(loanIdToUse);
    setIsGatewayOpen(true);
  };

  const handleGatewaySuccess = (receiptNo?: string) => {
    setUploadSuccessMsg(
      receiptNo
        ? `Payment verified and credited! Official receipt #${receiptNo} generated. Today's installment is marked as PAID.`
        : "Payment successfully recorded and credited to your loan facility. Today's installment is PAID."
    );
  };

  // Viewing Slip Details Modal
  const [viewingSlip, setViewingSlip] = useState<OnlinePayment | null>(null);
  const [customerSlipImgError, setCustomerSlipImgError] = useState(false);

  const getSafeCustomerSlipUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("data:image/svg+xml;utf8,")) {
      const raw = url.replace("data:image/svg+xml;utf8,", "");
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw);
    }
    return url;
  };
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");

  // Customer's online payment slips
  const customerOnlinePayments = useMemo(() => {
    if (!currentCustomer?.id) return [];
    if (!currentLoan) {
      return onlinePayments.filter(
        (op) =>
          op.customerId === currentCustomer.id ||
          (op.customerNic && op.customerNic.toLowerCase() === currentCustomer.nic?.toLowerCase())
      );
    }
    return onlinePayments.filter(
      (op) =>
        op.loanId === currentLoan.id ||
        (op.customerId === currentCustomer.id && (!op.loanId || op.loanId === currentLoan.id))
    );
  }, [onlinePayments, currentCustomer, currentLoan]);

  // Installment Schedule with Due Dates
  const installmentSchedule = useMemo(() => {
    if (!currentLoan) return [];

    const duration = Math.max(1, currentLoan.duration || 1);
    const gross = Number(currentLoan.principal || currentLoan.amount || 0);
    const totalRepay = getLoanTotalRepayment(currentLoan);
    const remainingGross = Math.max(0, gross - Number(currentLoan.capitalDeduction || 0));
    const totalInt =
      typeof currentLoan.interest === "number" && currentLoan.interest >= 0
        ? Math.max(0, currentLoan.interest - Number(currentLoan.interestDeduction || 0))
        : Math.max(0, totalRepay - remainingGross);
    const frequency = currentLoan.repaymentFrequency || "Monthly";
    const repaymentType = currentLoan.repaymentType || "Capital + Interest";
    const startDate = parseDateString(currentLoan.firstPaymentDate || currentLoan.issueDate) || parseDateString(todayStr)!;
    let runningBalance = totalRepay;
    let accumulatedPaid = customerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const rows = [];

    for (let i = 1; i <= duration; i++) {
      const dueDate = new Date(startDate.getTime());
      if (frequency === "Daily") {
        dueDate.setDate(dueDate.getDate() + (i - 1));
      } else if (frequency === "Weekly") {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
      } else {
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      }
      const dueDateStr = formatDateToYMD(dueDate);

      let installmentAmt = 0;
      let principalPortion = 0;
      let interestPortion = 0;

      if (repaymentType === "Interest Only") {
        if (i === duration) {
          principalPortion = remainingGross;
          installmentAmt = runningBalance;
          interestPortion = Math.max(0, Math.round((installmentAmt - principalPortion) * 100) / 100);
        } else {
          interestPortion = Math.round((totalInt / duration) * 100) / 100;
          principalPortion = 0;
          installmentAmt = interestPortion;
        }
      } else {
        if (i === duration) {
          installmentAmt = runningBalance;
          interestPortion = Math.max(0, Math.round((totalInt - Math.round((totalInt / duration) * 100) / 100 * (duration - 1)) * 100) / 100);
          principalPortion = Math.max(0, Math.round((installmentAmt - interestPortion) * 100) / 100);
        } else {
          installmentAmt = Math.round((totalRepay / duration) * 100) / 100;
          principalPortion = Math.round((remainingGross / duration) * 100) / 100;
          interestPortion = Math.max(0, Math.round((installmentAmt - principalPortion) * 100) / 100);
        }
      }

      runningBalance = Math.max(0, runningBalance - installmentAmt);

      let rowStatus: "PAID" | "OVERDUE" | "DUE_TODAY" | "DUE_TOMORROW" | "UPCOMING" = "UPCOMING";
      if (accumulatedPaid >= installmentAmt - 0.001) {
        rowStatus = "PAID";
        accumulatedPaid -= installmentAmt;
      } else {
        accumulatedPaid = 0;
        const dueTime = new Date(`${dueDateStr}T00:00:00Z`).getTime();
        const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
        const diffDays = Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          rowStatus = "OVERDUE";
        } else if (diffDays === 0) {
          rowStatus = "DUE_TODAY";
        } else if (diffDays === 1) {
          rowStatus = "DUE_TOMORROW";
        } else {
          rowStatus = "UPCOMING";
        }
      }

      rows.push({
        cycle: i,
        dueDate: dueDateStr,
        installmentAmount: installmentAmt,
        principalPortion,
        interestPortion,
        balance: runningBalance,
        status: rowStatus,
      });
    }

    return rows;
  }, [currentLoan, customerPayments, todayStr]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      clearSession();
    }
    window.location.href = "/login";
  };

  if (!currentCustomer) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <BrandLogo size="lg" theme="light" />
          </div>
          <h2 className="mt-5 text-center text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Borrower Portal Login
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500 font-medium">
            Access your loan balances, repayment schedule, and download payment receipts.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-6 px-5 sm:px-7 shadow-xs rounded-2xl border border-slate-200 space-y-5">
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="field-app-customerdashboard-page-1">
                  National ID (NIC) or Registered Mobile
                </label>
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => {
                    setLookupQuery(e.target.value);
                    setLookupError("");
                  }}
                  placeholder="e.g. 199512345678 or 0771234567"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  autoFocus id="field-app-customerdashboard-page-1"
                />
                {lookupError && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle size={13} /> {lookupError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={16} />
                <span>Verify &amp; Access Facility</span>
              </button>
            </form>

            <div className="pt-2 text-center border-t border-slate-100">
              <a
                href="/login"
                className="text-xs font-semibold text-slate-500 hover:text-red-600 transition inline-flex items-center gap-1"
              >
                <span>Staff or Management Officer?</span>
                <span className="font-bold underline">Staff Login</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const borrowerInitials = (currentCustomer.fullName || currentCustomer.name || "B")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans flex flex-col">
      {/* ═══ Top Global Header (Brand + Borrower Self-Service Status) ═══ */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" theme="light" />
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold tracking-tight text-slate-800 uppercase">
                Customer Portal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentLoan && (
              <button
                type="button"
                onClick={() => setActiveLoanId("")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">All Facilities</span>
                <span className="sm:hidden">Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsStatementOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="View and print official account statement"
            >
              <Printer size={13} className="text-red-600" />
              <span className="hidden md:inline">Official Statement</span>
              <span className="md:hidden">Statement</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Secure Sign Out"
            >
              <LogOut size={13} />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Main Portal Container ═════════════════════════════════════ */}
      <main className="flex-1 w-full mx-auto workspace-page">
        {/* ═══ Welcome Strip with Borrower Identity ═════════════════ */}
        <div className="relative overflow-hidden bg-slate-900 text-white rounded-xl px-3.5 py-2 sm:py-2.5 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-white flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
              {currentCustomer.photoUrl ? (
                <img
                  src={currentCustomer.photoUrl}
                  alt={currentCustomer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                borrowerInitials
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white tracking-tight">
                {currentCustomer.fullName || currentCustomer.name}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck size={11} className="text-emerald-400" />
                Verified
              </span>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                {currentCustomer.id && (
                  <span className="bg-white/10 px-1.5 py-0.2 rounded">ID: {currentCustomer.id}</span>
                )}
                {currentCustomer.nic && (
                  <span className="bg-white/10 px-1.5 py-0.2 rounded">NIC: {currentCustomer.nic}</span>
                )}
                {currentCustomer.phone && (
                  <span className="text-slate-400">📞 {currentCustomer.phone}</span>
                )}
                {currentCustomer.town && (
                  <span className="text-slate-400">📍 {currentCustomer.town}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto shrink-0 text-xs font-mono">
            <span className="text-[11px] text-slate-400">
              Active: <b className="text-white">{portfolioSummary.activeCount}</b> / {customerLoans.length} Facilities
            </span>
          </div>
        </div>

        {uploadSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs animate-in fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span className="font-semibold">{uploadSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadSuccessMsg("")}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5" aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {!currentLoan ? (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW 1: MY LOAN FACILITIES LIST (Default View)
             ═══════════════════════════════════════════════════════════════════ */
          <div className="space-y-3">
            {/* ═══ Prominent Next Installment Due Alert & Action Hero Banner ═══ */}
            {urgentDueInfo ? (
              <div
                className={`rounded-2xl border p-3.5 sm:p-4.5 shadow-xs transition-all relative overflow-hidden ${
                  urgentDueInfo.due.isTodayPaid
                    ? "bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-emerald-300 ring-1 ring-emerald-200"
                    : urgentDueInfo.due.status === "OVERDUE"
                    ? "bg-gradient-to-br from-rose-50 via-red-50/50 to-white border-rose-300 ring-1 ring-rose-200"
                    : urgentDueInfo.due.status === "DUE_TODAY"
                    ? "bg-gradient-to-br from-red-50 via-amber-50/50 to-white border-red-300 ring-1 ring-red-200"
                    : urgentDueInfo.due.status === "DUE_TOMORROW"
                    ? "bg-gradient-to-br from-amber-50 via-yellow-50/40 to-white border-amber-300 ring-1 ring-amber-200"
                    : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-white border-slate-200"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                  {/* Left Column: Badges, Facility Info, Due Date & Amount */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                          urgentDueInfo.due.isTodayPaid
                            ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/30"
                            : urgentDueInfo.due.status === "OVERDUE"
                            ? "bg-rose-600 text-white shadow-xs shadow-rose-600/30 animate-pulse"
                            : urgentDueInfo.due.status === "DUE_TODAY"
                            ? "bg-red-600 text-white shadow-xs shadow-red-600/30 animate-pulse"
                            : urgentDueInfo.due.status === "DUE_TOMORROW"
                            ? "bg-amber-600 text-white shadow-xs shadow-amber-600/30"
                            : "bg-slate-800 text-white"
                        }`}
                      >
                        {urgentDueInfo.due.isTodayPaid ? (
                          <>
                            <CheckCircle2 size={13} className="shrink-0" />
                            <span>Paid for Today</span>
                          </>
                        ) : urgentDueInfo.due.hasPendingSlip ? (
                          <>
                            <Clock size={13} className="shrink-0" />
                            <span>Slip Under Review</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} className="shrink-0" />
                            <span>{urgentDueInfo.due.badgeText}</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs font-bold text-slate-700 bg-white/90 border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        Facility: <b className="font-mono text-slate-900">{urgentDueInfo.loan.loanNo || urgentDueInfo.loan.id}</b>
                      </span>

                      <span className="text-xs font-semibold text-slate-600 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-lg">
                        {urgentDueInfo.loan.repaymentFrequency || "Daily"} &bull;{" "}
                        {urgentDueInfo.due.isTodayPaid && urgentDueInfo.due.cycle > 1
                          ? `Cycle #${urgentDueInfo.due.cycle - 1} Paid · Next: Cycle #${urgentDueInfo.due.cycle}`
                          : `Cycle #${urgentDueInfo.due.cycle} of ${urgentDueInfo.due.totalCycles}`}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {urgentDueInfo.due.isTodayPaid
                            ? "Today's Status:"
                            : urgentDueInfo.due.hasPendingSlip
                            ? "Verification Status:"
                            : "Next Due Installment:"}
                        </span>
                        {urgentDueInfo.due.isTodayPaid ? (
                          <span className="text-2xl sm:text-3xl font-semibold font-mono text-emerald-700 tracking-tight flex items-center gap-1.5">
                            <Check size={26} className="text-emerald-600 stroke-[3]" />
                            PAID
                          </span>
                        ) : urgentDueInfo.due.hasPendingSlip ? (
                          <span className="text-xl sm:text-2xl font-semibold font-mono text-amber-700 tracking-tight flex items-center gap-1.5">
                            <Clock size={20} className="text-amber-600" />
                            PENDING APPROVAL
                          </span>
                        ) : (
                          <span className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900 tracking-tight">
                            {MONEY(urgentDueInfo.due.installmentAmount)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Calendar size={15} className={urgentDueInfo.due.isTodayPaid ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"} />
                        <span>
                          {urgentDueInfo.due.isTodayPaid ? "Next Installment Due:" : "Due Date:"}{" "}
                          <b className="font-mono text-slate-900 text-sm sm:text-base">{urgentDueInfo.due.dueDate}</b>
                          <span className="text-slate-500 font-medium ml-1.5 hidden sm:inline">
                            ({formatFriendlyDate(urgentDueInfo.due.dueDate)}){urgentDueInfo.due.isTodayPaid ? ` · ${MONEY(urgentDueInfo.due.installmentAmount)} Due Tomorrow` : ""}
                          </span>
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                      {urgentDueInfo.due.isTodayPaid && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Today&apos;s daily collection payment is received and credited.
                        </span>
                      )}
                      {urgentDueInfo.due.hasPendingSlip && !urgentDueInfo.due.isTodayPaid && (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <Clock size={13} /> Bank transfer slip submitted &bull; Awaiting admin approval before credit.
                        </span>
                      )}
                      <span>
                        Remaining Balance: <b className="font-mono text-slate-800">{MONEY(loanStats.get(urgentDueInfo.loan.id)?.outstanding || 0)}</b>
                      </span>
                      {urgentDueInfo.loan.purpose && (
                        <span className="text-slate-400 italic">
                          &bull; &ldquo;{urgentDueInfo.loan.purpose}&rdquo;
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Right Column: Prominent Pay Now Action inside the alert banner */}
                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    {urgentDueInfo.due.isTodayPaid ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs shadow-emerald-600/30">
                          <CheckCircle2 size={14} />
                          <span>Paid for Today</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenGateway(urgentDueInfo.loan.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-2xs cursor-pointer"
                          title="Pay next installment in advance"
                        >
                          <CreditCard size={12} className="text-slate-400" />
                          <span>Pay Advance</span>
                        </button>
                      </div>
                    ) : urgentDueInfo.due.hasPendingSlip ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xs shadow-amber-500/30">
                          <Clock size={14} />
                          <span>Slip Under Review</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("slips")}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-2xs cursor-pointer"
                        >
                          <span>View Slip</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenGateway(urgentDueInfo.loan.id)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/30 cursor-pointer active:scale-[0.98]"
                        title={`Pay installment of ${MONEY(urgentDueInfo.due.installmentAmount || urgentDueInfo.loan.installment || 0)}`}
                      >
                        <CreditCard size={15} className="text-white" />
                        <span>Pay Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : customerLoans.length > 0 ? (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-emerald-950">
                      All Loan Facilities Fully Settled!
                    </h3>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      You currently have no pending installments. Thank you for your prompt repayments!
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ═══ Portfolio Summary 4-KPI Grid ════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {/* Card 1: Total Facilities */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/60 flex items-center justify-center shrink-0">
                  <Coins size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Facilities
                  </span>
                  <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 leading-tight">
                    {customerLoans.length} {customerLoans.length === 1 ? "Loan" : "Loans"}
                  </p>
                  <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {portfolioSummary.activeCount} Active Contracts
                  </p>
                </div>
              </div>

              {/* Card 2: Total Borrowed */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
                  <CreditCard size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Borrowed
                  </span>
                  <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 leading-tight truncate">
                    {MONEY(portfolioSummary.totalBorrowing)}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Payable: <b className="font-mono text-slate-700">{MONEY(portfolioSummary.totalPayableSum)}</b>
                  </p>
                </div>
              </div>

              {/* Card 3: Total Repaid */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Repaid
                  </span>
                  <p className="text-base sm:text-lg font-semibold font-mono text-emerald-600 leading-tight truncate">
                    {MONEY(portfolioSummary.totalPaidSum)}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 truncate">
                    <Check size={11} className="shrink-0" /> Recorded Repayments
                  </p>
                </div>
              </div>

              {/* Card 4: Total Outstanding */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 transition-all flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100/60 flex items-center justify-center shrink-0">
                  <Wallet size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Outstanding
                  </span>
                  <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 leading-tight truncate">
                    {MONEY(portfolioSummary.totalOutstandingSum)}
                  </p>
                  <p className="text-[11px] font-bold truncate">
                    {portfolioSummary.totalOutstandingSum <= 0 ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Fully Settled
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Remaining Balance
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══ Section Header ═══════════════════════════════════════ */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                  My Loan Facilities
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200/60 rounded-full">
                  {customerLoans.length} {customerLoans.length === 1 ? "Facility" : "Facilities"}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Click details to view schedule, receipts, and statement
              </span>
            </div>

            {customerLoans.length === 1 ? (
              /* ── Single Loan Featured Showcase Card (Sleek & Compact) ── */
              (() => {
                const loan = customerLoans[0];
                const stats = loanStats.get(loan.id) || {
                  paid: 0,
                  payable: loan.totalRepayment || (loan.principal || 0),
                  outstanding: loan.totalRepayment || (loan.principal || 0),
                  percent: 0,
                  paymentsCount: 0,
                };
                const dueInfo = loanDueMap.get(loan.id) || getLoanNextDueInfo(loan, effectiveRepayments, todayStr, onlinePayments);

                const statusLower = (loan.status || "").toLowerCase();
                const statusClass =
                  statusLower === "completed"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : statusLower === "overdue"
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : "bg-blue-100 text-blue-800 border-blue-200";

                const hasDue = (stats.outstanding || 0) > 0 && loan.status !== "Completed";

                return (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all space-y-3.5">
                    {/* Facility Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facility:</span>
                        <span className="text-base sm:text-lg font-semibold font-mono text-slate-900">
                          {loan.loanNo || loan.id}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusClass}`}>
                          {loan.status || "Active"}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {loan.repaymentFrequency || "Daily"}
                        </span>
                        {!dueInfo.isSettled && (
                          dueInfo.isTodayPaid ? (
                            <>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 size={11} className="text-emerald-600" /> Paid Today
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1">
                                <Calendar size={11} className="text-slate-500" /> Next Due: {dueInfo.dueDate}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                dueInfo.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : dueInfo.status === "DUE_TODAY"
                                  ? "bg-red-100 text-red-800 border-red-300 animate-pulse"
                                  : dueInfo.status === "DUE_TOMORROW"
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-slate-100 text-slate-800 border-slate-300"
                              }`}
                            >
                              <Calendar size={11} /> Next Due: {dueInfo.dueDate} ({dueInfo.badgeText})
                            </span>
                          )
                        )}
                        {loan.purpose && (
                          <span className="text-xs text-slate-600 font-medium hidden md:inline ml-1">
                            Purpose: <b className="text-slate-800">&ldquo;{loan.purpose}&rdquo;</b>
                          </span>
                        )}
                      </div>

                      {/* Action Buttons in Header */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveLoanId(loan.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} className="text-slate-500" />
                          <span>View Schedule</span>
                          <ChevronRight size={13} className="text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Facility Key Financial Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div
                        className={`rounded-xl p-2.5 sm:p-3 border transition-all ${
                          dueInfo.isTodayPaid
                            ? "bg-emerald-50/70 border-emerald-200 ring-1 ring-emerald-100"
                            : !dueInfo.isSettled && dueInfo.status === "OVERDUE"
                            ? "bg-rose-50/80 border-rose-200"
                            : !dueInfo.isSettled && (dueInfo.status === "DUE_TODAY" || dueInfo.status === "DUE_TOMORROW")
                            ? "bg-amber-50/80 border-amber-200"
                            : "bg-slate-50/80 border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold uppercase tracking-wider block ${dueInfo.isTodayPaid ? "text-emerald-800" : "text-slate-400"}`}>
                            {dueInfo.isTodayPaid ? "Daily Installment" : "Installment Due"}
                          </span>
                          {dueInfo.isTodayPaid ? (
                            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 flex items-center gap-0.5">
                              <Check size={9} className="stroke-[3]" /> PAID TODAY
                            </span>
                          ) : !dueInfo.isSettled && (
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                                dueInfo.status === "OVERDUE"
                                  ? "bg-rose-200 text-rose-800"
                                  : dueInfo.status === "DUE_TODAY"
                                  ? "bg-red-200 text-red-900"
                                  : dueInfo.status === "DUE_TOMORROW"
                                  ? "bg-amber-200 text-amber-900"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {dueInfo.badgeText}
                            </span>
                          )}
                        </div>
                        <p className={`text-base sm:text-lg font-semibold font-mono mt-0.5 ${dueInfo.isTodayPaid ? "text-emerald-700" : "text-slate-900"}`}>
                          {MONEY(dueInfo.installmentAmount || loan.installment || 0)}
                        </p>
                        <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                          <Calendar size={11} className={dueInfo.isTodayPaid ? "text-emerald-600 shrink-0" : "text-slate-400 shrink-0"} />
                          <span>
                            {dueInfo.isTodayPaid ? (
                              <>Next Due: <b className="font-mono text-slate-900">{dueInfo.dueDate}</b> (Tomorrow)</>
                            ) : (
                              <>Due: <b className="font-mono text-slate-900">{dueInfo.dueDate}</b></>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Principal Disbursed
                        </span>
                        <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 mt-0.5">
                          {MONEY(loan.principal || loan.amount || 0)}
                        </p>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Payable: {MONEY(stats.payable)}
                        </span>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Repaid
                        </span>
                        <p className="text-base sm:text-lg font-semibold font-mono text-emerald-600 mt-0.5">
                          {MONEY(stats.paid)}
                        </p>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {stats.paymentsCount} Payments Verified
                        </span>
                      </div>

                      <div className="bg-slate-50/80 rounded-xl p-2.5 sm:p-3 border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Remaining Balance
                        </span>
                        <p className="text-base sm:text-lg font-semibold font-mono text-slate-900 mt-0.5">
                          {MONEY(stats.outstanding)}
                        </p>
                        <span className="text-[11px] text-rose-600 font-bold">
                          {stats.percent}% Settled
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                        <span>Repayment Progress: {stats.percent}% Settled</span>
                        <span>{stats.outstanding <= 0 ? "Fully Paid Off" : `${MONEY(stats.outstanding)} Outstanding`}</span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : customerLoans.length > 1 ? (
                /* ── Multiple Loans Grid ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {customerLoans.map((loan) => {
                    const stats = loanStats.get(loan.id) || {
                      paid: 0,
                      payable: loan.totalRepayment || (loan.principal || 0),
                      outstanding: loan.totalRepayment || (loan.principal || 0),
                      percent: 0,
                      paymentsCount: 0,
                    };
                    const dueInfo = loanDueMap.get(loan.id) || getLoanNextDueInfo(loan, effectiveRepayments, todayStr, onlinePayments);

                    const statusLower = (loan.status || "").toLowerCase();
                    const statusClass =
                      statusLower === "completed"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : statusLower === "overdue"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : "bg-blue-100 text-blue-800 border-blue-200";

                    return (
                      <div
                        key={loan.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-red-300 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Loan Facility
                              </span>
                              <h3 className="text-base font-semibold text-slate-900 font-mono group-hover:text-red-600 transition">
                                {loan.loanNo || loan.id}
                              </h3>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}
                                >
                                  {loan.status || "Active"}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {loan.repaymentFrequency || "Daily"}
                                </span>
                              </div>
                              {!dueInfo.isSettled && (
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    dueInfo.isTodayPaid
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : dueInfo.status === "OVERDUE"
                                      ? "bg-rose-100 text-rose-800 border-rose-200"
                                      : dueInfo.status === "DUE_TODAY"
                                      ? "bg-red-100 text-red-800 border-red-200 animate-pulse"
                                      : dueInfo.status === "DUE_TOMORROW"
                                      ? "bg-amber-100 text-amber-800 border-amber-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {dueInfo.isTodayPaid ? (
                                    <>
                                      <CheckCircle2 size={10} className="text-emerald-600" /> Paid Today
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={10} /> {dueInfo.badgeText}
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {loan.purpose && (
                            <p className="text-xs text-slate-600 line-clamp-1 italic">
                              &ldquo;{loan.purpose}&rdquo;
                            </p>
                          )}

                          {/* Next Due Date Highlight Box */}
                          {!dueInfo.isSettled ? (
                            <div
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                                dueInfo.isTodayPaid
                                  ? "bg-emerald-50/70 border-emerald-200"
                                  : dueInfo.status === "OVERDUE"
                                  ? "bg-rose-50/80 border-rose-200"
                                  : dueInfo.status === "DUE_TODAY" || dueInfo.status === "DUE_TOMORROW"
                                  ? "bg-amber-50/80 border-amber-200"
                                  : "bg-slate-50 border-slate-200/80"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${dueInfo.isTodayPaid ? "text-emerald-800" : "text-slate-500"}`}>
                                  <Calendar size={11} className={dueInfo.isTodayPaid ? "text-emerald-600" : "text-red-600"} />
                                  {dueInfo.isTodayPaid ? "Today's Installment" : "Next Due Date"}
                                </span>
                                <div className="font-bold font-mono text-slate-900 text-xs">
                                  {dueInfo.isTodayPaid ? (
                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                      <Check size={12} className="stroke-[3]" /> PAID TODAY
                                    </span>
                                  ) : (
                                    <>
                                      {dueInfo.dueDate}
                                      <span className="text-[11px] text-slate-500 font-normal ml-1">
                                        (Cycle #{dueInfo.cycle})
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                  {dueInfo.isTodayPaid ? `Next: ${dueInfo.dueDate}` : "Installment"}
                                </span>
                                <span className="font-bold font-mono text-slate-900 text-xs">
                                  {MONEY(dueInfo.installmentAmount || loan.installment || 0)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>All installments completed</span>
                            </div>
                          )}

                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Principal Disbursed:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {MONEY(loan.principal || loan.amount || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Payable:</span>
                              <span className="font-bold font-mono text-slate-800">
                                {MONEY(stats.payable)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total Repaid:</span>
                              <span className="font-bold font-mono text-emerald-600">
                                {MONEY(stats.paid)}
                              </span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200/80 flex justify-between items-baseline">
                              <span className="text-[11px] font-bold text-slate-700">
                                Remaining Balance:
                              </span>
                              <span className="text-sm font-semibold font-mono text-slate-900">
                                {MONEY(stats.outstanding)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-red-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${stats.percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
                              <span>{stats.percent}% Settled</span>
                              <span>{stats.paymentsCount} Payments Recorded</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          {(stats?.outstanding || 0) > 0 && loan.status !== "Completed" ? (
                            <>
                              {dueInfo.isTodayPaid ? (
                                <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  <span>Paid for Today</span>
                                </div>
                              ) : dueInfo.hasPendingSlip ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("slips")}
                                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-amber-100 transition cursor-pointer"
                                >
                                  <Clock size={13} className="text-amber-600" />
                                  <span>Slip Under Review</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenGateway(loan.id)}
                                  className="flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xs shadow-red-600/25 cursor-pointer active:scale-[0.99]"
                                  title="Pay installment now"
                                >
                                  <CreditCard size={14} className="text-white" />
                                  <span>Pay Now</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setActiveLoanId(loan.id)}
                                className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                              >
                                <Eye size={14} className="text-slate-400" />
                                <span>Details</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveLoanId(loan.id)}
                                className="flex-1 py-2.5 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Eye size={14} className="text-slate-500" />
                                <span>View Facility</span>
                              </button>
                              <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shrink-0">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Settled</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800">
                    No active loan facilities found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    There are no registered loans under your borrower account. Please contact your staff contact or branch office.
                  </p>
                </div>
              )}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW 2: SPECIFIC LOAN DETAILED VIEW (Active when a loan is selected)
             ═══════════════════════════════════════════════════════════════════ */
          <>
            {/* ═══ Active Facility Top Navigator Bar ══════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveLoanId("")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>All Facilities</span>
                </button>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">Viewing Facility:</span>
                  <span className="text-sm font-semibold font-mono text-slate-900">
                    {currentLoan?.loanNo || currentLoan?.id}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {currentLoan?.status || "Active"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                {customerLoans.length > 1 && (
                  <select
                    value={currentLoan?.id}
                    onChange={(e) => setActiveLoanId(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none"
                  >
                    {customerLoans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.loanNo || l.id} ({MONEY(l.principal || l.amount || 0)})
                      </option>
                    ))}
                  </select>
                )}
                {outstandingBalance > 0 && currentLoan?.status !== "Completed" ? (
                  <button
                    type="button"
                    onClick={() => handleOpenGateway(currentLoan?.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/25 cursor-pointer active:scale-[0.99]"
                    title="Pay installment now"
                  >
                    <CreditCard size={13} className="text-white" />
                    <span>Pay Now</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Fully Settled</span>
                  </span>
                )}
              </div>
            </div>

            {/* ═══ Zone 1: Financial Standing Pulse (4 Micro KPI Cards) ═════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: Outstanding Balance */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <CreditCard size={16} className="text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Outstanding Balance
              </p>
              <p className="text-lg sm:text-xl font-semibold font-mono text-slate-900 leading-tight">
                {MONEY(outstandingBalance)}
              </p>
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-red-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 flex justify-between">
                <span>{percentSettled}% Settled</span>
                <span>Total: {MONEY(totalPayable)}</span>
              </p>
            </div>
          </div>

          {/* Card 2: Upcoming Installment */}
          <div
            className={`rounded-xl border p-3 sm:p-3.5 shadow-xs flex items-center gap-3 transition-all ${
              currentLoanDue?.isTodayPaid
                ? "bg-emerald-50/60 border-emerald-200"
                : currentLoanDue?.status === "OVERDUE"
                ? "bg-rose-50/60 border-rose-200"
                : currentLoanDue?.status === "DUE_TODAY" || currentLoanDue?.status === "DUE_TOMORROW"
                ? "bg-amber-50/60 border-amber-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                currentLoanDue?.isTodayPaid
                  ? "bg-emerald-100 text-emerald-600"
                  : currentLoanDue?.status === "OVERDUE"
                  ? "bg-rose-100 text-rose-600"
                  : currentLoanDue?.status === "DUE_TODAY" || currentLoanDue?.status === "DUE_TOMORROW"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {currentLoanDue?.isTodayPaid ? <CheckCircle2 size={16} /> : <Calendar size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {currentLoanDue?.isTodayPaid ? "Today's Installment" : "Next Installment"}
                </p>
                {currentLoanDue && !currentLoanDue.isSettled && (
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                      currentLoanDue.isTodayPaid
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : currentLoanDue.status === "OVERDUE"
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : currentLoanDue.status === "DUE_TODAY"
                        ? "bg-red-100 text-red-700 border border-red-200 animate-pulse"
                        : currentLoanDue.status === "DUE_TOMORROW"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {currentLoanDue.isTodayPaid ? "PAID TODAY" : currentLoanDue.badgeText}
                  </span>
                )}
              </div>
              <p className={`text-lg sm:text-xl font-semibold font-mono leading-tight ${currentLoanDue?.isTodayPaid ? "text-emerald-700" : "text-slate-900"}`}>
                {MONEY(currentLoanDue?.installmentAmount || nextInstallmentAmount)}
              </p>
              <p className="text-[11px] font-semibold truncate flex items-center gap-1 mt-0.5 text-slate-700">
                <Clock size={10} className="text-slate-400" />
                <span>
                  {currentLoanDue?.isTodayPaid ? "Next Due " : "Due "}
                  <b className="font-mono text-slate-900">{currentLoanDue?.dueDate || nextDueDate}</b>
                </span>
                {currentLoanDue && !currentLoanDue.isSettled && (
                  <span className="text-slate-400 font-normal">
                    (Cycle #{currentLoanDue.cycle} of {currentLoanDue.totalCycles})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Card 3: Total Repaid */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Repaid to Date
              </p>
              <p className="text-lg sm:text-xl font-semibold font-mono text-emerald-600 leading-tight">
                {MONEY(totalPaid)}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium truncate">
                {customerPayments.length} recorded payments
              </p>
            </div>
          </div>

          {/* Card 4: Active Loan Standing */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Facility Standing
              </p>
              <p className="text-sm font-bold text-slate-900 leading-tight font-mono mt-0.5">
                {currentLoan?.loanNo || "No Active Loan"}
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.2 rounded-full text-[11px] font-bold mt-1 ${
                  (currentLoan?.status || "").toLowerCase() === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : (currentLoan?.status || "").toLowerCase() === "overdue"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {currentLoan?.status || "Active Contract"}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ Zone 2: Core Two Pillars ═════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* ── Left Pillar (68%): Installment Schedule & Receipts Vault Tabs ── */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header & Tab Bar */}
              <div className="p-3 sm:p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Repayment Schedule &amp; Receipts
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Verified installments, cycle due dates, and official settlement receipts
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("schedule")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "schedule"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Calendar size={13} className={activeTab === "schedule" ? "text-red-600" : "text-slate-400"} />
                    <span>Due Dates ({installmentSchedule.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "history"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt size={13} className={activeTab === "history" ? "text-emerald-600" : "text-slate-400"} />
                    <span>Receipts ({customerPayments.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("slips")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "slips"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard size={13} className={activeTab === "slips" ? "text-blue-600" : "text-slate-400"} />
                    <span>Bank Slips ({customerOnlinePayments.length})</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: Installment Due Dates Table */}
              {activeTab === "schedule" && (
                <div className="overflow-x-auto min-w-full table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
                  <table className="w-full text-left text-xs whitespace-nowrap lms-table">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                      <tr>
                        <th className="py-2.5 px-4" scope="col">Cycle</th>
                        <th className="py-2.5 px-3" scope="col">Due Date</th>
                        <th className="py-2.5 px-3 text-right" scope="col">Installment</th>
                        <th className="py-2.5 px-3 text-right" scope="col">Principal</th>
                        <th className="py-2.5 px-3 text-right" scope="col">Interest</th>
                        <th className="py-2.5 px-3 text-right" scope="col">Balance</th>
                        <th className="py-2.5 px-4 text-center" scope="col">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {installmentSchedule.map((row) => (
                        <tr key={row.cycle} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800 text-xs">
                            #{row.cycle}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 text-xs">
                            {row.dueDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                            {MONEY(row.installmentAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">
                            {MONEY(row.principalPortion)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">
                            {MONEY(row.interestPortion)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs">
                            {MONEY(row.balance)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {row.status === "PAID" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <Check size={10} /> Paid
                              </span>
                            )}
                            {row.status === "DUE_TODAY" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 animate-pulse">
                                <Clock size={10} /> Due Today
                              </span>
                            )}
                            {row.status === "DUE_TOMORROW" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <Clock size={10} /> Due Tomorrow
                              </span>
                            )}
                            {row.status === "OVERDUE" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle size={10} /> Overdue
                              </span>
                            )}
                            {row.status === "UPCOMING" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                Upcoming
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {installmentSchedule.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            <Calendar size={32} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">No active installment schedule</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              When a loan is issued, the payment schedule will automatically appear here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Payment Receipts Table */}
              {activeTab === "history" && (
                <div className="overflow-x-auto min-w-full table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
                  <table className="w-full text-left text-xs whitespace-nowrap lms-table">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                      <tr>
                        <th className="py-2.5 px-4" scope="col">Receipt No</th>
                        <th className="py-2.5 px-3" scope="col">Date</th>
                        <th className="py-2.5 px-3" scope="col">Method</th>
                        <th className="py-2.5 px-3 text-right" scope="col">Amount Paid</th>
                        <th className="py-2.5 px-3" scope="col">Collector</th>
                        <th className="py-2.5 px-4 text-right" scope="col">Official Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {customerPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 text-xs">
                            {p.receiptNo || p.id}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-xs">{p.date}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {p.method || "Cash"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 text-xs">
                            {MONEY(p.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-xs">
                            {p.collectedBy || "Authorized Officer"}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptToPrint(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60 font-bold text-[11px] transition cursor-pointer"
                              title="Download & Print Official Settlement Receipt"
                            >
                              <Receipt size={12} className="text-red-600 shrink-0" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {customerPayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            <Receipt size={32} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">No payment receipts recorded yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Payments recorded by field officers or branch cashiers will show here immediately.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: Online Bank Slips Table */}
              {activeTab === "slips" && (
                <div className="overflow-x-auto min-w-full table-scroll" role="region" aria-label="Scrollable records table" tabIndex={0}>
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-600 font-medium">
                      All submitted electronic transfer slips and online payments for this facility.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenGateway(currentLoan?.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      title="Upload a new bank deposit slip"
                    >
                      <Upload size={12} />
                      <span>Upload Slip</span>
                    </button>
                  </div>
                  <table className="w-full text-left text-xs whitespace-nowrap lms-table">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                      <tr>
                        <th className="py-2.5 px-4" scope="col">Slip ID</th>
                        <th className="py-2.5 px-3" scope="col">Date</th>
                        <th className="py-2.5 px-3" scope="col">Bank &amp; Ref</th>
                        <th className="py-2.5 px-3 text-right" scope="col">Amount</th>
                        <th className="py-2.5 px-3 text-center" scope="col">Verification Status</th>
                        <th className="py-2.5 px-4 text-right" scope="col">Action / Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {customerOnlinePayments.map((op) => {
                        const isPending = op.status === "PENDING";
                        const isApproved = op.status === "COMPLETED";
                        const isDeclined = op.status === "REJECTED";

                        return (
                          <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900 text-xs">
                              {op.id}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-xs">
                              {op.paymentDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800 block text-xs truncate max-w-[160px]">
                                {op.bankName}
                              </span>
                              {op.referenceNumber && (
                                <span className="text-[11px] font-mono text-slate-400 block">
                                  Ref: {op.referenceNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                              {MONEY(op.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock size={10} /> Pending Review
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 size={10} /> Approved &amp; Credited
                                </span>
                              )}
                              {isDeclined && (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                                  title={op.reviewNotes || "Declined by accounts team"}
                                >
                                  <XCircle size={10} /> Declined
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => { setViewingSlip(op); setCustomerSlipImgError(false); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                                  title="View Uploaded Bank Slip"
                                >
                                  <Eye size={12} className="text-slate-500 shrink-0" />
                                  <span>View Slip</span>
                                </button>
                                {isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchingPayment: Payment = repayments.find((p) => p.receiptNo === op.receiptNo) || {
                                        id: op.receiptNo || op.id,
                                        loanId: op.loanId,
                                        customerId: op.customerId,
                                        amount: op.amount,
                                        date: op.paymentDate,
                                        type: "Capital",
                                        method: "Bank Transfer",
                                        collectedBy: op.reviewedBy || "Finance Admin",
                                        receiptNo: op.receiptNo,
                                      };
                                      setReceiptToPrint(matchingPayment);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                                    title="View Official Repayment Receipt"
                                  >
                                    <Receipt size={12} className="text-emerald-600 shrink-0" />
                                    <span>Receipt</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {customerOnlinePayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            <Upload size={32} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">No bank slips submitted yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              After making a bank transfer or cash deposit, upload your slip here for quick verification.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenGateway()}
                              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              <Upload size={12} />
                              <span>Upload Deposit Slip</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Pillar (32%): Bank Deposit Channels & Support Helpline ── */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* 1. Official Bank Deposit Channels */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Building size={15} className="text-red-600" />
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Bank Deposit Accounts
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full">
                  Direct Transfer
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[11px] text-slate-500 font-medium">
                  Use your <strong className="text-slate-800">NIC or Loan ID ({currentLoan?.loanNo || "LN"})</strong> as payment reference when making direct online deposits:
                </p>

                {/* Bank 1: Commercial Bank */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs">Commercial Bank of Ceylon</p>
                  <p className="text-[11px] text-slate-600 font-mono">Acc: <strong>1000 248 952</strong></p>
                  <p className="text-[11px] text-slate-400">Branch: Maharagama Branch</p>
                </div>

                {/* Bank 2: Sampath Bank */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs">Sampath Bank PLC</p>
                  <p className="text-[11px] text-slate-600 font-mono">Acc: <strong>0145 1002 9841</strong></p>
                  <p className="text-[11px] text-slate-400">Branch: City Office, Colombo</p>
                </div>

                {/* Quick Upload Button */}
                {/* Upload Bank Slip Proof */}
                <button
                  type="button"
                  onClick={() => handleOpenGateway(currentLoan?.id)}
                  className="w-full mt-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="Upload proof of bank transfer or deposit slip"
                >
                  <Upload size={14} />
                  <span>Upload Deposit Slip</span>
                </button>
              </div>
            </div>

            {/* 2. Customer Assistance Helpline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Phone size={15} className="text-slate-700" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Assistance &amp; Helpline
                </h3>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-[11px]">Branch Helpline:</span>
                  <a href="tel:0112345678" className="font-bold text-red-600 hover:underline">
                    011-2345678
                  </a>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-[11px]">Field Support:</span>
                  <a href="tel:0771234567" className="font-bold text-slate-900 hover:underline">
                    077-1234567
                  </a>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-[11px]">Hours:</span>
                  <span className="font-semibold text-slate-700">Mon - Sat: 8:30 AM - 5:00 PM</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                For settlement queries or installment adjustments, contact your staff contact directly.
              </p>
            </div>
          </div>
        </div>
      </>
      )}
      </main>

      {/* ── Single Payment Printable Receipt Modal ───────────────────────── */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 lms-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4 lms-dialog">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <BrandLogo size="sm" theme="light" />
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer" aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="py-4 text-center border-b border-dashed border-slate-200">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full mb-1.5">
                OFFICIAL PAYMENT RECEIPT
              </span>
              <p className="font-mono text-xs text-slate-500">
                Receipt No: <strong className="text-slate-900">{receiptToPrint.receiptNo || receiptToPrint.id}</strong>
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 font-mono mt-2">
                {MONEY(receiptToPrint.amount)}
              </h2>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                Payment Credited Successfully
              </p>
            </div>

            {/* Receipt Details Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-semibold text-slate-800">{currentCustomer.fullName || currentCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility ID:</span>
                <span className="font-mono font-bold text-red-600">{currentLoan?.loanNo || "LN"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800">{receiptToPrint.method || "Cash"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Collector / Officer:</span>
                <span className="text-slate-800">{receiptToPrint.collectedBy || "Authorized Officer"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="px-3 h-8 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Statement of Account Modal ──────────────────────────────── */}
      {isStatementOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 lms-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4 lms-dialog">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" theme="light" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">Borrower Statement of Account</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Issued: {todayStr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatementOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer" aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Statement Summary */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold uppercase block">Principal</span>
                <span className="text-sm font-semibold text-slate-900 font-mono">{MONEY(totalPrincipal)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-bold uppercase block">Total Repaid</span>
                <span className="text-sm font-semibold text-emerald-700 font-mono">{MONEY(totalPaid)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[11px] text-rose-700 font-bold uppercase block">Remaining</span>
                <span className="text-sm font-semibold text-rose-700 font-mono">{MONEY(outstandingBalance)}</span>
              </div>
            </div>

            {/* Statement Transactions */}
            <div className="flex-1 overflow-y-auto">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Transaction History
              </h4>
              <table className="w-full text-left text-xs whitespace-nowrap lms-table">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="p-2" scope="col">Date</th>
                    <th className="p-2" scope="col">Receipt #</th>
                    <th className="p-2" scope="col">Method</th>
                    <th className="p-2 text-right" scope="col">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customerPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2 text-slate-700">{p.date}</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{p.receiptNo || p.id}</td>
                      <td className="p-2 text-slate-700">{p.method || "Cash"}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{MONEY(p.amount)}</td>
                    </tr>
                  ))}
                  {customerPayments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Strictly confidential · PSI ONE Financial Operations
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 h-8 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                <Printer size={13} /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Viewing Slip Modal ──────────────────────────────────── */}
      {viewingSlip && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto lms-overlay">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4 my-8 lms-dialog">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-red-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Bank Deposit Slip · {viewingSlip.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSlip(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer" aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Slip Status Banner */}
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                viewingSlip.status === "COMPLETED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : viewingSlip.status === "REJECTED"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {viewingSlip.status === "COMPLETED" && (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Approved &amp; Credited! Official Receipt: <b>{viewingSlip.receiptNo}</b>
                  </span>
                </>
              )}
              {viewingSlip.status === "REJECTED" && (
                <>
                  <XCircle size={16} className="text-rose-600 shrink-0" />
                  <span>
                    Slip Declined: {viewingSlip.reviewNotes || "Verification failed. Contact branch."}
                  </span>
                </>
              )}
              {viewingSlip.status === "PENDING" && (
                <>
                  <Clock size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Pending Admin Verification — Your loan balance will update as soon as the accounts team approves this slip.
                  </span>
                </>
              )}
            </div>

            {/* Slip Image View */}
            <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 text-center min-h-[220px] flex items-center justify-center">
              {(() => {
                const safeUrl = getSafeCustomerSlipUrl(viewingSlip.slipUrl);
                const isPdf = safeUrl.startsWith("data:application/pdf") || (viewingSlip.slipFileName || "").toLowerCase().endsWith(".pdf");

                if (customerSlipImgError || !safeUrl) {
                  return (
                    <div className="w-full bg-white rounded-xl p-4 text-left border border-slate-200 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-semibold uppercase text-red-600">Electronic Bank Slip</span>
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{viewingSlip.referenceNumber || viewingSlip.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-bold">Bank</span>
                          <span className="font-bold text-slate-900 text-xs">{viewingSlip.bankName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-bold">Deposited</span>
                          <span className="font-mono font-semibold text-emerald-600 text-sm">{MONEY(viewingSlip.amount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={safeUrl}
                      title="Bank Slip PDF"
                      className="w-full h-72 rounded-lg border border-slate-700 bg-white"
                    />
                  );
                }

                return (
                  <img
                    src={safeUrl}
                    alt="Bank Slip"
                    onError={() => setCustomerSlipImgError(true)}
                    className="max-h-72 mx-auto rounded-lg object-contain shadow-md"
                  />
                );
              })()}
            </div>

            {/* Slip metadata breakdown */}
            <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-semibold text-slate-900 text-sm">
                  {MONEY(viewingSlip.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank:</span>
                <span className="font-semibold text-slate-800">{viewingSlip.bankName}</span>
              </div>
              {viewingSlip.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference No:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingSlip.referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Transfer Date:</span>
                <span className="font-medium text-slate-800">{viewingSlip.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility ID:</span>
                <span className="font-mono font-bold text-red-600">{viewingSlip.loanNo || viewingSlip.loanId}</span>
              </div>
              {viewingSlip.notes && (
                <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <span className="text-slate-400 block font-bold">Borrower Remarks:</span>
                  {viewingSlip.notes}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingSlip(null)}
                className="px-4 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Secure Fintech Customer Payment Gateway Modal ────────────────── */}
      {currentCustomer && isGatewayOpen && (
        <CustomerPaymentGatewayModal
          isOpen={isGatewayOpen}
          onClose={() => setIsGatewayOpen(false)}
          customer={currentCustomer}
          loans={customerLoans}
          initialLoanId={gatewayLoanId}
          todayDate={todayStr}
          onPaymentSuccess={handleGatewaySuccess}
        />
      )}
    </div>
  );
}
