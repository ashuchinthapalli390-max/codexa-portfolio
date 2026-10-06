import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  submitPaymentProof,
  startPaymentAttempt,
  SupportedUpiMethod,
} from "@/lib/payments/automated-upi";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/proof
 * Uploads payment screenshot and processes automated verification.
 * Enforces:
 * - 5-minute deadline against authoritative server timestamp
 * - SHA-256 screenshot hashing & deduplication
 * - UTR normalization, length checks & deduplication
 * - Reconciliation against TrustedUpiTransaction feed
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
        { error: "Payment has already been confirmed and completed." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const screenshot = formData.get("screenshot") as File | null;
    const paymentDateStr = formData.get("paymentDate") as string | null;
    const paymentTime = (formData.get("paymentTime") as string) || null;
    const utrNumber = (formData.get("utrNumber") as string)?.trim() || null;
    const upiApp = (formData.get("upiApp") as string)?.trim() || null;
    let attemptId = (formData.get("attemptId") as string)?.trim() || null;

    if (!screenshot) {
      return NextResponse.json(
        { error: "Payment screenshot is mandatory." },
        { status: 400 }
      );
    }

    if (!utrNumber) {
      return NextResponse.json(
        { error: "UTR / Transaction ID is mandatory." },
        { status: 400 }
      );
    }

    if (!paymentDateStr || !paymentTime) {
      return NextResponse.json(
        { error: "Payment date and time are mandatory." },
        { status: 400 }
      );
    }

    // Resolve or create attempt
    const now = new Date();
    let targetAttempt = attemptId
      ? await db.paymentAttempt.findUnique({ where: { id: attemptId } })
      : null;

    if (!targetAttempt) {
      // Find latest non-expired attempt
      targetAttempt =
        payment.attempts.find(
          (a) =>
            ["PAYMENT_STARTED", "AWAITING_PROOF"].includes(a.status) &&
            new Date(a.expiresAt) > now
        ) || null;
    }

    // If still no active attempt found, check if there's a recently expired one or create one
    if (!targetAttempt) {
      const latestAttempt = payment.attempts[0];
      if (latestAttempt && new Date(latestAttempt.expiresAt) <= now) {
        return NextResponse.json(
          {
            status: "EXPIRED",
            error:
              "Payment verification window expired. Please click 'Try Again' or 'Pay Now' to start a new 5-minute payment session.",
            reason: "UPLOAD_EXPIRED",
          },
          { status: 400 }
        );
      }

      // Start an attempt on the fly if user skipped clicking pay button
      const newAttemptResult = await startPaymentAttempt({
        paymentId: payment.id,
        userId: user.id,
        selectedMethod: (upiApp?.toUpperCase() || "OTHER_UPI") as SupportedUpiMethod,
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
    const mimeType = screenshot.type || "image/jpeg";

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const verificationResult = await submitPaymentProof({
      attemptId: targetAttempt.id,
      userId: user.id,
      utrNumber,
      paymentDateStr,
      paymentTimeStr: paymentTime,
      upiAppUsed: upiApp || undefined,
      proofBuffer,
      proofMimeType: mimeType,
      originalFilename: screenshot.name,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: verificationResult.status === "SUCCESS",
      ...verificationResult,
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/proof error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit payment proof" },
      { status: 400 }
    );
  }
}
