import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole } from "@/lib/permissions";
import { getPaymentProofBuffer } from "@/lib/payment-storage";
import { analyzePaymentScreenshot } from "@/lib/payments/analyze-payment-proof";
import { verifyPaymentAttemptWithEvidence } from "@/lib/payments/verify-payment-attempt";
import { logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/verification/retry
 * Re-runs the automated OCR and multi-factor verification pipeline
 * on the uploaded screenshot for an attempt.
 * Strictly restricted to FOUNDER and CO_FOUNDER.
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

    const role = getEffectiveRole(user);
    if (role !== "FOUNDER" && role !== "CO_FOUNDER") {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can re-run automated verification." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { attemptId } = body;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    const targetAttempt = attemptId
      ? payment.attempts.find((a) => a.id === attemptId)
      : payment.attempts[0];

    if (!targetAttempt || !targetAttempt.proofImageUrl) {
      return NextResponse.json(
        { error: "No proof screenshot found for this attempt to re-verify." },
        { status: 400 }
      );
    }

    const fileData = await getPaymentProofBuffer(targetAttempt.proofImageUrl);
    if (!fileData) {
      return NextResponse.json(
        { error: "Screenshot file not found in private storage." },
        { status: 404 }
      );
    }

    // 1. Re-analyze screenshot via OCR pipeline
    const ocrResult = await analyzePaymentScreenshot(fileData.buffer, fileData.mimeType);

    // 2. Re-run multi-factor verification engine
    const decision = await verifyPaymentAttemptWithEvidence({
      attemptId: targetAttempt.id,
      userId: targetAttempt.userId,
      ocrResult,
      proofFilePath: targetAttempt.proofImageUrl,
      ipAddress: req.headers.get("x-forwarded-for") || "admin-action",
      userAgent: req.headers.get("user-agent") || "admin-retry",
    });

    await logPaymentAudit({
      action: "PAYMENT_VERIFICATION_RERUN",
      actorId: user.id,
      actorName: user.displayName || user.username || "Admin",
      targetId: payment.id,
      details: {
        attemptId: targetAttempt.id,
        newStatus: decision.status,
        reason: decision.reason,
        role,
      },
    });

    return NextResponse.json({
      success: true,
      decision,
      ocrDetails: {
        detectedApp: ocrResult.detectedApp,
        detectedStatus: ocrResult.detectedStatus,
        detectedAmount: ocrResult.detectedAmount,
        detectedUtr: ocrResult.detectedUtr,
        detectedDate: ocrResult.detectedDate,
        detectedTime: ocrResult.detectedTime,
      },
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/verification/retry error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to re-run verification" },
      { status: 500 }
    );
  }
}
