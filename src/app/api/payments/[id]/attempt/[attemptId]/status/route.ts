import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFriendlyFailureMessage, MachineFailureReason } from "@/lib/payments/verify-payment-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/attempt/[attemptId]/status
 * Returns current attempt status and verification decision.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = params;

    const attempt = await db.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: { paymentRequest: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Payment attempt not found" },
        { status: 404 }
      );
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userMessage = attempt.verificationReason
      ? getFriendlyFailureMessage(attempt.verificationReason as MachineFailureReason)
      : null;

    let step = "AWAITING_SCREENSHOT";
    if (attempt.status === "ANALYZING_PROOF") step = "ANALYZING_PROOF";
    else if (attempt.status === "VERIFYING") step = "VERIFYING";
    else if (attempt.status === "SUCCESS") step = "SUCCESS";
    else if (attempt.status === "REVIEW_REQUIRED") step = "REVIEW_REQUIRED";
    else if (attempt.status === "FAILED") step = "FAILED";
    else if (attempt.status === "EXPIRED") step = "EXPIRED";

    return NextResponse.json({
      status: attempt.status,
      step,
      verificationReason: attempt.verificationReason,
      userMessage,
      utrNumber: attempt.utrNumber || attempt.detectedUtr || null,
      amount: 450,
      paymentApp: attempt.detectedApp || attempt.selectedMethod,
      verifiedAt: attempt.verifiedAt?.toISOString() || null,
      submittedAt: attempt.submittedAt?.toISOString() || null,
      expiresAt: attempt.expiresAt.toISOString(),
      startedAt: attempt.startedAt.toISOString(),
      proofImageUrl: attempt.proofImageUrl || null,
      detectedDetails: {
        detectedApp: attempt.detectedApp,
        detectedStatus: attempt.detectedStatus,
        detectedAmount: attempt.detectedAmount ? Number(attempt.detectedAmount) : null,
        detectedDate: attempt.detectedDate,
        detectedTime: attempt.detectedTime,
      },
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/attempt/[attemptId]/status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get attempt status" },
      { status: 500 }
    );
  }
}
