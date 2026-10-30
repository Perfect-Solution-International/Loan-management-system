"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PlanCards } from "@/components/billing/plan-cards";
import { billingApi, type PlansResponse } from "@/lib/billing-api";

export default function PricingPage() {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    billingApi
      .plans()
      .then((p) => {
        if (live) setData(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-5">
          <BrandLogo href="/pricing" size="md" theme="light" />
          <Link href="/login" className="text-sm font-semibold text-red-700">
            Sign in
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-700">
            PSI ONE FOR LENDING ORGANIZATIONS
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            One workspace for your lending business.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Start with a 7-day free trial. Continue with a monthly or yearly
            subscription. Your borrowers use the customer portal through your
            organization.
          </p>
        </div>
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
            {error}{" "}
            <button
              onClick={() => window.location.reload()}
              className="underline"
            >
              Try again
            </button>
          </p>
        ) : data ? (
          <PlanCards data={data} />
        ) : (
          <p role="status">Loading subscription plans…</p>
        )}
        <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="p-5 text-left text-lg font-semibold">
              Compare subscription options
            </caption>
            <thead className="bg-slate-50">
              <tr>
                {["Included", "Free Trial", "Monthly", "Yearly"].map((t) => (
                  <th key={t} className="p-4">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Access period",
                  "7 days",
                  "1 calendar month",
                  "12 calendar months",
                ],
                ["Authorized LMS features", "Included", "Included", "Included"],
                ["Customer portal", "Included", "Included", "Included"],
                [
                  "Payment required",
                  "No",
                  "Verified payment",
                  "Verified payment",
                ],
                ["Data retained after expiration", "Yes", "Yes", "Yes"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-slate-100">
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="p-4 font-medium">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className="p-4 text-slate-600">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
