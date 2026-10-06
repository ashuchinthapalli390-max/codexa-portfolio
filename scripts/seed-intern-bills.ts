import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXACT_LINE_ITEMS = [
  {
    item: "Mandatory ID Card",
    amount: 150,
  },
  {
    item: "AI Dev Tools Pack (Shared)",
    amount: 300,
    details: [
      "Nexa AI Access",
      "ChatGPT Astra",
      "Anthropic Fabel",
      "Gemini Pro",
      "more models",
    ],
  },
];

async function seedInternBills() {
  console.log("=== SEEDING OFFICIAL INTERNSHIP SERVICE BILLS (₹450) FOR ALL INTERNS ===");

  // Find primary payment account
  const primaryAccount = await prisma.paymentAccount.findFirst({
    where: { isActive: true },
    orderBy: { isDefault: "desc" },
  });

  const interns = await prisma.user.findMany({
    where: {
      OR: [{ role: "INTERN" }, { orgRole: "INTERN" }],
    },
    include: {
      employmentProfile: true,
      profile: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${interns.length} interns in database.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < interns.length; i++) {
    const intern = interns[i];
    const internId = intern.employmentProfile?.employeeId || `CXA-INT-2026-${String(i + 1).padStart(3, "0")}`;
    const numPart = String(i + 1).padStart(4, "0");
    const refId = `CXA-PAY-2026-${numPart}`;

    const existing = await prisma.paymentRequest.findFirst({
      where: {
        userId: intern.id,
        paymentPurpose: "INTERNSHIP_FEE",
      },
    });

    if (!existing) {
      await prisma.paymentRequest.create({
        data: {
          referenceId: refId,
          userId: intern.id,
          userName: intern.fullName || intern.profile?.displayName || intern.username,
          userEmail: intern.email,
          userRole: "INTERN",
          employeeId: internId,
          internId: internId,
          domain: "Development",
          paymentPurpose: "INTERNSHIP_FEE",
          title: "INTERNSHIP SERVICE BILL",
          description: "Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)",
          lineItems: EXACT_LINE_ITEMS,
          fixedAmount: 450.0,
          currency: "INR",
          paymentStatus: "PENDING_PAYMENT",
          paymentAccountId: primaryAccount?.id || null,
          dueDate: new Date("2026-10-15T23:59:59Z"),
        },
      });
      createdCount++;
      console.log(`[CREATED] ${refId} for ${intern.email} (${internId})`);
    } else {
      await prisma.paymentRequest.update({
        where: { id: existing.id },
        data: {
          title: "INTERNSHIP SERVICE BILL",
          domain: "Development",
          lineItems: EXACT_LINE_ITEMS,
          fixedAmount: 450.0,
          paymentAccountId: primaryAccount?.id || existing.paymentAccountId,
        },
      });
      updatedCount++;
      console.log(`[UPDATED] ${existing.referenceId} for ${intern.email}`);
    }
  }

  const totalPayments = await prisma.paymentRequest.count();
  console.log(`\n=== SUMMARY ===`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Total Payment Requests in DB: ${totalPayments}`);
}

seedInternBills()
  .catch((e) => {
    console.error("Error seeding intern bills:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
