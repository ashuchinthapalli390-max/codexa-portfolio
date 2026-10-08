import { db } from "../src/lib/db";

async function main() {
  const interns = await db.user.findMany({
    where: { role: "INTERN" },
    include: {
      profile: true,
      employmentProfile: true,
    },
  });

  console.log(`Checking 39 interns for duplicates or anomalies:`);
  const usernames = new Set<string>();
  const emails = new Set<string>();
  const empIds = new Set<string>();

  for (const intern of interns) {
    if (usernames.has(intern.username)) console.log(`DUPLICATE USERNAME: ${intern.username}`);
    usernames.add(intern.username);

    if (emails.has(intern.email)) console.log(`DUPLICATE EMAIL: ${intern.email}`);
    emails.add(intern.email);

    const empId = intern.employmentProfile?.employeeId;
    if (empId) {
      if (empIds.has(empId)) console.log(`DUPLICATE EMP ID: ${empId}`);
      empIds.add(empId);
    } else {
      console.log(`MISSING EMP ID: ${intern.username} (${intern.fullName})`);
    }

    if (!intern.fullName) console.log(`MISSING FULL NAME: ${intern.username}`);
    if (!intern.profileMediaUrl) console.log(`NO PROFILE MEDIA URL: ${intern.username}`);
  }

  console.log(`Distinct usernames: ${usernames.size}, emails: ${emails.size}, empIds: ${empIds.size}`);
}

main().catch(console.error).finally(() => db.$disconnect());
