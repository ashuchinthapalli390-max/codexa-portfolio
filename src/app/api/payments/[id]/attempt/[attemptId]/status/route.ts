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

    return NextResponse.json({
      status: attempt.status,
      verificationReason: attempt.verificationReason,
      userMessage,
      utrNumber: attempt.utrNumber || attempt.detectedUtr || null,
      amount: 450,
      paymentApp: attempt.detectedApp || attempt.selectedMethod,
      verifiedAt: attempt.verifiedAt?.toISOString() || null,
      expiresAt: attempt.expiresAt.toISOString(),
      startedAt: attempt.startedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/attempt/[attemptId]/status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get attempt status" },
      { status: 500 }
    );
  }
}
