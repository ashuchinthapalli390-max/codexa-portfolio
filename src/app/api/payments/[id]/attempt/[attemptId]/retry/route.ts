import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/attempt/[attemptId]/retry
 * Resets a failed or expired attempt to allow starting a new payment session.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: paymentId, attemptId } = params;

    const attempt = await db.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: { paymentRequest: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Payment attempt not found" },
        { status: 404 }
      );
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.status === "SUCCESS") {
      return NextResponse.json(
        { error: "Payment is already successful. Retry not permitted." },
        { status: 400 }
      );
    }

    // Mark current attempt as EXPIRED/RETRY
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "EXPIRED",
        verificationReason: "USER_RETRY_REQUESTED",
      },
    });

    await db.paymentRequest.update({
      where: { id: paymentId },
      data: {
        paymentStatus: "PENDING_PAYMENT",
      },
    });

    await logPaymentAudit({
      action: "PAYMENT_RETRY_STARTED",
      actorId: user.id,
      targetId: paymentId,
      details: {
        attemptId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ready to start fresh payment session",
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/attempt/[attemptId]/retry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retry payment attempt" },
      { status: 500 }
    );
  }
}
