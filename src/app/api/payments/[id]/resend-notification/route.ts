import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole } from "@/lib/permissions";
import { dispatchProofSubmittedNotifications } from "@/lib/payments/manual-approval-notifications";
import { logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/resend-notification
 * Re-sends the payment approval notification (Email with real screenshot attachment, Web Push, In-App)
 * strictly restricted to Founder and Co-Founder.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const role = getEffectiveRole(user);
    const isFounderOrCoFounder =
      role === "FOUNDER" ||
      role === "CO_FOUNDER" ||
      role === "OWNER" ||
      user.email === "ashuchinthapalli3900@gmail.com" ||
      user.email === "boddukurisanjay@gmail.com";

    if (!isFounderOrCoFounder) {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can resend payment approval notifications." },
        { status: 403 }
      );
    }

    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        user: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    }

    const latestAttempt = payment.attempts[0];
    const proofPath = payment.proofImageUrl || latestAttempt?.proofImageUrl;

    if (!proofPath) {
      return NextResponse.json(
        { error: "No payment proof screenshot found for this payment to attach." },
        { status: 400 }
      );
    }

    const actorName = user.displayName || user.username || "Founder/Co-Founder";

    // Asynchronously dispatch notifications with real screenshot attachment
    await dispatchProofSubmittedNotifications({
      payment: {
        id: payment.id,
        referenceId: payment.referenceId,
        userId: payment.userId,
        userName: payment.userName || payment.user?.fullName || payment.user?.username || "Intern",
        userEmail: payment.userEmail || payment.user?.email,
        domain: payment.domain || payment.user?.department,
        internId: payment.internId || payment.employeeId,
        fixedAmount: Number(payment.fixedAmount) || 450,
        paymentMethod: latestAttempt?.selectedMethod || payment.paymentMethod || "UPI",
        submittedAt: payment.submittedAt || latestAttempt?.submittedAt || new Date(),
        proofImageUrl: proofPath,
      },
      attempt: latestAttempt
        ? {
            id: latestAttempt.id,
            selectedMethod: latestAttempt.selectedMethod,
            submittedAt: latestAttempt.submittedAt,
            proofImageUrl: latestAttempt.proofImageUrl || proofPath,
          }
        : null,
    });

    await logPaymentAudit({
      action: "PAYMENT_APPROVAL_NOTIFICATION_RESENT",
      actorId: user.id,
      actorName,
      targetId: payment.id,
      details: {
        paymentId: payment.id,
        referenceId: payment.referenceId,
        proofPath,
        role,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Approval notification resent successfully with attached screenshot.",
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/resend-notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend approval notification." },
      { status: 500 }
    );
  }
}
