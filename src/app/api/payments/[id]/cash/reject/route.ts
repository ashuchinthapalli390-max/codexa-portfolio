import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canRejectCashPayment } from "@/lib/permissions";
import { logPaymentAudit } from "@/lib/payments/automated-upi";
import { sendPaymentRejectedEmail } from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/cash/reject
 * Rejects a cash payment request with a specified reason.
 * STRICTLY RESTRICTED TO: FOUNDER and CO_FOUNDER.
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

    if (!canRejectCashPayment(user)) {
      return NextResponse.json(
        {
          error: "Forbidden: Only Founder or Co-Founder can reject cash payment requests.",
          userRole: user.role || user.orgRole,
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const reason = (body.reason || "").trim();

    if (!reason) {
      return NextResponse.json(
        { error: "A valid rejection reason is required." },
        { status: 400 }
      );
    }

    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    if (payment.cashStatus === "CASH_RECEIVED" || payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        { error: "Cannot reject a payment that has already been confirmed and received." },
        { status: 400 }
      );
    }

    const now = new Date();
    const rejectorName = user.displayName || user.username || "CodeXa Founder/Co-Founder";

    const updatedPayment = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentStatus: "REJECTED",
        cashStatus: "CASH_REJECTED",
        cashRejectionReason: reason,
        rejectedAt: now,
        rejectedBy: user.id,
        rejectedByName: rejectorName,
        rejectionReason: reason,
      },
    });

    await logPaymentAudit({
      action: "CASH_PAYMENT_REJECTED",
      actorId: user.id,
      actorName: rejectorName,
      targetId: payment.id,
      details: {
        referenceId: payment.referenceId,
        reason,
        rejectedAt: now.toISOString(),
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    const targetEmail = payment.userEmail || payment.user?.email;
    const targetName = payment.userName || payment.user?.fullName || payment.user?.username || "Intern";

    if (targetEmail) {
      sendPaymentRejectedEmail({
        referenceId: payment.referenceId,
        recipientName: targetName,
        recipientEmail: targetEmail,
        title: payment.title || "Internship Service Fee",
        amount: Number(payment.fixedAmount),
        rejectionReason: reason,
      }).catch((err) => console.error("Error sending cash rejection email:", err));
    }

    sendPushNotification(payment.userId, {
      title: "Cash Payment Request Update",
      body: `Your cash payment request was not accepted: ${reason}. You may resubmit or choose UPI.`,
      data: { url: "/dashboard/payments" },
      tag: "payment-rejected",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Cash payment request rejected.",
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/cash/reject error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject cash payment request" },
      { status: 500 }
    );
  }
}
