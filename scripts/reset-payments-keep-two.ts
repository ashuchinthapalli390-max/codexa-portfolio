import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRESERVED_REFERENCES = ["CXA-PAY-2026-0013", "CXA-PAY-2026-0016"];
const PRESERVED_EMAILS = ["neelamaishwarya07@gmail.com", "renukakandakatla524@gmail.com"];

async function main() {
  console.log("=== CODEXA PAYMENTS RESET: PRESERVING ONLY THE 2 PAID PAYMENTS ===");
  console.log("Preserved Payment References:", PRESERVED_REFERENCES);
  console.log("Preserved User Emails:", PRESERVED_EMAILS);

  // 1. Verify the 2 preserved payments exist
  const preservedPayments = await prisma.paymentRequest.findMany({
    where: { referenceId: { in: PRESERVED_REFERENCES } },
    select: {
      id: true,
      referenceId: true,
      userName: true,
      userEmail: true,
      paymentStatus: true,
      cashStatus: true,
      paidAt: true,
    },
  });

  console.log("\nPreserved Payments Found in DB:");
  console.log(preservedPayments);

  if (preservedPayments.length !== 2) {
    throw new Error(`Expected 2 preserved payments, but found ${preservedPayments.length}`);
  }

  // 2. Identify all payments that need to be reset
  const paymentsToReset = await prisma.paymentRequest.findMany({
    where: { referenceId: { notIn: PRESERVED_REFERENCES } },
    select: {
      id: true,
      referenceId: true,
      userName: true,
      paymentStatus: true,
      cashStatus: true,
    },
  });

  console.log(`\nFound ${paymentsToReset.length} payments to reset.`);

  // 3. Reset all payment requests not in preserved list
  const resetPaymentsResult = await prisma.paymentRequest.updateMany({
    where: {
      referenceId: { notIn: PRESERVED_REFERENCES },
    },
    data: {
      paymentStatus: "PENDING_PAYMENT",
      cashStatus: "NONE",
      paidAt: null,
      paymentMethod: null,
      selectedUpiMethod: null,
      upiIdUsed: null,
      transactionId: null,
      utrNumber: null,
      paymentDate: null,
      paymentTime: null,
      upiApp: null,
      proofImageUrl: null,
      proofImageMimeType: null,
      proofImageHash: null,
      userNote: null,
      submittedAt: null,
      verifiedBy: null,
      verifiedByName: null,
      verifiedAt: null,
      rejectedBy: null,
      rejectedByName: null,
      rejectedAt: null,
      rejectionReason: null,
      adminNotes: null,
      cashRequestedAt: null,
      cashApprovedAt: null,
      cashApprovedById: null,
      cashApprovedByName: null,
      cashRejectionReason: null,
      cashNotes: null,
      successfulAttemptId: null,
    },
  });

  console.log(`Updated ${resetPaymentsResult.count} payment requests to PENDING_PAYMENT / cashStatus: NONE.`);

  // 4. Delete payment attempts belonging to reset payments
  const deletedAttempts = await prisma.paymentAttempt.deleteMany({
    where: {
      paymentRequest: {
        referenceId: { notIn: PRESERVED_REFERENCES },
      },
    },
  });
  console.log(`Deleted ${deletedAttempts.count} payment attempts belonging to reset payments.`);

  // 5. Update User table internServicePaymentPaid:
  // - Set false for all users not in preserved emails
  const resetUsersResult = await prisma.user.updateMany({
    where: {
      email: { notIn: PRESERVED_EMAILS },
      internServicePaymentPaid: true,
    },
    data: {
      internServicePaymentPaid: false,
    },
  });
  console.log(`Reset internServicePaymentPaid to false for ${resetUsersResult.count} users.`);

  // - Ensure the 2 preserved users have internServicePaymentPaid = true
  const ensuredPreservedUsers = await prisma.user.updateMany({
    where: {
      email: { in: PRESERVED_EMAILS },
    },
    data: {
      internServicePaymentPaid: true,
    },
  });
  console.log(`Ensured internServicePaymentPaid is true for ${ensuredPreservedUsers.count} preserved users.`);

  // 6. Clean up pending payment approval notifications
  const deletedNotifs = await prisma.notification.deleteMany({
    where: {
      type: "PAYMENT_APPROVAL_REQUIRED",
    },
  });
  console.log(`Deleted ${deletedNotifs.count} stale PAYMENT_APPROVAL_REQUIRED notifications.`);

  // 7. Complete Verification Pass
  console.log("\n=== POST-RESET VERIFICATION ===");
  const allNonPending = await prisma.paymentRequest.findMany({
    where: {
      OR: [
        { paymentStatus: { not: "PENDING_PAYMENT" } },
        { cashStatus: { not: "NONE" } },
      ],
    },
    select: {
      id: true,
      referenceId: true,
      userName: true,
      userEmail: true,
      paymentStatus: true,
      cashStatus: true,
      paidAt: true,
    },
  });

  console.log(`Total non-pending payments in DB (Must be exactly 2): ${allNonPending.length}`);
  console.log(allNonPending);

  const allPaidUsers = await prisma.user.findMany({
    where: { internServicePaymentPaid: true },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      internServicePaymentPaid: true,
    },
  });

  console.log(`\nUsers with internServicePaymentPaid = true (Must be exactly 2): ${allPaidUsers.length}`);
  console.log(allPaidUsers);

  const pendingApprovalCount = await prisma.paymentRequest.count({
    where: {
      OR: [
        { paymentStatus: "PENDING_APPROVAL" },
        { cashStatus: "PENDING_CASH_APPROVAL" },
      ],
    },
  });
  console.log(`\nPending review payments count (Must be 0): ${pendingApprovalCount}`);
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
