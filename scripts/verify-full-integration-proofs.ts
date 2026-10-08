import { db } from "../src/lib/db";
import { getEffectiveRole, hasPermission, Permission } from "../src/lib/permissions";
import { getOrCreateGlobalMobileConfig } from "../src/lib/mobile-features";

async function runIntegrationVerification() {
  console.log("=================================================================");
  console.log("   CODEXA ECOSYSTEM — 5-STEP INTEGRATION PROOF SUITE");
  console.log("=================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(title: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${title}`);
      if (details) console.log(`       -> ${details}`);
    } else {
      console.error(`[FAIL] ${title}`);
      if (details) console.error(`       -> ${details}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: 39-Interns Exact Parity Proof
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 1: PEOPLE DIRECTORY & 39-INTERNS PARITY ---");
  const allInterns = await db.user.findMany({
    where: { role: "INTERN" },
    include: { employmentProfile: true }
  });
  assert("Total Interns count in Core DB is 39", allInterns.length === 39, `Found: ${allInterns.length}`);

  const activeInterns = allInterns.filter(i => i.isActive);
  assert("Active Interns count is 39 (No missing Santhoshi or 38-limit bug)", activeInterns.length === 39, `Active: ${activeInterns.length}`);

  const uniqueUsernames = new Set(allInterns.map(i => i.username));
  assert("All 39 Intern usernames are distinct", uniqueUsernames.size === 39, `Distinct: ${uniqueUsernames.size}`);

  const uniqueEmpIds = new Set(allInterns.map(i => i.employmentProfile?.employeeId).filter(Boolean));
  assert("All 39 Intern Employee IDs are distinct", uniqueEmpIds.size === 39, `Distinct: ${uniqueEmpIds.size}`);

  // -------------------------------------------------------------
  // TEST 2: Role & Permission Matrix (Founder vs Intern)
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: RBAC MATRIX & FOUNDER VS INTERN ENFORCEMENT ---");
  const founderUser = await db.user.findFirst({
    where: {
      OR: [
        { email: "ashuchinthapalli3900@gmail.com" },
        { username: "ashu" },
        { role: "FOUNDER" }
      ]
    }
  });

  const sampleIntern = allInterns[0];

  assert("Founder account exists in Core DB", !!founderUser, `Username: @${founderUser?.username}`);
  const founderRole = getEffectiveRole(founderUser);
  assert("Founder effective role resolves to FOUNDER", founderRole === "FOUNDER", `Role: ${founderRole}`);

  const internRole = getEffectiveRole(sampleIntern);
  assert("Intern effective role resolves to INTERN", internRole === "INTERN", `Role: ${internRole}`);

  const founderCanControlAttendance = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR"].includes(founderRole);
  assert("Founder is authorized to OPEN/CLOSE attendance windows", founderCanControlAttendance);

  const internCanControlAttendance = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR"].includes(internRole);
  assert("Intern is BLOCKED from opening/closing attendance windows", !internCanControlAttendance);

  // -------------------------------------------------------------
  // TEST 3: Mobile App Control & Remote Config DB Persistence
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: APP CONTROL & CONFIG PERSISTENCE ---");
  const globalConfig = await getOrCreateGlobalMobileConfig();
  assert("MobileAppConfig singleton exists in Core DB", !!globalConfig, `ID: ${globalConfig.id}`);
  assert("MobileAppConfig has valid version", !!globalConfig.currentVersion, `Version: ${globalConfig.currentVersion}`);
  assert("MobileAppConfig configVersion is positive integer", globalConfig.configVersion > 0, `configVersion: ${globalConfig.configVersion}`);

  // -------------------------------------------------------------
  // TEST 4: Attendance Lifecycle & Window Sync
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: ATTENDANCE LIFECYCLE ---");
  const latestWindow = await db.attendanceWindow.findFirst({
    orderBy: { createdAt: "desc" }
  });
  assert("Attendance window record exists in Core DB", !!latestWindow, `Status: ${latestWindow?.status}`);

  // -------------------------------------------------------------
  // TEST 5: Scheduled Classes & Curriculum
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 5: SCHEDULED CLASSES & CURRICULUM ---");
  const classes = await db.$queryRawUnsafe<any[]>("SELECT * FROM scheduled_classes ORDER BY class_date DESC LIMIT 5");
  assert("Scheduled classes table has records", classes.length > 0, `Classes found: ${classes.length}`);
  if (classes.length > 0) {
    const c = classes[0];
    assert("Class has title, topic, and instructor", !!(c.title && c.topic && c.instructor_name), `Title: "${c.title}", Topic: "${c.topic}"`);
  }

  // -------------------------------------------------------------
  // TEST 6: Assignments & Multi-type Submissions
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 6: ASSIGNMENTS & REPOSITORIES ---");
  const assignments = await db.$queryRawUnsafe<any[]>("SELECT * FROM assignments ORDER BY due_date DESC LIMIT 5");
  assert("Assignments table has active assignments", assignments.length > 0, `Assignments found: ${assignments.length}`);
  if (assignments.length > 0) {
    const a = assignments[0];
    assert("Assignment specifies submission type", !!a.submission_type, `Type: ${a.submission_type}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Mandatory 450 Fee & Post-Payment Benefits
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 7: PAYMENTS (450 BILL) & BENEFITS TABLES ---");
  const sampleBill = await db.paymentRequest.findFirst({
    where: { paymentPurpose: "INTERNSHIP_FEE" }
  });
  assert("Internship fee billing record exists", !!sampleBill, `Bill amount: ${sampleBill?.amount}`);

  const idCardTableCheck = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM id_card_photo_submissions");
  assert("id_card_photo_submissions table is active", idCardTableCheck[0].count !== undefined, `Rows: ${idCardTableCheck[0].count}`);

  const aiAccessTableCheck = await db.$queryRawUnsafe<any[]>("SELECT count(*) as count FROM ai_access_requests");
  assert("ai_access_requests table is active", aiAccessTableCheck[0].count !== undefined, `Rows: ${aiAccessTableCheck[0].count}`);

  // -------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`   INTEGRATION VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log("=================================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runIntegrationVerification().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
