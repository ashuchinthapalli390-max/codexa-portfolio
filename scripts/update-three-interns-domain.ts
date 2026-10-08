import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const TARGET_IDS = ["CXA-INT-2026-040", "CXA-INT-2026-041", "CXA-INT-2026-042"];
const DOMAIN = "Full-Stack Development with AI";
const DURATION = "3 Months";
const DURATION_MONTHS = 3;
const DESIGNATION = "Full-Stack Development with AI Intern";

async function main() {
  console.log("=== UPDATING DOMAIN & DURATION FOR NEW 3 INTERNS ===");

  // 1. Update EmploymentProfile
  const empUpdate = await prisma.employmentProfile.updateMany({
    where: {
      employeeId: { in: TARGET_IDS },
    },
    data: {
      department: DOMAIN,
      internshipDomain: DOMAIN,
      designation: DESIGNATION,
      internshipDuration: DURATION,
      internshipDurationMonths: DURATION_MONTHS,
    },
  });
  console.log(`Updated EmploymentProfile for ${empUpdate.count} interns.`);

  // 2. Update PaymentRequest
  const payUpdate = await prisma.paymentRequest.updateMany({
    where: {
      internId: { in: TARGET_IDS },
    },
    data: {
      domain: DOMAIN,
    },
  });
  console.log(`Updated PaymentRequest domain for ${payUpdate.count} records.`);

  // 3. Update Master CSV rows 40, 41, 42
  const csvPath = path.resolve(process.cwd(), "CodeXa_Interns_Master_Details_39_Updated_2026-10-07.csv");
  if (fs.existsSync(csvPath)) {
    let content = fs.readFileSync(csvPath, "utf8");
    let lines = content.split(/\r?\n/);
    lines = lines.map((line) => {
      if (
        line.includes("CXA-INT-2026-040") ||
        line.includes("CXA-INT-2026-041") ||
        line.includes("CXA-INT-2026-042")
      ) {
        return line.replace(",Engineering,3,", `,${DOMAIN},3,`);
      }
      return line;
    });
    fs.writeFileSync(csvPath, lines.join("\n"), "utf8");
    console.log("Updated domain in master CSV file.");
  }

  // 4. Verification
  console.log("\n=== VERIFICATION ===");
  const verified = await prisma.user.findMany({
    where: {
      employmentProfile: {
        employeeId: { in: TARGET_IDS },
      },
    },
    include: {
      employmentProfile: true,
      paymentRequests: true,
    },
  });

  for (const u of verified) {
    console.log({
      internId: u.employmentProfile?.employeeId,
      name: u.fullName,
      mobile: u.phone,
      domain: u.employmentProfile?.internshipDomain,
      dept: u.employmentProfile?.department,
      designation: u.employmentProfile?.designation,
      duration: u.employmentProfile?.internshipDuration,
      paymentRef: u.paymentRequests[0]?.referenceId,
      paymentDomain: u.paymentRequests[0]?.domain,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
