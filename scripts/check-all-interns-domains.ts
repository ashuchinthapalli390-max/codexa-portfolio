import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    where: {
      OR: [{ role: "INTERN" }, { orgRole: "INTERN" }]
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      employmentProfile: {
        select: {
          employeeId: true,
          internshipDomain: true,
          internshipDuration: true,
          internshipDurationMonths: true,
          department: true,
          employmentType: true,
        }
      },
      paymentRequests: {
        select: {
          id: true,
          referenceId: true,
          domain: true,
          paymentStatus: true,
          cashStatus: true,
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Total interns in DB: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`[${i+1}] ${u.employmentProfile?.employeeId || 'NO_ID'} | ${u.fullName} (${u.email})`);
    console.log(`     Profile: domain="${u.employmentProfile?.internshipDomain}" | dept="${u.employmentProfile?.department}" | dur="${u.employmentProfile?.internshipDuration}" (${u.employmentProfile?.internshipDurationMonths}m) | type="${u.employmentProfile?.employmentType}"`);
    console.log(`     Payment: ref="${u.paymentRequests[0]?.referenceId}" | domain="${u.paymentRequests[0]?.domain}" | status="${u.paymentRequests[0]?.paymentStatus}" | cash="${u.paymentRequests[0]?.cashStatus}"`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
