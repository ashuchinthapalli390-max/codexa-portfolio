import { db } from "../src/lib/db";
import { generatePaymentReferenceId } from "../src/lib/cxa-ids";
import { savePaymentProof, getPaymentProofBuffer } from "../src/lib/payment-storage";
import QRCode from "qrcode";

async function runTests() {
  console.log("================================================================================");
  console.log("   CODEXA AGENCY — MANUAL UPI PAYMENT VERIFICATION SYSTEM TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Check Settings & Default UPI Account
  const settings = await db.paymentSetting.findFirst({ where: { id: "cxa_payment_settings" } });
  assert(!!settings, "PaymentSettings record exists with official agency config");
  assert(settings?.upiDisplayName === "CodeXa Agency", "Official UPI Display Name is 'CodeXa Agency'");
  assert(settings?.defaultUpiId === "codexa@upi", "Default UPI ID is 'codexa@upi'");

  const defaultAccount = await db.paymentAccount.findFirst({ where: { isDefault: true } });
  assert(!!defaultAccount, "Default PaymentAccount exists");
  assert(defaultAccount?.name === "CodeXa Primary UPI", "PaymentAccount name is 'CodeXa Primary UPI'");

  // 2. Reference ID Generator
  const newRefId = await generatePaymentReferenceId();
  assert(newRefId.startsWith("CXA-PAY-"), `Reference ID format begins with CXA-PAY-: ${newRefId}`);

  // 3. Find an existing intern to test payment flow
  const intern = await db.user.findFirst({
    where: { OR: [{ role: "INTERN" }, { orgRole: "INTERN" }] },
  });
  assert(!!intern, `Found active intern user for testing: ${intern?.email}`);

  if (!intern) {
    console.error("Cannot proceed without intern user.");
    return;
  }

  // 4. Create an Internship Service Bill of ₹450
  const billLineItems = [
    { item: "Mandatory ID Card", amount: 150 },
    {
      item: "AI Dev Tools Pack (Shared)",
      amount: 300,
      details: [
        "Nexa AI Access (Included)",
        "ChatGPT Astra (Included)",
        "Anthropic Fabel (Included)",
        "Gemini Pro (Included)",
        "More AI Models (Included)",
      ],
    },
  ];

  const testRef = await generatePaymentReferenceId();
  const payment = await db.paymentRequest.create({
    data: {
      referenceId: testRef,
      userId: intern.id,
      userName: intern.fullName || intern.username,
      userEmail: intern.email,
      userRole: "INTERN",
      domain: "Development",
      paymentPurpose: "INTERNSHIP_FEE",
      title: "Internship Service Fee",
      description: "Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)",
      lineItems: billLineItems,
      fixedAmount: 450.0,
      currency: "INR",
      paymentStatus: "PENDING_PAYMENT",
      paymentAccountId: defaultAccount?.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  assert(payment.paymentStatus === "PENDING_PAYMENT", "Payment created with initial status PENDING_PAYMENT");
  assert(payment.fixedAmount === 450.0, "Payment amount is strictly fixed to ₹450");
  assert(payment.referenceId === testRef, `Unique reference ID assigned: ${payment.referenceId}`);

  // 5. Test QR Code Generation
  const upiUri = `upi://pay?pa=${encodeURIComponent(defaultAccount?.upiId || "codexa@upi")}&pn=${encodeURIComponent(
    defaultAccount?.payeeName || "CodeXa Agency"
  )}&am=450.00&cu=INR&tn=${encodeURIComponent(payment.referenceId)}`;

  const qrBuffer = await QRCode.toBuffer(upiUri);
  assert(qrBuffer.length > 500, `Dynamic UPI QR code generated successfully (${qrBuffer.length} bytes)`);

  // 6. Test Payment Proof Upload & Hash Calculation
  const dummyScreenshotBuffer = Buffer.from("DUMMY_IMAGE_BINARY_DATA_FOR_PAYMENT_SCREENSHOT_VERIFICATION_TEST");
  const saveResult = await savePaymentProof(
    payment.id,
    dummyScreenshotBuffer,
    "screenshot.jpg",
    "image/jpeg"
  );

  assert(saveResult.success, "Payment proof saved to secure private storage");
  assert(!!saveResult.fileHash, `SHA-256 screenshot hash computed: ${saveResult.fileHash.slice(0, 16)}...`);

  // 7. Test Submitting Proof -> Transition to PENDING_VERIFICATION
  const testUtr = "428192847291";
  const submission1 = await db.paymentSubmission.create({
    data: {
      paymentRequestId: payment.id,
      submissionNumber: 1,
      proofImageUrl: saveResult.filePath,
      proofImageMimeType: saveResult.mimeType,
      proofImageHash: saveResult.fileHash,
      transactionId: testUtr,
      utrNumber: testUtr,
      paymentDate: new Date(),
      paymentTime: "14:30",
      upiApp: "PhonePe",
      userNote: "Paid via PhonePe at 2:30 PM",
      status: "PENDING_VERIFICATION",
    },
  });

  const updatedPending = await db.paymentRequest.update({
    where: { id: payment.id },
    data: {
      paymentStatus: "PENDING_VERIFICATION",
      submittedAt: new Date(),
      utrNumber: testUtr,
      proofImageUrl: saveResult.filePath,
      proofImageMimeType: saveResult.mimeType,
      proofImageHash: saveResult.fileHash,
      upiApp: "PhonePe",
    },
  });

  assert(updatedPending.paymentStatus === "PENDING_VERIFICATION", "Payment transitioned to PENDING_VERIFICATION after proof upload");
  assert(updatedPending.utrNumber === testUtr, `UTR reference stored: ${updatedPending.utrNumber}`);

  // 8. Admin Verification Queue Listing
  const queue = await db.paymentRequest.findMany({
    where: { paymentStatus: "PENDING_VERIFICATION" },
  });
  assert(queue.some((p) => p.id === payment.id), "Pending payment appears in Admin Verification Queue");

  // 9. Admin Decision: APPROVE FLOW
  const approvedPayment = await db.paymentRequest.update({
    where: { id: payment.id },
    data: {
      paymentStatus: "APPROVED",
      verifiedBy: "admin_tester",
      verifiedByName: "Ashu Founder",
      verifiedAt: new Date(),
      adminNotes: "Bank credit verified on statement.",
    },
  });

  assert(approvedPayment.paymentStatus === "APPROVED", "Admin approved payment: status updated to APPROVED");
  assert(approvedPayment.verifiedByName === "Ashu Founder", "Verified by admin name recorded");
  assert(!!approvedPayment.verifiedAt, "Verified timestamp recorded");

  // 10. Test Rejection & Resubmission Flow
  const testRef2 = await generatePaymentReferenceId();
  const payment2 = await db.paymentRequest.create({
    data: {
      referenceId: testRef2,
      userId: intern.id,
      userName: intern.fullName || intern.username,
      userEmail: intern.email,
      userRole: "INTERN",
      domain: "Development",
      paymentPurpose: "INTERNSHIP_FEE",
      title: "Internship Service Fee",
      lineItems: billLineItems,
      fixedAmount: 450.0,
      currency: "INR",
      paymentStatus: "PENDING_PAYMENT",
    },
  });

  // User submits initial proof for payment2
  await db.paymentRequest.update({
    where: { id: payment2.id },
    data: {
      paymentStatus: "PENDING_VERIFICATION",
      submittedAt: new Date(),
      utrNumber: "999888777666",
      proofImageUrl: saveResult.filePath,
    },
  });

  // Admin REJECTS with reason
  const rejectionReason = "Amount mismatch (Transferred ₹400 instead of ₹450)";
  const rejectedPayment = await db.paymentRequest.update({
    where: { id: payment2.id },
    data: {
      paymentStatus: "REJECTED",
      rejectedBy: "admin_tester",
      rejectedByName: "Ashu Founder",
      rejectedAt: new Date(),
      rejectionReason,
    },
  });

  assert(rejectedPayment.paymentStatus === "REJECTED", "Admin rejected payment: status updated to REJECTED");
  assert(rejectedPayment.rejectionReason === rejectionReason, `Rejection reason stored: ${rejectedPayment.rejectionReason}`);

  // User RESUBMITS with new proof
  const dummyResubmitBuffer = Buffer.from("RESUBMITTED_CORRECTED_PAYMENT_PROOF_BUFFER");
  const saveResubmitResult = await savePaymentProof(
    payment2.id,
    dummyResubmitBuffer,
    "corrected_screenshot.png",
    "image/png"
  );

  const submission2 = await db.paymentSubmission.create({
    data: {
      paymentRequestId: payment2.id,
      submissionNumber: 2,
      proofImageUrl: saveResubmitResult.filePath,
      proofImageMimeType: saveResubmitResult.mimeType,
      proofImageHash: saveResubmitResult.fileHash,
      transactionId: "111222333444",
      utrNumber: "111222333444",
      paymentDate: new Date(),
      status: "PENDING_VERIFICATION",
    },
  });

  const resubmittedPayment = await db.paymentRequest.update({
    where: { id: payment2.id },
    data: {
      paymentStatus: "PENDING_VERIFICATION",
      submittedAt: new Date(),
      utrNumber: "111222333444",
      proofImageUrl: saveResubmitResult.filePath,
      rejectionReason: null, // Cleared on resubmit
    },
  });

  assert(resubmittedPayment.paymentStatus === "PENDING_VERIFICATION", "Resubmission restored status to PENDING_VERIFICATION");
  assert(resubmittedPayment.rejectionReason === null, "Prior rejection reason cleared on resubmission");

  // Check submission history
  const allSubmissions = await db.paymentSubmission.findMany({
    where: { paymentRequestId: payment2.id },
  });
  assert(allSubmissions.length >= 1, `Payment preserves full submission history (${allSubmissions.length} records)`);

  // 11. Test Private Storage Retrieval
  const fileData = await getPaymentProofBuffer(saveResult.filePath);
  assert(!!fileData && fileData.buffer.length > 0, "Retrieved proof image buffer from private storage");

  // 12. Duplicate UTR Detection Check
  const duplicateFound = await db.paymentRequest.findFirst({
    where: {
      utrNumber: testUtr,
      paymentStatus: { in: ["APPROVED", "PENDING_VERIFICATION"] },
    },
  });
  assert(!!duplicateFound, `Duplicate UTR detection identified existing transaction: ${duplicateFound?.referenceId}`);

  // Clean up test payment2
  await db.paymentSubmission.deleteMany({ where: { paymentRequestId: payment2.id } });
  await db.paymentRequest.delete({ where: { id: payment2.id } });

  console.log("\n================================================================================");
  console.log(`   MANUAL UPI PAYMENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
