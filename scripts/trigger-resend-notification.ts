import { db } from "../src/lib/db";
import { dispatchProofSubmittedNotifications } from "../src/lib/payments/manual-approval-notifications";

async function main() {
  console.log("Looking up pending payment requests...");

  const payment = await db.paymentRequest.findFirst({
    where: {
      OR: [
        { referenceId: "CXA-PAY-2026-0008" },
        { paymentStatus: "PENDING_APPROVAL" },
      ],
    },
    include: {
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      user: true,
    },
  });

  if (!payment) {
    console.log("No pending payment found matching CXA-PAY-2026-0008 or status PENDING_APPROVAL.");
    return;
  }

  console.log("Payment found:", {
    id: payment.id,
    referenceId: payment.referenceId,
    userName: payment.userName || payment.user?.fullName,
    status: payment.status,
    proofImageUrl: payment.proofImageUrl,
    attemptsCount: payment.attempts.length,
    latestAttemptProof: payment.attempts[0]?.proofImageUrl,
  });

  const latestAttempt = payment.attempts[0];
  const proofPath = payment.proofImageUrl || latestAttempt?.proofImageUrl;

  console.log(`Proof path resolved: ${proofPath}`);
  console.log("Triggering dispatchProofSubmittedNotifications (Email with inline screenshot & attachment, Web Push, In-App)...");

  await dispatchProofSubmittedNotifications({
    payment: {
      id: payment.id,
      referenceId: payment.referenceId,
      userId: payment.userId,
      userName: payment.userName || payment.user?.fullName || payment.user?.username || "Intern",
      userEmail: payment.userEmail || payment.user?.email,
      domain: payment.domain || payment.user?.department,
      internId: payment.internId || payment.employeeId,
      fixedAmount: Number(payment.fixedAmount) || 450,
      paymentMethod: latestAttempt?.selectedMethod || payment.paymentMethod || "UPI",
      submittedAt: payment.submittedAt || latestAttempt?.submittedAt || new Date(),
      proofImageUrl: proofPath,
    },
    attempt: latestAttempt
      ? {
          id: latestAttempt.id,
          selectedMethod: latestAttempt.selectedMethod,
          submittedAt: latestAttempt.submittedAt,
          proofImageUrl: latestAttempt.proofImageUrl || proofPath,
        }
      : null,
  });

  console.log("SUCCESS: dispatchProofSubmittedNotifications completed without errors!");
}

main()
  .catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
