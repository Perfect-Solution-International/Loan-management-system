"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, AlertCircle } from "lucide-react";
import {
  billingApi,
  billingDate,
  downloadReceipt,
  money,
  type SubscriptionPayment,
} from "@/lib/billing-api";
import { useData } from "@/providers/data-provider";

export function PaymentResult({
  paymentId,
  testCheckout = false,
}: {
  paymentId: string;
  testCheckout?: boolean;
}) {
  const { currentUser, refresh } = useData();
  const router = useRouter();
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [testEnabled, setTestEnabled] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const p = await billingApi.payment(paymentId);
    setPayment(p);
    setError("");
    if (p.status !== "pending")
      sessionStorage.removeItem(
        `psi-billing-checkout:${p.organizationId}:${p.planId}`,
      );
    if (testCheckout) {
      const s = await billingApi.subscription();
      setTestEnabled(s.testMode);
    }
    return p;
  }, [paymentId, testCheckout]);
  useEffect(() => {
    if (!paymentId || currentUser?.role !== "Admin") return;
    let live = true;
    const reload = () => {
      if (live)
        void load().catch((e) => {
          if (live) setError(e.message);
        });
    };
    reload();
    const timer = window.setInterval(reload, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [paymentId, currentUser?.role, load]);
  async function complete(status: string) {
    setBusy(true);
    try {
      const p = await billingApi.testComplete(paymentId, status);
      await refresh();
      router.replace(
        `/dashboard/billing/${p.status === "succeeded" ? "success" : p.status === "failed" ? "failed" : "canceled"}?payment=${encodeURIComponent(p.id)}`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete payment test",
      );
    } finally {
      setBusy(false);
    }
  }
  const title = !payment
    ? "Checking payment"
    : payment.status === "succeeded"
      ? "Payment verified"
      : payment.status === "failed"
        ? "Payment failed"
        : payment.status === "canceled"
          ? "Payment canceled"
          : "Awaiting payment confirmation";
  const Icon =
    payment?.status === "succeeded"
      ? CheckCircle2
      : payment?.status === "pending"
        ? Clock3
        : AlertCircle;
  return (
    <main className="page-container">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <Icon
          size={36}
          className={
            payment?.status === "succeeded"
              ? "text-emerald-600"
              : "text-red-600"
          }
        />
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        {!paymentId && (
          <p role="alert" className="mt-4 text-red-800">
            No payment reference was provided. Open billing history to select
            your payment.
          </p>
        )}
        {currentUser?.role !== "Admin" && (
          <p className="mt-4">Organization administrator access required.</p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {payment && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              {payment.status === "succeeded"
                ? "The backend verified this payment and recorded the purchased billing period."
                : payment.status === "pending"
                  ? "We have not received verified payment confirmation. This screen checks the backend automatically; arriving here does not activate a subscription."
                  : "This attempt did not activate a subscription. You can return to billing to start a new checkout."}
            </p>
            {payment.provider === "test" && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Development test payment. No real money was charged.
              </p>
            )}
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              {[
                [
                  "Amount",
                  money(
                    payment.amountMinor,
                    payment.currency,
                    payment.currencyExponent,
                  ),
                ],
                ["Status", payment.status],
                ["Payment date", billingDate(payment.paymentDate)],
                ["Period end", billingDate(payment.periodEnd)],
                [
                  "Transaction",
                  payment.providerTransactionId || "Awaiting provider",
                ],
                ["Payment reference", payment.id],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 break-all font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {testCheckout && testEnabled && payment.status === "pending" && (
              <section className="mt-7 border-t border-slate-200 pt-5">
                <h2 className="font-semibold">Simulate a provider outcome</h2>
                <p className="mt-2 text-xs text-slate-500">
                  Available only on the explicitly configured development test
                  adapter.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    ["succeeded", "Test successful payment"],
                    ["failed", "Test failed payment"],
                    ["canceled", "Cancel test checkout"],
                  ].map(([status, label]) => (
                    <button
                      key={status}
                      disabled={busy}
                      onClick={() => void complete(status)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${status === "succeeded" ? "btn btn-primary" : "border-slate-300"}`}
                    >
                      {busy ? "Processing…" : label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {payment.status === "succeeded" && (
              <button
                onClick={() =>
                  void downloadReceipt(payment.id).catch((e) =>
                    setError(e.message),
                  )
                }
                className="btn btn-primary mt-6 rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Download verified receipt
              </button>
            )}
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-red-700">
          <Link href="/dashboard/billing">Return to billing</Link>
          <button
            disabled={!paymentId || busy}
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            Refresh status
          </button>
        </div>
      </div>
    </main>
  );
}
