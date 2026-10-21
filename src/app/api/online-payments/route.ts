import { NextResponse } from "next/server";
import type { OnlinePayment } from "@/types";
import { initialOnlinePayments } from "@/lib/demo-data";

// In-memory server-side storage for online payments during runtime
let serverOnlinePayments: OnlinePayment[] = [...(initialOnlinePayments || [])];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get("loanId");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    let filtered = serverOnlinePayments;

    if (loanId) {
      filtered = filtered.filter((p) => p.loanId === loanId);
    }
    if (customerId) {
      filtered = filtered.filter((p) => p.customerId === customerId);
    }
    if (status) {
      filtered = filtered.filter((p) => p.status.toUpperCase() === status.toUpperCase());
    }

    return NextResponse.json(filtered);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch online payments", details: err?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.loanId || !body.customerId || !body.amount) {
      return NextResponse.json(
        { error: "Missing required fields: loanId, customerId, amount" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const generatedId =
      body.id || `SLIP-${Date.now().toString().slice(-6)}`;

    const newPayment: OnlinePayment = {
      id: generatedId,
      loanId: String(body.loanId),
      loanNo: body.loanNo || String(body.loanId),
      customerId: String(body.customerId),
      customerName: body.customerName || "Customer",
      customerPhone: body.customerPhone || "",
      customerNic: body.customerNic || "",
      amount: Number(body.amount),
      paymentDate: body.paymentDate || new Date().toISOString().slice(0, 10),
      submittedAt: body.submittedAt || new Date().toISOString(),
      bankName: body.bankName || "Commercial Bank",
      referenceNumber: body.referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      slipUrl: body.slipUrl || "",
      slipFileName: body.slipFileName || "bank_deposit_slip.jpg",
      slipFileType: body.slipFileType || "image/jpeg",
      status: "PENDING",
      notes: body.notes || "",
      paymentMethod: body.paymentMethod || "BANK_SLIP",
    };

    // Prepend to server payments list
    serverOnlinePayments = [
      newPayment,
      ...serverOnlinePayments.filter((p) => p.id !== newPayment.id),
    ];

    return NextResponse.json(newPayment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to submit online payment", details: err?.message },
      { status: 500 }
    );
  }
}

