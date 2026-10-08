import { db } from "../src/lib/db";

async function main() {
  console.log("Testing Prisma Client Typed Models...");

  const classes = await db.scheduledClass.findMany();
  console.log(`[PASS] db.scheduledClass.findMany() returned ${classes.length} classes.`);

  const assignments = await db.assignment.findMany();
  console.log(`[PASS] db.assignment.findMany() returned ${assignments.length} assignments.`);

  const submissions = await db.assignmentSubmission.findMany();
  console.log(`[PASS] db.assignmentSubmission.findMany() returned ${submissions.length} submissions.`);

  const idCards = await db.idCardPhotoSubmission.findMany();
  console.log(`[PASS] db.idCardPhotoSubmission.findMany() returned ${idCards.length} photo submissions.`);

  const aiRequests = await db.aiAccessRequest.findMany();
  console.log(`[PASS] db.aiAccessRequest.findMany() returned ${aiRequests.length} AI requests.`);

  console.log("All typed Prisma models work perfectly!");
}

main().catch(console.error).finally(() => db.$disconnect());
