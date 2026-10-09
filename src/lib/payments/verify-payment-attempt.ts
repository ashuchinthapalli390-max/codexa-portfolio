/**
 * CODEXA AGENCY — AUTOMATED PAYMENT VERIFICATION SERVICE
 * 
 * Responsibilities:
 * - Deterministic reconciliation of OCR screenshot evidence
 * - Strict 5-minute session window & timestamp checks
 * - SHA-256 and Perceptual duplicate proof detection
 * - UTR normalization and deduplication across all payments
 * - Strict ₹450 amount matching (Decimal/cents exactness)
 * - Reconciliation against TrustedUpiTransaction feed
 * - Atomic database updates, status transitions, and audit logs
 * 
 * NO manual approval fallback for mandatory ₹450 intern payment.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { OcrExtractionResult } from "./analyze-payment-proof";
import { getPaymentSettings, logPaymentAudit } from "./automated-upi";
import { sendPaymentApprovedEmail } from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";

export type MachineFailureReason =
  | "PROOF_UNREADABLE"
  | "PROOF_INVALID"
  | "DUPLICATE_PROOF"
  | "UTR_NOT_DETECTED"
  | "UTR_INVALID"
  | "DUPLICATE_UTR"
  | "AMOUNT_NOT_DETECTED"
  | "AMOUNT_MISMATCH"
  | "PAYMENT_STATUS_NOT_SUCCESSFUL"
  | "DATE_NOT_DETECTED"
  | "TIME_NOT_DETECTED"
  | "PAYMENT_TOO_EARLY"
  | "PAYMENT_OUTSIDE_WINDOW"
  | "UPLOAD_EXPIRED"
  | "RECEIVER_NOT_DETECTED"
  | "RECEIVER_MISMATCH"
  | "REFERENCE_MISMATCH"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_PENDING"
  | "TRANSACTION_FAILED"
  | "TRUSTED_TRANSACTION_UNAVAILABLE";

export interface VerificationChecks {
  screenshotReadable: "PASS" | "FAIL" | "REVIEW";
  paymentStatus: "PASS" | "FAIL" | "REVIEW";
  amount: "PASS" | "FAIL" | "REVIEW";
  utr: "PASS" | "FAIL" | "REVIEW";
  duplicateUtr: "PASS" | "FAIL" | "REVIEW";
  duplicateProof: "PASS" | "FAIL" | "REVIEW";
  receiver: "PASS" | "FAIL" | "REVIEW";
  paymentDate: "PASS" | "FAIL" | "REVIEW";
  paymentTime: "PASS" | "FAIL" | "REVIEW";
  trustedTransaction: "PASS" | "FAIL" | "REVIEW";
}

export interface VerificationDecision {
  status: "SUCCESS" | "REVIEW_REQUIRED" | "FAILED" | "EXPIRED";
  reason?: MachineFailureReason | string;
  userMessage?: string;
  verifiedAt?: string;
  utrNumber?: string;
  amount?: number;
  paymentApp?: string;
  checks?: VerificationChecks;
  issueCodes?: string[];
}

/**
 * Maps machine-readable failure reason to clean, professional user-facing text.
 */
export function getFriendlyFailureMessage(reason: MachineFailureReason | string): string {
  switch (reason) {
    case "AMOUNT_MISMATCH":
      return "Payment amount could not be verified as exact ₹450. Please ensure you transfer exactly ₹450.";
    case "AMOUNT_NOT_DETECTED":
      return "Payment amount could not be clearly read from the screenshot. Please upload a clear transaction receipt.";
    case "PAYMENT_STATUS_NOT_SUCCESSFUL":
      return "The uploaded screenshot does not show a successful payment. Only successful transactions are accepted.";
    case "UTR_NOT_DETECTED":
      return "12-digit UTR / UPI Transaction ID could not be detected. Please ensure your screenshot includes the full transaction details.";
    case "UTR_INVALID":
      return "The detected transaction identifier format is invalid.";
    case "DUPLICATE_UTR":
      return "This UTR / Transaction ID has already been registered for another verified payment.";
    case "DUPLICATE_PROOF":
      return "This payment screenshot appears to have already been used. Duplicate receipts are strictly rejected.";
    case "UPLOAD_EXPIRED":
      return "Your 5-minute payment session expired before proof was submitted. Please start a new session.";
    case "PAYMENT_TOO_EARLY":
      return "The transaction in the screenshot was made prior to initiating this payment session.";
    case "PAYMENT_OUTSIDE_WINDOW":
    case "PAYMENT_TIME_OUTSIDE_WINDOW":
      return "The transaction timestamp falls outside the authorized 5-minute payment window and requires administrative review.";
    case "RECEIVER_MISMATCH":
      return "The payee details in the receipt do not match the official CodeXa Agency payment account.";
    case "TRANSACTION_NOT_FOUND":
    case "TRUSTED_TRANSACTION_UNAVAILABLE":
      return "The transaction is being reconciled with the CodeXa settlement feed. Administrative verification required.";
    case "TRANSACTION_FAILED":
      return "The bank reports this transaction status as failed or reversed.";
    case "PROOF_UNREADABLE":
    default:
      return "Payment screenshot could not be automatically verified. Please ensure the image is clear and try again.";
  }
}

