import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canApproveCashPayment } from "@/lib/permissions";
import { logPaymentAudit } from "@/lib/payments/automated-upi";
import { sendPaymentApprovedEmail } from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/cash/approve
 * Confirms receipt of physical cash payment.
 * STRICTLY RESTRICTED TO: FOUNDER and CO_FOUNDER.
 * CEO, CTO, HR, COO, Interns receive 403 Forbidden.
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

    // Role-based permission check: ONLY Founder or Co-Founder
    if (!canApproveCashPayment(user)) {
      return NextResponse.json(
        {
          error: "Forbidden: Only Founder or Co-Founder can approve cash payments.",
          userRole: user.role || user.orgRole,
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

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
            internServicePaymentPaid: true,
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

    // Prevent duplicate approvals
    if (payment.cashStatus === "CASH_RECEIVED" && (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS")) {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        message: "Payment is already marked as received and approved.",
        payment,
      });
    }

    const now = new Date();
    const approverName = user.displayName || user.username || "CodeXa Founder/Co-Founder";

    // Atomically update payment and user paid status
    const [updatedPayment] = await db.$transaction([
      db.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "APPROVED",
          paymentMethod: "CASH",
          cashStatus: "CASH_RECEIVED",
          cashApprovedAt: now,
          cashApprovedById: user.id,
          cashApprovedByName: approverName,
          paidAt: now,
          verifiedAt: now,
          verifiedBy: user.id,
          verifiedByName: approverName,
          verificationSource: "MANUAL_CASH_RECEIPT",
          cashNotes: notes || payment.cashNotes || null,
        },
      }),
      db.user.update({
        where: { id: payment.userId },
        data: {
          internServicePaymentPaid: true,
        },
      }),
    ]);

    // Audit log
    await logPaymentAudit({
      action: "CASH_PAYMENT_CONFIRMED",
      actorId: user.id,
      actorName: approverName,
      targetId: payment.id,
      details: {
        referenceId: payment.referenceId,
        amount: Number(payment.fixedAmount),
        internId: payment.internId,
        internName: payment.userName,
        notes: notes || null,
        confirmedAt: now.toISOString(),
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    // Notify intern asynchronously
    const targetEmail = payment.userEmail || payment.user?.email;
    const targetName = payment.userName || payment.user?.fullName || payment.user?.username || "Intern";

    if (targetEmail) {
      sendPaymentApprovedEmail({
        referenceId: payment.referenceId,
        recipientName: targetName,
        recipientEmail: targetEmail,
        title: payment.title || "Internship Service Fee",
        amount: Number(payment.fixedAmount),
        paymentDate: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        utrNumber: "CASH_RECEIVED (Physical Handover)",
      }).catch((err) => console.error("Error sending cash approval email:", err));
    }

    // In-App Notification to Intern
    db.notification.create({
      data: {
        userId: payment.userId,
        type: "SECURITY",
        title: "Cash Payment Confirmed! 🎉",
        message: `Your cash payment of ₹${payment.fixedAmount} for CodeXa Internship Service Bill has been confirmed by ${approverName}.`,
        link: "/dashboard/payments",
        isRead: false,
      },
    }).catch(() => {});

    sendPushNotification(payment.userId, {
      title: "Cash Payment Confirmed! 🎉",
      body: `Your cash payment of ₹${payment.fixedAmount} for CodeXa Internship Service Bill has been confirmed.`,
      data: { url: "/dashboard/payments" },
      tag: "payment-approved",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Cash payment of ₹${payment.fixedAmount} confirmed successfully by ${approverName}.`,
      payment: {
        ...updatedPayment,
        // Do not expose sensitive admin IDs to client
        cashApprovedById: undefined,
        verifiedBy: undefined,
      },
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/cash/approve error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve cash payment" },
      { status: 500 }
    );
  }
}
