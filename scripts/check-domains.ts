import { db } from "../src/lib/db";

async function main() {
  const interns = await db.user.findMany({
    where: { role: "INTERN" },
    include: { employmentProfile: true },
  });

  console.log("Total interns:", interns.length);
  const userDepts = [...new Set(interns.map((i) => i.department))];
  const empDepts = [...new Set(interns.map((i) => i.employmentProfile?.department))];
  const designations = [...new Set(interns.map((i) => i.employmentProfile?.designation))];

  console.log("User departments:", userDepts);
  console.log("EmploymentProfile departments:", empDepts);
  console.log("EmploymentProfile designations:", designations);

  // Check sample intern records
  console.log("\nSample 5 interns:");
  for (const i of interns.slice(0, 5)) {
    console.log({
      id: i.id,
      email: i.email,
      dept: i.department,
      empDept: i.employmentProfile?.department,
      designation: i.employmentProfile?.designation,
      status: i.employmentProfile?.status,
    });
  }

  // Check PaymentRequest domains
  const payments = await db.paymentRequest.findMany({
    select: { domain: true, paymentPurpose: true, fixedAmount: true, paymentStatus: true },
  });
  console.log("\nPaymentRequest domains:", [...new Set(payments.map((p) => p.domain))]);
}

main().finally(() => db.$disconnect());
