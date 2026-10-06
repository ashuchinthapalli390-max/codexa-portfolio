import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import { dataStore } from "@/lib/data-store";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail } from "@/lib/email/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/verify
 * Admin action to manually APPROVE or REJECT a payment proof.
 * Requires VERIFY_PAYMENT permission (Founder, Co-Founder, HR).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.VERIFY_PAYMENT)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to verify payments." }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { action, rejectionReason, adminNotes } = body;

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'APPROVE' or 'REJECT'." }, { status: 400 });
    }

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        submissions: {
          orderBy: { submissionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    const latestSubmission = payment.submissions[0];

    // ─── APPROVE FLOW ─────────────────────────────────────────────────────────
    if (action === "APPROVE") {
      const updatedPayment = await db.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "APPROVED",
          verifiedBy: user.id,
          verifiedByName: user.displayName || user.username || "Admin",
          verifiedAt: new Date(),
          adminNotes: adminNotes || payment.adminNotes,
          // Clear any prior rejection data
          rejectionReason: null,
          rejectedBy: null,
          rejectedByName: null,
          rejectedAt: null,
        },
      });

      if (latestSubmission) {
        await db.paymentSubmission.update({
          where: { id: latestSubmission.id },
          data: {
            status: "APPROVED",
            reviewedBy: user.id,
            reviewedByName: user.displayName || user.username || "Admin",
            reviewedAt: new Date(),
            adminNotes: adminNotes || null,
          },
        });
      }

      await dataStore.logAudit(
        user.id,
        "PAYMENT_APPROVED",
        `Approved payment ${payment.referenceId} for ${payment.userName || payment.userEmail} (Amount: ₹${payment.fixedAmount})`
      );

      // Async email notification
      if (payment.userEmail) {
        sendPaymentApprovedEmail({
          referenceId: payment.referenceId,
          recipientName: payment.userName || payment.userEmail,
          recipientEmail: payment.userEmail,
          title: payment.title,
          amount: payment.fixedAmount,
          utrNumber: payment.utrNumber || undefined,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: "Payment successfully approved.",
        payment: updatedPayment,
      });
    }

    // ─── REJECT FLOW ──────────────────────────────────────────────────────────
    if (action === "REJECT") {
      const reason = (rejectionReason || "").trim();
      if (!reason) {
        return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
      }

      const updatedPayment = await db.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "REJECTED",
          rejectedBy: user.id,
          rejectedByName: user.displayName || user.username || "Admin",
          rejectedAt: new Date(),
          rejectionReason: reason,
          adminNotes: adminNotes || payment.adminNotes,
        },
      });

      if (latestSubmission) {
        await db.paymentSubmission.update({
          where: { id: latestSubmission.id },
          data: {
            status: "REJECTED",
            reviewedBy: user.id,
            reviewedByName: user.displayName || user.username || "Admin",
            reviewedAt: new Date(),
            rejectionReason: reason,
            adminNotes: adminNotes || null,
          },
        });
      }

      await dataStore.logAudit(
        user.id,
        "PAYMENT_REJECTED",
        `Rejected payment ${payment.referenceId} for ${payment.userName || payment.userEmail}. Reason: ${reason}`
      );

      // Async email notification
      if (payment.userEmail) {
        sendPaymentRejectedEmail({
          referenceId: payment.referenceId,
          recipientName: payment.userName || payment.userEmail,
          recipientEmail: payment.userEmail,
          title: payment.title,
          amount: payment.fixedAmount,
          rejectionReason: reason,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: "Payment proof rejected. User can resubmit proof.",
        payment: updatedPayment,
      });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/verify error:", error);
    return NextResponse.json({ error: error.message || "Failed to process verification" }, { status: 500 });
  }
}
