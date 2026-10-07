import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import { dataStore } from "@/lib/data-store";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail } from "@/lib/email/notifications";
import { sendMandatoryFeePaymentConfirmationEmail } from "@/services/payment-reminders";

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

    const isMandatoryInternPayment =
      payment.fixedAmount === 450 ||
      payment.paymentPurpose === "INTERNSHIP_FEE" ||
      payment.paymentPurpose === "INTERNSHIP_SERVICE_BILL" ||
      payment.userRole === "INTERN";

    // ─── SAFE ACTIONS (RETRY_VERIFY, DISPUTE, INVALIDATE) ────────────────────
    if (action === "RETRY_VERIFY") {
      const { runAutomaticVerificationEngine } = await import("@/lib/payments/automated-upi");
      const latestAttempt = await db.paymentAttempt.findFirst({
        where: { paymentId: payment.id },
        orderBy: { createdAt: "desc" },
      });
      if (latestAttempt) {
        const result = await runAutomaticVerificationEngine({ attemptId: latestAttempt.id });
        return NextResponse.json({ success: true, result });
      }
      return NextResponse.json({ error: "No payment attempt found to verify." }, { status: 404 });
    }

    if (action === "INVALIDATE") {
      await db.paymentAttempt.updateMany({
        where: { paymentId: payment.id, status: { not: "SUCCESS" } },
        data: { status: "EXPIRED", verificationReason: "ADMIN_INVALIDATED" },
      });
      await db.paymentRequest.update({
        where: { id: payment.id },
        data: { paymentStatus: "PENDING_PAYMENT" },
      });
      return NextResponse.json({ success: true, message: "Attempt invalidated." });
    }

    // ─── STRICT RULE: NO MANUAL APPROVAL FOR MANDATORY INTERN UPI PAYMENT ────
    if (action === "APPROVE" && isMandatoryInternPayment) {
      return NextResponse.json(
        {
          error:
            "Manual approval is disabled for mandatory ₹450 internship payments. All transactions must be verified automatically by the settlement engine.",
        },
        { status: 400 }
      );
    }

    // ─── APPROVE FLOW (FOR OTHER / LEGACY PAYMENTS ONLY) ─────────────────────
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
        if (payment.fixedAmount === 450 || payment.paymentPurpose === "INTERNSHIP_FEE") {
          sendMandatoryFeePaymentConfirmationEmail({
            studentName: payment.userName || payment.userEmail,
            email: payment.userEmail,
            domain: payment.domain || "Engineering Track",
            amount: payment.fixedAmount,
            transactionId: payment.utrNumber || payment.referenceId,
            paidDate: new Date().toLocaleDateString("en-IN"),
          }).catch(() => {});
        } else {
          sendPaymentApprovedEmail({
            referenceId: payment.referenceId,
            recipientName: payment.userName || payment.userEmail,
            recipientEmail: payment.userEmail,
            title: payment.title,
            amount: payment.fixedAmount,
            utrNumber: payment.utrNumber || undefined,
          }).catch(() => {});
        }
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
