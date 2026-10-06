import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAutomaticVerificationEngine } from "@/lib/payments/automated-upi";
import { hasPermission, Permission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/verification
 * Polling endpoint for checking automated payment verification status.
 * Returns authoritative decision outcome, failure reasons, or success metadata.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);
    if (!canViewAll && payment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const latestAttempt = payment.attempts[0];

    // If currently VERIFYING and UTR is present, attempt background feed re-check
    if (latestAttempt && latestAttempt.status === "VERIFYING" && latestAttempt.utrNumber) {
      try {
        const recheckResult = await runAutomaticVerificationEngine({
          attemptId: latestAttempt.id,
        });
        if (recheckResult.status === "SUCCESS") {
          return NextResponse.json({
            status: "SUCCESS",
            paymentStatus: "APPROVED",
            attemptId: latestAttempt.id,
            utrNumber: latestAttempt.utrNumber,
            verificationReason: "MATCHED_TRUSTED_TRANSACTION",
            verificationSource: "TRUSTED_BANK_FEED",
            matchedTransactionId: recheckResult.matchedTransactionId,
            verifiedAt: recheckResult.verifiedAt,
            amount: Number(payment.fixedAmount),
            referenceId: payment.referenceId,
          });
        }
      } catch (err) {
        console.error("Verification re-check error:", err);
      }
    }

    return NextResponse.json({
      status: latestAttempt?.status || payment.paymentStatus,
      paymentStatus: payment.paymentStatus,
      attemptId: latestAttempt?.id || null,
      utrNumber: latestAttempt?.utrNumber || payment.utrNumber,
      verificationReason: latestAttempt?.verificationReason || null,
      verificationSource: latestAttempt?.verificationSource || null,
      matchedTransactionId: latestAttempt?.matchedTransactionId || null,
      verifiedAt: latestAttempt?.verifiedAt || payment.verifiedAt,
      amount: Number(payment.fixedAmount),
      referenceId: payment.referenceId,
      expiresAt: latestAttempt?.expiresAt || null,
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve verification status" },
      { status: 500 }
    );
  }
}
