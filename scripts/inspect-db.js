const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.paymentRequest.findMany({
    take: 10,
    select: {
      id: true,
      referenceId: true,
      userName: true,
      domain: true,
      fixedAmount: true,
      paymentPurpose: true,
      paymentStatus: true,
      title: true,
      lineItems: true,
    }
  });
  console.log("Sample payments:", payments);

  const distinctDomains = await prisma.paymentRequest.findMany({
    select: { domain: true },
    distinct: ['domain'],
  });
  console.log("Distinct domains in PaymentRequest:", distinctDomains);

  const distinctPurposes = await prisma.paymentRequest.findMany({
    select: { paymentPurpose: true },
    distinct: ['paymentPurpose'],
  });
  console.log("Distinct payment purposes:", distinctPurposes);

  const userStats = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  });
  console.log("User role breakdown:", userStats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
