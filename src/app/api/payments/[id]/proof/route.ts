import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePaymentProof } from "@/lib/payment-storage";
import {
  startPaymentAttempt,
  SupportedUpiMethod,
  logPaymentAudit,
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_SIZE_BYTES,
} from "@/lib/payments/automated-upi";
import { analyzePaymentScreenshot } from "@/lib/payments/analyze-payment-proof";
import {
  verifyPaymentAttemptWithEvidence,
  getFriendlyFailureMessage,
} from "@/lib/payments/verify-payment-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/proof
 * 
 * FULLY AUTOMATIC SCREENSHOT-BASED UPI PAYMENT INGESTION:
 * - NO manual UTR input accepted
 * - NO manual payment date or time accepted
 * - Accepts ONLY screenshot image (JPEG, PNG, WebP <= 10MB)
 * - Executes server-side OCR and heuristic parsing via analyzePaymentScreenshot
 * - Strictly verifies ₹450 amount, success status, UTR uniqueness, and 5-min session window
 * - Reconciles against TrustedUpiTransaction feed
 * - Returns deterministic SUCCESS or FAILED outcome
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found." },
        { status: 404 }
      );
    }

    // Ownership check: User must own the payment
    if (payment.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only submit proof for your own payments." },
        { status: 403 }
      );
    }

    // Check if payment already completed
    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        {
          status: "SUCCESS",
          success: true,
          message: "Payment has already been confirmed and completed.",
        },
        { status: 200 }
      );
    }

    const formData = await req.formData();
    const screenshot = formData.get("screenshot") as File | null;
    let attemptId = (formData.get("attemptId") as string)?.trim() || null;

    if (!screenshot) {
      return NextResponse.json(
        { error: "Payment screenshot is required. Please upload your payment receipt." },
        { status: 400 }
      );
    }

    const mimeType = (screenshot.type || "image/jpeg").toLowerCase();
    if (!ALLOWED_PROOF_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a JPEG, PNG, or WebP screenshot." },
        { status: 400 }
      );
    }

    if (screenshot.size > MAX_PROOF_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Screenshot exceeds the 10 MB limit." },
        { status: 400 }
      );
    }

    // Resolve active attempt
    const now = new Date();
    let targetAttempt = attemptId
      ? await db.paymentAttempt.findUnique({ where: { id: attemptId } })
      : null;

    if (!targetAttempt) {
      // Find latest non-expired active attempt
      targetAttempt =
        payment.attempts.find(
          (a) =>
            ["PAYMENT_STARTED", "AWAITING_PROOF", "AWAITING_SCREENSHOT"].includes(a.status) &&
            new Date(a.expiresAt) > now
        ) || null;
    }

    // If no active attempt exists, check if latest attempt expired
    if (!targetAttempt) {
      const latestAttempt = payment.attempts[0];
      if (latestAttempt && new Date(latestAttempt.expiresAt) <= now) {
        return NextResponse.json(
          {
            status: "EXPIRED",
            reason: "UPLOAD_EXPIRED",
            error: getFriendlyFailureMessage("UPLOAD_EXPIRED"),
          },
          { status: 400 }
        );
      }

      // Auto-initialize session if none active
      const newAttemptResult = await startPaymentAttempt({
        paymentId: payment.id,
        userId: user.id,
        selectedMethod: "OTHER_UPI",
      });
      targetAttempt = newAttemptResult.attempt as any;
    }

    if (!targetAttempt) {
      return NextResponse.json(
        { error: "Could not initialize payment session attempt." },
        { status: 500 }
      );
    }

    // Check if session has expired
    if (now > new Date(targetAttempt.expiresAt)) {
      await db.paymentAttempt.update({
        where: { id: targetAttempt.id },
        data: {
          status: "EXPIRED",
          verificationReason: "UPLOAD_EXPIRED",
        },
      });

      return NextResponse.json(
        {
          status: "EXPIRED",
          reason: "UPLOAD_EXPIRED",
          error: getFriendlyFailureMessage("UPLOAD_EXPIRED"),
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await screenshot.arrayBuffer();
    const proofBuffer = Buffer.from(arrayBuffer);

    // Save proof image privately
    const uploadResult = await savePaymentProof(
      payment.id,
      proofBuffer,
      screenshot.name || "screenshot.png",
      mimeType
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to save payment proof securely." },
        { status: 500 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Set attempt status to ANALYZING_PROOF
    await db.paymentAttempt.update({
      where: { id: targetAttempt.id },
      data: {
        status: "ANALYZING_PROOF",
        submittedAt: now,
        proofImageUrl: uploadResult.filePath,
      },
    });

    await logPaymentAudit({
      action: "PAYMENT_PROOF_ANALYSIS_STARTED",
      actorId: user.id,
      targetId: payment.id,
      details: {
        attemptId: targetAttempt.id,
        fileSize: proofBuffer.length,
        mimeType,
      },
      ipAddress,
      userAgent,
    });

    // ─── EXECUTE OCR & SCREENSHOT UNDERSTANDING PIPELINE ─────────────────────
    const ocrResult = await analyzePaymentScreenshot(proofBuffer, mimeType);

    await logPaymentAudit({
      action: "PAYMENT_PROOF_ANALYSIS_COMPLETED",
      actorId: user.id,
      targetId: payment.id,
      details: {
        attemptId: targetAttempt.id,
        detectedApp: ocrResult.detectedApp,
        detectedStatus: ocrResult.detectedStatus,
        detectedAmount: ocrResult.detectedAmount,
        detectedUtr: ocrResult.detectedUtr,
        confidence: ocrResult.confidence,
      },
      ipAddress,
      userAgent,
    });

    // Set attempt status to VERIFYING
    await db.paymentAttempt.update({
      where: { id: targetAttempt.id },
      data: {
        status: "VERIFYING",
      },
    });

    await logPaymentAudit({
      action: "PAYMENT_AUTO_VERIFICATION_STARTED",
      actorId: user.id,
      targetId: payment.id,
      details: {
        attemptId: targetAttempt.id,
        utr: ocrResult.detectedUtr,
        amount: ocrResult.detectedAmount,
      },
      ipAddress,
      userAgent,
    });

    // ─── EXECUTE DETERMINISTIC VERIFICATION ORCHESTRATION ────────────────────
    const decision = await verifyPaymentAttemptWithEvidence({
      attemptId: targetAttempt.id,
      userId: user.id,
      ocrResult,
      proofFilePath: uploadResult.filePath,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: decision.status === "SUCCESS",
      ...decision,
      ocrDetails: {
        detectedApp: ocrResult.detectedApp,
        detectedStatus: ocrResult.detectedStatus,
        detectedAmount: ocrResult.detectedAmount,
        detectedUtr: ocrResult.detectedUtr ? `••••••${ocrResult.detectedUtr.slice(-4)}` : null,
        detectedDate: ocrResult.detectedDate,
        detectedTime: ocrResult.detectedTime,
      },
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/proof error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process automatic payment verification" },
      { status: 400 }
    );
  }
}
