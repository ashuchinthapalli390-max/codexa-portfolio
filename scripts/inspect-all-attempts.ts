import { db } from "../src/lib/db";

async function main() {
  const attempts = await db.paymentAttempt.findMany({
    include: {
      user: { select: { email: true, fullName: true } },
      paymentRequest: { select: { referenceId: true, paymentStatus: true, userName: true } }
    }
  });

  console.log(`TOTAL ATTEMPTS: ${attempts.length}`);
  attempts.forEach(a => {
    console.log({
      id: a.id,
      user: a.user?.email,
      ref: a.paymentRequest?.referenceId,
      method: a.selectedMethod,
      status: a.status,
      utr: a.utrNumber,
      proofUrl: a.proofImageUrl,
      reason: a.verificationReason,
      source: a.verificationSource,
      matchedTx: a.matchedTransactionId,
      createdAt: a.createdAt
    });
  });

  const submissions = await db.paymentSubmission.findMany();
  console.log(`TOTAL SUBMISSIONS: ${submissions.length}`);
  submissions.forEach(s => console.log(s));
}

main().catch(console.error).finally(() => db.$disconnect());
