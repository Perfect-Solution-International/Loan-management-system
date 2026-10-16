import type { Customer, Loan, Payment, StaffUser, SystemSettings } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function getAuthHeader(): HeadersInit {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("staff_token");
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
  }
  return { "Content-Type": "application/json" };
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getMe(): Promise<StaffUser> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async lookupCustomer(query: string): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers/lookup?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(customer),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Loans
  async getLoans(customerId?: string): Promise<Loan[]> {
    const url = customerId
      ? `${API_BASE_URL}/loans?customerId=${encodeURIComponent(customerId)}`
      : `${API_BASE_URL}/loans`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createLoan(loan: Partial<Loan>): Promise<Loan> {
    const res = await fetch(`${API_BASE_URL}/loans`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(loan),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateLoanStatus(loanId: string, status: string) {
    const res = await fetch(`${API_BASE_URL}/loans/${loanId}/status`, {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Payments
  async getPayments(loanId?: string, customerId?: string): Promise<Payment[]> {
    let url = `${API_BASE_URL}/payments`;
    if (loanId) url += `?loanId=${encodeURIComponent(loanId)}`;
    else if (customerId) url += `?customerId=${encodeURIComponent(customerId)}`;

    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async recordPayment(payment: Partial<Payment>): Promise<Payment> {
    const res = await fetch(`${API_BASE_URL}/payments`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE_URL}/settings`, { headers: getAuthHeader() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

