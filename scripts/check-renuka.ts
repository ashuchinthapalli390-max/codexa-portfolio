import { db } from "../src/lib/db";

async function main() {
  const p = await db.paymentRequest.findUnique({
    where: { id: "cmux4ph05000vz488ag1aeycs" },
    include: { attempts: true },
  });
  console.log(p);
}

main().catch(console.error).finally(() => db.$disconnect());
