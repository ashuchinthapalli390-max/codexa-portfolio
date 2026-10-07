import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole } from "@/lib/permissions";
import { logPaymentAudit } from "@/lib/payments/automated-upi";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/review/reject
 * Rejects a payment in REVIEW_REQUIRED or pending verification state.
 * Strictly restricted to FOUNDER and CO_FOUNDER.
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

    const role = getEffectiveRole(user);
    if (role !== "FOUNDER" && role !== "CO_FOUNDER") {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can reject payment exceptions." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { attemptId, reason } = body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { error: "A rejection reason is required." },
        { status: 400 }
      );
    }

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        { error: "Cannot reject a payment that has already succeeded." },
        { status: 400 }
      );
    }

    const targetAttempt = attemptId
      ? payment.attempts.find((a) => a.id === attemptId)
      : payment.attempts[0];

    const rejectedNow = new Date();
    const rejecterName = user.displayName || user.username || "Founder/Co-Founder";
    const rejectionNote = reason.trim();

    await db.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "FAILED",
          rejectedAt: rejectedNow,
          rejectedBy: user.id,
          rejectedByName: `${rejecterName} (${role})`,
          rejectionReason: rejectionNote,
        },
      });

      if (targetAttempt) {
        await tx.paymentAttempt.update({
          where: { id: targetAttempt.id },
          data: {
            status: "FAILED",
            verificationReason: "ADMIN_REJECTED",
          },
        });
      }
    });

    await logPaymentAudit({
      action: "PAYMENT_REVIEW_REJECTED",
      actorId: user.id,
      actorName: rejecterName,
      targetId: payment.id,
      details: {
        paymentId: payment.id,
        referenceId: payment.referenceId,
        attemptId: targetAttempt?.id,
        reason: rejectionNote,
        role,
      },
    });

    // Notify intern
    sendPushNotification(payment.userId, {
      title: "❌ Payment Proof Rejected",
      body: `Your payment proof was rejected: "${rejectionNote}". You may submit a new attempt from the dashboard.`,
      icon: "/email-assets/codexa-logo.png",
      badge: "/email-assets/codexa-logo.png",
      tag: "payment-rejected",
      data: {
        type: "MANDATORY_SERVICE_PAYMENT_REJECTED",
        url: "/dashboard/payments",
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Payment proof rejected.",
      paymentStatus: "FAILED",
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/review/reject error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject payment" },
      { status: 500 }
    );
  }
}
