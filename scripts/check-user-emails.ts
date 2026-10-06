import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      id: { in: ["cmuw8zizo000h12t76attfbro", "cmuw8zk0f000q12t77303090u"] },
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      orgRole: true,
    },
  });

  console.log("Users found by ID:", JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

main();
