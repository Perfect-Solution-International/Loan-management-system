import { NextResponse } from "next/server";
import type { OnlinePayment } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, notes, reviewer, receiptNo } = body;

    if (!action || !["APPROVE", "REJECT"].includes(action.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid action. Must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    const reviewDate = new Date().toISOString().slice(0, 10);
    const reviewerName = reviewer || "Admin Officer";

    return NextResponse.json({
      success: true,
      id,
      status: action.toUpperCase() === "APPROVE" ? "COMPLETED" : "REJECTED",
      reviewedBy: reviewerName,
      reviewedAt: reviewDate,
      reviewNotes: notes || (action.toUpperCase() === "APPROVE" ? "Slip approved" : "Slip declined"),
      receiptNo: action.toUpperCase() === "APPROVE" ? receiptNo : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to process payment status update", details: err?.message },
      { status: 500 }
    );
  }
}

