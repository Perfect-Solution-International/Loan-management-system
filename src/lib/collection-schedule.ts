import type { Loan, Customer, Payment } from "@/types";

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
  asOfDateStr: string = "2026-10-14"
): { items: ScheduledCollectionItem[]; summary: DailyCollectionSummary } {
  const targetDate = parseDateString(asOfDateStr) || new Date(2026, 9, 14);
  const items: ScheduledCollectionItem[] = [];

  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  for (const loan of loans) {
    const statusUpper = (loan.status || "").toUpperCase();
    if (statusUpper === "REJECTED" || statusUpper === "PENDING") {
      continue;
    }

    const customer = customerMap.get(loan.customerId);
    const loanPayments = payments.filter((p) => p.loanId === loan.id);
    const totalPaid = loanPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalRepayment =
      loan.totalRepayment || (loan.principal || loan.amount || 0) + (loan.interest || 0);
    const balanceDue = Math.max(0, totalRepayment - totalPaid);

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

    // Calculate arrears if delinquent
    let arrearsAmount = 0;
    if (startDate && targetDate >= startDate) {
      const diffDays = Math.max(
        0,
        Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      let cycleDays = 30;
      if (frequency === "Daily") cycleDays = 1;
      else if (frequency === "Weekly") cycleDays = 7;

      const cyclesElapsed = Math.min(duration, Math.floor(diffDays / cycleDays) + 1);
      const expectedDue = Math.min(totalRepayment, cyclesElapsed * installmentAmount);
      const rawArrears = Math.max(0, expectedDue - totalPaid);
      if (rawArrears > 0) {
        arrearsAmount = rawArrears;
      }
    }

    if (statusUpper === "OVERDUE" && arrearsAmount <= 0) {
      arrearsAmount = installmentAmount;
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

      // Total expected from borrower today
      const amountToCollect = isCollectedToday
        ? Number(todaysPayment?.amount) || installmentAmount
        : Math.min(balanceDue, installmentAmount + (isScheduledForDate ? 0 : arrearsAmount));

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
    if (it.isCollectedToday) {
      collectedAmount += it.totalDueToday;
      collectedCount++;
    } else {
      pendingAmount += it.totalDueToday;
      pendingCount++;
      if (it.status === "OVERDUE") {
        overdueCount++;
      }
    }
    targetAmount += it.totalDueToday;
  }

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

