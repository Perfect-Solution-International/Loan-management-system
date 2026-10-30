import { PaymentResult } from "@/components/billing/payment-result";

export default async function Page({searchParams}: {searchParams: Promise<{payment?: string}>}) {
 return <PaymentResult paymentId={(await searchParams).payment || ""} testCheckout />;
}
