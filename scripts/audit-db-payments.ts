import { db } from "../src/lib/db";

async function main() {
  const usersCount = await db.user.count();
  const paymentRequests = await db.paymentRequest.findMany({
    include: {
      attempts: true,
      submissions: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          orgRole: true,
          department: true,
          employmentProfile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalAttempts = await db.paymentAttempt.count();
  const totalSubmissions = await db.paymentSubmission.count();

  console.log("=== DB AUDIT OVERVIEW ===");
  console.log(`Total Users: ${usersCount}`);
  console.log(`Total Payment Requests: ${paymentRequests.length}`);
  console.log(`Total Payment Attempts: ${totalAttempts}`);
  console.log(`Total Submissions: ${totalSubmissions}`);

  console.log("\n=== PAYMENT REQUESTS DETAILS ===");
  paymentRequests.forEach((p, idx) => {
    console.log(`\n[${idx + 1}] ID: ${p.id} | Ref: ${p.referenceId}`);
    console.log(`    User: ${p.userName} (${p.userEmail}) | Role: ${p.userRole} | InternID: ${p.internId}`);
    console.log(`    Amount: ₹${p.fixedAmount} | Status: ${p.paymentStatus} | Method: ${p.paymentMethod} | CashStatus: ${p.cashStatus}`);
    console.log(`    Domain: "${p.domain}" | Created: ${p.createdAt.toISOString()}`);
    console.log(`    UTR: ${p.utrNumber} | ProofUrl: ${p.proofImageUrl ? p.proofImageUrl.substring(0, 60) + "..." : "null"}`);
    console.log(`    Attempts (${p.attempts.length}):`);
    p.attempts.forEach((a) => {
      console.log(`      -> Attempt ${a.id}: status=${a.status}, method=${a.selectedMethod}, utr=${a.utrNumber}, detectedUtr=${a.detectedUtr}, proof=${a.proofImageUrl ? a.proofImageUrl.substring(0, 50) + "..." : "null"}, reason=${a.verificationReason}`);
    });
    console.log(`    Submissions (${p.submissions.length}):`);
    p.submissions.forEach((s) => {
      console.log(`      -> Sub ${s.id}: status=${s.status}, utr=${s.utrNumber}, proof=${s.proofImageUrl ? s.proofImageUrl.substring(0, 50) + "..." : "null"}`);
    });
  });

  // Check unique domains currently in DB
  const distinctDomains = await db.paymentRequest.findMany({
    select: { domain: true },
    distinct: ["domain"],
  });
  console.log("\n=== DISTINCT PAYMENT DOMAINS IN DB ===");
  console.log(distinctDomains.map((d) => d.domain));

  // Check distinct internship domains in EmploymentProfile
  const profileDomains = await db.employmentProfile.findMany({
    select: { internshipDomain: true, department: true, employmentType: true },
    distinct: ["internshipDomain", "department"],
  });
  console.log("\n=== DISTINCT EMPLOYMENT PROFILE DOMAINS IN DB ===");
  console.log(profileDomains);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
