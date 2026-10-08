import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== FIXING SAMITHA REDDY STATUS TO NOT PAID ===");

  // 1. Update Samitha Reddy's User record
  const userUpdate = await prisma.user.updateMany({
    where: {
      email: "chsamithareddy@gmail.com",
    },
    data: {
      internServicePaymentPaid: false,
    },
  });

  console.log(`Updated Samitha Reddy user record to internServicePaymentPaid: false (count: ${userUpdate.count})`);

  // 2. Ensure payment request is PENDING_PAYMENT / cashStatus: NONE
  const paymentUpdate = await prisma.paymentRequest.updateMany({
    where: {
      referenceId: "CXA-PAY-2026-0024",
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

  console.log(`Updated Samitha Reddy payment request (count: ${paymentUpdate.count})`);

  // 3. Clear any payment attempts for CXA-PAY-2026-0024
  const attemptDelete = await prisma.paymentAttempt.deleteMany({
    where: {
      paymentRequest: {
        referenceId: "CXA-PAY-2026-0024",
      },
    },
  });
  console.log(`Deleted payment attempts for Samitha Reddy (count: ${attemptDelete.count})`);

  // 4. Verification
  console.log("\n=== VERIFICATION ===");
  const samitha = await prisma.user.findFirst({
    where: { email: "chsamithareddy@gmail.com" },
    include: { paymentRequests: true },
  });

  console.log("Samitha Reddy current record:");
  console.log({
    id: samitha?.id,
    name: samitha?.fullName,
    email: samitha?.email,
    internServicePaymentPaid: samitha?.internServicePaymentPaid,
    paymentStatus: samitha?.paymentRequests[0]?.paymentStatus,
    cashStatus: samitha?.paymentRequests[0]?.cashStatus,
    paidAt: samitha?.paymentRequests[0]?.paidAt,
  });

  // Verify all paid users in DB
  const allPaidUsers = await prisma.user.findMany({
    where: { internServicePaymentPaid: true },
    select: {
      email: true,
      fullName: true,
      internServicePaymentPaid: true,
    },
  });

  console.log("\nALL USERS WITH internServicePaymentPaid = true (Must be exactly 2):");
  console.log(allPaidUsers);

  // Verify all approved/paid payment requests
  const allPaidPayments = await prisma.paymentRequest.findMany({
    where: {
      OR: [
        { paymentStatus: { in: ["APPROVED", "SUCCESS"] } },
        { cashStatus: "CASH_RECEIVED" },
      ],
    },
    select: {
      referenceId: true,
      userName: true,
      userEmail: true,
      paymentStatus: true,
      cashStatus: true,
    },
  });

  console.log("\nALL PAID/APPROVED PAYMENT REQUESTS IN DB (Must be exactly 2):");
  console.log(allPaidPayments);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
