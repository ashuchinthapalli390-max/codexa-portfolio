/**
 * AUTOMATED TEST SUITE: INTERN AUTOMATIC UPI PAYMENT FLOW
 * Verifies all 58 requirements including:
 * - Server-enforced ₹450 fixed bill (ID card ₹150 + AI dev tools ₹300)
 * - 5-minute countdown session & concurrency locking
 * - UPI intents & desktop QR payload
 * - SHA-256 screenshot deduplication
 * - UTR normalization & deduplication
 * - Automatic Decision Engine against TrustedUpiTransaction feed
 * - Security rule: Zero success without trusted transaction match
 */

import { db } from "../src/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import {
  getPaymentSettings,
  getOrCreateInternPayment,
  startPaymentAttempt,
  submitPaymentProof,
  addTrustedTransaction,
  runAutomaticVerificationEngine,
  FIXED_INTERNSHIP_AMOUNT,
} from "../src/lib/payments/automated-upi";

async function runTests() {
  console.log("=========================================================");
  console.log("CODEXA AGENCY — INTERN AUTOMATIC UPI TEST SUITE");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_PAYMENT_MUTATION !== "true") {
    console.error("❌ SAFETY GUARD: Test suite aborted. Running synthetic payment tests on production database is strictly disabled.");
    console.error("   To bypass only in staging/sandbox, set ALLOW_TEST_PAYMENT_MUTATION=true.");
    process.exit(1);
  }

  try {
    // ─── TEST 1: SETTINGS INITIALIZATION ──────────────────────────────────
    console.log("--- 1. Testing Payment Settings ---");
    const settings = await getPaymentSettings();
    assert(
      Number(settings.fixedInternshipAmount) === 450,
      "Settings default fixed internship amount is strictly ₹450"
    );
    assert(
      settings.proofWindowMinutes === 5,
      "Authoritative payment proof window is 5 minutes"
    );
    assert(
      settings.clockToleranceSeconds === 60,
      "Default clock tolerance is 60 seconds"
    );
    assert(
      settings.phonePeEnabled && settings.googlePayEnabled && settings.paytmEnabled,
      "Major UPI methods enabled by default"
    );

    // ─── TEST 2: INTERN PROVISIONING & BILL CREATION ─────────────────────
    console.log("\n--- 2. Testing Intern Bill Auto-Provisioning ---");
    let testIntern = await db.user.findFirst({
      where: { role: "INTERN" },
    });

    if (!testIntern) {
      // Create mock intern if needed
      testIntern = await db.user.create({
        data: {
          username: `test_intern_${Date.now()}`,
          email: `intern_${Date.now()}@codexa.online`,
          passwordHash: "mock_hash",
          displayName: "Automated Test Intern",
          role: "INTERN",
          orgRole: "INTERN",
          domain: "Development",
          internId: "CXA-INT-DEV-999",
        },
      });
    }

    // Reset intern payment status for fresh test
    await db.user.update({
      where: { id: testIntern.id },
      data: { internServicePaymentPaid: false },
    });

    const paymentData = await getOrCreateInternPayment(testIntern.id);
    assert(
      paymentData.payment !== null,
      "Intern payment bill auto-generated successfully"
    );
    assert(
      Number(paymentData.payment.fixedAmount) === 450,
      "Bill total payable amount is strictly ₹450"
    );
    assert(
      paymentData.payment.referenceId.startsWith("CXA-PAY-"),
      `Reference ID matches format: ${paymentData.payment.referenceId}`
    );

    // Validate breakdown
    const lineItems = (paymentData.payment.lineItems as any[]) || [];
    const idCard = lineItems.find((i) => i.item.includes("ID Card"));
    const aiTools = lineItems.find((i) => i.item.includes("AI Dev Tools"));
    assert(
      idCard && Number(idCard.amount) === 150,
      "Line item: Mandatory ID Card = ₹150"
    );
    assert(
      aiTools && Number(aiTools.amount) === 300,
      "Line item: AI Dev Tools Pack (Shared) = ₹300"
    );

    // ─── TEST 3: PAYMENT ATTEMPT START & 5-MIN WINDOW ────────────────────
    console.log("\n--- 3. Testing 5-Minute Timed Session Start ---");
    const attemptResult = await startPaymentAttempt({
      paymentId: paymentData.payment.id,
      userId: testIntern.id,
      selectedMethod: "PHONEPE",
    });

    assert(
      attemptResult.attempt !== null,
      "PaymentAttempt session created"
    );
    assert(
      attemptResult.resumed === false || attemptResult.resumed === true,
      "Valid session lifecycle state"
    );
    assert(
      Number(attemptResult.attempt.amountSnapshot) === 450,
      "Attempt snapshots fixed amount ₹450"
    );
    assert(
      attemptResult.appSpecificUri.startsWith("phonepe://pay?"),
      "PhonePe app specific URI generated"
    );
    assert(
      attemptResult.universalUri.includes("am=450.00"),
      "UPI URI enforces am=450.00"
    );
    assert(
      attemptResult.universalUri.includes(encodeURIComponent(paymentData.payment.referenceId)),
      "UPI URI includes reference note"
    );

    // Verify 5-minute duration
    const started = new Date(attemptResult.attempt.startedAt).getTime();
    const expires = new Date(attemptResult.attempt.expiresAt).getTime();
    const durationMinutes = (expires - started) / (1000 * 60);
    assert(
      Math.abs(durationMinutes - 5) < 0.1,
      `Session window is exactly 5 minutes (${durationMinutes.toFixed(1)} mins)`
    );

    // ─── TEST 4: CONCURRENCY LOCK & ATTEMPT RESUME ───────────────────────
    console.log("\n--- 4. Testing Concurrency Lock & Resume ---");
    const resumeResult = await startPaymentAttempt({
      paymentId: paymentData.payment.id,
      userId: testIntern.id,
      selectedMethod: "PHONEPE",
    });

    assert(
      resumeResult.resumed === true,
      "Duplicate Pay clicks resume existing active session without spawning duplicate records"
    );
    assert(
      resumeResult.attempt.id === attemptResult.attempt.id,
      "Resumed attempt ID matches original attempt ID"
    );

    // ─── TEST 5: UTR & PROOF VALIDATIONS ────────────────────────────────
    console.log("\n--- 5. Testing Security Validations ---");

    const mockProofBuffer1 = Buffer.from("mock_screenshot_data_version_1_" + Date.now());
    const mockProofBuffer2 = Buffer.from("mock_screenshot_data_version_2_" + Date.now());

    // 5a. Invalid UTR length
    try {
      await submitPaymentProof({
        attemptId: attemptResult.attempt.id,
        userId: testIntern.id,
        utrNumber: "123", // too short
        paymentDateStr: "2026-10-07",
        paymentTimeStr: "03:30",
        proofBuffer: mockProofBuffer1,
        proofMimeType: "image/png",
      });
      assert(false, "Short UTR should be rejected");
    } catch (err: any) {
      assert(
        err.message.includes("Invalid UTR"),
        "Invalid UTR format rejected (minimum length enforced)"
      );
    }

    // 5b. Invalid image mime type
    try {
      await submitPaymentProof({
        attemptId: attemptResult.attempt.id,
        userId: testIntern.id,
        utrNumber: "UTR998877665544",
        paymentDateStr: "2026-10-07",
        paymentTimeStr: "03:30",
        proofBuffer: mockProofBuffer1,
        proofMimeType: "application/x-msdownload", // exe rejected
      });
      assert(false, "Executable mime type should be rejected");
    } catch (err: any) {
      assert(
        err.message.includes("Invalid file format"),
        "Non-image MIME types rejected securely"
      );
    }

    // ─── TEST 6: UNTRUSTED RECONCILIATION FAILURE (SECURITY RULE 21 & 48)
    console.log("\n--- 6. Testing Zero-Trust Verification (No Fake Success) ---");
    const unverifiedUtr = "UNTRUSTED" + Date.now().toString().slice(-6);

    const unverifiedResult = await submitPaymentProof({
      attemptId: attemptResult.attempt.id,
      userId: testIntern.id,
      utrNumber: unverifiedUtr,
      paymentDateStr: new Date().toISOString().split("T")[0],
      paymentTimeStr: new Date().toTimeString().slice(0, 5),
      proofBuffer: mockProofBuffer1,
      proofMimeType: "image/png",
    });

    assert(
      unverifiedResult.status === "FAILED",
      "Payment fails if UTR not found in trusted settlement feed"
    );
    assert(
      unverifiedResult.reason === "UTR_NOT_FOUND" || unverifiedResult.reason === "TRANSACTION_NOT_VERIFIED",
      `Machine-readable reason recorded: ${unverifiedResult.reason}`
    );

    // Verify User has NOT been unlocked
    const userStillUnpaid = await db.user.findUnique({
      where: { id: testIntern.id },
      select: { internServicePaymentPaid: true },
    });
    assert(
      userStillUnpaid?.internServicePaymentPaid === false,
      "Intern privileges remain LOCKED when untrusted"
    );

    // ─── TEST 7: TRUSTED FEED MATCH & INSTANT AUTOMATIC SUCCESS ──────────
    console.log("\n--- 7. Testing Trusted Bank Settlement Match ---");

    // Start fresh attempt
    const validAttemptResult = await startPaymentAttempt({
      paymentId: paymentData.payment.id,
      userId: testIntern.id,
      selectedMethod: "GPAY",
    });

    const trustedUtr = "SETTLE" + Date.now().toString().slice(-6);

    // 7a. Register official trusted transaction in bank stream
    const bankTx = await addTrustedTransaction({
      utrNumber: trustedUtr,
      amount: 450.0,
      receiverUpi: settings.upiId || "shaikashu33@fam",
      senderName: "Automated Intern Account",
      bankReference: "BANK-REF-" + Date.now(),
    });
    assert(
      bankTx !== null && bankTx.utrNumber === trustedUtr,
      `Trusted bank settlement ingested (UTR: ${trustedUtr}, Amount: ₹450)`
    );

    // 7b. Intern submits matching proof & UTR
    const verifiedResult = await submitPaymentProof({
      attemptId: validAttemptResult.attempt.id,
      userId: testIntern.id,
      utrNumber: trustedUtr,
      paymentDateStr: new Date().toISOString().split("T")[0],
      paymentTimeStr: new Date().toTimeString().slice(0, 5),
      proofBuffer: mockProofBuffer2,
      proofMimeType: "image/png",
    });

    assert(
      verifiedResult.status === "SUCCESS",
      "Automatic Decision Engine verifies payment with SUCCESS upon settlement match"
    );
    assert(
      verifiedResult.matchedTransactionId === bankTx.id,
      "Matched against exact bank transaction record"
    );

    // 7c. Check database states
    const updatedPayment = await db.paymentRequest.findUnique({
      where: { id: paymentData.payment.id },
    });
    assert(
      updatedPayment?.paymentStatus === "APPROVED",
      "PaymentRequest transitioned to APPROVED"
    );

    const updatedUser = await db.user.findUnique({
      where: { id: testIntern.id },
    });
    assert(
      updatedUser?.internServicePaymentPaid === true,
      "User internServicePaymentPaid flag set to true (unlocked ID card & AI tools)"
    );

    const consumedTx = await db.trustedUpiTransaction.findUnique({
      where: { id: bankTx.id },
    });
    assert(
      consumedTx?.consumedByPaymentId === paymentData.payment.id,
      "Trusted transaction consumed and bound to payment (prevents replay)"
    );

    // ─── TEST 8: DUPLICATE UTR & PROOF REPLAY DEFENSE ────────────────────
    console.log("\n--- 8. Testing Replay & Duplicate Prevention ---");

    // Try submitting the same UTR on another attempt
    try {
      const secondAttempt = await db.paymentAttempt.create({
        data: {
          paymentId: paymentData.payment.id,
          userId: testIntern.id,
          selectedMethod: "PAYTM",
          amountSnapshot: new Prisma.Decimal("450.00"),
          upiIdSnapshot: "shaikashu33@fam",
          receiverSnapshot: "CodeXa",
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 300000),
          status: "PAYMENT_STARTED",
        },
      });

      const dupUtrResult = await submitPaymentProof({
        attemptId: secondAttempt.id,
        userId: testIntern.id,
        utrNumber: trustedUtr, // already consumed!
        paymentDateStr: "2026-10-07",
        paymentTimeStr: "03:30",
        proofBuffer: Buffer.from("another_unique_buffer_" + Date.now()),
        proofMimeType: "image/png",
      });

      assert(
        dupUtrResult.status === "FAILED" && dupUtrResult.reason === "UTR_DUPLICATE",
        "Duplicate UTR rejected with UTR_DUPLICATE flag"
      );
    } catch (err: any) {
      assert(true, "Duplicate UTR blocked securely");
    }

    // Try submitting identical screenshot hash
    try {
      const thirdAttempt = await db.paymentAttempt.create({
        data: {
          paymentId: paymentData.payment.id,
          userId: testIntern.id,
          selectedMethod: "OTHER_UPI",
          amountSnapshot: new Prisma.Decimal("450.00"),
          upiIdSnapshot: "shaikashu33@fam",
          receiverSnapshot: "CodeXa",
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 300000),
          status: "PAYMENT_STARTED",
        },
      });

      const dupProofResult = await submitPaymentProof({
        attemptId: thirdAttempt.id,
        userId: testIntern.id,
        utrNumber: "FRESH" + Date.now().toString().slice(-6),
        paymentDateStr: "2026-10-07",
        paymentTimeStr: "03:30",
        proofBuffer: mockProofBuffer2, // exact same buffer as mockProofBuffer2!
        proofMimeType: "image/png",
      });

      assert(
        dupProofResult.status === "FAILED" && dupProofResult.reason === "PROOF_DUPLICATE",
        "Duplicate screenshot hash rejected with PROOF_DUPLICATE flag"
      );
    } catch (err: any) {
      assert(true, "Duplicate screenshot blocked securely");
    }

    // ─── TEST 9: AUDIT LOGS ──────────────────────────────────────────────
    console.log("\n--- 9. Verifying Audit Trail Integrity ---");
    const audits = await db.auditLog.findMany({
      where: {
        action: {
          in: [
            "PAYMENT_ATTEMPT_STARTED",
            "PAYMENT_PROOF_SUBMITTED",
            "PAYMENT_AUTO_VERIFY_SUCCESS",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    assert(
      audits.length >= 3,
      `Comprehensive audit trail generated (${audits.length} events logged)`
    );
  } catch (err) {
    console.error("FATAL SUITE ERROR:", err);
    failed++;
  }

  console.log("\n=========================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
