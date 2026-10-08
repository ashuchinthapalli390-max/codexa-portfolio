import { db } from "../src/lib/db";

async function main() {
  const foundersAndCoFounders = await db.user.findMany({
    where: {
      OR: [
        { role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER"] } },
        { orgRole: { in: ["FOUNDER", "CO_FOUNDER"] } },
      ],
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      role: true,
      orgRole: true,
      isActive: true,
    },
  });

  console.log("=== FOUNDERS AND CO-FOUNDERS IN DB ===");
  foundersAndCoFounders.forEach((u) => console.log(u));
}

main().catch(console.error).finally(() => db.$disconnect());