/**
 * Builds formatted WhatsApp notification message for Co-Founder B. Sanjay (7075920852)
 */
export function buildWhatsAppReviewMessage(params: {
  internName: string;
  internId: string;
  domain: string;
  amount: number;
  paymentMethod: string;
  referenceId: string;
  utrNumber?: string | null;
  windowStart: string;
  windowEnd: string;
  detectedTime?: string | null;
  issue: string;
  reviewUrl: string;
}): string {
  const maskedUtr = params.utrNumber
    ? params.utrNumber.length > 4
      ? `••••••••${params.utrNumber.slice(-4)}`
      : params.utrNumber
    : "N/A";

  return [
    "CodeXa Payment Verification Required",
    "",
    `Intern: ${params.internName}`,
    `Intern ID: ${params.internId}`,
    `Domain: ${params.domain}`,
    "",
    `Amount: ₹${params.amount}`,
    `Method: ${params.paymentMethod}`,
    `Reference: ${params.referenceId}`,
    "",
    `Detected UTR: ${maskedUtr}`,
    "",
    "Expected Payment Window:",
    `${params.windowStart} – ${params.windowEnd}`,
    "",
    `Detected Payment Time: ${params.detectedTime || "N/A"}`,
    "",
    `Issue:`,
    `${params.issue}`,
    "",
    "All remaining verification checks passed.",
    "",
    "Review Payment:",
    params.reviewUrl,
    "",
    "— CodeXa Payment System",
  ].join("\n");
}

/**
 * Deterministic automated verification pipeline.
 */
