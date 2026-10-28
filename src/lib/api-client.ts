import type { AuditLog, LoanNote, Customer, CustomerDocument, Loan, Payment, StaffUser, SystemSettings, OnlinePayment } from "@/types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api/backend").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function getToken() { return typeof window === "undefined" ? null : sessionStorage.getItem("psi_token"); }
export function clearSession() {
  sessionStorage.removeItem("psi_token"); sessionStorage.removeItem("psi_session_kind"); sessionStorage.removeItem("customerSessionId");
  for (const key of ["staff_token", "psi_active_staff_id", "psi_user_role", "psi_logged_staff_name"]) localStorage.removeItem(key);
  window.dispatchEvent(new Event("psi-session"));
}
export function saveSession(token: string, kind: "staff" | "customer") {
  clearSession(); sessionStorage.setItem("psi_token", token); sessionStorage.setItem("psi_session_kind", kind);
  window.dispatchEvent(new Event("psi-session"));
}
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, { method, cache: "no-store", headers: {
      "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  } catch { throw new ApiError("Cannot reach the backend. Check that the API server is running.", 0); }
  const text = await response.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    if (response.status === 401 && token && !path.endsWith("/login")) clearSession();
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Request failed (" + response.status + ")";
    throw new ApiError(message, response.status);
  }
  return data as T;
}
const id = encodeURIComponent;
const query = (values: Record<string, string | undefined>) => {
  const params = new URLSearchParams(); for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params.size ? "?" + params : "";
};
export interface PortalSnapshot { customer: Customer; loans: Loan[]; payments: Payment[]; onlinePayments: OnlinePayment[]; settings: SystemSettings }
export const api = {
  login: (email: string, password: string) => request<{token: string; user: StaffUser}>("/auth/login", "POST", {email, password}),
  customerLogin: (identifier: string, password: string) => request<{token: string; customer: Customer}>("/portal/login", "POST", {identifier, password}),
  register: (body: {name: string; username: string; email: string; password: string}) => request<Customer>("/portal/register", "POST", body),
  getMe: () => request<StaffUser>("/auth/me"),
  getPortal: () => request<PortalSnapshot>("/portal/me"),
  getCustomers: () => request<Customer[]>("/customers"),
  getCustomer: (customerId: string) => request<Customer>("/customers/" + id(customerId)),
  lookupCustomer: (value: string) => request<Customer>("/customers/lookup" + query({query: value})),
  createCustomer: (body: Partial<Customer>) => request<Customer>("/customers", "POST", body),
  updateCustomer: (customerId: string, body: Partial<Customer>) => request<Customer>("/customers/" + id(customerId), "PUT", body),
  deleteCustomer: (customerId: string) => request("/customers/" + id(customerId), "DELETE"),
  addDocument: (doc: CustomerDocument) => request<CustomerDocument>("/customers/" + id(doc.customerId) + "/documents", "POST", doc),
  deleteDocument: (customerId: string, documentId: string) => request("/customers/" + id(customerId) + "/documents/" + id(documentId), "DELETE"),
  getLoanNotes: () => request<Record<string, LoanNote>>("/loan-notes"),
  saveLoanNote: (loanId: string, promiseDate: string, note: string) => request<LoanNote>("/loans/" + id(loanId) + "/note", "PUT", {promiseDate, note}),
  deleteLoan: (loanId: string) => request("/loans/" + id(loanId), "DELETE"),
  getLoans: (customerId?: string) => request<Loan[]>("/loans" + query({customerId})),
  getLoan: (loanId: string) => request<Loan>("/loans/" + id(loanId)),
  createLoan: (body: Partial<Loan>) => request<Loan>("/loans", "POST", body),
  updateLoanStatus: (loanId: string, status: string, notes?: string) => request<Loan>("/loans/" + id(loanId) + "/status", "PATCH", {status, notes}),
  getPayments: (loanId?: string, customerId?: string) => request<Payment[]>("/payments" + query({loanId, customerId})),
  recordPayment: (body: Partial<Payment>) => request<Payment>("/payments", "POST", body),
  updatePayment: (paymentId: string, body: Partial<Payment>) => request<Payment>("/payments/" + id(paymentId), "PUT", body),
  deletePayment: (paymentId: string) => request("/payments/" + id(paymentId), "DELETE"),
  getSettings: () => request<SystemSettings>("/settings"),
  updateSettings: (body: Partial<SystemSettings>) => request<SystemSettings>("/settings", "PUT", body),
  getUsers: () => request<StaffUser[]>("/users"),
  createUser: (body: StaffUser) => request<StaffUser>("/users", "POST", body),
  updateUser: (userId: string, body: Partial<StaffUser>) => request<StaffUser>("/users/" + id(userId), "PUT", body),
  getAuditLogs: () => request<AuditLog[]>("/audit-logs?limit=1000"),
  getOnlinePayments: (loanId?: string, customerId?: string) => request<OnlinePayment[]>("/online-payments" + query({loanId, customerId})),
  createOnlinePayment: (body: Partial<OnlinePayment>) => request<OnlinePayment>((sessionStorage.getItem("psi_session_kind") === "customer" ? "/portal" : "") + "/online-payments", "POST", body),
  approveOnlinePayment: (paymentId: string, notes?: string) => request("/online-payments/" + id(paymentId) + "/approve", "PATCH", {notes}),
  rejectOnlinePayment: (paymentId: string, notes?: string) => request("/online-payments/" + id(paymentId) + "/reject", "PATCH", {notes}),
};
