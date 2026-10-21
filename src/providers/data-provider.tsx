"use client";

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type {
  Customer,
  Loan,
  Payment,
  CustomerDocument,
  SystemSettings,
  StaffUser,
  OnlinePayment,
  OnlinePaymentStatus,
} from "@/types";
import {
  initialCustomers,
  initialLoans,
  initialPayments,
  initialOnlinePayments,
  initialDocuments,
  initialSettings,
  initialStaffUsers,
} from "@/lib/demo-data";
import { api } from "@/lib/api-client";
import { getLoanTotalRepayment } from "@/lib/loan-financials";

export interface DataContextValue {
  customers: Customer[];
  loans: Loan[];
  payments: Payment[];
  repayments: Payment[];
  documents: CustomerDocument[];
  settings: SystemSettings;
  staffUsers: StaffUser[];
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string | number, updated: Partial<Customer>) => void;
  deleteCustomer: (id: string | number) => void;
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string | number, updated: Partial<Loan>) => void;
  addPayment: (payment: Payment) => void;
  updatePayment: (id: string, updated: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  addRepayment: (payment: Payment) => void;
  addDocument: (doc: CustomerDocument) => void;
  deleteDocument: (id: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  addStaffUser: (user: StaffUser) => void;
  updateStaffUser: (id: string, updated: Partial<StaffUser>) => void;
  resetAllData: () => void;
  getNextReceiptNo: () => string;
  onlinePayments: OnlinePayment[];
  addOnlinePayment: (payment: OnlinePayment) => void;
  approveOnlinePayment: (id: string, notes?: string, reviewer?: string) => void;
  rejectOnlinePayment: (id: string, notes?: string, reviewer?: string) => void;
}

export function getNextReceiptNo(paymentsList: Payment[] = []): string {
  const currentYear = new Date().getFullYear();
  let maxSeq = 0;

  for (const p of paymentsList) {
    if (!p.receiptNo) continue;
    const match = p.receiptNo.match(/^REC-(\d{4})-(\d+)$/);
    if (match) {
      const parsed = parseInt(match[2], 10);
      if (!isNaN(parsed)) {
        if (paymentsList.length < 50 && parsed >= 1000) {
          // Ignore legacy random numbers like 5954
          continue;
        }
        if (parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  const nextSeq = maxSeq > 0 ? maxSeq + 1 : (paymentsList.length > 0 ? paymentsList.length + 1 : 1);
  return `REC-${currentYear}-${String(nextSeq).padStart(4, "0")}`;
}

const defaultState: DataContextValue = {
  customers: initialCustomers || [],
  loans: initialLoans || [],
  payments: initialPayments || [],
  get repayments() {
    return this.payments;
  },
  documents: initialDocuments || [],
  settings: initialSettings,
  staffUsers: initialStaffUsers || [],
  addCustomer: () => {},
  updateCustomer: () => {},
  deleteCustomer: () => {},
  addLoan: () => {},
  updateLoan: () => {},
  addPayment: () => {},
  updatePayment: () => {},
  deletePayment: () => {},
  addRepayment: () => {},
  addDocument: () => {},
  deleteDocument: () => {},
  updateSettings: () => {},
  addStaffUser: () => {},
  updateStaffUser: () => {},
  resetAllData: () => {},
  getNextReceiptNo: () => `REC-${new Date().getFullYear()}-0001`,
  onlinePayments: initialOnlinePayments || [],
  addOnlinePayment: () => {},
  approveOnlinePayment: () => {},
  rejectOnlinePayment: () => {},
};

const DataContext = createContext<DataContextValue>(defaultState);

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || []);
  const [loans, setLoans] = useState<Loan[]>(initialLoans || []);
  const loansRef = React.useRef(loans);
  loansRef.current = loans;
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [onlinePayments, setOnlinePayments] = useState<OnlinePayment[]>(initialOnlinePayments || []);
  const [documents, setDocuments] = useState<CustomerDocument[]>(initialDocuments || []);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(initialStaffUsers || []);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage ONCE after mount (client-only)
  React.useEffect(() => {
    try {
      const SYSTEM_WIPE_FLAG = "psi_clean_slate_superadmin_v3";
      const isWiped = localStorage.getItem(SYSTEM_WIPE_FLAG);

      if (!isWiped) {
        // Complete clean-slate: wipe all previous mock/dummy data
        localStorage.removeItem("psi_customers");
        localStorage.removeItem("psi_loans");
        localStorage.removeItem("psi_payments");
        localStorage.removeItem("psi_online_payments");
        localStorage.removeItem("psi_documents");
        localStorage.removeItem("psi_field_ptp_notes");
        localStorage.setItem("psi_staff_users", JSON.stringify(initialStaffUsers));
        localStorage.setItem(SYSTEM_WIPE_FLAG, "true");

        setCustomers([]);
        setLoans([]);
        setPayments([]);
        setOnlinePayments([]);
        setDocuments([]);
        setStaffUsers(initialStaffUsers);
        return;
      }

      const storedCustomers = localStorage.getItem("psi_customers");
      if (storedCustomers) {
        setCustomers(JSON.parse(storedCustomers));
      }

      const storedLoans = localStorage.getItem("psi_loans");
      if (storedLoans) {
        setLoans(JSON.parse(storedLoans));
      }

      const storedPayments = localStorage.getItem("psi_payments");
      if (storedPayments) {
        const parsed: Payment[] = JSON.parse(storedPayments);
        // Normalize any legacy random receipts so they cleanly sequence from 0001
        const normalized = [...parsed]
          .reverse()
          .map((p, idx) => {
            const isOldRandom =
              !p.receiptNo ||
              /^REC-\d{4}-[1-9]\d{3}$/.test(p.receiptNo) ||
              p.receiptNo.startsWith("REC-FLD-") ||
              p.receiptNo.startsWith("RCP-");
            if (isOldRandom) {
              const yr = p.date ? p.date.slice(0, 4) : new Date().getFullYear().toString();
              return {
                ...p,
                receiptNo: `REC-${yr}-${String(idx + 1).padStart(4, "0")}`,
              };
            }
            return p;
          })
          .reverse();
        setPayments(normalized);
        localStorage.setItem("psi_payments", JSON.stringify(normalized));
      }

      const storedOnline = localStorage.getItem("psi_online_payments");
      if (storedOnline) {
        try {
          const parsedOnline: OnlinePayment[] = JSON.parse(storedOnline);
          const autoApprovedReceipts = new Set<string>();
          const correctedOnline = parsedOnline.map((op) => {
            if (
              op.paymentMethod === "BANK_SLIP" &&
              (op.reviewedBy === "Customer Online Portal (Instant Credit)" ||
                op.reviewNotes === "Instant online portal bank transfer credit")
            ) {
              if (op.receiptNo) autoApprovedReceipts.add(op.receiptNo);
              return {
                ...op,
                status: "PENDING" as const,
                reviewedBy: undefined,
                reviewedAt: undefined,
                reviewNotes: undefined,
                receiptNo: undefined,
              };
            }
            return op;
          });

          if (autoApprovedReceipts.size > 0) {
            setPayments((prev) => {
              const filtered = prev.filter(
                (p) => !autoApprovedReceipts.has(p.receiptNo || "") && !autoApprovedReceipts.has(p.id)
              );
              localStorage.setItem("psi_payments", JSON.stringify(filtered));
              return filtered;
            });
          }

          setOnlinePayments(correctedOnline);
          localStorage.setItem("psi_online_payments", JSON.stringify(correctedOnline));
        } catch (e) {
          console.error("Failed to parse online payments", e);
        }
      }

      const storedDocs = localStorage.getItem("psi_documents");
      if (storedDocs) {
        setDocuments(JSON.parse(storedDocs));
      }

      const storedSettings = localStorage.getItem("psi_settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }

      const storedStaff = localStorage.getItem("psi_staff_users");
      if (storedStaff) {
        const parsedStaff: StaffUser[] = JSON.parse(storedStaff);
        const merged = [...parsedStaff];
        for (const initUser of initialStaffUsers) {
          if (!merged.some((u) => u.id === initUser.id)) {
            merged.push(initUser);
          }
        }
        setStaffUsers(merged);
        localStorage.setItem("psi_staff_users", JSON.stringify(merged));
      } else {
        setStaffUsers(initialStaffUsers);
      }
    } catch (e) {
      console.error("Failed to load stored data from localStorage", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Real-time cross-tab synchronization: when customer submits in one tab, admin updates immediately
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "psi_online_payments" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setOnlinePayments(parsed);
        } catch {}
      }
      if (e.key === "psi_payments" && e.newValue) {
        try {
          setPayments(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === "psi_loans" && e.newValue) {
        try {
          setLoans(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === "psi_customers" && e.newValue) {
        try {
          setCustomers(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Sync state to localStorage on changes (ONLY after hydration)
  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_customers", JSON.stringify(customers));
    } catch (e) {
      console.error("Failed to save customers to localStorage", e);
    }
  }, [customers, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_loans", JSON.stringify(loans));
    } catch (e) {
      console.error("Failed to save loans to localStorage", e);
    }
  }, [loans, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_payments", JSON.stringify(payments));
    } catch (e) {
      console.error("Failed to save payments to localStorage", e);
    }
  }, [payments, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_online_payments", JSON.stringify(onlinePayments));
    } catch (e) {
      console.error("Failed to save online payments to localStorage", e);
    }
  }, [onlinePayments, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_documents", JSON.stringify(documents));
    } catch (e) {
      console.error("Failed to save documents to localStorage", e);
    }
  }, [documents, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings to localStorage", e);
    }
  }, [settings, isHydrated]);

  React.useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("psi_staff_users", JSON.stringify(staffUsers));
    } catch (e) {
      console.error("Failed to save staff users to localStorage", e);
    }
  }, [staffUsers, isHydrated]);

  const addCustomer = React.useCallback((customer: Customer) => {
    setCustomers((prev) => [customer, ...prev]);
  }, []);

  const deleteCustomer = React.useCallback((id: string | number) => {
    const idStr = String(id);
    setCustomers((prev) => prev.filter((item) => item.id !== id && String(item.id) !== idStr));
    api.deleteCustomer(idStr).catch(() => {});
  }, []);

  const updateCustomer = React.useCallback((id: string | number, updated: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((item: Customer) =>
        item.id === id || String(item.id) === String(id)
          ? { ...item, ...updated }
          : item
      )
    );
  }, []);

  const addLoan = React.useCallback((loan: Loan) => {
    setLoans((prev) => [loan, ...prev]);
  }, []);

  const updateLoan = React.useCallback((id: string | number, updated: Partial<Loan>) => {
    setLoans((prev) =>
      prev.map((item: Loan) =>
        item.id === id || String(item.id) === String(id)
          ? { ...item, ...updated }
          : item
      )
    );
  }, []);

  const addPayment = React.useCallback((payment: Payment) => {
    const isOldRandom =
      !payment.receiptNo ||
      /^REC-\d{4}-[1-9]\d{3}$/.test(payment.receiptNo) ||
      payment.receiptNo.startsWith("REC-FLD-") ||
      payment.receiptNo.startsWith("RCP-");

    const finalReceiptNo = isOldRandom ? getNextReceiptNo(payments) : payment.receiptNo;
    const paymentWithReceipt: Payment = {
      ...payment,
      receiptNo: finalReceiptNo,
    };

    setPayments((prev) => [paymentWithReceipt, ...prev]);

    // Check if the loan balance is now settled in full
    setLoans((prevLoans) =>
      prevLoans.map((l) => {
        if (l.id === payment.loanId || String(l.id) === String(payment.loanId)) {
          const existingPaid = payments
            .filter((p) => p.loanId === l.id || String(p.loanId) === String(l.id))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const totalPaidAfter = Math.round((existingPaid + (Number(payment.amount) || 0)) * 100) / 100;

          const expectedRepayment = getLoanTotalRepayment(l);
          if (expectedRepayment > 0 && totalPaidAfter >= expectedRepayment - 0.01 && l.status !== "Completed") {
            return { ...l, status: "Completed" };
          }
        }
        return l;
      })
    );
  }, [payments]);

  const updatePayment = React.useCallback((id: string, updated: Partial<Payment>) => {
    setPayments((prev) => {
      const nextPayments = prev.map((p) => (p.id === id ? { ...p, ...updated } : p));
      const targetPayment = nextPayments.find((p) => p.id === id);
      if (targetPayment) {
        const loanId = targetPayment.loanId;
        const currentLoan = loansRef.current.find((l) => l.id === loanId || String(l.id) === String(loanId));
        if (currentLoan) {
          const expectedRepayment = getLoanTotalRepayment(currentLoan);
          const totalPaidAfter = nextPayments
            .filter((p) => p.loanId === loanId || String(p.loanId) === String(loanId))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          setLoans((prevLoans) =>
            prevLoans.map((l) => {
              if (l.id === loanId || String(l.id) === String(loanId)) {
                if (expectedRepayment > 0 && totalPaidAfter >= expectedRepayment - 0.01) {
                  return { ...l, status: "Completed" };
                } else if (l.status === "Completed") {
                  return { ...l, status: "Active" };
                }
              }
              return l;
            })
          );
        }
      }
      return nextPayments;
    });
    api.updatePayment(id, updated).catch(() => {});
  }, []);

  const deletePayment = React.useCallback((id: string) => {
    setPayments((prev) => {
      const targetPayment = prev.find((p) => p.id === id);
      const nextPayments = prev.filter((p) => p.id !== id);
      if (targetPayment) {
        const loanId = targetPayment.loanId;
        const currentLoan = loansRef.current.find((l) => l.id === loanId || String(l.id) === String(loanId));
        if (currentLoan) {
          const expectedRepayment = getLoanTotalRepayment(currentLoan);
          const totalPaidAfter = nextPayments
            .filter((p) => p.loanId === loanId || String(p.loanId) === String(loanId))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          setLoans((prevLoans) =>
            prevLoans.map((l) => {
              if (l.id === loanId || String(l.id) === String(loanId)) {
                if (expectedRepayment > 0 && totalPaidAfter < expectedRepayment - 0.01 && l.status === "Completed") {
                  return { ...l, status: "Active" };
                }
              }
              return l;
            })
          );
        }
      }
      return nextPayments;
    });
    api.deletePayment(id).catch(() => {});
  }, []);

  const getNextReceiptNumber = React.useCallback(() => {
    return getNextReceiptNo(payments);
  }, [payments]);

  const addDocument = React.useCallback((doc: CustomerDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const deleteDocument = React.useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateSettings = React.useCallback((newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const addStaffUser = React.useCallback((user: StaffUser) => {
    setStaffUsers((prev) => [...prev, user]);
  }, []);

  const updateStaffUser = React.useCallback((id: string, updated: Partial<StaffUser>) => {
    setStaffUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
    );
  }, []);

  const addOnlinePayment = React.useCallback((payment: OnlinePayment) => {
    setOnlinePayments((prev) => [payment, ...prev.filter((p) => p.id !== payment.id)]);
    // Asynchronously sync with backend API
    api.createOnlinePayment(payment).catch((err) => {
      console.warn("Backend sync notice for online payment:", err?.message || err);
    });
  }, []);

  const approveOnlinePayment = React.useCallback(
    (id: string, notes?: string, reviewer?: string) => {
      const reviewerName = reviewer || "Admin Officer";
      const reviewDate = new Date().toISOString().slice(0, 10);
      const generatedReceiptNo = getNextReceiptNo(payments);

      let targetItem: OnlinePayment | undefined;

      setOnlinePayments((prev) =>
        prev.map((op) => {
          if (op.id === id) {
            targetItem = {
              ...op,
              status: "COMPLETED",
              reviewedBy: reviewerName,
              reviewedAt: reviewDate,
              reviewNotes: notes || "Bank transfer slip verified and accepted",
              receiptNo: generatedReceiptNo,
            };
            return targetItem;
          }
          return op;
        })
      );

      // Asynchronously notify backend API
      api.approveOnlinePayment(id, notes, reviewerName, generatedReceiptNo).catch((err) => {
        console.warn("Backend sync notice for approval:", err?.message || err);
      });

      // Create official repayment record and credit loan
      const target = targetItem || onlinePayments.find((o) => o.id === id);
      if (target) {
        const newPayment: Payment = {
          id: `PAY-${Date.now().toString().slice(-6)}`,
          loanId: target.loanId,
          customerId: target.customerId,
          amount: target.amount,
          date: target.paymentDate || reviewDate,
          type: "Capital",
          method: "Bank Transfer",
          notes: `[Online Slip Approved] Ref: ${target.referenceNumber} | Bank: ${target.bankName}${
            notes ? ` | Note: ${notes}` : ""
          }`,
          collectedBy: reviewerName,
          receiptNo: generatedReceiptNo,
        };

        addPayment(newPayment);
      }
    },
    [payments, onlinePayments, addPayment]
  );

  const rejectOnlinePayment = React.useCallback(
    (id: string, notes?: string, reviewer?: string) => {
      const reviewerName = reviewer || "Admin Officer";
      const reviewDate = new Date().toISOString().slice(0, 10);
      setOnlinePayments((prev) =>
        prev.map((op) =>
          op.id === id
            ? {
                ...op,
                status: "REJECTED",
                reviewedBy: reviewerName,
                reviewedAt: reviewDate,
                reviewNotes: notes || "Payment slip declined by administrator",
              }
            : op
        )
      );

      // Asynchronously notify backend API
      api.rejectOnlinePayment(id, notes, reviewerName).catch((err) => {
        console.warn("Backend sync notice for rejection:", err?.message || err);
      });
    },
    []
  );

  const resetAllData = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("psi_customers");
      localStorage.removeItem("psi_loans");
      localStorage.removeItem("psi_payments");
      localStorage.removeItem("psi_online_payments");
      localStorage.removeItem("psi_documents");
      localStorage.removeItem("psi_field_ptp_notes");
      localStorage.setItem("psi_staff_users", JSON.stringify(initialStaffUsers));
      sessionStorage.clear();
    }
    setCustomers([]);
    setLoans([]);
    setPayments([]);
    setOnlinePayments([]);
    setDocuments([]);
    setStaffUsers(initialStaffUsers);
  }, []);

  const contextValue = React.useMemo<DataContextValue>(
    () => ({
      customers,
      loans,
      payments,
      repayments: payments,
      documents,
      settings,
      staffUsers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addLoan,
      updateLoan,
      addPayment,
      updatePayment,
      deletePayment,
      addRepayment: addPayment,
      addDocument,
      deleteDocument,
      updateSettings,
      addStaffUser,
      updateStaffUser,
      resetAllData,
      getNextReceiptNo: getNextReceiptNumber,
      onlinePayments,
      addOnlinePayment,
      approveOnlinePayment,
      rejectOnlinePayment,
    }),
    [
      customers,
      loans,
      payments,
      documents,
      settings,
      staffUsers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addLoan,
      updateLoan,
      addPayment,
      updatePayment,
      deletePayment,
      addDocument,
      deleteDocument,
      updateSettings,
      addStaffUser,
      updateStaffUser,
      resetAllData,
      getNextReceiptNumber,
      onlinePayments,
      addOnlinePayment,
      approveOnlinePayment,
      rejectOnlinePayment,
    ]
  );

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  return context || defaultState;
}

export default DataProvider;