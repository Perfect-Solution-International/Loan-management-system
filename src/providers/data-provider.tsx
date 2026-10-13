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

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || []);
  const [loans, setLoans] = useState<Loan[]>(initialLoans || []);
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [documents, setDocuments] = useState<CustomerDocument[]>(initialDocuments || []);
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(initialStaffUsers || []);

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
  return context || defaultState;
}

export default DataProvider;