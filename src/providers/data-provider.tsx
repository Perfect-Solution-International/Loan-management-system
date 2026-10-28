"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Customer, Loan, Payment, CustomerDocument, SystemSettings, StaffUser, OnlinePayment, LoanNote, AuditLog } from "@/types";
import { initialSettings } from "@/lib/demo-data";
import { api, getToken } from "@/lib/api-client";

type Result<T> = Promise<T | null>;
export interface DataContextValue {
 customers: Customer[]; loans: Loan[]; payments: Payment[]; repayments: Payment[];
 documents: CustomerDocument[]; settings: SystemSettings; staffUsers: StaffUser[]; onlinePayments: OnlinePayment[]; auditLogs: AuditLog[];
 currentUser: StaffUser | null; currentCustomer: Customer | null; loading: boolean; error: string; refresh: () => Promise<void>;
 addCustomer: (customer: Customer) => Result<Customer>;
 updateCustomer: (id: string | number, updated: Partial<Customer>) => Result<Customer>;
 deleteCustomer: (id: string | number) => Result<boolean>;
 loanNotes: Record<string, LoanNote>;
 saveLoanNote: (id: string, promiseDate: string, note: string) => Result<LoanNote>;
 deleteLoan: (id: string) => Result<boolean>;
 addLoan: (loan: Loan) => Result<Loan>;
 updateLoan: (id: string | number, updated: Partial<Loan>) => Result<Loan>;
 addPayment: (payment: Payment) => Result<Payment>;
 addRepayment: (payment: Payment) => Result<Payment>;
 updatePayment: (id: string, updated: Partial<Payment>) => Result<Payment>;
 deletePayment: (id: string) => Result<boolean>;
 addDocument: (doc: CustomerDocument) => Result<CustomerDocument>;
 deleteDocument: (id: string) => Result<boolean>;
 updateSettings: (settings: Partial<SystemSettings>) => Result<SystemSettings>;
 addStaffUser: (user: StaffUser) => Result<StaffUser>;
 updateStaffUser: (id: string, updated: Partial<StaffUser>) => Result<StaffUser>;
 getNextReceiptNo: () => string;
 addOnlinePayment: (payment: OnlinePayment) => Result<OnlinePayment>;
 approveOnlinePayment: (id: string, notes?: string, reviewer?: string) => Result<boolean>;
 rejectOnlinePayment: (id: string, notes?: string, reviewer?: string) => Result<boolean>;
}
const DataContext = createContext<DataContextValue | null>(null);
const empty = { loanNotes: {} as Record<string, LoanNote>, customers: [] as Customer[], loans: [] as Loan[], payments: [] as Payment[], onlinePayments: [] as OnlinePayment[], staffUsers: [] as StaffUser[], auditLogs: [] as AuditLog[], settings: initialSettings, currentUser: null as StaffUser | null, currentCustomer: null as Customer | null };

