import { request } from "@/lib/api-client";

export interface SubscriptionPlan {
 id: string; name: string; billingInterval: "trial" | "month" | "year";
 amountMinor: number | null; currency: string | null; currencyExponent: number;
 trialDuration: number; active: boolean; yearlyDiscountPercent: number | null;
}
export interface Subscription {
 id: string; organizationId: string; planId: string | null;
 status: "trialing" | "active" | "past_due" | "expired" | "canceled" | "suspended";
 trialStart: string | null; trialEnd: string | null; currentPeriodStart: string | null;
 currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; canceledAt: string | null;
}
export interface SubscriptionPayment {
 id: string; organizationId: string; subscriptionId: string; planId: string;
 amountMinor: number; currency: string; currencyExponent: number; billingInterval: "month" | "year";
 provider: string; providerSessionId: string | null; providerTransactionId: string | null;
 status: "pending" | "succeeded" | "failed" | "canceled"; checkoutUrl: string | null;
 paymentDate: string | null; receiptReference: string | null; periodStart: string | null; periodEnd: string | null; createdAt: string;
}
export interface SubscriptionSnapshot {
 subscription: Subscription; plan: SubscriptionPlan | null; serverTime: string;
 trialDaysRemaining: number; canCreate: boolean; legacyAccessUntil: string | null;
 organizationName: string; organizationStatus: string; paymentsEnabled: boolean; testMode: boolean; recurring: boolean;
}
export interface BillingNotification { id: string; eventType: string; message: string; createdAt: string }
export interface PlansResponse { plans: SubscriptionPlan[]; paymentsEnabled: boolean; testMode: boolean; recurring: boolean }
export interface OrganizationRegistration { organizationName: string; adminName: string; email: string; phone: string; password: string; confirmPassword: string }
export interface OrganizationSummary { id: string; name: string; email: string; phone: string; ownerId: string | null; registeredAt: string; status: string; subscriptionId: string; subscriptionStatus: string; trialStart: string | null; trialEnd: string | null }
const paymentPath = (id: string) => "/billing/payments/" + encodeURIComponent(id);
export const billingApi = {
 plans: () => request<PlansResponse>("/billing/plans", "GET", undefined, null),
 register: (body: OrganizationRegistration) => request<{token: string; organizationId: string; userId: string}>("/organizations/register", "POST", body, null),
 subscription: () => request<SubscriptionSnapshot>("/billing/subscription"),
 payments: (offset = 0) => request<SubscriptionPayment[]>("/billing/payments?offset=" + offset),
 payment: (id: string) => request<SubscriptionPayment>(paymentPath(id)),
 checkout: (planId: string, idempotencyKey: string, renew = false) => request<SubscriptionPayment>(renew ? "/billing/renew" : "/billing/checkout", "POST", {planId, idempotencyKey}),
 cancel: () => request<SubscriptionSnapshot>("/billing/cancel", "POST", {}),
 receipt: (id: string) => request<{receiptReference: string; payment: SubscriptionPayment; issuedBy: string; testReceipt: boolean}>(paymentPath(id) + "/receipt"),
 notifications: () => request<BillingNotification[]>("/billing/notifications"),
 testComplete: (id: string, status: string) => request<SubscriptionPayment>(paymentPath(id) + "/test-complete", "POST", {status}),
};
export function money(amount: number | null, currency: string | null, exponent = 2) {
 if (amount === null || !currency) return "Contact us for pricing";
 return new Intl.NumberFormat("en", {style: "currency", currency, minimumFractionDigits: exponent, maximumFractionDigits: exponent}).format(amount / 10 ** exponent);
}
export function billingDate(date: string | null) {
 return date ? new Intl.DateTimeFormat("en", {dateStyle: "medium", timeStyle: "short", timeZone: "UTC"}).format(new Date(date)) + " UTC" : "—";
}
export async function downloadReceipt(id: string) {
 const receipt = await billingApi.receipt(id);
 const p = receipt.payment;
 const text = [receipt.testReceipt ? "DEVELOPMENT TEST RECEIPT — NO REAL PAYMENT" : "PSI One subscription payment receipt", receipt.receiptReference,
  "Organization: " + p.organizationId, "Payment date: " + billingDate(p.paymentDate), "Amount: " + money(p.amountMinor, p.currency, p.currencyExponent),
  "Period: " + billingDate(p.periodStart) + " to " + billingDate(p.periodEnd), "Provider: " + p.provider, "Transaction: " + p.providerTransactionId, "Status: verified payment"].join("\n");
 const url = URL.createObjectURL(new Blob([text], {type: "text/plain;charset=utf-8"}));
 const a = document.createElement("a"); a.href = url; a.download = receipt.receiptReference + ".txt"; a.click(); URL.revokeObjectURL(url);
}
const platformToken = () => sessionStorage.getItem("psi_platform_token");
export const platformApi = {
 setOrganizationStatus: (id: string, status: "active" | "suspended") => request("/platform/organizations/" + encodeURIComponent(id) + "/status", "PATCH", {status}, platformToken()),
 login: (email: string, password: string) => request<{token: string}>("/platform/login", "POST", {email, password}, null),
 plans: () => request<SubscriptionPlan[]>("/platform/plans", "GET", undefined, platformToken()),
 savePlan: (plan: SubscriptionPlan) => request<SubscriptionPlan>("/platform/plans/" + encodeURIComponent(plan.id), "PUT", plan, platformToken()),
 organizations: (offset = 0) => request<OrganizationSummary[]>("/platform/organizations?offset=" + offset, "GET", undefined, platformToken()),
};
