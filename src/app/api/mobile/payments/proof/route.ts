import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
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
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let paymentId: string | null = null;
    let attemptId: string | null = null;
    let screenshotFile: File | null = null;
    let utrNumber: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      screenshotFile = formData.get("screenshot") as File | null;
      paymentId = (formData.get("paymentId") as string)?.trim() || null;
      attemptId = (formData.get("attemptId") as string)?.trim() || null;
      utrNumber = (formData.get("utrNumber") as string)?.trim() || null;
    } else {
      const body = await req.json().catch(() => ({}));
      paymentId = body.paymentId || null;
      attemptId = body.attemptId || null;
      utrNumber = body.utrNumber || null;
    }

    // Find payment request
    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [
          ...(paymentId ? [{ id: paymentId }, { referenceId: paymentId }] : []),
          { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
        ],
      },
      include: {
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: { code: "PAYMENT_NOT_FOUND", message: "Payment record not found." }, requestId },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (payment.userId !== user.id) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "You can only submit proof for your own bills." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Check if already approved
    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        {
          ok: true,
          status: "SUCCESS",
          success: true,
          message: "Payment has already been confirmed and approved.",
        },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    const now = new Date();
    let proofFilePath = payment.proofImageUrl || "";
    let fileHash = payment.proofImageHash || "";
    let mimeType = payment.proofImageMimeType || "image/jpeg";

    // Handle actual image upload if provided
    if (screenshotFile) {
      mimeType = (screenshotFile.type || "image/jpeg").toLowerCase();
      if (!ALLOWED_PROOF_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { ok: false, error: { code: "INVALID_MIME", message: "Invalid format. Accepted: JPEG, PNG, WebP." }, requestId },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      if (screenshotFile.size > MAX_PROOF_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { ok: false, error: { code: "FILE_TOO_LARGE", message: "Screenshot exceeds the 10 MB limit." }, requestId },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const arrayBuffer = await screenshotFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await savePaymentProof(
        payment.id,
        buffer,
        screenshotFile.name || "screenshot.png",
        mimeType
      );

      if (!uploadResult.success) {
        return NextResponse.json(
          { ok: false, error: { code: "STORAGE_ERROR", message: uploadResult.error || "Failed to save screenshot." }, requestId },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      proofFilePath = uploadResult.filePath;
      fileHash = uploadResult.fileHash;
    }

    // Resolve target attempt
    let targetAttempt = attemptId
      ? payment.attempts.find((a) => a.id === attemptId)
      : payment.attempts[0];

    if (!targetAttempt) {
      const attemptRes = await startPaymentAttempt({
        paymentId: payment.id,
        userId: user.id,
        selectedMethod: "OTHER_UPI",
      });
      targetAttempt = attemptRes.attempt as any;
    }

    // Atomically transition payment to PENDING_APPROVAL
    await db.$transaction(async (tx) => {
      await tx.paymentRequest.update({
        where: { id: payment.id },
        data: {
          paymentStatus: "PENDING_APPROVAL",
          proofImageUrl: proofFilePath || payment.proofImageUrl,
          proofImageMimeType: mimeType,
          proofImageHash: fileHash || payment.proofImageHash,
          utrNumber: utrNumber || payment.utrNumber,
          submittedAt: now,
        },
      });

      if (targetAttempt) {
        await tx.paymentAttempt.update({
          where: { id: targetAttempt.id },
          data: {
            status: "PENDING_APPROVAL",
            submittedAt: now,
            proofImageUrl: proofFilePath || targetAttempt.proofImageUrl,
            proofImageHash: fileHash || targetAttempt.proofImageHash,
            utrNumber: utrNumber || targetAttempt.utrNumber,
          },
        });
      }
    });

    await logPaymentAudit({
      action: "PAYMENT_PROOF_SUBMITTED_MOBILE",
      actorId: user.id,
      targetId: payment.id,
      details: {
        paymentId: payment.id,
        referenceId: payment.referenceId,
        attemptId: targetAttempt?.id,
        filePath: proofFilePath,
        hasScreenshot: !!screenshotFile,
      },
    });

    // Notify Founder and Co-Founder via Email, Web Push, and Android FCM
    dispatchProofSubmittedNotifications({
      payment: {
        id: payment.id,
        referenceId: payment.referenceId,
        userId: user.id,
        userName: payment.userName || user.displayName || user.username,
        userEmail: payment.userEmail || user.email,
        domain: payment.domain,
        internId: payment.internId,
        fixedAmount: 450,
        paymentMethod: targetAttempt?.selectedMethod || payment.paymentMethod || "UPI",
        submittedAt: now,
        proofImageUrl: proofFilePath,
      },
      attempt: targetAttempt ? {
        id: targetAttempt.id,
        selectedMethod: targetAttempt.selectedMethod,
        submittedAt: now,
        proofImageUrl: proofFilePath,
      } : null,
    }).catch((err) => {
      console.error("[Proof Submitted Notifications Dispatch Error]", err);
    });

    return NextResponse.json({
      ok: true,
      success: true,
      status: "PENDING_APPROVAL",
      paymentStatus: "PENDING_APPROVAL",
      paymentId: payment.id,
      referenceId: payment.referenceId,
      amount: 450,
      submittedAt: now.toISOString(),
      message: "Payment screenshot submitted and is awaiting CodeXa management approval.",
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/payments/proof error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SUBMISSION_ERROR", message: err?.message || "Could not submit payment proof." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
