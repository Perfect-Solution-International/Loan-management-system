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
} from "@/types";
import {
  initialCustomers,
  initialLoans,
  initialPayments,
  initialDocuments,
  initialSettings,
  initialStaffUsers,
} from "@/lib/demo-data";

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
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string | number, updated: Partial<Loan>) => void;
  addPayment: (payment: Payment) => void;
  addRepayment: (payment: Payment) => void;
  addDocument: (doc: CustomerDocument) => void;
  deleteDocument: (id: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  addStaffUser: (user: StaffUser) => void;
  updateStaffUser: (id: string, updated: Partial<StaffUser>) => void;
  resetAllData: () => void;
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
  addLoan: () => {},
  updateLoan: () => {},
  addPayment: () => {},
  addRepayment: () => {},
  addDocument: () => {},
  deleteDocument: () => {},
  updateSettings: () => {},
  addStaffUser: () => {},
  updateStaffUser: () => {},
  resetAllData: () => {},
};

const DataContext = createContext<DataContextValue>(defaultState);

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || []);
  const [loans, setLoans] = useState<Loan[]>(initialLoans || []);
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
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
        localStorage.removeItem("psi_documents");
        localStorage.removeItem("psi_field_ptp_notes");
        localStorage.setItem("psi_staff_users", JSON.stringify(initialStaffUsers));
        localStorage.setItem(SYSTEM_WIPE_FLAG, "true");

        setCustomers([]);
        setLoans([]);
        setPayments([]);
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
        setPayments(JSON.parse(storedPayments));
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
        setStaffUsers(JSON.parse(storedStaff));
      } else {
        setStaffUsers(initialStaffUsers);
      }
    } catch (e) {
      console.error("Failed to load stored data from localStorage", e);
    } finally {
      setIsHydrated(true);
    }
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
    setPayments((prev) => [payment, ...prev]);

    // Check if the loan balance is now settled in full
    setLoans((prevLoans) =>
      prevLoans.map((l) => {
        if (l.id === payment.loanId || String(l.id) === String(payment.loanId)) {
          const existingPaid = payments
            .filter((p) => p.loanId === l.id)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const totalPaidAfter = existingPaid + (Number(payment.amount) || 0);

          if (totalPaidAfter >= (l.totalRepayment || 0) && l.status !== "Completed") {
            return { ...l, status: "Completed" };
          }
        }
        return l;
      })
    );
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

  const resetAllData = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("psi_customers");
      localStorage.removeItem("psi_loans");
      localStorage.removeItem("psi_payments");
      localStorage.removeItem("psi_documents");
      localStorage.removeItem("psi_field_ptp_notes");
      localStorage.setItem("psi_staff_users", JSON.stringify(initialStaffUsers));
      sessionStorage.clear();
    }
    setCustomers([]);
    setLoans([]);
    setPayments([]);
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
      addLoan,
      updateLoan,
      addPayment,
      addRepayment: addPayment,
      addDocument,
      deleteDocument,
      updateSettings,
      addStaffUser,
      updateStaffUser,
      resetAllData,
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
      addLoan,
      updateLoan,
      addPayment,
      addDocument,
      deleteDocument,
      updateSettings,
      addStaffUser,
      updateStaffUser,
      resetAllData,
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