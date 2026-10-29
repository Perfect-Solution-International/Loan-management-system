"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useData } from "@/providers/data-provider";
import { PaymentHistory } from "@/components/billing/payment-history";
import { billingApi, type SubscriptionPayment } from "@/lib/billing-api";

export default function BillingHistoryPage() {
 const {currentUser} = useData(); const [payments, setPayments] = useState<SubscriptionPayment[] | null>(null); const [error, setError] = useState("");
 const [offset, setOffset] = useState(0);
 useEffect(() => {if (currentUser?.role !== "Admin") return; let live = true; billingApi.payments(offset).then(p => {if (live) {setPayments(p);setError("");}}).catch(e => {if (live) setError(e.message);}); return () => {live = false;};}, [currentUser?.role, offset]);
 return <main className="page-container space-y-6"><Link href="/dashboard/billing" className="text-sm font-semibold text-red-700">← Back to billing</Link><h1 className="text-2xl font-semibold">Billing history</h1>{currentUser?.role !== "Admin" ? <p>Organization administrator access required.</p> : <>{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{payments ? <><PaymentHistory payments={payments} onError={setError} /><div className="flex justify-between"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset-100))} className="text-sm font-semibold text-red-700 disabled:opacity-40">Previous</button><button disabled={payments.length < 100} onClick={() => setOffset(offset+100)} className="text-sm font-semibold text-red-700 disabled:opacity-40">Next</button></div></> : !error && <p role="status">Loading billing history…</p>}</>}</main>;
}
