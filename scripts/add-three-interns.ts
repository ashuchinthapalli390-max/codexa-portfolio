import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const DEFAULT_HASH = "$2b$12$6C.f4gWxN1iPQrcVeat/JeF44GdWOl2y6iRdPlFQAteo8Lw1SqQ9K"; // Hash for "CodeXa@Intern2026#Access"

const NEW_INTERNS = [
  {
    order: 40,
    internId: "CXA-INT-2026-040",
    fullName: "Chinnam Likith Venkata Karthikeya",
    email: "karthikchinnam02@gmail.com",
    phone: "9490801597",
    college: "Narasaraopeta Engineering College",
    collegeLocation: "Narasaraopet, Palnadu, Andhra Pradesh",
    offerReference: "CXA/INT/2026/040",
    preferredUsername: "karthikchinnam",
    paymentRef: "CXA-PAY-2026-0040",
  },
  {
    order: 41,
    internId: "CXA-INT-2026-041",
    fullName: "Shaik Arifa",
    email: "msk007728@gmail.com",
    phone: "8639446926",
    college: "Narasaraopeta Engineering College",
    collegeLocation: "Narasaraopet, Palnadu, Andhra Pradesh",
    offerReference: "CXA/INT/2026/041",
    preferredUsername: "shaikarifa",
    paymentRef: "CXA-PAY-2026-0041",
  },
  {
    order: 42,
    internId: "CXA-INT-2026-042",
    fullName: "B. Naga Yasaswini",
    email: "bapanapalliyasaswini1211@gmail.com",
    phone: "9490346976",
    college: "Narasaraopeta Engineering College",
    collegeLocation: "Narasaraopet, Palnadu, Andhra Pradesh",
    offerReference: "CXA/INT/2026/042",
    preferredUsername: "nagayasaswini",
    paymentRef: "CXA-PAY-2026-0042",
  },
];

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

async function main() {
  console.log("=== ADDING 3 NEW INTERNS TO CODEXA DATABASE ===");

  const primaryAccount = await prisma.paymentAccount.findFirst({
    where: { isActive: true },
    orderBy: { isDefault: "desc" },
  });

  const existingUsers = await prisma.user.findMany({
    select: { username: true, email: true },
  });
  const takenUsernames = new Set(existingUsers.map((u) => u.username.toLowerCase()));

  const joiningDate = new Date("2026-10-24T00:00:00.000Z");
  const endDate = new Date("2027-01-23T00:00:00.000Z");
  const dueDate = new Date("2026-10-15T23:59:59.000Z");

  for (const intern of NEW_INTERNS) {
    const email = intern.email.toLowerCase().trim();

    // Check existing
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { employmentProfile: { employeeId: intern.internId } },
        ],
      },
      include: {
        employmentProfile: true,
        paymentRequests: true,
      },
    });

    if (existing) {
      console.log(`[ALREADY EXISTS] ${intern.internId} (${email}) - skipping creation.`);
      continue;
    }

    // Determine unique username
    let candidateUsername = intern.preferredUsername.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    let counter = 1;
    while (takenUsernames.has(candidateUsername)) {
      candidateUsername = `${intern.preferredUsername}${counter}`;
      counter++;
    }
    takenUsernames.add(candidateUsername);

    console.log(`Creating intern: ${intern.internId} | ${intern.fullName} | @${candidateUsername} | ${email}`);

    // Create User, Profile, EmploymentProfile, PaymentRequest in transaction
    const createdUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          username: candidateUsername,
          fullName: intern.fullName,
          phone: intern.phone,
          role: "INTERN",
          orgRole: "INTERN",
          department: "Engineering",
          passwordHash: DEFAULT_HASH,
          mustChangePassword: true,
          isActive: true,
          internServicePaymentPaid: false,
          profile: {
            create: {
              displayName: intern.fullName,
              memberType: "CORE_TEAM",
              primaryRole: "Intern Engineer",
              headline: "Intern Engineer at CodeXa Agency",
              bio: `Intern Engineer at CodeXa Agency. Assigned ID: ${intern.internId}`,
              isPublic: false,
            },
          },
          employmentProfile: {
            create: {
              employeeId: intern.internId,
              employmentType: "INTERN",
              workforceType: "INTERN",
              department: "Engineering",
              designation: "Intern Engineer",
              status: "ACTIVE",
              stipend: 15000,
              internshipDuration: "3 Months",
              internshipDurationMonths: 3,
              joiningDate,
              endDate,
              internshipStartDate: joiningDate,
              internshipEndDate: endDate,
              college: intern.college,
              collegeLocation: intern.collegeLocation,
              referenceNumber: intern.offerReference,
              phone: intern.phone,
            },
          },
        },
        include: {
          employmentProfile: true,
          profile: true,
        },
      });

      // Create PaymentRequest for ₹450
      await tx.paymentRequest.create({
        data: {
          referenceId: intern.paymentRef,
          userId: u.id,
          userName: intern.fullName,
          userEmail: email,
          userRole: "INTERN",
          workforceType: "INTERN",
          employeeId: intern.internId,
          internId: intern.internId,
          domain: "Engineering",
          paymentPurpose: "INTERNSHIP_FEE",
          title: "INTERNSHIP SERVICE BILL",
          description: "Mandatory ID Card (₹150) + AI Dev Tools Pack (Shared) (₹300)",
          lineItems: EXACT_LINE_ITEMS,
          fixedAmount: 450.0,
          currency: "INR",
          paymentStatus: "PENDING_PAYMENT",
          cashStatus: "NONE",
          paymentAccountId: primaryAccount?.id || null,
          dueDate,
        },
      });

      return u;
    });

    console.log(`[SUCCESS] Created ${intern.internId} (${createdUser.id}) with Payment ${intern.paymentRef}`);
  }

  // Verification pass
  console.log("\n=== POST-PROVISIONING VERIFICATION ===");
  const allTargetInterns = await prisma.user.findMany({
    where: {
      employmentProfile: {
        employeeId: { in: NEW_INTERNS.map((i) => i.internId) },
      },
    },
    include: {
      employmentProfile: true,
      profile: true,
      paymentRequests: true,
    },
  });

  console.log(`Verified ${allTargetInterns.length} / ${NEW_INTERNS.length} interns in database.`);
  for (const t of allTargetInterns) {
    console.log({
      id: t.id,
      internId: t.employmentProfile?.employeeId,
      name: t.fullName,
      email: t.email,
      username: t.username,
      college: t.employmentProfile?.college,
      phone: t.employmentProfile?.phone,
      offerRef: t.employmentProfile?.referenceNumber,
      paymentRef: t.paymentRequests[0]?.referenceId,
      paymentStatus: t.paymentRequests[0]?.paymentStatus,
    });
  }
}

main()
  .catch((e) => {
    console.error("Failed to add interns:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
