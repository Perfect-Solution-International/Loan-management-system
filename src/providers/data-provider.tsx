"use client";

import React, { createContext, useContext, useState, useSyncExternalStore } from "react";
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
};

const DataContext = createContext<DataContextValue>(defaultState);

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("psi_customers");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored customers", e);
      }
    }
    return initialCustomers || [];
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("psi_loans");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored loans", e);
      }
    }
    return initialLoans || [];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("psi_payments");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored payments", e);
      }
    }
    return initialPayments || [];
  });

  const [documents, setDocuments] = useState<CustomerDocument[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("psi_documents");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored documents", e);
      }
    }
    return initialDocuments || [];
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("psi_settings");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored settings", e);
      }
    }
    return initialSettings;
  });

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("psi_staff_users");
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored staff users", e);
      }
    }
    return initialStaffUsers || [];
  });

  // Sync state to localStorage on changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("psi_customers", JSON.stringify(customers));
      } catch (e) {
        console.error("Failed to save customers to localStorage", e);
      }
    }
  }, [customers]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("psi_loans", JSON.stringify(loans));
      } catch (e) {
        console.error("Failed to save loans to localStorage", e);
      }
    }
  }, [loans]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("psi_payments", JSON.stringify(payments));
      } catch (e) {
        console.error("Failed to save payments to localStorage", e);
      }
    }
  }, [payments]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("psi_documents", JSON.stringify(documents));
      } catch (e) {
        console.error("Failed to save documents to localStorage", e);
      }
    }
  }, [documents]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("psi_settings", JSON.stringify(settings));
      } catch (e) {
        console.error("Failed to save settings to localStorage", e);
      }
    }
  }, [settings]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("psi_staff_users", JSON.stringify(staffUsers));
      } catch (e) {
        console.error("Failed to save staff users to localStorage", e);
      }
    }
  }, [staffUsers]);

  const addCustomer = (customer: Customer) => {
    setCustomers((prev) => [customer, ...prev]);
  };

  const updateCustomer = (id: string | number, updated: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((item: Customer) =>
        item.id === id || String(item.id) === String(id)
          ? { ...item, ...updated }
          : item
      )
    );
  };

  const addLoan = (loan: Loan) => {
    setLoans((prev) => [loan, ...prev]);
  };

  const updateLoan = (id: string | number, updated: Partial<Loan>) => {
    setLoans((prev) =>
      prev.map((item: Loan) =>
        item.id === id || String(item.id) === String(id)
          ? { ...item, ...updated }
          : item
      )
    );
  };

  const addPayment = (payment: Payment) => {
    setPayments((prev) => [payment, ...prev]);

    // Check if the loan balance is now settled in full
    setLoans((prevLoans) =>
      prevLoans.map((l) => {
        if (l.id === payment.loanId || String(l.id) === String(payment.loanId)) {
          // Calculate all payments for this loan including the newly added payment
          const existingPaid = payments
            .filter((p) => p.loanId === l.id)
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const totalPaidAfter = existingPaid + (Number(payment.amount) || 0);

          if (totalPaidAfter >= l.totalRepayment && l.status !== "Completed") {
            return { ...l, status: "Completed" };
          }
        }
        return l;
      })
    );
  };

  const addDocument = (doc: CustomerDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addStaffUser = (user: StaffUser) => {
    setStaffUsers((prev) => [...prev, user]);
  };

  const updateStaffUser = (id: string, updated: Partial<StaffUser>) => {
    setStaffUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
    );
  };

  return (
    <DataContext.Provider
      value={{
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  // Each consumer must finish hydrating before exposing browser records, including
  // consumers inside Suspense boundaries that hydrate after the provider mounts.
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot
  );

  if (isHydrated) return context || defaultState;

  return {
    ...context,
    customers: defaultState.customers,
    loans: defaultState.loans,
    payments: defaultState.payments,
    repayments: defaultState.payments,
    documents: defaultState.documents,
    settings: defaultState.settings,
    staffUsers: defaultState.staffUsers,
  };
}

export default DataProvider;
