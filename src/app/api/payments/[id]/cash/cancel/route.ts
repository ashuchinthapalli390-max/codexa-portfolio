import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/cash/cancel
 * Intern can cancel their own pending Cash payment request.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    if (payment.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only cancel your own cash payment request." },
        { status: 403 }
      );
    }

    if (payment.cashStatus === "CASH_RECEIVED" || payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        { error: "Cannot cancel. Cash payment has already been confirmed and received." },
        { status: 400 }
      );
    }

    if (payment.cashStatus !== "PENDING_CASH_APPROVAL") {
      return NextResponse.json(
        { error: "No pending cash payment request to cancel." },
        { status: 400 }
      );
    }

    const updated = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        cashStatus: "CASH_CANCELLED",
        paymentMethod: null,
      },
    });

    await logPaymentAudit({
      action: "CASH_PAYMENT_CANCELLED",
      actorId: user.id,
      actorName: user.displayName || user.username || "Intern",
      targetId: payment.id,
      details: {
        referenceId: payment.referenceId,
        cancelledAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cash payment request cancelled successfully.",
      payment: updated,
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/cash/cancel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel cash payment request" },
      { status: 500 }
    );
  }
}
