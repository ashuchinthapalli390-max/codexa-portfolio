import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import {
  logPaymentAudit,
  runAutomaticVerificationEngine,
} from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFounderOrCoFounder(user: any): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return role === "FOUNDER" || role === "CO_FOUNDER";
}

/**
 * POST /api/admin/payments/[id]/override
 * Founder & Co-Founder emergency override operations:
 * - DISPUTE: Flags payment as disputed
 * - RETRY_VERIFY: Re-runs automatic verification engine on latest attempt
 * - INVALIDATE: Revokes payment and reverses internServicePaymentPaid access
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFounderOrCoFounder(user)) {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can trigger admin overrides." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { action, reason } = body;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    const latestAttempt = payment.attempts[0];

    if (action === "DISPUTE") {
      await db.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "REJECTED",
          rejectionReason: reason || "Marked as Disputed by Administration",
          rejectedBy: user.id,
          rejectedByName: user.displayName || user.username || "Admin",
          rejectedAt: new Date(),
        },
      });

      if (latestAttempt) {
        await db.paymentAttempt.update({
          where: { id: latestAttempt.id },
          data: {
            status: "FAILED",
            verificationReason: "DISPUTED_BY_ADMIN",
          },
        });
      }

      await logPaymentAudit({
        action: "PAYMENT_MARKED_DISPUTED",
        actorId: user.id,
        actorName: user.displayName || user.username || "Admin",
        targetId: payment.id,
        details: { reason },
      });

      return NextResponse.json({
        success: true,
        message: "Payment marked as disputed",
      });
    }

    if (action === "RETRY_VERIFY") {
      if (!latestAttempt) {
        return NextResponse.json(
          { error: "No payment attempt found to verify" },
          { status: 400 }
        );
      }

      const result = await runAutomaticVerificationEngine({
        attemptId: latestAttempt.id,
      });

      await logPaymentAudit({
        action: "ADMIN_RETRY_VERIFICATION_TRIGGERED",
        actorId: user.id,
        actorName: user.displayName || user.username || "Admin",
        targetId: payment.id,
        details: { attemptId: latestAttempt.id, outcome: result },
      });

      return NextResponse.json({
        success: true,
        message: "Automatic verification re-executed",
        result,
      });
    }

    if (action === "INVALIDATE") {
      await db.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "CANCELLED",
          rejectionReason: reason || "Invalidated by Administration",
        },
      });

      // Revoke intern privileges if unlocked
      await db.user.update({
        where: { id: payment.userId },
        data: { internServicePaymentPaid: false },
      });

      await logPaymentAudit({
        action: "PAYMENT_INVALIDATED",
        actorId: user.id,
        actorName: user.displayName || user.username || "Admin",
        targetId: payment.id,
        details: { reason },
      });

      return NextResponse.json({
        success: true,
        message: "Payment invalidated and student access revoked",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: DISPUTE, RETRY_VERIFY, INVALIDATE." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST /api/admin/payments/[id]/override error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute payment override" },
      { status: 500 }
    );
  }
}
