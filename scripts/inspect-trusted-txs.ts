import { db } from "../src/lib/db";

async function main() {
  const txs = await db.trustedUpiTransaction.findMany();
  console.log("=== TRUSTED TRANSACTIONS ===", txs.length);
  txs.forEach((t) => {
    console.log({
      id: t.id,
      utr: t.utrNumber,
      amount: Number(t.amount),
      senderName: t.senderName,
      bankReference: t.bankReference,
      status: t.status,
      consumedBy: t.consumedByPaymentId,
      createdAt: t.createdAt,
    });
  });
}

main().catch(console.error).finally(() => db.$disconnect());
