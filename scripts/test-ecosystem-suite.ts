import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  getEffectiveRole,
  isPermanentFounder,
  canCreateRole,
  getAllowedRolesToCreate,
  OrgRole,
} from "../src/lib/permissions";
import {
  generateCodeXaId,
  generateOfferNumber,
  generatePayslipNumber,
  generateVerificationCode,
  generateDesktopActivationKey,
  generatePublishToken,
} from "../src/lib/cxa-ids";

async function runEcosystemVerification() {
  console.log("=================================================================");
  console.log("   CODEXA AGENCY — COMPLETE ECOSYSTEM INTEGRATION TEST SUITE   ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // ─── 1. VERIFY SEEDED CREW ACCOUNTS & BCRYPT ─────────────────────────────
  console.log("\n--- TEST GROUP 1: SEEDED CREW ACCOUNTS ---");
  const crewEmails = [
    { email: "boddukurisanjay@gmail.com", expectedRole: "CO_FOUNDER", name: "Sanjay" },
    { email: "katlakishore86@gmail.com", expectedRole: "CEO", name: "Kishore" },
    { email: "amruthadivvela@gmail.com", expectedRole: "CTO", name: "Amrutha" },
    { email: "vyshnavireddy720@gmail.com", expectedRole: "HR", name: "Vyshnavi" },
    { email: "varunparlapalli2008@gmail.com", expectedRole: "COO", name: "Varun" },
  ];

  for (const c of crewEmails) {
    const user = await db.user.findUnique({ where: { email: c.email } });
    assert(Boolean(user), `Crew account exists: ${c.email}`);
    if (user) {
      assert(user.mustChangePassword === true, `${c.name} has mustChangePassword = true`);
      assert(user.role === c.expectedRole || user.orgRole === c.expectedRole, `${c.name} has role ${c.expectedRole}`);
      const validPw = await bcrypt.compare("Codexa123", user.passwordHash);
      assert(validPw, `${c.name} password matches hashed temporary password "Codexa123"`);
    }
  }

  // ─── 2. ROLE & PERMISSIONS ARCHITECTURE (ALL 8 ROLES) ────────────────────
  console.log("\n--- TEST GROUP 2: ROLE RBAC & AUTHORIZATION MATRICES ---");
  const founderUser = { email: "ashuchinthapalli3900@gmail.com", role: "FOUNDER" };
  const coFounderUser = { email: "boddukurisanjay@gmail.com", role: "CO_FOUNDER" };
  const ceoUser = { email: "katlakishore86@gmail.com", role: "CEO" };
  const ctoUser = { email: "amruthadivvela@gmail.com", role: "CTO" };
  const hrUser = { email: "vyshnavireddy720@gmail.com", role: "HR" };
  const cooUser = { email: "varunparlapalli2008@gmail.com", role: "COO" };
  const employeeUser = { email: "dev@codxa.online", role: "EMPLOYEE" };
  const internUser = { email: "intern@codxa.online", role: "INTERN" };

  // Founder & Co-Founder full parity
  assert(getEffectiveRole(founderUser) === "FOUNDER", "Founder resolves to FOUNDER");
  assert(getEffectiveRole(coFounderUser) === "CO_FOUNDER", "Co-Founder resolves to CO_FOUNDER");
  assert(hasPermission(founderUser, Permission.MANAGE_SECURITY), "Founder has MANAGE_SECURITY");
  assert(hasPermission(coFounderUser, Permission.MANAGE_SECURITY), "Co-Founder has MANAGE_SECURITY (100% parity)");
  assert(hasPermission(founderUser, Permission.MANAGE_PAYROLL), "Founder has MANAGE_PAYROLL");
  assert(hasPermission(coFounderUser, Permission.MANAGE_PAYROLL), "Co-Founder has MANAGE_PAYROLL");

  // CEO boundaries
  assert(hasPermission(ceoUser, Permission.VIEW_DASHBOARD), "CEO has VIEW_DASHBOARD");
  assert(hasPermission(ceoUser, Permission.VIEW_PROJECTS), "CEO has VIEW_PROJECTS");
  assert(!hasPermission(ceoUser, Permission.MANAGE_SECURITY), "CEO CANNOT MANAGE_SECURITY");
  assert(!hasPermission(ceoUser, Permission.DELETE_USERS), "CEO CANNOT DELETE_USERS");

  // CTO boundaries
  assert(hasPermission(ctoUser, Permission.CREATE_PROJECTS), "CTO can CREATE_PROJECTS");
  assert(hasPermission(ctoUser, Permission.APPROVE_PROJECTS), "CTO can APPROVE_PROJECTS");
  assert(hasPermission(ctoUser, Permission.MANAGE_DESKTOP_ACCESS), "CTO can MANAGE_DESKTOP_ACCESS");
  assert(!hasPermission(ctoUser, Permission.MANAGE_PAYROLL), "CTO CANNOT MANAGE_PAYROLL");

  // HR boundaries
  assert(hasPermission(hrUser, Permission.MANAGE_EMPLOYEES), "HR can MANAGE_EMPLOYEES");
  assert(hasPermission(hrUser, Permission.MANAGE_INTERNS), "HR can MANAGE_INTERNS");
  assert(hasPermission(hrUser, Permission.VERIFY_PAYMENTS), "HR can VERIFY_PAYMENTS");
  assert(hasPermission(hrUser, Permission.GENERATE_OFFER_LETTERS), "HR can GENERATE_OFFER_LETTERS");
  assert(!hasPermission(hrUser, Permission.MANAGE_SECURITY), "HR CANNOT MANAGE_SECURITY");

  // COO boundaries (Analytics removed per requirement)
  assert(hasPermission(cooUser, Permission.VIEW_DASHBOARD), "COO has VIEW_DASHBOARD");
  assert(hasPermission(cooUser, Permission.VIEW_PROJECTS), "COO has VIEW_PROJECTS");
  assert(!hasPermission(cooUser, Permission.VIEW_ANALYTICS), "COO has NO VIEW_ANALYTICS (Analytics removed)");
  assert(!hasPermission(cooUser, Permission.EDIT_PROFILES), "COO CANNOT EDIT_PROFILES");

  // Employee & Intern personal boundaries
  assert(hasPermission(employeeUser, Permission.EDIT_OWN_PROFILE), "Employee can EDIT_OWN_PROFILE");
  assert(!hasPermission(employeeUser, Permission.EDIT_OTHER_PROFILES), "Employee CANNOT EDIT_OTHER_PROFILES");
  assert(!hasPermission(employeeUser, Permission.MANAGE_PAYROLL), "Employee CANNOT MANAGE_PAYROLL");
  assert(!hasPermission(internUser, Permission.APPROVE_PROJECTS), "Intern CANNOT APPROVE_PROJECTS");

  // Role creation boundary check
  assert(canCreateRole(founderUser, "CEO"), "Founder can create CEO");
  assert(canCreateRole(coFounderUser, "CTO"), "Co-Founder can create CTO");
  assert(canCreateRole(ctoUser, "EMPLOYEE"), "CTO can create EMPLOYEE");
  assert(canCreateRole(ctoUser, "INTERN"), "CTO can create INTERN");
  assert(!canCreateRole(ctoUser, "FOUNDER"), "CTO CANNOT create FOUNDER");
  assert(!canCreateRole(hrUser, "CO_FOUNDER"), "HR CANNOT create CO_FOUNDER");

  // High-Level Account Protection
  assert(isPermanentFounder("ashuchinthapalli3900@gmail.com"), "Permanent Founder protected");
  assert(!isPermanentFounder("katlakishore86@gmail.com"), "CEO is not permanent founder");

  // ─── 3. OFFICIAL CODEXA ID GENERATORS ────────────────────────────────────
  console.log("\n--- TEST GROUP 3: CODEXA ID & DOCUMENT IDENTIFIERS ---");
  const empId = await generateCodeXaId("EMPLOYEE");
  assert(empId.startsWith("CXA-EMP-2026-"), `Generated Employee ID format: ${empId}`);

  const intId = await generateCodeXaId("INTERN");
  assert(intId.startsWith("CXA-INT-2026-"), `Generated Intern ID format: ${intId}`);

  const offerNum = await generateOfferNumber();
  assert(offerNum.startsWith("CXA/OFFER/2026/"), `Generated Offer Letter format: ${offerNum}`);

  const verifyCode = generateVerificationCode();
  assert(verifyCode.startsWith("CXA-V-"), `Generated Verification Code format: ${verifyCode}`);

  const payslipNum = await generatePayslipNumber(10, 2026);
  assert(payslipNum.startsWith("CXA-PAY-2026-10-"), `Generated Payslip Number format: ${payslipNum}`);

  const desktopKey = generateDesktopActivationKey();
  assert(desktopKey.rawKey.startsWith("CXA-DESK-"), `Generated Desktop License Key: ${desktopKey.rawKey}`);
  assert(desktopKey.keyHash.length === 64, "Desktop key SHA-256 hash generated");
  assert(desktopKey.keyDisplayPrefix.startsWith("CXA-DESK-"), "Desktop key display prefix generated");

  const pubToken = generatePublishToken();
  assert(pubToken.rawToken.startsWith("CXA-PUBLISH-"), `Generated Publish Token format: ${pubToken.rawToken}`);
  assert(pubToken.expiresAt > new Date(), "Publish token expiration time set into future");

  // ─── 4. DATABASE MODELS & WORKFLOWS ──────────────────────────────────────
  console.log("\n--- TEST GROUP 4: DATABASE SCHEMAS & PLATFORM ENTITIES ---");

  // Feature flags
  const flags = await db.featureFlag.findMany();
  assert(flags.length >= 8, `Feature flags initialized (Count: ${flags.length})`);

  // Mobile App Config
  const mobileConf = await db.mobileAppConfig.findFirst({ where: { targetType: "GLOBAL" } });
  assert(Boolean(mobileConf), "Global Mobile App configuration exists");
  if (mobileConf) {
    assert(mobileConf.attendanceEnabled === true, "Mobile Attendance enabled by default");
    assert(mobileConf.dmRoleMatrix !== null, "Role-to-Role DM matrix persisted");
  }

  // Attendance Windows
  const testWindow = await db.attendanceWindow.create({
    data: {
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(Date.now() + 30 * 60 * 1000),
      status: "ACTIVE",
      createdById: userWithFounderId?.id || "seed-founder",
      createdByName: "Founder Ashu",
    },
  });
  assert(Boolean(testWindow.id), `Attendance Window session opened: ${testWindow.id}`);

  // Clean test window
  await db.attendanceWindow.delete({ where: { id: testWindow.id } });

  console.log("\n=================================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED   `);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

// Helper to get any founder ID
let userWithFounderId: any = null;
db.user.findFirst({ where: { role: "FOUNDER" } }).then((u) => {
  userWithFounderId = u;
  runEcosystemVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Test execution failed:", err);
      process.exit(1);
    });
});
