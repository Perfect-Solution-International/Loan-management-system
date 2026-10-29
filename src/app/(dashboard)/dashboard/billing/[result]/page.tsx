import { notFound } from "next/navigation";
import { PaymentResult } from "@/components/billing/payment-result";

export default async function Page({params, searchParams}: {params: Promise<{result: string}>; searchParams: Promise<{payment?: string}>}) {
 const {result} = await params;
 if (!["success", "failed", "canceled"].includes(result)) notFound();
 return <PaymentResult paymentId={(await searchParams).payment || ""} />;
}
