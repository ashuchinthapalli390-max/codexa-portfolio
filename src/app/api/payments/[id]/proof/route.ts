import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePaymentProof } from "@/lib/payment-storage";
import {
  startPaymentAttempt,
  logPaymentAudit,
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_SIZE_BYTES,
} from "@/lib/payments/automated-upi";
import { dispatchProofSubmittedNotifications } from "@/lib/payments/manual-approval-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/proof
 * 
 * FAST, SECURE MANUAL PAYMENT APPROVAL INGESTION:
 * - Accepts payment screenshot (JPEG, PNG, WebP <= 10MB)
 * - Persists proof privately
 * - Sets status immediately to PENDING_APPROVAL
 * - Dispatches notifications to Founder and Co-Founder (Email + Attachment, Web Push, In-App)
 * - Returns prompt response without blocking on slow OCR or bank APIs
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

    // Resolve or initialize attempt
    const now = new Date();
    let targetAttempt = attemptId
      ? await db.paymentAttempt.findUnique({ where: { id: attemptId } })
      : null;

    if (!targetAttempt) {
      targetAttempt =
        payment.attempts.find(
          (a) =>
            ["PAYMENT_STARTED", "AWAITING_PROOF", "AWAITING_SCREENSHOT", "PENDING_APPROVAL"].includes(a.status)
        ) || null;
    }

    if (!targetAttempt) {
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

    // Atomically persist PENDING_APPROVAL on attempt and payment request
    await db.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: targetAttempt!.id },
        data: {
          status: "PENDING_APPROVAL",
          submittedAt: now,
          proofImageUrl: uploadResult.filePath,
          proofImageHash: uploadResult.fileHash,
        },
      });

      await tx.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "PENDING_APPROVAL",
          proofImageUrl: uploadResult.filePath,
          proofImageMimeType: mimeType,
          proofImageHash: uploadResult.fileHash,
          paymentMethod: targetAttempt!.selectedMethod || payment.paymentMethod || "OTHER_UPI",
          submittedAt: now,
        },
      });
    });

    await logPaymentAudit({
      action: "PAYMENT_PROOF_SUBMITTED_FOR_APPROVAL",
      actorId: user.id,
      targetId: payment.id,
      details: {
        attemptId: targetAttempt.id,
        fileSize: proofBuffer.length,
        mimeType,
        filePath: uploadResult.filePath,
        selectedMethod: targetAttempt.selectedMethod,
      },
      ipAddress,
      userAgent,
    });

    // Asynchronously dispatch all management notifications (Founder & Co-Founder)
    dispatchProofSubmittedNotifications({
      payment: {
        id: payment.id,
        referenceId: payment.referenceId,
        userId: user.id,
        userName: payment.userName || user.displayName || user.displayName || user.username,
        userEmail: payment.userEmail || user.email,
        domain: payment.domain,
        internId: payment.internId,
        fixedAmount: 450,
        paymentMethod: targetAttempt.selectedMethod || payment.paymentMethod || "OTHER_UPI",
        submittedAt: now,
        proofImageUrl: uploadResult.filePath,
      },
      attempt: {
        id: targetAttempt.id,
        selectedMethod: targetAttempt.selectedMethod,
        submittedAt: now,
        proofImageUrl: uploadResult.filePath,
      },
    }).catch((err) => {
      console.error("[Management Notification Dispatch Error]", err);
    });

    return NextResponse.json({
      success: true,
      status: "PENDING_APPROVAL",
      message: "Payment proof submitted successfully. The CodeXa Founder or Co-Founder will review your payment and update its status.",
      submittedAt: now.toISOString(),
      proofImageUrl: uploadResult.filePath,
      referenceId: payment.referenceId,
      amount: 450,
      paymentMethod: targetAttempt.selectedMethod || "OTHER_UPI",
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/proof error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit payment screenshot" },
      { status: 500 }
    );
  }
}
