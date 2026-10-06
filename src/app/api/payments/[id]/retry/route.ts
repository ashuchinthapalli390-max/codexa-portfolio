import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/retry
 * Resets failed/expired payment sessions to allow starting a new 5-minute attempt.
 * Does not overwrite old attempts (preserving full audit history).
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
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    if (payment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        { error: "Payment has already succeeded. Retrying is not permitted." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Expire any pending attempts
    await db.paymentAttempt.updateMany({
      where: {
        paymentId: payment.id,
        status: { in: ["PAYMENT_STARTED", "AWAITING_PROOF", "VERIFYING"] },
      },
      data: {
        status: "EXPIRED",
        verificationReason: "USER_RETRY_INITIATED",
      },
    });

    // Reset payment request status to PENDING_PAYMENT
    const updatedPayment = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentStatus: "PENDING_PAYMENT",
        rejectionReason: null,
      },
    });

    await logPaymentAudit({
      action: "PAYMENT_RETRY_INITIATED",
      actorId: user.id,
      actorName: user.displayName || user.username || "User",
      targetId: payment.id,
      details: {
        paymentId: payment.id,
        referenceId: payment.referenceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ready to start new payment session",
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/retry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset payment attempt" },
      { status: 500 }
    );
  }
}
