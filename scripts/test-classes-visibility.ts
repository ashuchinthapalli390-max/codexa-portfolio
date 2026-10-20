import {
  parseYearOfStudy,
  extractTargetYears,
  determineClassType,
  computePublicationStatus,
  computeLifecycleStatus,
} from "../src/lib/classes/class-visibility";
import {
  hasPermission,
  Permission,
  ROLE_PERMISSIONS,
} from "../src/lib/permissions";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${msg}`);
}

async function runTests() {
  console.log("=== CODEXA MOBILE V9 — BACKEND CLASSES VISIBILITY VERIFICATION ===");

  // 1. Academic Year Parsing
  assert(parseYearOfStudy("1st Year") === 1, "parseYearOfStudy('1st Year') === 1");
  assert(parseYearOfStudy("2nd Year") === 2, "parseYearOfStudy('2nd Year') === 2");
  assert(parseYearOfStudy("3rd Year") === 3, "parseYearOfStudy('3rd Year') === 3");
  assert(parseYearOfStudy("4th Year") === 4, "parseYearOfStudy('4th Year') === 4");
  assert(parseYearOfStudy("Year 2") === 2, "parseYearOfStudy('Year 2') === 2");
  assert(parseYearOfStudy("Year-3") === 3, "parseYearOfStudy('Year-3') === 3");
  assert(parseYearOfStudy(null) === null, "parseYearOfStudy(null) === null");

  // 2. Target Academic Years in Classes
  const targetYears1 = extractTargetYears(["YEAR_1", "YEAR_2"]);
  assert(targetYears1.length === 2 && targetYears1.includes(1) && targetYears1.includes(2), "extractTargetYears(['YEAR_1', 'YEAR_2'])");
  const targetYearsAll = extractTargetYears(["ALL_YEARS"]);
  assert(targetYearsAll.length === 4, "extractTargetYears(['ALL_YEARS']) returns all 4 years");

  // 3. Class Types
  assert(determineClassType({ title: "Live System Design", mode: "ONLINE" }) === "LIVE_CLASS", "determineClassType Live");
  assert(determineClassType({ title: "Workshop: Building Agents", mode: "ONLINE" }) === "WORKSHOP", "determineClassType Workshop");
  assert(determineClassType({ title: "Weekly Mentor Sync", mode: "ONLINE" }) === "MENTOR_SESSION", "determineClassType Mentor");
  assert(determineClassType({ title: "In-Person Hardware Lab", mode: "OFFLINE" }) === "OFFLINE_CLASS", "determineClassType Offline");

  // 4. Publication State vs Lifecycle Status
  assert(computePublicationStatus({ publishedAt: null, status: "DRAFT" }) === "DRAFT", "Draft is DRAFT");
  assert(computePublicationStatus({ publishedAt: null, status: "UPCOMING" }) === "UNPUBLISHED", "No publishedAt is UNPUBLISHED");
  assert(computePublicationStatus({ publishedAt: new Date(), status: "UPCOMING" }) === "PUBLISHED", "With publishedAt is PUBLISHED");

  assert(computeLifecycleStatus({ status: "CANCELLED", classDate: new Date(), startTime: "10:00", endTime: "11:00" }) === "CANCELLED", "Cancelled status");
  assert(computeLifecycleStatus({ status: "RESCHEDULED", classDate: new Date(), startTime: "10:00", endTime: "11:00" }) === "RESCHEDULED", "Rescheduled status");
  assert(computeLifecycleStatus({ status: "COMPLETED", classDate: new Date(), startTime: "10:00", endTime: "11:00" }) === "COMPLETED", "Completed status");

  // 5. RBAC & Administrative Isolation
  assert(hasPermission("FOUNDER", Permission.CAN_VIEW_CLASSES), "Founder can view classes");
  assert(hasPermission("FOUNDER", Permission.CAN_VIEW_DRAFT_CLASSES), "Founder can view draft classes");
  assert(hasPermission("FOUNDER", Permission.CAN_CREATE_CLASSES), "Founder can create classes");
  assert(hasPermission("FOUNDER", Permission.CAN_EDIT_CLASSES), "Founder can edit classes");
  assert(hasPermission("FOUNDER", Permission.CAN_PUBLISH_CLASSES), "Founder can publish classes");
  assert(hasPermission("FOUNDER", Permission.CAN_RESCHEDULE_CLASSES), "Founder can reschedule classes");
  assert(hasPermission("FOUNDER", Permission.CAN_CANCEL_CLASSES), "Founder can cancel classes");

  assert(hasPermission("CO_FOUNDER", Permission.CAN_VIEW_CLASSES), "Co-Founder can view classes");
  assert(hasPermission("CO_FOUNDER", Permission.CAN_VIEW_DRAFT_CLASSES), "Co-Founder can view draft classes");
  assert(hasPermission("CO_FOUNDER", Permission.CAN_CREATE_CLASSES), "Co-Founder can create classes");

  // Ordinary Roles: CAN_VIEW_CLASSES only, NO draft or mutation rights by default
  const nonAdminRoles = ["CEO", "CTO", "HR", "COO", "EMPLOYEE", "INTERN"] as const;
  for (const r of nonAdminRoles) {
    assert(hasPermission(r, Permission.CAN_VIEW_CLASSES), `${r} can view published classes`);
    assert(!hasPermission(r, Permission.CAN_VIEW_DRAFT_CLASSES), `${r} cannot view draft classes by default`);
    assert(!hasPermission(r, Permission.CAN_CREATE_CLASSES), `${r} cannot create classes by default`);
    assert(!hasPermission(r, Permission.CAN_EDIT_CLASSES), `${r} cannot edit classes by default`);
    assert(!hasPermission(r, Permission.CAN_PUBLISH_CLASSES), `${r} cannot publish classes by default`);
    assert(!hasPermission(r, Permission.CAN_CANCEL_CLASSES), `${r} cannot cancel classes by default`);
  }

  console.log("\n🎉 ALL BACKEND CLASSES VISIBILITY & SECURITY UNIT TESTS PASSED!");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
