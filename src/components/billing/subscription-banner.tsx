"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  billingApi,
  billingDate,
  type SubscriptionSnapshot,
} from "@/lib/billing-api";

export function SubscriptionBanner({ enabled }: { enabled: boolean }) {
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () =>
      billingApi
        .subscription()
        .then((s) => {
          if (live) {
            setSnapshot(s);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    void load();
    const timer = window.setInterval(load, 60000);
    window.addEventListener("focus", load);
    window.addEventListener("psi-subscription-updated", load);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      window.removeEventListener("psi-subscription-updated", load);
    };
  }, [enabled]);
  if (!enabled) return null;
  if (error)
    return (
      <div
        role="status"
        className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900"
      >
        Unable to check subscription status.{" "}
        <Link href="/dashboard/billing" className="font-semibold underline">
          Open billing
        </Link>
      </div>
    );
  if (!snapshot) return null;
  const s = snapshot.subscription;
  const legacy =
    snapshot.legacyAccessUntil &&
    new Date(snapshot.serverTime) < new Date(snapshot.legacyAccessUntil);
  if (
    s.status === "active" &&
    !s.cancelAtPeriodEnd &&
    s.currentPeriodEnd &&
    new Date(s.currentPeriodEnd).getTime() -
      new Date(snapshot.serverTime).getTime() >
      7 * 86400000
  )
    return null;
  const message = legacy
    ? `Your existing portfolio has migration access until ${billingDate(snapshot.legacyAccessUntil)}.`
    : s.status === "trialing"
      ? `Your free trial ends in ${snapshot.trialDaysRemaining} day${snapshot.trialDaysRemaining === 1 ? "" : "s"}. Ends ${billingDate(s.trialEnd)}.`
      : !snapshot.canCreate
        ? "Your subscription requires renewal. Existing records and repayment recording remain available."
        : `Your subscription ${s.cancelAtPeriodEnd ? "ends" : "renews"} on ${billingDate(s.currentPeriodEnd)}.`;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm sm:px-6 ${snapshot.canCreate ? "border-slate-200 bg-white text-slate-700" : "border-amber-200 bg-amber-50 text-amber-900"}`}
    >
      <p>{message}</p>
      <Link
        href="/dashboard/billing"
        className="shrink-0 font-semibold text-red-700 underline"
      >
        Manage subscription
      </Link>
    </div>
  );
}
