"use client";

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Customer, Loan, Payment } from "@/types";
import {
  initialCustomers,
  initialLoans,
  initialPayments,
} from "@/lib/demo-data";

export interface DataContextValue {
  customers: Customer[];
  loans: Loan[];
  payments: Payment[];
  repayments: Payment[]; // alias for components referencing repayments
  addCustomer: (customer: Customer) => void;
  addLoan: (loan: Loan) => void;
  addPayment: (payment: Payment) => void;
  addRepayment: (payment: Payment) => void;
  updateLoan?: (id: string | number, updated: Partial<Loan>) => void;
  updateCustomer?: (id: string | number, updated: Partial<Customer>) => void;
}

// Fallback state so useData() never throws a crash error
const defaultState: DataContextValue = {
  customers: initialCustomers || [],
  loans: initialLoans || [],
  payments: initialPayments || [],
  get repayments() {
    return this.payments;
  },
  addCustomer: () => {},
  addLoan: () => {},
  addPayment: () => {},
  addRepayment: () => {},
};

const DataContext = createContext<DataContextValue>(defaultState);

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || []);
  const [loans, setLoans] = useState<Loan[]>(initialLoans || []);
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);

  const addCustomer = (customer: Customer) => {
    setCustomers((prev) => [customer, ...prev]);
  };

  const addLoan = (loan: Loan) => {
    setLoans((prev) => [loan, ...prev]);
  };

  const addPayment = (payment: Payment) => {
    setPayments((prev) => [payment, ...prev]);
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

  const updateCustomer = (id: string | number, updated: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((item: Customer) =>
        item.id === id || String(item.id) === String(id)
          ? { ...item, ...updated }
          : item
      )
    );
  };

  return (
    <DataContext.Provider
      value={{
        customers,
        loans,
        payments,
        repayments: payments, // compatibility alias
        addCustomer,
        addLoan,
        addPayment,
        addRepayment: addPayment,
        updateLoan,
        updateCustomer,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  // Return the defaultState fallback if context is ever missing, preventing hard crashes
  return context || defaultState;
}

export default DataProvider;