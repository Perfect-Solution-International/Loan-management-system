"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import {
  billingDate,
  downloadReceipt,
  money,
  type SubscriptionPayment,
} from "@/lib/billing-api";

export function PaymentHistory({
  payments,
  onError,
}: {
  payments: SubscriptionPayment[];
  onError: (message: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[850px] text-left text-sm">
        <caption className="p-5 text-left text-lg font-semibold">
          Subscription payment history
        </caption>
        <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {[
              "Payment date",
              "Billing period",
              "Transaction",
              "Amount",
              "Status",
              "Receipt",
            ].map((text) => (
              <th key={text} className="p-4">
                {text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="p-4">
                {billingDate(p.paymentDate || p.createdAt)}
              </td>
              <td className="p-4 text-xs text-slate-600">
                {p.periodStart ? (
                  <>
                    {billingDate(p.periodStart)}
                    <br />
                    to {billingDate(p.periodEnd)}
                  </>
                ) : (
                  "Pending verification"
                )}
              </td>
              <td className="max-w-[180px] break-all p-4 text-xs">
                <Link
                  className="text-red-700 underline"
                  href={`/dashboard/billing/success?payment=${encodeURIComponent(p.id)}`}
                >
                  {p.providerTransactionId || p.id}
                </Link>
                {p.provider === "test" && (
                  <span className="mt-1 block font-semibold text-amber-700">
                    Development test
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap p-4 font-medium">
                {money(p.amountMinor, p.currency, p.currencyExponent)}
              </td>
              <td className="p-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "succeeded" ? "bg-emerald-50 text-emerald-800" : p.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}
                >
                  {p.status}
                </span>
              </td>
              <td className="p-4">
                {p.status === "succeeded" ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-red-700"
                    onClick={() =>
                      void downloadReceipt(p.id).catch((e) =>
                        onError(e.message),
                      )
                    }
                  >
                    <Download size={15} /> Download
                  </button>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
          {!payments.length && (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-500">
                No subscription payments yet. Borrower loan repayments are
                recorded separately.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
