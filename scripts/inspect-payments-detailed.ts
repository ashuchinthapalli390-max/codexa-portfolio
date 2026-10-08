import { db } from "../src/lib/db";

async function main() {
  const trusted = await db.trustedUpiTransaction.findMany();
  console.log("=== TRUSTED UPI TRANSACTIONS ===", trusted.length);
  trusted.forEach((t) => console.log(t));

  const allAttempts = await db.paymentAttempt.findMany({
    include: {
      user: { select: { email: true, fullName: true } },
      paymentRequest: { select: { referenceId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("\n=== ALL PAYMENT ATTEMPTS ===", allAttempts.length);
  allAttempts.forEach((a) => {
    console.log({
      id: a.id,
      paymentRef: a.paymentRequest?.referenceId,
      user: a.user?.email,
      status: a.status,
      method: a.selectedMethod,
      utr: a.utrNumber,
      proofUrl: a.proofImageUrl,
      verificationReason: a.verificationReason,
      verificationSource: a.verificationSource,
      matchedTransactionId: a.matchedTransactionId,
      createdAt: a.createdAt,
    });
  });

  const auditLogs = await db.auditLog.findMany({
    where: {
      action: { startsWith: "PAYMENT" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  console.log("\n=== RECENT PAYMENT AUDIT LOGS ===", auditLogs.length);
  auditLogs.forEach((l) => console.log(l));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
