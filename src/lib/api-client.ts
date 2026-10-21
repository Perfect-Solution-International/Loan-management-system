import type { Customer, Loan, Payment, StaffUser, SystemSettings, OnlinePayment } from "@/types";

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

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(customer),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteCustomer(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
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

  async updatePayment(id: string, payment: Partial<Payment>): Promise<Payment> {
    const res = await fetch(`${API_BASE_URL}/payments/${id}`, {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deletePayment(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/payments/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
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

  // Online Payments
  async getOnlinePayments(loanId?: string, customerId?: string): Promise<OnlinePayment[]> {
    let url = `/api/online-payments`;
    const params = new URLSearchParams();
    if (loanId) params.append("loanId", loanId);
    if (customerId) params.append("customerId", customerId);
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const res = await fetch(url, { headers: getAuthHeader() });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    return [];
  },

  async createOnlinePayment(payment: Partial<OnlinePayment>): Promise<OnlinePayment> {
    const res = await fetch(`/api/online-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async approveOnlinePayment(id: string, notes?: string, reviewer?: string, receiptNo?: string) {
    const res = await fetch(`/api/online-payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE", notes, reviewer, receiptNo }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async rejectOnlinePayment(id: string, notes?: string, reviewer?: string) {
    const res = await fetch(`/api/online-payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECT", notes, reviewer }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

