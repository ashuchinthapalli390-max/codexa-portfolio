import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole } from "@/lib/permissions";
import { logPaymentAudit } from "@/lib/payments/automated-upi";
import { dispatchPaymentApprovedToIntern } from "@/lib/payments/manual-approval-notifications";

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

    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS" || payment.paymentStatus === "REJECTED") {
      return NextResponse.json(
        { ok: false, error: "PAYMENT_ALREADY_REVIEWED", message: "This payment has already been reviewed." },
        { status: 409 }
      );
    }

    if (body.confirmation !== true && body.confirmReceipt !== true) {
      return NextResponse.json(
        { ok: false, error: "CONFIRMATION_REQUIRED", message: "You must independently confirm receipt of ₹450 before approving." },
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
          verifiedBy: user.id,
          verifiedByName: `${approverName} (${role})`,
          verificationSource: "MANUAL_RECEIPT_CONFIRMATION",
          adminNotes: notes ? `Approved: ${notes}` : payment.adminNotes,
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
            verificationReason: "MANUAL_RECEIPT_CONFIRMATION",
            verificationSource: "MANUAL_RECEIPT_CONFIRMATION",
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

    // 5. Dispatch All Intern Notifications (In-App, Push, Email)
    dispatchPaymentApprovedToIntern({
      payment: {
        id: payment.id,
        referenceId: payment.referenceId,
        userId: payment.userId,
        userName: payment.userName || payment.user?.fullName,
        userEmail: payment.userEmail || payment.user?.email,
        internId: payment.internId,
        fixedAmount: Number(payment.fixedAmount) || 450,
        paymentMethod: targetAttempt?.selectedMethod || payment.paymentMethod || "UPI",
      },
      approverName,
      approverRole: role,
    }).catch((err) => console.error("[Payment Approved Dispatch Error]", err));

    return NextResponse.json({
      success: true,
      message: "Payment successfully approved and recorded.",
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