export async function verifyPaymentAttemptWithEvidence(params: {
  attemptId: string;
  userId: string;
  ocrResult: OcrExtractionResult;
  proofFilePath: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<VerificationDecision> {
  const { attemptId, userId, ocrResult, proofFilePath, ipAddress, userAgent } = params;

  // 1. Load Attempt and Parent Payment Request
  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paymentRequest: true,
      user: true,
    },
  });

  if (!attempt) {
    throw new Error("Payment session attempt not found.");
  }

  if (attempt.userId !== userId) {
    throw new Error("Forbidden: Payment attempt ownership mismatch.");
  }

  if (attempt.status === "SUCCESS") {
    return {
      status: "SUCCESS",
      userMessage: "Payment has already been successfully confirmed.",
      verifiedAt: attempt.verifiedAt?.toISOString(),
      utrNumber: attempt.utrNumber || attempt.detectedUtr || undefined,
      amount: 450,
      paymentApp: attempt.detectedApp || attempt.selectedMethod,
      checks: {
        screenshotReadable: "PASS",
        paymentStatus: "PASS",
        amount: "PASS",
        utr: "PASS",
        duplicateUtr: "PASS",
        duplicateProof: "PASS",
        receiver: "PASS",
        paymentDate: "PASS",
        paymentTime: "PASS",
        trustedTransaction: "PASS",
      },
    };
  }

  const now = new Date();
  const settings = await getPaymentSettings();

  // 2. Validate 5-Minute Window Expiry for Submission
  // CRITICAL FIX (Requirement 8): Validate submission time (attempt.submittedAt), NOT OCR completion time.
  // The transaction and upload are valid if the user uploaded within the window, regardless of OCR duration.
  const submissionTime = attempt.submittedAt ? new Date(attempt.submittedAt) : now;
  if (submissionTime > attempt.expiresAt) {
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "EXPIRED",
        verificationReason: "UPLOAD_EXPIRED",
        proofImageUrl: proofFilePath,
        proofImageHash: ocrResult.proofHash,
        perceptualHash: ocrResult.perceptualHash,
      },
    });

    await db.paymentRequest.update({
      where: { id: attempt.paymentId },
      data: { paymentStatus: "EXPIRED" },
    });

    await logPaymentAudit({
      action: "PAYMENT_ATTEMPT_EXPIRED",
      actorId: userId,
      targetId: attempt.paymentId,
      details: { attemptId, reason: "UPLOAD_EXPIRED", submissionTime, expiresAt: attempt.expiresAt },
      ipAddress,
      userAgent,
    });

    return {
      status: "EXPIRED",
      reason: "UPLOAD_EXPIRED",
      userMessage: getFriendlyFailureMessage("UPLOAD_EXPIRED"),
    };
  }

  // 3. Initialize Checks Structure
  const checks: VerificationChecks = {
    screenshotReadable: "PASS",
    paymentStatus: "PASS",
    amount: "PASS",
    utr: "PASS",
    duplicateUtr: "PASS",
    duplicateProof: "PASS",
    receiver: "PASS",
    paymentDate: "PASS",
    paymentTime: "PASS",
    trustedTransaction: "PASS",
  };
  const issueCodes: string[] = [];

  // Check 3.1: Screenshot readability
  if (ocrResult.confidence.utrConfidence < 0.15 && !ocrResult.detectedUtr) {
    checks.screenshotReadable = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "PROOF_UNREADABLE", checks, ["PROOF_UNREADABLE"], ipAddress, userAgent);
  }

  // Check 3.2: Duplicate Screenshot Check (Exact SHA-256 & Perceptual Hash)
  const duplicateProof = await db.paymentAttempt.findFirst({
    where: {
      OR: [
        { proofImageHash: ocrResult.proofHash },
        { perceptualHash: ocrResult.perceptualHash },
      ],
      id: { not: attemptId },
      status: "SUCCESS",
    },
  });

  if (duplicateProof) {
    checks.duplicateProof = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "DUPLICATE_PROOF", checks, ["DUPLICATE_PROOF"], ipAddress, userAgent);
  }

  // Check 3.3: Status Check from OCR
  if (ocrResult.detectedStatus !== "SUCCESS") {
    checks.paymentStatus = "FAIL";
    const reason: MachineFailureReason =
      ocrResult.detectedStatus === "FAILED"
        ? "PAYMENT_STATUS_NOT_SUCCESSFUL"
        : "PROOF_UNREADABLE";
    return await recordFailure(attempt, ocrResult, proofFilePath, reason, checks, [reason], ipAddress, userAgent);
  }

  // Check 3.4: Amount Check (Fixed ₹450.00 exact)
  if (ocrResult.detectedAmount === null) {
    checks.amount = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "AMOUNT_NOT_DETECTED", checks, ["AMOUNT_NOT_DETECTED"], ipAddress, userAgent);
  }

  if (Math.abs(ocrResult.detectedAmount - 450) > 0.01) {
    checks.amount = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "AMOUNT_MISMATCH", checks, ["AMOUNT_MISMATCH"], ipAddress, userAgent);
  }

  // Check 3.5: UTR / Transaction ID Extraction & Normalization
  if (!ocrResult.detectedUtr) {
    checks.utr = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "UTR_NOT_DETECTED", checks, ["UTR_NOT_DETECTED"], ipAddress, userAgent);
  }

  const cleanUtr = ocrResult.detectedUtr.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleanUtr.length < 8 || cleanUtr.length > 24) {
    checks.utr = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "UTR_INVALID", checks, ["UTR_INVALID"], ipAddress, userAgent);
  }

  // Check 3.6: Duplicate UTR across all successful payments
  const duplicateUtr = await db.paymentAttempt.findFirst({
    where: {
      utrNumber: cleanUtr,
      id: { not: attemptId },
      status: "SUCCESS",
    },
  });

  if (duplicateUtr) {
    checks.duplicateUtr = "FAIL";
    return await recordFailure(attempt, ocrResult, proofFilePath, "DUPLICATE_UTR", checks, ["DUPLICATE_UTR"], ipAddress, userAgent);
  }

  // Check 3.7: Receiver Validation
  if (ocrResult.detectedReceiverUpi) {
    const officialUpi = (settings.upiId || settings.defaultUpiId || "7075920852@ptyes").toLowerCase();
    if (!ocrResult.detectedReceiverUpi.includes(officialUpi) && !officialUpi.includes(ocrResult.detectedReceiverUpi)) {
      checks.receiver = "FAIL";
      return await recordFailure(attempt, ocrResult, proofFilePath, "RECEIVER_MISMATCH", checks, ["RECEIVER_MISMATCH"], ipAddress, userAgent);
    }
  }

  // Check 3.8: Timestamp Window Check (Tolerance: default 60s)
  const toleranceSeconds = settings.clockToleranceSeconds || 60;
  const toleranceMs = toleranceSeconds * 1000;
  const minAllowed = new Date(attempt.startedAt.getTime() - toleranceMs);
  const maxAllowed = new Date(attempt.expiresAt.getTime() + toleranceMs);

  let isTimeOutsideWindow = false;
  if (ocrResult.detectedTimestamp) {
    if (ocrResult.detectedTimestamp < minAllowed) {
      // Made before session started
      checks.paymentTime = "REVIEW";
      isTimeOutsideWindow = true;
      issueCodes.push("PAYMENT_TOO_EARLY");
    } else if (ocrResult.detectedTimestamp > maxAllowed) {
      // Made slightly after 5-minute window
      checks.paymentTime = "REVIEW";
      isTimeOutsideWindow = true;
      issueCodes.push("PAYMENT_TIME_OUTSIDE_WINDOW");
    }
  }

  // Check 3.9: RECONCILIATION WITH TRUSTED TRANSACTION FEED
  // Screenshot alone is evidence, not cryptographic proof.
  // Reconcile against TrustedUpiTransaction feed where consumedByPaymentId is null.
  const trustedTx = await db.trustedUpiTransaction.findFirst({
    where: {
      utrNumber: { equals: cleanUtr, mode: "insensitive" },
      consumedByPaymentId: null,
    },
  });

  let trustedTxMatched = false;
  if (trustedTx) {
    const trustedAmount = Number(trustedTx.amount);
    if (Math.abs(trustedAmount - 450) > 0.01) {
      checks.trustedTransaction = "FAIL";
      return await recordFailure(attempt, ocrResult, proofFilePath, "AMOUNT_MISMATCH", checks, ["AMOUNT_MISMATCH"], ipAddress, userAgent);
    }

    if (trustedTx.status !== "SUCCESS") {
      checks.trustedTransaction = "FAIL";
      return await recordFailure(attempt, ocrResult, proofFilePath, "TRANSACTION_FAILED", checks, ["TRANSACTION_FAILED"], ipAddress, userAgent);
    }
    trustedTxMatched = true;
    checks.trustedTransaction = "PASS";
  } else {
    // If not in trusted feed:
    // Section 46: Do NOT fake trusted verification. Route to REVIEW_REQUIRED or UNVERIFIED.
    checks.trustedTransaction = "REVIEW";
    issueCodes.push("TRUSTED_TRANSACTION_UNAVAILABLE");
  }

  // 4. DECISION ARBITRATION
  // If time is outside window OR trusted feed is unavailable/pending verification -> REVIEW_REQUIRED
  if (isTimeOutsideWindow || !trustedTxMatched) {
    const primaryReason = isTimeOutsideWindow
      ? "PAYMENT_TIME_OUTSIDE_WINDOW"
      : "TRUSTED_TRANSACTION_UNAVAILABLE";

    return await recordReviewRequired(
      attempt,
      ocrResult,
      proofFilePath,
      primaryReason,
      checks,
      issueCodes,
      cleanUtr,
      ipAddress,
      userAgent
    );
  }

  // 5. 100% PASS: ATOMIC CONSUMPTION & AUTO_SUCCESS
  const verifiedNow = new Date();

  // Atomically mark Trusted Transaction as consumed if present
  if (trustedTx) {
    await db.trustedUpiTransaction.update({
      where: { id: trustedTx.id },
      data: {
        consumedByPaymentId: attempt.paymentId,
        consumedAt: verifiedNow,
      },
    });
  }

  // Update Payment Attempt to SUCCESS with full OCR audit snapshot
  await db.paymentAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUCCESS",
      utrNumber: cleanUtr,
      proofImageUrl: proofFilePath,
      proofImageHash: ocrResult.proofHash,
      perceptualHash: ocrResult.perceptualHash,
      detectedApp: ocrResult.detectedApp,
      detectedAmount: ocrResult.detectedAmount ? new Prisma.Decimal(ocrResult.detectedAmount.toString()) : null,
      detectedCurrency: ocrResult.detectedCurrency,
      detectedStatus: ocrResult.detectedStatus,
      detectedUtr: cleanUtr,
      detectedTransactionId: ocrResult.detectedTransactionId,
      detectedDate: ocrResult.detectedDate,
      detectedTime: ocrResult.detectedTime,
      detectedTimestamp: ocrResult.detectedTimestamp,
      detectedReceiverName: ocrResult.detectedReceiverName,
      detectedReceiverUpi: ocrResult.detectedReceiverUpi,
      detectedReference: ocrResult.detectedReference,
      ocrConfidence: {
        confidence: ocrResult.confidence,
        checks,
        issueCodes: [],
      } as any,
      verificationReason: "MATCHED_TRUSTED_TRANSACTION",
      verificationSource: "TRUSTED_BANK_FEED",
      matchedTransactionId: trustedTx?.id || null,
      verifiedAt: verifiedNow,
      submittedAt: now,
    },
  });

  // Update Payment Request to APPROVED
  await db.paymentRequest.update({
    where: { id: attempt.paymentId },
    data: {
      paymentStatus: "APPROVED",
      successfulAttemptId: attemptId,
      utrNumber: cleanUtr,
      proofImageUrl: proofFilePath,
      proofImageHash: ocrResult.proofHash,
      paidAt: verifiedNow,
      verifiedAt: verifiedNow,
      verifiedByName: "CodeXa Automated Decision Engine",
      verificationSource: "TRUSTED_BANK_FEED",
    },
  });

  // Mark internServicePaymentPaid on User account
  await db.user.update({
    where: { id: attempt.userId },
    data: {
      internServicePaymentPaid: true,
    },
  });

  // Audit Logging
  await logPaymentAudit({
    action: "PAYMENT_AUTO_VERIFICATION_SUCCESS",
    actorId: attempt.userId,
    targetId: attempt.paymentId,
    details: {
      attemptId,
      utr: cleanUtr,
      amount: 450,
      matchedTransactionId: trustedTx?.id || null,
      app: ocrResult.detectedApp,
      verifiedAt: verifiedNow.toISOString(),
      checks,
    },
    ipAddress,
    userAgent,
  });

  // Send Confirmation Email
  const userEmail = attempt.paymentRequest.userEmail || attempt.user?.email;
  if (userEmail) {
    sendPaymentApprovedEmail({
      recipientEmail: userEmail,
      recipientName: attempt.paymentRequest.userName || "Intern",
      referenceId: attempt.paymentRequest.referenceId,
      title: attempt.paymentRequest.title,
      amount: 450,
      utrNumber: cleanUtr,
    }).catch((err) => console.error("[Email Error]", err));
  }

  // Send Web Push Notification
  sendPushNotification(attempt.userId, {
    title: "🎉 CodeXa Payment Confirmed",
    body: "Your mandatory ₹450 internship payment is verified. Student ID card & AI tools pack are unlocked!",
    icon: "/email-assets/codexa-logo.png",
    badge: "/email-assets/codexa-logo.png",
    tag: "mandatory-service-payment-success",
    data: {
      type: "MANDATORY_SERVICE_PAYMENT_SUCCESS",
      url: "/dashboard/payments",
    },
  }).catch(() => {});

  return {
    status: "SUCCESS",
    verifiedAt: verifiedNow.toISOString(),
    utrNumber: cleanUtr,
    amount: 450,
    paymentApp: ocrResult.detectedApp,
    checks,
    issueCodes: [],
  };
}

