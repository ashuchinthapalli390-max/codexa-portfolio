import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePaymentProof } from "@/lib/payment-storage";
import {
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_SIZE_BYTES,
  logPaymentAudit,
} from "@/lib/payments/automated-upi";
import { analyzePaymentScreenshot } from "@/lib/payments/analyze-payment-proof";
import {
  verifyPaymentAttemptWithEvidence,
  getFriendlyFailureMessage,
} from "@/lib/payments/verify-payment-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/attempt/[attemptId]/screenshot
 * Dedicated screenshot upload endpoint strictly accepting ONLY an image file.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: paymentId, attemptId } = params;

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
      return NextResponse.json(
        { error: "Forbidden: Attempt ownership mismatch" },
        { status: 403 }
      );
    }

    const now = new Date();
    if (now > new Date(attempt.expiresAt)) {
      await db.paymentAttempt.update({
        where: { id: attemptId },
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

    const formData = await req.formData();
    const screenshot = formData.get("screenshot") as File | null;

    if (!screenshot) {
      return NextResponse.json(
        { error: "Payment screenshot is required" },
        { status: 400 }
      );
    }

    const mimeType = (screenshot.type || "image/jpeg").toLowerCase();
    if (!ALLOWED_PROOF_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Invalid format. Accepted: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (screenshot.size > MAX_PROOF_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Screenshot exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    const arrayBuffer = await screenshot.arrayBuffer();
    const proofBuffer = Buffer.from(arrayBuffer);

    // Save proof image privately
    const uploadResult = await savePaymentProof(
      paymentId,
      proofBuffer,
      screenshot.name || "proof.png",
      mimeType
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to save screenshot" },
        { status: 500 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Update status to ANALYZING_PROOF
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "ANALYZING_PROOF",
        submittedAt: now,
        proofImageUrl: uploadResult.filePath,
      },
    });

    // Run OCR analysis
    const ocrResult = await analyzePaymentScreenshot(proofBuffer, mimeType);

    // Update status to VERIFYING
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: { status: "VERIFYING" },
    });

    // Run Verification Engine
    const decision = await verifyPaymentAttemptWithEvidence({
      attemptId,
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
    console.error("POST /api/payments/[id]/attempt/[attemptId]/screenshot error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process screenshot verification" },
      { status: 400 }
    );
  }
}
