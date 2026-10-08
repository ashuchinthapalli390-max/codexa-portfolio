import { db } from "../src/lib/db";

async function main() {
  console.log("=== CODEXA ECOSYSTEM TABLES AUDIT ===");

  const classes = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM scheduled_classes").catch(e => [{ count: "ERROR: " + e.message }]);
  console.log("1. Scheduled Classes:", classes[0].count);

  const assignments = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM assignments").catch(e => [{ count: "ERROR: " + e.message }]);
  console.log("2. Assignments:", assignments[0].count);

  const submissions = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM assignment_submissions").catch(e => [{ count: "ERROR: " + e.message }]);
  console.log("3. Assignment Submissions:", submissions[0].count);

  const idCards = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM id_card_photo_submissions").catch(e => [{ count: "ERROR: " + e.message }]);
  console.log("4. ID Card Submissions:", idCards[0].count);

  const aiReqs = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM ai_access_requests").catch(e => [{ count: "ERROR: " + e.message }]);
  console.log("5. AI Access Requests:", aiReqs[0].count);

  const attendanceWindows = await db.attendanceWindow.count();
  console.log("6. Attendance Windows:", attendanceWindows);

  const mobileSessions = await db.mobileSession.count();
  console.log("7. Mobile Sessions:", mobileSessions);

  const totalUsers = await db.user.count();
  const totalInterns = await db.user.count({ where: { role: "INTERN" } });
  console.log(`8. Users: ${totalUsers} total, ${totalInterns} interns`);

  console.log("=== AUDIT COMPLETE ===");
}

main().catch(console.error).finally(() => db.$disconnect());
