"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, History } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { LoadingState, Modal } from "@/components/ui";
import { PlanCards } from "@/components/billing/plan-cards";
import { CheckoutDetails } from "@/components/billing/checkout-details";
import { PaymentHistory } from "@/components/billing/payment-history";
import { ApiError } from "@/lib/api-client";
import { billingApi, billingDate, money, type SubscriptionSnapshot, type PlansResponse, type SubscriptionPayment, type SubscriptionPlan, type BillingNotification } from "@/lib/billing-api";

export default function BillingPage() {
 const router = useRouter();
 const {currentUser} = useData();
 const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
 const [plans, setPlans] = useState<PlansResponse | null>(null); const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
 const [notifications, setNotifications] = useState<BillingNotification[]>([]);
 const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
 const checkoutInProgress = useRef(false);
 const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [cancelOpen, setCancelOpen] = useState(false);
 const load = useCallback(async () => {
  const [s,p,h,n] = await Promise.all([billingApi.subscription(), billingApi.plans(), billingApi.payments(), billingApi.notifications()]);
  setSnapshot(s); setPlans(p); setPayments(h); setNotifications(n); setError("");
 }, []);
 useEffect(() => {if (currentUser?.role !== "Admin") return; let live = true; const reload = () => {if (live) void load().catch(e => {if (live) setError(e.message);});}; reload(); const timer = window.setInterval(reload, 60000); window.addEventListener("focus", reload); return () => {live = false; clearInterval(timer); window.removeEventListener("focus", reload);};}, [currentUser?.role, load]);
 async function checkout(plan: SubscriptionPlan, contactSaved = false) {
  if (busy || checkoutInProgress.current || !snapshot || !plans) return;
  checkoutInProgress.current = true; setBusy(true); setError("");
  try {
   if (!plans.paymentsEnabled) throw new Error(plans.configError || "Online checkout is currently unavailable.");
   if (!contactSaved) {
    const contact = await billingApi.contact();
    try { await billingApi.saveContact(contact); }
    catch (e) {
     if (e instanceof ApiError && e.status === 400) { setCheckoutPlan(plan); return; }
     throw e;
    }
   }
   const keyName = `psi-billing-checkout:${snapshot.subscription.organizationId}:${plan.id}`;
   let key = sessionStorage.getItem(keyName); if (!key) {key = crypto.randomUUID(); sessionStorage.setItem(keyName, key);}
   const payment = await billingApi.checkout(plan.id, key, snapshot.subscription.status !== "trialing");
   if (payment.status !== "pending") {sessionStorage.removeItem(keyName); router.push(`/dashboard/billing/${payment.status === "succeeded" ? "success" : payment.status}?payment=${encodeURIComponent(payment.id)}`); return;}
   if (!payment.checkoutUrl) throw new Error("OnePay could not open card checkout. Contact support to check this attempt before trying another payment.");
   const url = new URL(payment.checkoutUrl, window.location.origin);
   if (url.protocol !== "https:" && !(snapshot.testMode && url.origin === window.location.origin && url.pathname === "/dashboard/billing/test-checkout")) throw new Error("The payment provider returned an unsupported checkout URL. Contact support.");
   window.location.assign(url.href);
  } catch (e) {setError(e instanceof Error ? e.message : "Unable to start checkout"); if (contactSaved) throw e;}
  finally { checkoutInProgress.current = false; setBusy(false); }
 }
 async function cancel() {setBusy(true); try {await billingApi.cancel(); setCancelOpen(false); await load();} catch(e) {setError(e instanceof Error ? e.message : "Cancellation failed");} finally {setBusy(false);}}
 if (currentUser?.role !== "Admin") return <main className="page-container"><h1 className="text-xl font-semibold">Organization administrator access required</h1><p className="mt-3 text-slate-600">Contact your organization administrator to manage its subscription.</p></main>;
 if (!snapshot || !plans) return error ? <main className="page-container"><p role="alert">{error}</p><button className="mt-3 text-red-700 underline" onClick={() => void load().catch(e => setError(e.message))}>Retry loading billing</button></main> : <LoadingState label="Loading organization billing…" />;
 const s = snapshot.subscription;
 const currentPayment = payments.find(p => p.status === "succeeded" && p.planId === s.planId);
 const currentPrice = currentPayment ? money(currentPayment.amountMinor, currentPayment.currency, currentPayment.currencyExponent) : snapshot.plan?.billingInterval === "trial" ? "Free" : money(snapshot.plan?.amountMinor ?? null, snapshot.plan?.currency ?? null, snapshot.plan?.currencyExponent);
 return <main className="page-container space-y-7">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-red-700">ORGANIZATION SUBSCRIPTION</p><h1 className="mt-2 text-2xl font-semibold text-slate-900">Billing & subscription</h1><p className="mt-2 text-sm text-slate-500">{snapshot.organizationName}</p></div><Link href="/dashboard/billing/history" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"><History size={17} /> Billing history</Link></div>
  {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><CreditCard size={20} className="text-red-600" />{snapshot.plan?.name || "Choose a subscription"}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">{s.status.replace("_", " ")}</span></div>
   {s.status === "trialing" && <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4"><p className="font-semibold text-red-900">Your free trial ends in {snapshot.trialDaysRemaining} day{snapshot.trialDaysRemaining === 1 ? "" : "s"}.</p><p className="mt-1 text-sm text-red-800">Trial expiration: {billingDate(s.trialEnd)}</p></div>}
   {!snapshot.canCreate && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{s.status === "suspended" ? "Your subscription is suspended. Contact platform support." : "Your subscription requires renewal. Choose a plan to resume new lending."} Existing records, exports and repayment recordkeeping remain available.</p>}
   {snapshot.legacyAccessUntil && <p className="mt-4 text-sm text-slate-600">Existing portfolio migration access ends {billingDate(snapshot.legacyAccessUntil)}.</p>}
   <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2 xl:grid-cols-4">{[["Plan price", currentPrice], ["Current period start", billingDate(s.currentPeriodStart || s.trialStart)], ["Current period end", billingDate(s.currentPeriodEnd || s.trialEnd)], [s.cancelAtPeriodEnd ? "Access ends" : "Next renewal date", billingDate(s.currentPeriodEnd)]].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-800">{value}</dd></div>)}</dl>
   <p className="mt-5 text-xs text-slate-500">{snapshot.recurring ? "Recurring billing is enabled by the payment provider." : "Manual renewal: your payment method is not charged automatically. Renewal adds a calendar billing period after your current paid period."}</p>
   <p className="mt-2 break-all text-xs text-slate-500">Organization ID: {s.organizationId} · Billing timestamps: UTC</p>
   {!s.cancelAtPeriodEnd && s.status !== "expired" && s.status !== "canceled" && <button type="button" onClick={() => setCancelOpen(true)} className="mt-5 text-sm font-semibold text-red-700 underline">Cancel subscription</button>}
   {s.cancelAtPeriodEnd && <p className="mt-4 text-sm font-medium text-amber-800">Cancellation requested. Any existing paid access continues through its period end.</p>}
  </section>
  <section><h2 className="mb-5 text-lg font-semibold">Subscribe, renew or change your plan</h2><PlanCards data={plans} includeTrial={false} busy={busy} onSelect={plan => void checkout(plan)} /><p className="mt-3 text-sm text-slate-500">Subscribe to enter your card details on OnePay. Your subscription activates after payment is verified.</p></section>
  <PaymentHistory payments={payments} limit={5} onError={setError} />
  {!!notifications.length && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Billing updates</h2><ul className="mt-4 space-y-3">{notifications.slice(0,5).map(n => <li key={n.id} className="border-t border-slate-100 pt-3 text-sm"><p>{n.message}</p><p className="mt-1 text-xs text-slate-500">{billingDate(n.createdAt)}</p></li>)}</ul></section>}
  {checkoutPlan && <CheckoutDetails plan={checkoutPlan} paymentsEnabled={plans.paymentsEnabled} configError={plans.configError} onClose={() => !busy && setCheckoutPlan(null)} onCheckout={() => checkout(checkoutPlan, true)} />}
  {cancelOpen && <Modal title="Cancel organization subscription" onClose={() => !busy && setCancelOpen(false)}><div className="space-y-5 p-5"><p className="text-sm text-slate-600">Any paid access continues until the end of its billing period. Your records are retained. Canceling a trial ends new lending access immediately.</p><div className="flex flex-wrap justify-end gap-3"><button disabled={busy} onClick={() => setCancelOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Keep subscription</button><button disabled={busy} onClick={() => void cancel()} className="btn btn-primary rounded-xl px-4 py-2 text-sm">{busy ? "Canceling…" : "Confirm cancellation"}</button></div></div></Modal>}
 </main>;
}
