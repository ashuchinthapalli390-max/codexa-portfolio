import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePaymentProof } from "@/lib/payment-storage";
import { dataStore } from "@/lib/data-store";
import { sendPaymentProofSubmittedEmail } from "@/lib/email/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/proof
 * Uploads payment screenshot and submits payment for manual verification.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: { OR: [{ id }, { referenceId: id }] },
      include: { submissions: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    }

    // Ownership check: User must own the payment
    if (payment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: You can only submit proof for your own payments." }, { status: 403 });
    }

    // Status check
    const isResubmission = payment.paymentStatus === "REJECTED";
    if (payment.paymentStatus !== "PENDING_PAYMENT" && !isResubmission) {
      return NextResponse.json(
        { error: `Payment is currently ${payment.paymentStatus}. Further proof submission is locked.` },
        { status: 400 }
      );
    }

    // Check system setting for resubmission
    const settings = await db.paymentSetting.findFirst({ where: { id: "cxa_payment_settings" } });
    if (isResubmission && settings && !settings.allowResubmission) {
      return NextResponse.json({ error: "Resubmission is currently disabled by agency policy." }, { status: 403 });
    }

    if (settings && !settings.proofUploadEnabled) {
      return NextResponse.json({ error: "Proof upload is temporarily disabled by agency administrators." }, { status: 403 });
    }

    const formData = await req.formData();
    const screenshot = formData.get("screenshot") as File | null;
    const paymentDateStr = formData.get("paymentDate") as string | null;
    const paymentTime = (formData.get("paymentTime") as string) || null;
    const utrNumber = (formData.get("utrNumber") as string)?.trim() || null;
    const upiApp = (formData.get("upiApp") as string)?.trim() || null;
    const userNote = (formData.get("userNote") as string)?.trim() || null;

    if (!screenshot) {
      return NextResponse.json({ error: "Payment screenshot is required." }, { status: 400 });
    }

    if (!paymentDateStr) {
      return NextResponse.json({ error: "Payment date is required." }, { status: 400 });
    }

    if (settings?.isUtrRequired && !utrNumber) {
      return NextResponse.json({ error: "Transaction / UTR reference number is required." }, { status: 400 });
    }

    // Save proof screenshot to secure private storage
    const arrayBuffer = await screenshot.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const saveResult = await savePaymentProof(
      payment.id,
      fileBuffer,
      screenshot.name,
      screenshot.type || "image/jpeg"
    );

    if (!saveResult.success) {
      return NextResponse.json({ error: saveResult.error || "Failed to save screenshot." }, { status: 400 });
    }

    const nextSubmissionNumber = (payment.submissions?.length || 0) + 1;
    const parsedPaymentDate = new Date(paymentDateStr);

    // Create payment submission entry
    const submission = await db.paymentSubmission.create({
      data: {
        paymentRequestId: payment.id,
        submissionNumber: nextSubmissionNumber,
        proofImageUrl: saveResult.filePath,
        proofImageMimeType: saveResult.mimeType,
        proofImageHash: saveResult.fileHash,
        transactionId: utrNumber,
        utrNumber,
        paymentDate: parsedPaymentDate,
        paymentTime,
        upiApp,
        userNote,
        status: "PENDING_VERIFICATION",
      },
    });

    // Update payment request to PENDING_VERIFICATION
    const updatedPayment = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentStatus: "PENDING_VERIFICATION",
        submittedAt: new Date(),
        utrNumber,
        paymentDate: parsedPaymentDate,
        paymentTime,
        upiApp,
        proofImageUrl: saveResult.filePath,
        proofImageMimeType: saveResult.mimeType,
        proofImageHash: saveResult.fileHash,
        userNote,
        // Clear previous rejection reason if resubmitted
        rejectionReason: null,
        rejectedBy: null,
        rejectedByName: null,
        rejectedAt: null,
      },
    });

    const auditAction = isResubmission ? "PAYMENT_PROOF_RESUBMITTED" : "PAYMENT_PROOF_SUBMITTED";
    await dataStore.logAudit(
      user.id,
      auditAction,
      `Submitted payment proof for ${payment.referenceId} (UTR: ${utrNumber || "N/A"})`
    );

    // Async notify user that proof was received
    if (user.email || payment.userEmail) {
      sendPaymentProofSubmittedEmail({
        referenceId: payment.referenceId,
        recipientName: user.displayName || user.username || "Team Member",
        recipientEmail: user.email || payment.userEmail || "",
        title: payment.title,
        amount: payment.fixedAmount,
        utrNumber: utrNumber || undefined,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully. Pending verification.",
      payment: updatedPayment,
      submission,
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/proof error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit payment proof" }, { status: 500 });
  }
}