export function DataProvider({ children }: { children: React.ReactNode }) {
 const [data, setData] = useState(empty);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [pending, setPending] = useState(0);
 const [ready, setReady] = useState(false);
 const requests = useRef(new Set<string>());
 const generation = useRef(0);
 const pathname = usePathname(); const router = useRouter();
 const refresh = useCallback(async () => {
   await Promise.resolve();
   const token = getToken(); const current = ++generation.current;
   if (!token) { setData(empty); setLoading(false); setReady(true); return; }
   try {
    if (sessionStorage.getItem("psi_session_kind") === "customer") {
      const snapshot = await api.getPortal();
      if (current !== generation.current || getToken() !== token) return;
      setData({ ...empty, ...snapshot, customers: [snapshot.customer], currentCustomer: snapshot.customer });
    } else {
      const currentUser = await api.getMe();
      const [customers, loans, payments, onlinePayments, settings, staffUsers, auditLogs, loanNotes] = await Promise.all([
        api.getCustomers(), api.getLoans(), api.getPayments(), api.getOnlinePayments(), api.getSettings(), api.getUsers(), api.getAuditLogs(), api.getLoanNotes(),
      ]);
      if (current !== generation.current || getToken() !== token) return;
      setData({ customers, loans, payments, onlinePayments, settings, staffUsers, auditLogs, loanNotes, currentUser, currentCustomer: null });
    }
    setError(""); setReady(true);
   } catch (err) { if (current === generation.current) setError(err instanceof Error ? err.message : "Failed to load records"); }
   finally { if (current === generation.current) setLoading(false); }
 }, []);
 useEffect(() => {
   const sessionChanged = () => { setData(empty); setReady(false); setLoading(true); void refresh(); };
   void refresh(); window.addEventListener("psi-session", sessionChanged);
   const focused = () => { if (getToken()) void refresh(); };
   window.addEventListener("focus", focused);
   const timer = window.setInterval(focused, 30000);
   return () => { generation.current++; window.removeEventListener("psi-session", sessionChanged); window.removeEventListener("focus", focused); clearInterval(timer); };
 }, [refresh]);
 const isPublic = pathname === "/login" || pathname === "/register" || pathname === "/";
 useEffect(() => {
   if (loading || isPublic) return;
   if (!getToken()) router.replace("/login");
   else if (data.currentCustomer && pathname !== "/customerdashboard") router.replace("/customerdashboard");
 }, [loading, isPublic, pathname, data.currentCustomer, router]);

 const mutate = async <T,>(key: string, action: () => Promise<T>): Result<T> => {
   if (requests.current.has(key)) return null;
   requests.current.add(key); setPending(n => n + 1); setError("");
   try { const result = await action(); await refresh(); return result; }
   catch (err) { setError(err instanceof Error ? err.message : "The operation failed. Please try again."); return null; }
   finally { requests.current.delete(key); setPending(n => n - 1); }
 };
 const documents = data.customers.flatMap(customer => customer.documents || []);
 const addPayment = (payment: Payment) => mutate("payment:" + payment.id, async () => { const saved = await api.recordPayment({ ...payment, id: payment.id === "Assigned on save" ? crypto.randomUUID() : payment.id, receiptNo: undefined }); Object.assign(payment, saved); return saved; });
 const value: DataContextValue = {
   ...data, documents, repayments: data.payments, loading, error, refresh,
   addCustomer: customer => mutate("customer:" + customer.id, () => api.createCustomer(customer)),
   updateCustomer: (id, updated) => mutate("customer:" + id, () => api.updateCustomer(String(id), updated)),
   deleteCustomer: id => mutate("customer:" + id, async () => { await api.deleteCustomer(String(id)); return true; }),
   saveLoanNote: (id, promiseDate, note) => mutate("note:" + id, () => api.saveLoanNote(id, promiseDate, note)),
   deleteLoan: id => mutate("loan:" + id, async () => { await api.deleteLoan(id); return true; }),
   addLoan: loan => mutate("loan:" + loan.id, () => api.createLoan(loan)),
   updateLoan: (id, updated) => mutate("loan:" + id, () => api.updateLoanStatus(String(id), updated.status || "Pending", updated.notes)),
   addPayment, addRepayment: addPayment,
   updatePayment: (id, updated) => mutate("payment:" + id, () => api.updatePayment(id, updated)),
   deletePayment: id => mutate("payment:" + id, async () => { await api.deletePayment(id); return true; }),
   addDocument: doc => mutate("document:" + doc.id, () => api.addDocument(doc)),
   deleteDocument: id => mutate("document:" + id, async () => { const doc = documents.find(d => d.id === id); if (!doc) throw new Error("Document not found"); await api.deleteDocument(doc.customerId, id); return true; }),
   updateSettings: settings => mutate("settings", () => api.updateSettings({ ...data.settings, ...settings })),
   addStaffUser: user => mutate("user:" + user.id, () => api.createUser(user)),
   updateStaffUser: (id, updated) => mutate("user:" + id, () => api.updateUser(id, updated)),
   // A preview only. The backend allocates the official receipt atomically.
   getNextReceiptNo: () => "Assigned on save",
   addOnlinePayment: payment => mutate("online:" + payment.id, () => api.createOnlinePayment(payment)),
   approveOnlinePayment: (id, notes) => mutate("online:" + id, async () => { await api.approveOnlinePayment(id, notes); return true; }),
   rejectOnlinePayment: (id, notes) => mutate("online:" + id, async () => { await api.rejectOnlinePayment(id, notes); return true; }),
 };
 const blocked = !isPublic && (!ready || loading || (!data.currentUser && !data.currentCustomer) || (!!data.currentCustomer && pathname !== "/customerdashboard"));
 return <DataContext.Provider value={value}>
   {error && <div role="alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] max-w-xl w-[calc(100%-2rem)] rounded-xl bg-red-50 border border-red-300 p-4 text-sm text-red-900 shadow-lg">{error}<button type="button" onClick={() => void refresh()} className="ml-3 underline font-semibold">Retry loading</button><button type="button" onClick={() => setError("")} className="ml-3" aria-label="Dismiss error">?</button></div>}
   {blocked ? <main className="p-12 text-center text-slate-600">{error ? "Unable to load your account. Use Retry loading above." : "Loading your account?"}</main> : children}
   {pending > 0 && <div className="fixed inset-0 z-[150] bg-slate-900/20 flex items-center justify-center" role="status" aria-live="polite"><div className="bg-white rounded-xl p-5 shadow-xl">Saving?</div></div>}
 </DataContext.Provider>;
}
export function useData(): DataContextValue { const context = useContext(DataContext); if (!context) throw new Error("useData requires DataProvider"); return context; }
export default DataProvider;
