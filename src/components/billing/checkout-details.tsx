"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui";
import {
  billingApi,
  money,
  type BillingContact,
  type SubscriptionPlan,
} from "@/lib/billing-api";

export function CheckoutDetails({
  plan,
  paymentsEnabled,
  configError,
  onClose,
  onCheckout,
}: {
  plan: SubscriptionPlan;
  paymentsEnabled: boolean;
  configError?: string | null;
  onClose: () => void;
  onCheckout: () => Promise<void>;
}) {
  const [contact, setContact] = useState<BillingContact>({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let live = true;
    billingApi
      .contact()
      .then((c) => {
        if (live) setContact(c);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function save(continueToPayment: boolean) {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const c = await billingApi.saveContact(contact);
      setContact(c);
      setSaved(true);
      if (continueToPayment) await onCheckout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to prepare payment");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Subscription checkout" onClose={() => !busy && onClose()}>
      <form
        className="space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (paymentsEnabled) void save(true);
        }}
      >
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="font-semibold text-slate-900">{plan.name}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {money(plan.amountMinor, plan.currency, plan.currencyExponent)}{" "}
            <span className="text-sm font-normal">
              per {plan.billingInterval === "year" ? "year" : "month"} /
              organization
            </span>
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Confirm your billing details, then enter your card details on OnePay’s
          secure payment page.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-sm text-emerald-700">
            Billing details saved.
          </p>
        )}
        <fieldset
          disabled={busy || loading}
          className="space-y-4 disabled:opacity-60"
        >
          {(
            [
              ["name", "Billing name", "text", "name"],
              ["email", "Billing email", "email", "email"],
              ["phone", "Phone number", "tel", "tel"],
            ] as const
          ).map(([key, label, type, autoComplete]) => (
            <label
              key={key}
              className="block text-sm font-medium text-slate-700"
            >
              {label}
              <input
                required
                type={type}
                autoComplete={autoComplete}
                maxLength={key === "name" ? 200 : key === "email" ? 254 : 30}
                value={contact[key]}
                onChange={(e) => {
                  setContact({ ...contact, [key]: e.target.value });
                  setSaved(false);
                }}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </label>
          ))}
          <p className="text-xs text-slate-500">
            Use an international phone number, for example +94771234567.
          </p>
        </fieldset>
        {!paymentsEnabled && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {configError ||
              "Online checkout is currently unavailable. You can save your billing details."}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void save(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Save billing details
          </button>
          <button
            type="submit"
            disabled={busy || loading || !paymentsEnabled}
            className="btn btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading
              ? "Loading details…"
              : busy
                ? "Preparing checkout…"
                : "Continue to OnePay"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
