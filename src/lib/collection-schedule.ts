import type { Loan, Customer, Payment } from "@/types";
import { getLoanTotalRepayment } from "@/lib/loan-financials";

export interface ScheduledCollectionItem {
  id: string; // unique item key
  loan: Loan;
  customer?: Customer;
  cycleNumber: number;
  totalCycles: number;
  dueDate: string; // YYYY-MM-DD
  installmentAmount: number;
  arrearsAmount: number;
  totalDueToday: number;
  repaymentFrequency: "Daily" | "Weekly" | "Monthly" | string;
  isDueToday: boolean;
  hasArrears: boolean;
  isCollectedToday: boolean;
  todaysPayment?: Payment;
  status: "COLLECTED" | "DUE_TODAY" | "OVERDUE" | "UPCOMING";
  routeArea: string;
}

export interface DailyCollectionSummary {
  targetAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  collectionRate: number;
  totalCount: number;
  collectedCount: number;
  pendingCount: number;
  overdueCount: number;
}

export function parseDateString(str: string): Date | null {
  if (!str) return null;
  const parts = str.slice(0, 10).split("-").map(Number);
  if (parts.length < 3 || parts.some((p) => isNaN(p))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function formatDateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatFriendlyDate(dateStr: string): string {
  const d = parseDateString(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generates today's collection items based on scheduled loan installments,
 * past arrears, and payments made on the specified asOfDate.
 */
export function getDailyCollections(
  loans: Loan[],
  customers: Customer[],
  payments: Payment[],
  asOfDateStr: string = new Date().toISOString().slice(0, 10)
): { items: ScheduledCollectionItem[]; summary: DailyCollectionSummary } {
  const targetDate = parseDateString(asOfDateStr) || new Date();
  const items: ScheduledCollectionItem[] = [];

  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => {
    customerMap.set(c.id, c);
    customerMap.set(String(c.id).trim().toLowerCase(), c);
  });

  // Pre-index payments by loanId for fast O(1) lookups
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
    const statusUpper = (loan.status || "").toUpperCase();
    if (statusUpper === "REJECTED" || statusUpper === "PENDING") {
      continue;
    }

    let customer =
      customerMap.get(loan.customerId) ||
      customerMap.get(String(loan.customerId).trim().toLowerCase());

    if (!customer && loan.customerName) {
      customer = {
        id: loan.customerId || `CUS-${loan.id}`,
        name: loan.customerName,
        fullName: loan.customerName,
        nic: "",
        phone: "",
        address: "",
        village: "",
        town: "",
        district: "",
        monthlyIncome: 0,
        status: "ACTIVE",
      };
    }
    const loanPayments = paymentsByLoanId.get(loan.id) || [];
    const totalPaid = loanPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalRepayment = getLoanTotalRepayment(loan);
    const balanceDue = Math.max(0, Math.round((totalRepayment - totalPaid) * 100) / 100);

    // Look for a payment made on this specific date
    const todaysPayment = loanPayments.find(
      (p) => (p.date || "").slice(0, 10) === asOfDateStr
    );

    // If fully completed before and no payment was made today, skip
    if (balanceDue <= 0 && !todaysPayment) {
      continue;
    }

    const startDateStr = loan.firstPaymentDate || loan.issueDate;
    const startDate = parseDateString(startDateStr);
    const duration = loan.duration && loan.duration > 0 ? loan.duration : 1;
    const frequency = loan.repaymentFrequency || "Monthly";
    const installmentAmount =
      loan.installment || Math.round(totalRepayment / duration);

    let isScheduledForDate = false;
    let matchedCycle = 1;

    if (startDate) {
      if (frequency === "Daily") {
        const diffTime = targetDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < duration) {
          isScheduledForDate = true;
          matchedCycle = diffDays + 1;
        }
      } else if (frequency === "Weekly") {
        const diffTime = targetDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays % 7 === 0 && Math.floor(diffDays / 7) < duration) {
          isScheduledForDate = true;
          matchedCycle = Math.floor(diffDays / 7) + 1;
        }
      } else {
        // Monthly
        for (let m = 0; m < duration; m++) {
          const installmentDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + m,
            startDate.getDate()
          );
          if (formatDateToYMD(installmentDate) === asOfDateStr) {
            isScheduledForDate = true;
            matchedCycle = m + 1;
            break;
          }
        }
      }
    }

    // Calculate past arrears: only cycles strictly prior to targetDate
    let arrearsAmount = 0;
    if (startDate && targetDate > startDate) {
      const diffDays = Math.max(
        0,
        Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      let cycleDays = 30;
      if (frequency === "Daily") cycleDays = 1;
      else if (frequency === "Weekly") cycleDays = 7;

      const pastCycles = Math.min(duration, Math.floor(diffDays / cycleDays));
      const expectedPastDue = Math.min(totalRepayment, pastCycles * installmentAmount);
      const rawArrears = Math.max(0, Math.round((expectedPastDue - totalPaid) * 100) / 100);
      if (rawArrears > 0) {
        arrearsAmount = Math.min(balanceDue, rawArrears);
      }
    }

    if (statusUpper === "OVERDUE" && arrearsAmount <= 0) {
      arrearsAmount = Math.min(balanceDue, installmentAmount);
    }

    const hasArrears = arrearsAmount > 0 || statusUpper === "OVERDUE";
    const isCollectedToday = Boolean(todaysPayment && Number(todaysPayment.amount) > 0);

    // Item belongs on the daily sheet if:
    // 1. Scheduled today
    // 2. Collected today
    // 3. Or has active arrears / overdue to be recovered today
    if (isScheduledForDate || isCollectedToday || hasArrears) {
      let status: ScheduledCollectionItem["status"] = "DUE_TODAY";
      if (isCollectedToday) {
        status = "COLLECTED";
      } else if (hasArrears || statusUpper === "OVERDUE") {
        status = "OVERDUE";
      } else {
        status = "DUE_TODAY";
      }

      // Total expected from borrower today:
      // If collected today: payment amount.
      // If scheduled today: installment + any past arrears (capped at balance due)
      // If NOT scheduled today: just arrears (capped at balance due)
      let amountToCollect = 0;
      if (isCollectedToday) {
        amountToCollect = Number(todaysPayment?.amount) || installmentAmount;
      } else if (isScheduledForDate) {
        amountToCollect = Math.min(balanceDue, installmentAmount + arrearsAmount);
      } else {
        amountToCollect = Math.min(balanceDue, arrearsAmount);
      }

      const routeArea =
        customer?.town || customer?.village || customer?.district || "Colombo Metro";

      items.push({
        id: `${loan.id}-${asOfDateStr}`,
        loan,
        customer,
        cycleNumber: matchedCycle,
        totalCycles: duration,
        dueDate: asOfDateStr,
        installmentAmount,
        arrearsAmount,
        totalDueToday: amountToCollect,
        repaymentFrequency: frequency,
        isDueToday: isScheduledForDate,
        hasArrears,
        isCollectedToday,
        todaysPayment,
        status,
        routeArea,
      });
    }
  }

  // Calculate summary metrics
  let targetAmount = 0;
  let collectedAmount = 0;
  let pendingAmount = 0;
  let collectedCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const it of items) {
    const paidToday = Number(it.todaysPayment?.amount) || 0;
    if (it.isCollectedToday) {
      const recordedPayment = paidToday > 0 ? paidToday : it.totalDueToday;
      collectedAmount += recordedPayment;
      collectedCount++;
      if (recordedPayment < it.totalDueToday) {
        pendingAmount += (it.totalDueToday - recordedPayment);
      }
    } else {
      pendingAmount += it.totalDueToday;
      pendingCount++;
      if (it.status === "OVERDUE") {
        overdueCount++;
      }
    }
    targetAmount += Math.max(it.totalDueToday, paidToday);
  }

  // Round summary figures to 2 decimal places
  targetAmount = Math.round(targetAmount * 100) / 100;
  collectedAmount = Math.round(collectedAmount * 100) / 100;
  pendingAmount = Math.round(pendingAmount * 100) / 100;

  const collectionRate =
    targetAmount > 0 ? Math.round((collectedAmount / targetAmount) * 100) : 0;

  return {
    items,
    summary: {
      targetAmount,
      collectedAmount,
      pendingAmount,
      collectionRate,
      totalCount: items.length,
      collectedCount,
      pendingCount,
      overdueCount,
    },
  };
}

