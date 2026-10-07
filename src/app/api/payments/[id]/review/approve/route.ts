import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole } from "@/lib/permissions";
import { logPaymentAudit } from "@/lib/payments/automated-upi";
import { sendPaymentApprovedEmail } from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/review/approve
 * Approves a payment in REVIEW_REQUIRED state.
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
        { error: "Forbidden: Only Founder and Co-Founder can approve payment exceptions." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { attemptId, notes } = body;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
        },
        user: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        { error: "Payment has already been approved." },
        { status: 400 }
      );
    }

    const targetAttempt = attemptId
      ? payment.attempts.find((a) => a.id === attemptId)
      : payment.attempts[0];

    const verifiedNow = new Date();
    const approverName = user.displayName || user.username || "Founder/Co-Founder";

    // Atomically execute approval
    await db.$transaction(async (tx) => {
      // 1. Update Payment Request
      await tx.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "APPROVED",
          successfulAttemptId: targetAttempt?.id || null,
          utrNumber: targetAttempt?.utrNumber || payment.utrNumber,
          verifiedAt: verifiedNow,
          verifiedByName: `${approverName} (${role})`,
          verificationSource: "ADMIN_EXCEPTION_APPROVAL",
          adminNotes: notes ? `Approved exception: ${notes}` : payment.adminNotes,
          paidAt: verifiedNow,
        },
      });

      // 2. Update Payment Attempt if present
      if (targetAttempt) {
        await tx.paymentAttempt.update({
          where: { id: targetAttempt.id },
          data: {
            status: "SUCCESS",
            verifiedAt: verifiedNow,
            verificationReason: "ADMIN_APPROVED_EXCEPTION",
            verificationSource: "ADMIN_EXCEPTION_APPROVAL",
          },
        });
      }

      // 3. Mark intern access cleared
      await tx.user.update({
        where: { id: payment.userId },
        data: {
          internServicePaymentPaid: true,
        },
      });
    });

    // 4. Log Audit Event
    await logPaymentAudit({
      action: "PAYMENT_REVIEW_APPROVED",
      actorId: user.id,
      actorName: approverName,
      targetId: payment.id,
      details: {
        paymentId: payment.id,
        referenceId: payment.referenceId,
        attemptId: targetAttempt?.id,
        role,
        notes,
      },
    });

    // 5. Send Idempotent Success Email
    const recipientEmail = payment.userEmail || payment.user?.email;
    if (recipientEmail) {
      sendPaymentApprovedEmail({
        recipientEmail,
        recipientName: payment.userName || "Intern",
        referenceId: payment.referenceId,
        title: payment.title,
        amount: Number(payment.fixedAmount) || 450,
        utrNumber: targetAttempt?.utrNumber || payment.utrNumber || "Verified by Administration",
      }).catch((err) => console.error("[Review Approve Email Error]", err));
    }

    // 6. Push Notification to Intern
    sendPushNotification(payment.userId, {
      title: "🎉 CodeXa Payment Approved",
      body: `Your mandatory internship payment (${payment.referenceId}) has been verified and cleared by CodeXa Administration!`,
      icon: "/email-assets/codexa-logo.png",
      badge: "/email-assets/codexa-logo.png",
      tag: "payment-approved",
      data: {
        type: "MANDATORY_SERVICE_PAYMENT_SUCCESS",
        url: "/dashboard/payments",
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Payment exception successfully approved.",
      paymentStatus: "APPROVED",
      verifiedAt: verifiedNow.toISOString(),
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/review/approve error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve payment exception" },
      { status: 500 }
    );
  }
}
