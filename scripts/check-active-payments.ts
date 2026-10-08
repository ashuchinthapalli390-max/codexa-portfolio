import { db } from "../src/lib/db";

async function main() {
  const paymentRequests = await db.paymentRequest.findMany({
    where: {
      OR: [
        { attempts: { some: {} } },
        { submissions: { some: {} } },
        { paymentStatus: { not: "PENDING_PAYMENT" } },
        { cashStatus: { not: "NONE" } }
      ]
    },
    include: {
      attempts: true,
      submissions: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        }
      }
    }
  });

  console.log(`Payments with attempts/status changes: ${paymentRequests.length}`);
  paymentRequests.forEach(p => {
    console.log({
      id: p.id,
      ref: p.referenceId,
      user: `${p.userName} (${p.userEmail})`,
      status: p.paymentStatus,
      cashStatus: p.cashStatus,
      method: p.paymentMethod,
      utr: p.utrNumber,
      proofUrl: p.proofImageUrl,
      attempts: p.attempts.map(a => ({
        id: a.id,
        method: a.selectedMethod,
        status: a.status,
        utr: a.utrNumber,
        detectedUtr: a.detectedUtr,
        proofUrl: a.proofImageUrl,
        verificationReason: a.verificationReason,
        verificationSource: a.verificationSource
      }))
    });
  });
}

main().catch(console.error).finally(() => db.$disconnect());
