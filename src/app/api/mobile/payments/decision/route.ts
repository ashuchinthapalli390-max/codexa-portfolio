import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { dispatchPaymentApprovedToIntern, dispatchPaymentRejectedToIntern } from "@/lib/payments/manual-approval-notifications";
import { sendFcmPushToUser } from "@/lib/firebase-admin";
import { canApproveCashPayment, getEffectiveRole } from "@/lib/permissions";
import { logPaymentAudit, runAutomaticVerificationEngine } from "@/lib/payments/automated-upi";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail } from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const effectiveRole = getEffectiveRole(user);
    const isFullAdmin = effectiveRole === "FOUNDER" || effectiveRole === "CO_FOUNDER" || effectiveRole === "OWNER";

    if (!isFullAdmin) {
      return NextResponse.json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Only Founder or Co-Founder can perform payment review decisions." },
      }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { paymentId, action, reason, notes } = body;

    if (!paymentId || !action) {
      return NextResponse.json({
        ok: false,
        error: { code: "BAD_REQUEST", message: "Payment ID and action are required." },
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id: paymentId }, { referenceId: paymentId }] },
      include: {
        user: { select: { id: true, fullName: true, username: true, email: true } },
        attempts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!payment) {
      return NextResponse.json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Payment record not found." },
      }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Concurrency protection: verify payment hasn't already been decided
    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS" || payment.paymentStatus === "REJECTED") {
      return NextResponse.json({
        ok: false,
        error: {
          code: "PAYMENT_ALREADY_REVIEWED",
          message: "This payment has already been reviewed.",
          currentStatus: payment.paymentStatus,
        },
      }, { status: 409, headers: NO_CACHE_HEADERS });
    }

    const now = new Date();
    const approverName = user.displayName || user.username || "CodeXa Founder/Co-Founder";
    const latestAttempt = payment.attempts[0];

    // ── 1. CONFIRM CASH ──
    if (action === "CONFIRM_CASH" || action === "APPROVE_CASH") {
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
          data: { internServicePaymentPaid: true },
        }),
      ]);

      await logPaymentAudit({
        action: "CASH_PAYMENT_CONFIRMED_MOBILE",
        actorId: user.id,
        actorName: approverName,
        targetId: payment.id,
        details: { referenceId: payment.referenceId, amount: 450, notes },
      });

      // Async email and push
      if (payment.user?.email) {
        sendPaymentApprovedEmail({
          referenceId: payment.referenceId,
          recipientName: payment.user.fullName || payment.user.username || "Intern",
          recipientEmail: payment.user.email,
          title: payment.title || "Internship Service Fee",
          amount: Number(payment.fixedAmount),
          paymentDate: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          utrNumber: "CASH_RECEIVED (Physical Handover)",
        }).catch(() => {});
      }

      sendPushNotification(payment.userId, {
        title: "Cash Payment Confirmed! 🎉",
        body: `Your cash payment of ₹${payment.fixedAmount} for CodeXa Internship Service Bill has been confirmed.`,
        data: { url: "/dashboard/payments" },
        tag: "payment-approved",
      }).catch(() => {});

      sendFcmPushToUser(payment.userId, {
        title: "Cash Payment Confirmed! 🎉",
        body: `Your cash payment of ₹${payment.fixedAmount} for CodeXa Internship Service Bill has been confirmed.`,
        data: { type: "PAYMENT_APPROVED", paymentId: payment.id, referenceId: payment.referenceId, click_action: "FLUTTER_NOTIFICATION_CLICK" },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        message: "Cash payment confirmed successfully.",
        status: "APPROVED",
        paymentId: updatedPayment.id,
      }, { headers: NO_CACHE_HEADERS });
    }

    // ── 2. RETRY AUTOMATIC VERIFICATION ──
    if (action === "RETRY_VERIFY") {
      if (!latestAttempt) {
        return NextResponse.json({
          ok: false,
          error: { code: "NO_ATTEMPT", message: "No payment attempt found to verify." },
        }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const result = await runAutomaticVerificationEngine({ attemptId: latestAttempt.id });

      return NextResponse.json({
        ok: true,
        message: "Automated verification re-run completed.",
        result,
      }, { headers: NO_CACHE_HEADERS });
    }

    // ── 3. APPROVE EXCEPTION (MANUAL RECEIPT CONFIRMATION) ──
    if (action === "APPROVE") {
      if (body.confirmation !== true && body.confirmReceipt !== true) {
        return NextResponse.json({
          ok: false,
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: "You must independently confirm receipt of ₹450 in the official receiving account before approving.",
          },
        }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const [updatedPayment] = await db.$transaction([
        db.paymentRequest.update({
          where: { id: payment.id },
          data: {
            paymentStatus: "APPROVED",
            verifiedBy: user.id,
            verifiedByName: `${approverName} (${effectiveRole})`,
            verifiedAt: now,
            verificationSource: "MANUAL_RECEIPT_CONFIRMATION",
            paidAt: now,
            adminNotes: notes || payment.adminNotes,
            rejectionReason: null,
            successfulAttemptId: latestAttempt?.id || null,
          },
        }),
        ...(latestAttempt ? [
          db.paymentAttempt.update({
            where: { id: latestAttempt.id },
            data: {
              status: "SUCCESS",
              verifiedAt: now,
              verificationReason: "MANUAL_RECEIPT_CONFIRMATION",
              verificationSource: "MANUAL_RECEIPT_CONFIRMATION",
            },
          }),
        ] : []),
        db.user.update({
          where: { id: payment.userId },
          data: { internServicePaymentPaid: true },
        }),
      ]);

      await logPaymentAudit({
        action: "PAYMENT_REVIEW_APPROVED_MOBILE",
        actorId: user.id,
        actorName: approverName,
        targetId: payment.id,
        details: { referenceId: payment.referenceId, amount: 450, notes, role: effectiveRole },
      });

      // Dispatch full notifications (In-App, Android FCM Push, Email)
      dispatchPaymentApprovedToIntern({
        payment: {
          id: payment.id,
          referenceId: payment.referenceId,
          userId: payment.userId,
          userName: payment.userName || payment.user?.fullName,
          userEmail: payment.userEmail || payment.user?.email,
          internId: payment.internId,
          fixedAmount: Number(payment.fixedAmount) || 450,
          paymentMethod: latestAttempt?.selectedMethod || payment.paymentMethod || "UPI",
        },
        approverName,
        approverRole: effectiveRole,
      }).catch((err) => console.error("[Payment Approved Dispatch Error]", err));

      if (payment.user?.email) {
        sendPaymentApprovedEmail({
          referenceId: payment.referenceId,
          recipientName: payment.user.fullName || payment.user.username || "Intern",
          recipientEmail: payment.user.email,
          title: payment.title || "Internship Service Fee",
          amount: Number(payment.fixedAmount),
          paymentDate: now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          utrNumber: payment.utrNumber || undefined,
        }).catch(() => {});
      }

      return NextResponse.json({
        ok: true,
        message: "Payment approved successfully.",
        status: "APPROVED",
        paymentId: updatedPayment.id,
      }, { headers: NO_CACHE_HEADERS });
    }

    // ── 4. REJECT PAYMENT ──
    if (action === "REJECT") {
      const rejectionReason = (reason || notes || "Payment not received in official CodeXa account").trim();

      const [updatedPayment] = await db.$transaction([
        db.paymentRequest.update({
          where: { id: payment.id },
          data: {
            paymentStatus: "REJECTED",
            rejectedBy: user.id,
            rejectedByName: `${approverName} (${effectiveRole})`,
            rejectedAt: now,
            rejectionReason,
          },
        }),
        ...(latestAttempt ? [
          db.paymentAttempt.update({
            where: { id: latestAttempt.id },
            data: {
              status: "FAILED",
              verificationReason: `ADMIN_REJECTED: ${rejectionReason}`,
            },
          }),
        ] : []),
      ]);

      await logPaymentAudit({
        action: "PAYMENT_REVIEW_REJECTED_MOBILE",
        actorId: user.id,
        actorName: approverName,
        targetId: payment.id,
        details: { referenceId: payment.referenceId, reason: rejectionReason, role: effectiveRole },
      });

      // Dispatch full rejection notifications (In-App, Android FCM Push, Email)
      dispatchPaymentRejectedToIntern({
        payment: {
          id: payment.id,
          referenceId: payment.referenceId,
          userId: payment.userId,
          userName: payment.userName || payment.user?.fullName,
          userEmail: payment.userEmail || payment.user?.email,
          internId: payment.internId,
        },
        reason: rejectionReason,
        reviewerName: approverName,
        reviewerRole: effectiveRole,
      }).catch((err) => console.error("[Payment Rejected Dispatch Error]", err));

      if (payment.user?.email) {
        sendPaymentRejectedEmail({
          referenceId: payment.referenceId,
          recipientName: payment.user.fullName || payment.user.username || "Intern",
          recipientEmail: payment.user.email,
          title: payment.title,
          amount: Number(payment.fixedAmount),
          rejectionReason,
        }).catch(() => {});
      }

      return NextResponse.json({
        ok: true,
        message: "Payment proof rejected.",
        status: "REJECTED",
        paymentId: updatedPayment.id,
      }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      ok: false,
      error: { code: "INVALID_ACTION", message: "Unsupported action." },
    }, { status: 400, headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/payments/decision] [${requestId}]`, err);
    return NextResponse.json({
      ok: false,
      error: { code: "SERVER_ERROR", message: err?.message || "Failed to execute decision." },
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
