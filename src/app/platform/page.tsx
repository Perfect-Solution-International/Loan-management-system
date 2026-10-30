"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ApiError } from "@/lib/api-client";
import {
  billingDate,
  platformApi,
  type SubscriptionPlan,
  type OrganizationSummary,
} from "@/lib/billing-api";

export default function PlatformPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const load = useCallback(async () => {
    const [p, o] = await Promise.all([
      platformApi.plans(),
      platformApi.organizations(offset),
    ]);
    setPlans(p);
    setOrganizations(o);
  }, [offset]);
  useEffect(() => {
    if (!sessionStorage.getItem("psi_platform_token")) {
      router.replace("/platform/login");
      return;
    }
    void Promise.resolve()
      .then(load)
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          sessionStorage.removeItem("psi_platform_token");
          router.replace("/platform/login");
        } else setError(e.message);
      });
  }, [load, router]);
  async function save(plan: SubscriptionPlan) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await platformApi.savePlan(plan);
      setSaved(plan.name + " saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save plan");
    } finally {
      setBusy(false);
    }
  }
  function update(id: string, values: Partial<SubscriptionPlan>) {
    setPlans(plans.map((p) => (p.id === id ? { ...p, ...values } : p)));
  }
  async function setOrganizationStatus(o: OrganizationSummary) {
    setBusy(true);
    setError("");
    try {
      await platformApi.setOrganizationStatus(
        o.id,
        o.status === "active" ? "suspended" : "active",
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update organization",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white p-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo href="/platform" size="md" theme="light" />
          <button
            className="text-sm font-semibold text-red-700"
            onClick={() => {
              sessionStorage.removeItem("psi_platform_token");
              router.replace("/platform/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-7 p-5 py-10">
        <h1 className="text-2xl font-semibold">SaaS platform administration</h1>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-emerald-800">
            {saved}
          </p>
        )}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Subscription plans</h2>
          <p className="mb-5 text-sm text-slate-600">
            Set an explicit price and currency before publishing. Prices are
            stored in minor units; a currency exponent of 2 means 100 minor
            units = 1 currency unit. Changing pricing affects future checkouts.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {plans
              .filter((p) => p.billingInterval !== "trial")
              .map((p) => (
                <form
                  key={p.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(p);
                  }}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="font-semibold capitalize">
                    {p.billingInterval === "month" ? "Monthly" : "Yearly"}
                  </h3>
                  <label className="block text-sm">
                    Name
                    <input
                      required
                      value={p.name}
                      onChange={(e) => update(p.id, { name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                    />
                  </label>
                  <label className="block text-sm">
                    Price in minor units
                    <input
                      required
                      type="number"
                      min="1"
                      max="9000000000000"
                      step="1"
                      value={p.amountMinor ?? ""}
                      onChange={(e) =>
                        update(p.id, {
                          amountMinor:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      Currency
                      <input
                        required
                        pattern="[A-Z]{3}"
                        maxLength={3}
                        value={p.currency ?? ""}
                        placeholder="ISO code"
                        onChange={(e) =>
                          update(p.id, {
                            currency: e.target.value.toUpperCase(),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                      />
                    </label>
                    <label className="block text-sm">
                      Currency exponent
                      <input
                        type="number"
                        min="0"
                        max="3"
                        required
                        value={p.currencyExponent}
                        onChange={(e) =>
                          update(p.id, {
                            currencyExponent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                      />
                    </label>
                  </div>
                  {p.billingInterval === "year" && (
                    <label className="block text-sm">
                      Explicit yearly discount % (optional)
                      <input
                        type="number"
                        min="0.01"
                        max="99.99"
                        step="0.01"
                        value={p.yearlyDiscountPercent ?? ""}
                        onChange={(e) =>
                          update(p.id, {
                            yearlyDiscountPercent:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                      />
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) =>
                        update(p.id, { active: e.target.checked })
                      }
                    />{" "}
                    Publish plan
                  </label>
                  <button
                    disabled={busy}
                    className="btn btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {busy ? "Saving…" : "Save plan"}
                  </button>
                </form>
              ))}
          </div>
        </section>
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[750px] text-left text-sm">
            <caption className="p-5 text-left text-lg font-semibold">
              Organizations & subscriptions
            </caption>
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Organization",
                  "Owner / contact",
                  "Subscription",
                  "Trial ends",
                  "Registered",
                ].map((t) => (
                  <th key={t} className="p-4">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="p-4 font-medium">
                    {o.name}
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {o.id}
                    </span>
                  </td>
                  <td className="p-4">
                    {o.email || "Owner assignment required"}
                    <span className="block text-xs text-slate-500">
                      {o.phone}
                    </span>
                  </td>
                  <td className="p-4">
                    {o.status === "suspended"
                      ? "suspended"
                      : o.subscriptionStatus}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setOrganizationStatus(o)}
                      className="mt-2 block text-xs font-semibold text-red-700 underline disabled:opacity-50"
                    >
                      {o.status === "active"
                        ? "Suspend new lending"
                        : "Restore account"}
                    </button>
                  </td>
                  <td className="p-4">{billingDate(o.trialEnd)}</td>
                  <td className="p-4">{billingDate(o.registeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-slate-100 p-4">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 100))}
              className="text-sm text-red-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={organizations.length < 100}
              onClick={() => setOffset(offset + 100)}
              className="text-sm text-red-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
