/**
 * CODEXA AGENCY — AUTOMATED UPI PAYMENT ENGINE FOR INTERNS
 * 
 * Strict Server-Enforced Rules:
 * 1. Fixed & Non-Editable ₹450 (Mandatory ID Card: ₹150 + AI Dev Tools Pack: ₹300)
 * 2. Dedicated 5-Minute Server-Enforced Payment Window
 * 3. Double-Click & Concurrency Lock Protection
 * 4. Proof SHA-256 Hashing & Duplicate Detection
 * 5. UTR Normalization, Format Validation & Duplicate Detection
 * 6. Automated Decision Engine Reconciling Against Trusted Bank/UPI Feed
 * 7. Founder & Co-Founder Restricted Settings Management
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { generatePaymentReferenceId } from "@/lib/cxa-ids";
import { savePaymentProof } from "@/lib/payment-storage";
import {
  sendPaymentApprovedEmail,
  sendPaymentProofSubmittedEmail,
  sendPaymentRejectedEmail,
} from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";

export const FIXED_INTERNSHIP_AMOUNT = 450.0;
export const MANDATORY_ID_CARD_AMOUNT = 150.0;
export const MANDATORY_AI_TOOLS_AMOUNT = 300.0;

export const DEFAULT_RECEIVER_NAME = "CodeXa Agency";
export const DEFAULT_RECEIVER_UPI = "shaikashu33@fam";
export const DEFAULT_PROOF_WINDOW_MINUTES = 5;
export const DEFAULT_CLOCK_TOLERANCE_SECONDS = 60;
export const MAX_PROOF_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type SupportedUpiMethod =
  | "PHONEPE"
  | "GPAY"
  | "GOOGLE_PAY"
  | "PAYTM"
  | "FAM"
  | "FAMPAY"
  | "AMAZON_PAY"
  | "BHIM"
  | "CRED"
  | "WHATSAPP_PAY"
  | "OTHER_UPI";

export const ALLOWED_PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MANDATORY_BILL_BREAKDOWN = {
  domain: "Development",
  items: [
    {
      item: "Mandatory ID Card",
      amount: MANDATORY_ID_CARD_AMOUNT,
    },
    {
      item: "AI Dev Tools Pack (Shared)",
      amount: MANDATORY_AI_TOOLS_AMOUNT,
      includes: [
        "Nexa AI Access",
        "ChatGPT Astra",
        "Anthropic Fabel",
        "Gemini Pro",
        "More models",
      ],
    },
  ],
  total: FIXED_INTERNSHIP_AMOUNT,
};

// ─── 1. PAYMENT SETTINGS RESOLVER ─────────────────────────────────────────────

export async function getPaymentSettings() {
  const existing = await db.paymentSetting.findUnique({
    where: { id: "cxa_payment_settings" },
  });

  if (existing) {
    return existing;
  }

  // Create default settings if not exists
  return await db.paymentSetting.create({
    data: {
      id: "cxa_payment_settings",
      receiverName: DEFAULT_RECEIVER_NAME,
      upiDisplayName: DEFAULT_RECEIVER_NAME,
      upiId: DEFAULT_RECEIVER_UPI,
      defaultUpiId: DEFAULT_RECEIVER_UPI,
      fixedInternshipAmount: new Prisma.Decimal("450.00"),
      phonePeEnabled: true,
      googlePayEnabled: true,
      paytmEnabled: true,
      otherUpiEnabled: true,
      proofWindowMinutes: DEFAULT_PROOF_WINDOW_MINUTES,
      clockToleranceSeconds: DEFAULT_CLOCK_TOLERANCE_SECONDS,
      verificationProvider: "BANK_STATEMENT_MATCH",
      systemEnabled: true,
      allowAdminOverride: true,
      paymentInstructions:
        "Scan the QR code or tap your preferred UPI app. Pay exactly ₹450 and upload your transaction screenshot with UTR within 5 minutes.",
      proofUploadEnabled: true,
      isUtrRequired: true,
      allowResubmission: true,
    },
  });
}

// ─── 2. AUDIT LOG HELPER ──────────────────────────────────────────────────────

export async function logPaymentAudit(params: {
  action: string;
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId || null,
        actorName: params.actorName || null,
        targetId: params.targetId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Failed to log payment audit:", err);
  }
}

// ─── 3. GET OR AUTO-CREATE INTERN PAYMENT ──────────────────────────────────────

export async function getOrCreateInternPayment(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      orgRole: true,
      department: true,
      internServicePaymentPaid: true,
      profile: {
        select: { displayName: true },
      },
      employmentProfile: {
        select: { employeeId: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Find existing internship payment
  let payment = await db.paymentRequest.findFirst({
    where: {
      userId,
      paymentPurpose: {
        in: ["INTERNSHIP_FEE", "INTERNSHIP_SERVICE_BILL"],
      },
    },
    include: {
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const settings = await getPaymentSettings();
  const fixedAmount = Number(settings.fixedInternshipAmount || 450);

  if (!payment) {
    // Generate authoritative reference
    const referenceId = await generatePaymentReferenceId();
    const internDomain = user.department || "Development";
    const internName = user.profile?.displayName || user.fullName || user.username || "Intern";
    const empId = user.employmentProfile?.employeeId || null;

    const createdPayment = await db.paymentRequest.create({
      data: {
        referenceId,
        userId: user.id,
        userName: internName,
        userEmail: user.email,
        userRole: "INTERN",
        domain: internDomain,
        internId: empId,
        employeeId: empId,
        paymentPurpose: "INTERNSHIP_SERVICE_BILL",
        title: "Internship Service Bill",
        description: "Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)",
        fixedAmount,
        currency: "INR",
        paymentStatus: user.internServicePaymentPaid ? "APPROVED" : "PENDING_PAYMENT",
        lineItems: MANDATORY_BILL_BREAKDOWN.items,
      },
    });

    await logPaymentAudit({
      action: "PAYMENT_REQUEST_AUTOGENERATED",
      actorId: user.id,
      actorName: internName,
      targetId: createdPayment.id,
      details: {
        referenceId,
        amount: fixedAmount,
        domain: internDomain,
      },
    });

    payment = {
      ...createdPayment,
      attempts: [],
    };
  }

  // Check if there is an active session
  const now = new Date();
  const activeAttempt = payment.attempts.find(
    (a) =>
      ["PAYMENT_STARTED", "AWAITING_PROOF", "VERIFYING"].includes(a.status) &&
      new Date(a.expiresAt) > now
  );

  return {
    payment,
    user,
    settings,
    activeAttempt: activeAttempt || null,
    serverNow: now.toISOString(),
  };
}

// ─── 4. UPI INTENT URL BUILDER ────────────────────────────────────────────────

export function buildUpiIntentUrl(params: {
  upiId: string;
  receiverName: string;
  amount: number;
  referenceId: string;
  method?: SupportedUpiMethod | string;
}): {
  universalUri: string;
  appSpecificUri: string;
  qrPayload: string;
} {
  const { upiId, receiverName, amount, referenceId, method } = params;
  const formattedAmount = Number(amount).toFixed(2);
  const encodedName = encodeURIComponent(receiverName);
  const encodedNote = encodeURIComponent(referenceId);

  // Universal standard UPI payment URI
  const universalUri = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
  const qrPayload = universalUri;

  let appSpecificUri = universalUri;

  const normalizedMethod = (method || "").toUpperCase();

  switch (normalizedMethod) {
    case "PHONEPE":
      appSpecificUri = `phonepe://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "GPAY":
    case "GOOGLE_PAY":
      appSpecificUri = `gpay://upi/pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "PAYTM":
      appSpecificUri = `paytmmp://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "FAM":
    case "FAMPAY":
      appSpecificUri = `fam://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "AMAZON_PAY":
      appSpecificUri = `amazonpay://upi/pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "BHIM":
      appSpecificUri = `bhim://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "CRED":
      appSpecificUri = `cred://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "WHATSAPP_PAY":
      appSpecificUri = `whatsapp://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
      break;
    case "OTHER_UPI":
    default:
      appSpecificUri = universalUri;
      break;
  }

  return { universalUri, appSpecificUri, qrPayload };
}

// ─── 5. START / RESUME PAYMENT ATTEMPT ─────────────────────────────────────────

export async function startPaymentAttempt(params: {
  paymentId: string;
  userId: string;
  selectedMethod: SupportedUpiMethod;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { paymentId, userId, selectedMethod, ipAddress, userAgent } = params;

  // 1. Validate payment exists and belongs to user
  const payment = await db.paymentRequest.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (payment.userId !== userId) {
    throw new Error("Forbidden: You can only initiate your own payment");
  }

  if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
    throw new Error("Payment has already been successfully verified and completed.");
  }

  if (payment.cashStatus === "PENDING_CASH_APPROVAL") {
    throw new Error(
      "A Cash payment request is currently pending confirmation. Please cancel your Cash request first if you wish to pay via UPI."
    );
  }

  // 2. Fetch active settings
  const settings = await getPaymentSettings();

  if (!settings.systemEnabled) {
    throw new Error("Payment system is temporarily under maintenance. Please try again shortly.");
  }

  // Check method availability
  if (selectedMethod === "PHONEPE" && !settings.phonePeEnabled) {
    throw new Error("PhonePe payment method is currently disabled");
  }
  if (selectedMethod === "GPAY" && !settings.googlePayEnabled) {
    throw new Error("Google Pay payment method is currently disabled");
  }
  if (selectedMethod === "PAYTM" && !settings.paytmEnabled) {
    throw new Error("Paytm payment method is currently disabled");
  }
  if (selectedMethod === "OTHER_UPI" && !settings.otherUpiEnabled) {
    throw new Error("Other UPI payment method is currently disabled");
  }

  const now = new Date();

  // 3. Concurrency Lock: Check if there is already an active non-expired attempt
  const existingActiveAttempt = await db.paymentAttempt.findFirst({
    where: {
      paymentId,
      userId,
      status: { in: ["PAYMENT_STARTED", "AWAITING_PROOF"] },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingActiveAttempt) {
    // Resume existing attempt
    const remainingSeconds = Math.max(
      0,
      Math.floor((existingActiveAttempt.expiresAt.getTime() - now.getTime()) / 1000)
    );

    const intentData = buildUpiIntentUrl({
      upiId: existingActiveAttempt.upiIdSnapshot,
      receiverName: existingActiveAttempt.receiverSnapshot,
      amount: Number(existingActiveAttempt.amountSnapshot),
      referenceId: payment.referenceId,
      method: existingActiveAttempt.selectedMethod as SupportedUpiMethod,
    });

    return {
      resumed: true,
      attempt: existingActiveAttempt,
      remainingSeconds,
      serverNow: now.toISOString(),
      expiresAt: existingActiveAttempt.expiresAt.toISOString(),
      ...intentData,
    };
  }

  // 4. Mark all past open attempts as EXPIRED if past deadline
  await db.paymentAttempt.updateMany({
    where: {
      paymentId,
      userId,
      status: { in: ["PAYMENT_STARTED", "AWAITING_PROOF"] },
      expiresAt: { lte: now },
    },
    data: {
      status: "EXPIRED",
      verificationReason: "UPLOAD_EXPIRED",
    },
  });

  // 5. Generate new 5-minute PaymentAttempt
  const windowMinutes = settings.proofWindowMinutes || DEFAULT_PROOF_WINDOW_MINUTES;
  const expiresAt = new Date(now.getTime() + windowMinutes * 60 * 1000);
  const amountToCharge = new Prisma.Decimal(
    (settings.fixedInternshipAmount || 450).toString()
  );
  const upiIdToUse = settings.upiId || settings.defaultUpiId || DEFAULT_RECEIVER_UPI;
  const receiverToUse = settings.receiverName || settings.upiDisplayName || DEFAULT_RECEIVER_NAME;

  const newAttempt = await db.paymentAttempt.create({
    data: {
      paymentId,
      userId,
      selectedMethod,
      amountSnapshot: amountToCharge,
      upiIdSnapshot: upiIdToUse,
      receiverSnapshot: receiverToUse,
      startedAt: now,
      expiresAt,
      status: "PAYMENT_STARTED",
    },
  });

  // Map method to canonical enum (PHONEPE, GOOGLE_PAY, PAYTM, OTHER_UPI)
  const canonicalMethod = selectedMethod === "GPAY" ? "GOOGLE_PAY" : selectedMethod;

  // Update payment request status and selected method
  await db.paymentRequest.update({
    where: { id: paymentId },
    data: {
      paymentMethod: canonicalMethod,
      paymentStatus:
        payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS"
          ? payment.paymentStatus
          : "PAYMENT_STARTED",
    },
  });

  await logPaymentAudit({
    action: "PAYMENT_ATTEMPT_STARTED",
    actorId: userId,
    targetId: paymentId,
    details: {
      attemptId: newAttempt.id,
      selectedMethod,
      amount: Number(amountToCharge),
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    ipAddress,
    userAgent,
  });

  const intentData = buildUpiIntentUrl({
    upiId: upiIdToUse,
    receiverName: receiverToUse,
    amount: Number(amountToCharge),
    referenceId: payment.referenceId,
    method: selectedMethod,
  });

  return {
    resumed: false,
    attempt: newAttempt,
    remainingSeconds: windowMinutes * 60,
    serverNow: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ...intentData,
  };
}

// ─── 6. SUBMIT PAYMENT PROOF & RUN VERIFICATION ────────────────────────────────

export async function submitPaymentProof(params: {
  attemptId: string;
  userId: string;
  utrNumber: string;
  paymentDateStr: string; // e.g. "YYYY-MM-DD"
  paymentTimeStr: string; // e.g. "HH:mm"
  upiAppUsed?: string;
  proofBuffer: Buffer;
  proofMimeType: string;
  originalFilename?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const {
    attemptId,
    userId,
    utrNumber,
    paymentDateStr,
    paymentTimeStr,
    upiAppUsed,
    proofBuffer,
    proofMimeType,
    ipAddress,
    userAgent,
  } = params;

  // 1. Fetch attempt and payment
  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paymentRequest: true,
    },
  });

  if (!attempt) {
    throw new Error("Payment session not found");
  }

  if (attempt.userId !== userId) {
    throw new Error("Forbidden: You cannot submit proof for another user's payment");
  }

  if (attempt.status === "SUCCESS") {
    throw new Error("Payment is already completed and verified.");
  }

  if (attempt.status === "VERIFYING") {
    throw new Error("Payment is already in verification. Please wait for verification to complete.");
  }

  const now = new Date();
  const settings = await getPaymentSettings();

  // 2. Authoritative 5-Minute Window Check
  if (now > attempt.expiresAt) {
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "EXPIRED",
        verificationReason: "UPLOAD_EXPIRED",
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
      details: {
        attemptId,
        submittedAt: now.toISOString(),
        expiresAt: attempt.expiresAt.toISOString(),
      },
      ipAddress,
      userAgent,
    });

    return {
      status: "EXPIRED",
      error: "Payment verification window expired. Please start a new payment verification attempt.",
      reason: "UPLOAD_EXPIRED",
    };
  }

  // 3. Validate Proof Image
  if (!ALLOWED_PROOF_MIME_TYPES.includes(proofMimeType.toLowerCase())) {
    throw new Error("Invalid file format. Allowed formats: JPEG, PNG, WEBP.");
  }

  if (proofBuffer.length > MAX_PROOF_FILE_SIZE_BYTES) {
    throw new Error("Screenshot exceeds the 10 MB limit.");
  }

  // Calculate SHA-256 hash of screenshot
  const proofHash = crypto.createHash("sha256").update(proofBuffer).digest("hex");

  // Check duplicate proof hash across existing SUCCESS / VERIFYING payments
  const duplicateProof = await db.paymentAttempt.findFirst({
    where: {
      proofImageHash: proofHash,
      id: { not: attemptId },
      status: { in: ["SUCCESS", "VERIFYING"] },
    },
  });

  if (duplicateProof) {
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        verificationReason: "PROOF_DUPLICATE",
        proofImageHash: proofHash,
      },
    });

    await db.paymentRequest.update({
      where: { id: attempt.paymentId },
      data: { paymentStatus: "FAILED" },
    });

    await logPaymentAudit({
      action: "PAYMENT_AUTO_VERIFY_FAILED",
      actorId: userId,
      targetId: attempt.paymentId,
      details: {
        attemptId,
        reason: "PROOF_DUPLICATE",
        matchedAttemptId: duplicateProof.id,
      },
      ipAddress,
      userAgent,
    });

    return {
      status: "FAILED",
      reason: "PROOF_DUPLICATE",
      error: "This payment screenshot has already been used for another transaction. Duplicate proofs are rejected.",
    };
  }

  // 4. Validate & Normalize UTR
  const cleanUtr = utrNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!cleanUtr || cleanUtr.length < 8 || cleanUtr.length > 22) {
    throw new Error("Invalid UTR / Transaction ID format. Must be 8 to 22 alphanumeric characters.");
  }

  // Check duplicate UTR across existing SUCCESS / VERIFYING payments
  const duplicateUtr = await db.paymentAttempt.findFirst({
    where: {
      utrNumber: cleanUtr,
      id: { not: attemptId },
      status: { in: ["SUCCESS", "VERIFYING"] },
    },
  });

  if (duplicateUtr) {
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        verificationReason: "UTR_DUPLICATE",
        utrNumber: cleanUtr,
      },
    });

    await db.paymentRequest.update({
      where: { id: attempt.paymentId },
      data: { paymentStatus: "FAILED" },
    });

    await logPaymentAudit({
      action: "PAYMENT_AUTO_VERIFY_FAILED",
      actorId: userId,
      targetId: attempt.paymentId,
      details: {
        attemptId,
        reason: "UTR_DUPLICATE",
        utrNumber: cleanUtr,
        matchedAttemptId: duplicateUtr.id,
      },
      ipAddress,
      userAgent,
    });

    return {
      status: "FAILED",
      reason: "UTR_DUPLICATE",
      error: "This UTR / Transaction ID has already been attached to a verified payment. Duplicate UTR submissions are prohibited.",
    };
  }

  // 5. Validate User-Provided Payment Date & Time with Configurable Tolerance
  let parsedPaymentDate: Date;
  try {
    const dateTimeStr = `${paymentDateStr}T${paymentTimeStr}:00`;
    if (dateTimeStr.includes("+") || dateTimeStr.includes("Z")) {
      parsedPaymentDate = new Date(dateTimeStr);
    } else {
      parsedPaymentDate = new Date(`${dateTimeStr}+05:30`);
    }
    if (isNaN(parsedPaymentDate.getTime())) {
      parsedPaymentDate = now;
    }
  } catch {
    parsedPaymentDate = now;
  }

  const toleranceSeconds = settings.clockToleranceSeconds || DEFAULT_CLOCK_TOLERANCE_SECONDS;
  const toleranceMs = toleranceSeconds * 1000;
  const minAllowedTime = new Date(attempt.startedAt.getTime() - toleranceMs);
  const maxAllowedTime = new Date(attempt.expiresAt.getTime() + toleranceMs);

  let timingMismatch = false;
  if (parsedPaymentDate < minAllowedTime || parsedPaymentDate > maxAllowedTime) {
    timingMismatch = true;
  }

  // 6. Save Proof Screenshot Privately
  const uploadResult = await savePaymentProof(
    attempt.paymentId,
    proofBuffer,
    params.originalFilename || "screenshot.png",
    proofMimeType
  );

  if (!uploadResult.success) {
    throw new Error(uploadResult.error || "Failed to save payment proof securely.");
  }

  // 7. Update Attempt to VERIFYING
  await db.paymentAttempt.update({
    where: { id: attemptId },
    data: {
      utrNumber: cleanUtr,
      paymentDate: parsedPaymentDate,
      paymentTime: paymentTimeStr,
      upiAppUsed: upiAppUsed || attempt.selectedMethod,
      proofImageUrl: uploadResult.filePath,
      proofImageHash: proofHash,
      submittedAt: now,
      status: "VERIFYING",
      verificationReason: timingMismatch ? "PAYMENT_TIME_MISMATCH" : null,
    },
  });

  await db.paymentRequest.update({
    where: { id: attempt.paymentId },
    data: {
      paymentStatus: "PENDING_VERIFICATION",
      utrNumber: cleanUtr,
      paymentDate: parsedPaymentDate,
      paymentTime: paymentTimeStr,
      upiApp: upiAppUsed || attempt.selectedMethod,
      proofImageUrl: uploadResult.filePath,
      submittedAt: now,
    },
  });

  await logPaymentAudit({
    action: "PAYMENT_PROOF_SUBMITTED",
    actorId: userId,
    targetId: attempt.paymentId,
    details: {
      attemptId,
      utrNumber: cleanUtr,
      proofHash,
      submittedAt: now.toISOString(),
      timingMismatch,
    },
    ipAddress,
    userAgent,
  });

  // 8. RUN AUTOMATIC DECISION ENGINE AGAINST TRUSTED TRANSACTION FEED
  const verificationResult = await runAutomaticVerificationEngine({
    attemptId,
    cleanUtr,
    timingMismatch,
  });

  if (verificationResult.status !== "SUCCESS") {
    // Send Web Push notification confirming proof submission
    sendPushNotification(userId, {
      title: "CodeXa Payment Proof Submitted",
      body: `Proof for ₹${Number(attempt.amountSnapshot)} (Ref: ${attempt.paymentRequest.referenceId}) has been received and is under verification.`,
      icon: "/email-assets/codexa-logo.png",
      badge: "/email-assets/codexa-logo.png",
      tag: "mandatory-service-payment-verifying",
      data: {
        type: "MANDATORY_SERVICE_PAYMENT_PROOF_SUBMITTED",
        url: "/dashboard/payments",
      },
    }).catch(() => {});

    // Send confirmation email
    const recipientEmail = attempt.paymentRequest.userEmail;
    if (recipientEmail) {
      sendPaymentProofSubmittedEmail({
        recipientEmail,
        recipientName: attempt.paymentRequest.userName || "Intern",
        referenceId: attempt.paymentRequest.referenceId,
        title: attempt.paymentRequest.title,
        amount: Number(attempt.amountSnapshot),
        utrNumber: cleanUtr,
      }).catch(() => {});
    }
  }

  return verificationResult;
}

// ─── 7. AUTOMATIC DECISION ENGINE ─────────────────────────────────────────────

export async function runAutomaticVerificationEngine(params: {
  attemptId: string;
  cleanUtr?: string;
  timingMismatch?: boolean;
}) {
  const { attemptId } = params;

  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paymentRequest: true,
      user: true,
    },
  });

  if (!attempt) {
    throw new Error("Payment attempt not found");
  }

  const utrToVerify = params.cleanUtr || attempt.utrNumber;
  if (!utrToVerify) {
    return {
      status: "FAILED",
      reason: "UTR_NOT_FOUND",
      error: "No UTR number was provided for verification.",
    };
  }

  await logPaymentAudit({
    action: "PAYMENT_AUTO_VERIFY_STARTED",
    actorId: attempt.userId,
    targetId: attempt.paymentId,
    details: {
      attemptId,
      utr: utrToVerify,
      amount: Number(attempt.amountSnapshot),
    },
  });

  // Query Trusted Transaction Feed (Official Bank / Merchant Stream)
  const trustedTx = await db.trustedUpiTransaction.findFirst({
    where: {
      utrNumber: { equals: utrToVerify, mode: "insensitive" },
      consumedByPaymentId: null, // not previously consumed
    },
  });

  // CRITICAL SECURITY RULE:
  // DO NOT approve merely because of screenshot or typed UTR.
  // Real SUCCESS strictly requires match in trusted transaction source!
  if (!trustedTx) {
    const failureReason = "UTR_NOT_FOUND";

    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        verificationReason: failureReason,
      },
    });

    await db.paymentRequest.update({
      where: { id: attempt.paymentId },
      data: { paymentStatus: "FAILED" },
    });

    await logPaymentAudit({
      action: "PAYMENT_AUTO_VERIFY_FAILED",
      actorId: attempt.userId,
      targetId: attempt.paymentId,
      details: {
        attemptId,
        utr: utrToVerify,
        reason: failureReason,
      },
    });

    return {
      status: "FAILED",
      reason: failureReason,
      error:
        "Transaction could not be verified in the CodeXa settlement feed. Please verify the ₹450 transfer was successfully debited or try again.",
    };
  }

  // 1. Amount Verification (Must be strictly ₹450)
  const expectedAmount = Number(attempt.amountSnapshot);
  const actualAmount = Number(trustedTx.amount);

  if (Math.abs(expectedAmount - actualAmount) > 0.01) {
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        verificationReason: "AMOUNT_MISMATCH",
      },
    });

    await db.paymentRequest.update({
      where: { id: attempt.paymentId },
      data: { paymentStatus: "FAILED" },
    });

    await logPaymentAudit({
      action: "PAYMENT_AUTO_VERIFY_FAILED",
      actorId: attempt.userId,
      targetId: attempt.paymentId,
      details: {
        attemptId,
        expectedAmount,
        actualAmount,
        reason: "AMOUNT_MISMATCH",
      },
    });

    return {
      status: "FAILED",
      reason: "AMOUNT_MISMATCH",
      error: `Amount mismatch: Expected ₹${expectedAmount}, but transaction received was ₹${actualAmount}.`,
    };
  }

  // 2. Transaction Status Check
  if (trustedTx.status !== "SUCCESS") {
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "FAILED",
        verificationReason: "PAYMENT_FAILED",
      },
    });

    await db.paymentRequest.update({
      where: { id: attempt.paymentId },
      data: { paymentStatus: "FAILED" },
    });

    return {
      status: "FAILED",
      reason: "PAYMENT_FAILED",
      error: "The bank reports this transaction status as failed or reversed.",
    };
  }

  // 3. Mark Trusted Transaction as Consumed
  const verifiedNow = new Date();
  await db.trustedUpiTransaction.update({
    where: { id: trustedTx.id },
    data: {
      consumedByPaymentId: attempt.paymentId,
      consumedAt: verifiedNow,
    },
  });

  // 4. Update Payment Attempt to SUCCESS
  await db.paymentAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUCCESS",
      verificationReason: "MATCHED_TRUSTED_TRANSACTION",
      verificationSource: "TRUSTED_BANK_FEED",
      matchedTransactionId: trustedTx.id,
      verifiedAt: verifiedNow,
    },
  });

  // 5. Update Payment Request to APPROVED
  await db.paymentRequest.update({
    where: { id: attempt.paymentId },
    data: {
      paymentStatus: "APPROVED",
      successfulAttemptId: attemptId,
      verifiedAt: verifiedNow,
      verifiedByName: "CodeXa Automated Decision Engine",
    },
  });

  // 6. Unlock Intern Access & Mark internServicePaymentPaid
  await db.user.update({
    where: { id: attempt.userId },
    data: {
      internServicePaymentPaid: true,
    },
  });

  await logPaymentAudit({
    action: "PAYMENT_AUTO_VERIFY_SUCCESS",
    actorId: attempt.userId,
    targetId: attempt.paymentId,
    details: {
      attemptId,
      matchedTransactionId: trustedTx.id,
      amount: expectedAmount,
      utr: utrToVerify,
      verifiedAt: verifiedNow.toISOString(),
    },
  });

  // 7. Send Payment Confirmation Email
  const recipientEmail = attempt.paymentRequest.userEmail || attempt.user?.email;
  if (recipientEmail) {
    try {
      await sendPaymentApprovedEmail({
        recipientEmail,
        recipientName: attempt.paymentRequest.userName || "Intern",
        referenceId: attempt.paymentRequest.referenceId,
        title: attempt.paymentRequest.title,
        amount: expectedAmount,
        utrNumber: utrToVerify,
      });
    } catch (emailErr) {
      console.error("Failed to send payment approval email:", emailErr);
    }
  }

  // 8. Send Web Push Notification to Intern
  sendPushNotification(attempt.userId, {
    title: "🎉 CodeXa Payment Confirmed",
    body: `Your mandatory ₹${expectedAmount} internship service payment is verified. Student ID card & AI tools pack are unlocked!`,
    icon: "/email-assets/codexa-logo.png",
    badge: "/email-assets/codexa-logo.png",
    tag: "mandatory-service-payment-success",
    data: {
      type: "MANDATORY_SERVICE_PAYMENT_SUCCESS",
      url: "/dashboard/payments",
    },
  }).catch((err) => console.error("Failed to send push on payment approval:", err));

  return {
    status: "SUCCESS",
    verifiedAt: verifiedNow.toISOString(),
    matchedTransactionId: trustedTx.id,
    referenceId: attempt.paymentRequest.referenceId,
    amount: expectedAmount,
    utrNumber: utrToVerify,
  };
}

// ─── 8. FOUNDER / CO-FOUNDER SIMULATION & INGESTION ───────────────────────────

export async function addTrustedTransaction(params: {
  utrNumber: string;
  amount: number;
  receiverUpi: string;
  senderName?: string;
  bankReference?: string;
}) {
  const cleanUtr = params.utrNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  return await db.trustedUpiTransaction.upsert({
    where: { utrNumber: cleanUtr },
    update: {
      amount: new Prisma.Decimal(params.amount.toFixed(2)),
      receiverUpi: params.receiverUpi.trim().toLowerCase(),
      senderName: params.senderName || null,
      bankReference: params.bankReference || null,
      status: "SUCCESS",
    },
    create: {
      utrNumber: cleanUtr,
      amount: new Prisma.Decimal(params.amount.toFixed(2)),
      receiverUpi: params.receiverUpi.trim().toLowerCase(),
      senderName: params.senderName || null,
      bankReference: params.bankReference || null,
      status: "SUCCESS",
    },
  });
}