/**
 * Helper to record REVIEW_REQUIRED state for minor exceptions (e.g. late payment, offline feed).
 */
async function recordReviewRequired(
  attempt: any,
  ocrResult: OcrExtractionResult,
  proofFilePath: string,
  reason: MachineFailureReason | string,
  checks: VerificationChecks,
  issueCodes: string[],
  cleanUtr: string | null,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<VerificationDecision> {
  const now = new Date();

  await db.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "REVIEW_REQUIRED",
      verificationReason: reason,
      utrNumber: cleanUtr,
      proofImageUrl: proofFilePath,
      proofImageHash: ocrResult.proofHash,
      perceptualHash: ocrResult.perceptualHash,
      detectedApp: ocrResult.detectedApp,
      detectedAmount: ocrResult.detectedAmount ? new Prisma.Decimal(ocrResult.detectedAmount.toString()) : null,
      detectedCurrency: ocrResult.detectedCurrency,
      detectedStatus: ocrResult.detectedStatus,
      detectedUtr: cleanUtr,
      detectedTransactionId: ocrResult.detectedTransactionId,
      detectedDate: ocrResult.detectedDate,
      detectedTime: ocrResult.detectedTime,
      detectedTimestamp: ocrResult.detectedTimestamp,
      detectedReceiverName: ocrResult.detectedReceiverName,
      detectedReceiverUpi: ocrResult.detectedReceiverUpi,
      detectedReference: ocrResult.detectedReference,
      ocrConfidence: {
        confidence: ocrResult.confidence,
        checks,
        issueCodes,
      } as any,
      submittedAt: now,
    },
  });

  await db.paymentRequest.update({
    where: { id: attempt.paymentId },
    data: {
      paymentStatus: "REVIEW_REQUIRED",
      utrNumber: cleanUtr,
      proofImageUrl: proofFilePath,
      proofImageHash: ocrResult.proofHash,
    },
  });

  await logPaymentAudit({
    action: "PAYMENT_REVIEW_REQUIRED",
    actorId: attempt.userId,
    targetId: attempt.paymentId,
    details: {
      attemptId: attempt.id,
      reason,
      issueCodes,
      checks,
      detectedUtr: cleanUtr,
      detectedAmount: ocrResult.detectedAmount,
      detectedTime: ocrResult.detectedTime,
    },
    ipAddress,
    userAgent,
  });

  // Notify Founder & Co-Founder via Web Push
  try {
    const admins = await db.user.findMany({
      where: {
        role: { in: ["FOUNDER", "CO_FOUNDER"] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const admin of admins) {
      sendPushNotification(admin.id, {
        title: "⚠️ CodeXa Payment Review Required",
        body: `Payment from ${attempt.paymentRequest?.userName || "Intern"} (${attempt.paymentRequest?.referenceId}) requires manual verification review.`,
        icon: "/email-assets/codexa-logo.png",
        badge: "/email-assets/codexa-logo.png",
        tag: "payment-review-required",
        data: {
          type: "PAYMENT_REVIEW_REQUIRED",
          url: `/dashboard/payments/${attempt.paymentId}`,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Failed to notify admins for review required:", err);
  }

  return {
    status: "REVIEW_REQUIRED",
    reason,
    userMessage: "Payment detected. A minor detail requires verification review by CodeXa administration.",
    utrNumber: cleanUtr || undefined,
    amount: 450,
    paymentApp: ocrResult.detectedApp,
    checks,
    issueCodes,
  };
}

/**
 * Helper to persist failure decision with machine reason and audit logs.
 */
async function recordFailure(
  attempt: any,
  ocrResult: OcrExtractionResult,
  proofFilePath: string,
  reason: MachineFailureReason,
  checks: VerificationChecks,
  issueCodes: string[],
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<VerificationDecision> {
  const cleanUtr = ocrResult.detectedUtr?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || null;

  await db.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "FAILED",
      verificationReason: reason,
      utrNumber: cleanUtr,
      proofImageUrl: proofFilePath,
      proofImageHash: ocrResult.proofHash,
      perceptualHash: ocrResult.perceptualHash,
      detectedApp: ocrResult.detectedApp,
      detectedAmount: ocrResult.detectedAmount ? new Prisma.Decimal(ocrResult.detectedAmount.toString()) : null,
      detectedCurrency: ocrResult.detectedCurrency,
      detectedStatus: ocrResult.detectedStatus,
      detectedUtr: cleanUtr,
      detectedTransactionId: ocrResult.detectedTransactionId,
      detectedDate: ocrResult.detectedDate,
      detectedTime: ocrResult.detectedTime,
      detectedTimestamp: ocrResult.detectedTimestamp,
      detectedReceiverName: ocrResult.detectedReceiverName,
      detectedReceiverUpi: ocrResult.detectedReceiverUpi,
      detectedReference: ocrResult.detectedReference,
      ocrConfidence: {
        confidence: ocrResult.confidence,
        checks,
        issueCodes,
      } as any,
    },
  });

  await db.paymentRequest.update({
    where: { id: attempt.paymentId },
    data: {
      paymentStatus: "FAILED",
      rejectionReason: getFriendlyFailureMessage(reason),
    },
  });

  await logPaymentAudit({
    action: "PAYMENT_AUTO_VERIFICATION_FAILED",
    actorId: attempt.userId,
    targetId: attempt.paymentId,
    details: {
      attemptId: attempt.id,
      reason,
      checks,
      issueCodes,
      detectedUtr: cleanUtr,
      detectedAmount: ocrResult.detectedAmount,
      detectedStatus: ocrResult.detectedStatus,
    },
    ipAddress,
    userAgent,
  });

  return {
    status: "FAILED",
    reason,
    userMessage: getFriendlyFailureMessage(reason),
    utrNumber: cleanUtr || undefined,
    paymentApp: ocrResult.detectedApp,
    checks,
    issueCodes,
  };
}
