import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  getEffectiveRole,
  getRoleDisplayName,
  hasPermission,
  Permission,
  getAllowedRolesToCreate,
  canCreateRole,
  isProtectedAccount,
  canModifyTargetUser,
  PERMANENT_FOUNDER_EMAIL,
  CO_FOUNDER_EMAIL,
} from "../src/lib/permissions";

const prisma = new PrismaClient();

const EXPECTED_CREW = [
  {
    name: "Sanjay",
    email: "boddukurisanjay@gmail.com",
    role: "CO_FOUNDER",
    displayName: "Sanjay",
  },
  {
    name: "Kishore",
    email: "katlakishore86@gmail.com",
    role: "CEO",
    displayName: "Kishore",
  },
  {
    name: "Amrutha Divvela",
    email: "amruthadivvela@gmail.com",
    role: "CTO",
    displayName: "Amrutha Divvela",
  },
  {
    name: "Vyshnavi Reddy",
    email: "vyshnavireddy720@gmail.com",
    role: "HR",
    displayName: "Vyshnavi Reddy",
  },
  {
    name: "Varun Parlapalli",
    email: "varunparlapalli2008@gmail.com",
    role: "COO",
    displayName: "Varun Parlapalli",
  },
];

async function runTests() {
  console.log("=================================================");
  console.log("CODEXA AGENCY — CREW & RBAC VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${details ? `-> ${details}` : ""}`);
      failed++;
    }
  }

  // ─── 1. TEST DATABASE SEEDED CREW ACCOUNTS ──────────────────────────────────
  console.log("--- 1. Testing Database Seeded Crew Accounts ---");
  for (const expected of EXPECTED_CREW) {
    const normalizedEmail = expected.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { email: { equals: expected.email } },
        ],
      },
    });

    assert(Boolean(user), `Account exists for ${expected.email} (${expected.role})`);

    if (user) {
      // Check password hash against temporary password 'Codexa123'
      const match = await bcrypt.compare("Codexa123", user.passwordHash);
      assert(match, `Initial password matches temporary 'Codexa123' for ${expected.email}`);

      // Check mustChangePassword flag
      assert(user.mustChangePassword === true, `mustChangePassword flag is TRUE for ${expected.email}`);

      // Check role resolution
      const effectiveRole = getEffectiveRole(user);
      assert(
        effectiveRole === expected.role,
        `Effective role for ${expected.email} is ${expected.role} (resolved: ${effectiveRole})`
      );

      // Check account is active
      assert(user.isActive === true, `Account is active for ${expected.email}`);
    }
  }

  // ─── 2. TEST FOUNDER UNRESTRICTED PERMISSIONS ───────────────────────────────
  console.log("\n--- 2. Testing Founder & Co-Founder Permissions ---");
  const founderUser = { email: PERMANENT_FOUNDER_EMAIL, role: "OWNER" };
  const coFounderUser = { email: CO_FOUNDER_EMAIL, role: "CO_FOUNDER" };

  for (const perm of Object.values(Permission)) {
    assert(hasPermission(founderUser, perm), `Founder has permission: ${perm}`);
    assert(hasPermission(coFounderUser, perm), `Co-Founder has identical permission: ${perm}`);
  }

  // ─── 3. TEST CEO PERMISSION BOUNDARIES ──────────────────────────────────────
  console.log("\n--- 3. Testing CEO Access & Restrictions ---");
  const ceoUser = { email: "katlakishore86@gmail.com", role: "CEO" };

  assert(hasPermission(ceoUser, Permission.VIEW_DASHBOARD), "CEO can VIEW_DASHBOARD");
  assert(hasPermission(ceoUser, Permission.VIEW_EXECUTIVE_CENTER), "CEO can VIEW_EXECUTIVE_CENTER");
  assert(hasPermission(ceoUser, Permission.VIEW_CREW), "CEO can VIEW_CREW");
  assert(hasPermission(ceoUser, Permission.VIEW_EMPLOYEES), "CEO can VIEW_EMPLOYEES");
  assert(hasPermission(ceoUser, Permission.VIEW_INTERNS), "CEO can VIEW_INTERNS");
  assert(hasPermission(ceoUser, Permission.VIEW_PROFILES), "CEO can VIEW_PROFILES");
  assert(hasPermission(ceoUser, Permission.EDIT_PROFILES), "CEO can EDIT_PROFILES");
  assert(hasPermission(ceoUser, Permission.APPROVE_PROJECTS), "CEO can APPROVE_PROJECTS");
  assert(hasPermission(ceoUser, Permission.VIEW_APPROVALS), "CEO can VIEW_APPROVALS");
  assert(hasPermission(ceoUser, Permission.DECIDE_APPROVALS), "CEO can DECIDE_APPROVALS");
  assert(hasPermission(ceoUser, Permission.VIEW_PAYMENTS), "CEO can VIEW_PAYMENTS");
  assert(hasPermission(ceoUser, Permission.VIEW_PAYMENT_ANALYTICS), "CEO can VIEW_PAYMENT_ANALYTICS");
  assert(hasPermission(ceoUser, Permission.VIEW_ANALYTICS), "CEO can VIEW_ANALYTICS");

  // CEO Restrictions
  assert(!hasPermission(ceoUser, Permission.MANAGE_SECURITY), "CEO CANNOT MANAGE_SECURITY");
  assert(!hasPermission(ceoUser, Permission.MANAGE_PLATFORM_SETTINGS), "CEO CANNOT MANAGE_PLATFORM_SETTINGS");
  assert(!hasPermission(ceoUser, Permission.DELETE_USERS), "CEO CANNOT DELETE_USERS");
  assert(!hasPermission(ceoUser, Permission.CHANGE_USER_ROLE), "CEO CANNOT CHANGE_USER_ROLE");

  // ─── 4. TEST CTO PERMISSION BOUNDARIES ──────────────────────────────────────
  console.log("\n--- 4. Testing CTO Access & Restrictions ---");
  const ctoUser = { email: "amruthadivvela@gmail.com", role: "CTO" };

  assert(hasPermission(ctoUser, Permission.VIEW_PROJECTS), "CTO can VIEW_PROJECTS");
  assert(hasPermission(ctoUser, Permission.CREATE_PROJECTS), "CTO can CREATE_PROJECTS");
  assert(hasPermission(ctoUser, Permission.EDIT_PROJECTS), "CTO can EDIT_PROJECTS");
  assert(hasPermission(ctoUser, Permission.APPROVE_PROJECTS), "CTO can APPROVE_PROJECTS");
  assert(hasPermission(ctoUser, Permission.REJECT_PROJECTS), "CTO can REJECT_PROJECTS");
  assert(hasPermission(ctoUser, Permission.DELETE_PROJECTS), "CTO can DELETE_PROJECTS");
  assert(hasPermission(ctoUser, Permission.CREATE_USERS), "CTO has CREATE_USERS permission");
  assert(hasPermission(ctoUser, Permission.SEND_EMAIL), "CTO can SEND_EMAIL");

  // CTO Allowed Roles
  const ctoAllowedRoles = getAllowedRolesToCreate(ctoUser);
  assert(ctoAllowedRoles.includes("INTERN"), "CTO is authorized to create INTERN");
  assert(ctoAllowedRoles.includes("EMPLOYEE"), "CTO is authorized to create EMPLOYEE");
  assert(!ctoAllowedRoles.includes("FOUNDER"), "CTO CANNOT create FOUNDER");
  assert(!ctoAllowedRoles.includes("CO_FOUNDER"), "CTO CANNOT create CO_FOUNDER");
  assert(!ctoAllowedRoles.includes("CEO"), "CTO CANNOT create CEO");
  assert(!canCreateRole(ctoUser, "CEO"), "canCreateRole(cto, 'CEO') is false");
  assert(!canCreateRole(ctoUser, "FOUNDER"), "canCreateRole(cto, 'FOUNDER') is false");

  // CTO Restrictions
  assert(!hasPermission(ctoUser, Permission.VIEW_PAYMENTS), "CTO CANNOT VIEW_PAYMENTS");
  assert(!hasPermission(ctoUser, Permission.VERIFY_PAYMENTS), "CTO CANNOT VERIFY_PAYMENTS");
  assert(!hasPermission(ctoUser, Permission.MANAGE_SECURITY), "CTO CANNOT MANAGE_SECURITY");

  // ─── 5. TEST HR PERMISSION BOUNDARIES ───────────────────────────────────────
  console.log("\n--- 5. Testing HR Access & Restrictions ---");
  const hrUser = { email: "vyshnavireddy720@gmail.com", role: "HR" };

  assert(hasPermission(hrUser, Permission.VIEW_CREW), "HR can VIEW_CREW");
  assert(hasPermission(hrUser, Permission.MANAGE_CREW), "HR can MANAGE_CREW");
  assert(hasPermission(hrUser, Permission.VIEW_EMPLOYEES), "HR can VIEW_EMPLOYEES");
  assert(hasPermission(hrUser, Permission.MANAGE_EMPLOYEES), "HR can MANAGE_EMPLOYEES");
  assert(hasPermission(hrUser, Permission.VIEW_INTERNS), "HR can VIEW_INTERNS");
  assert(hasPermission(hrUser, Permission.MANAGE_INTERNS), "HR can MANAGE_INTERNS");
  assert(hasPermission(hrUser, Permission.VIEW_PAYMENTS), "HR can VIEW_PAYMENTS");
  assert(hasPermission(hrUser, Permission.VERIFY_PAYMENTS), "HR can VERIFY_PAYMENTS");
  assert(hasPermission(hrUser, Permission.VIEW_PAYMENT_ANALYTICS), "HR can VIEW_PAYMENT_ANALYTICS");
  assert(hasPermission(hrUser, Permission.SEND_EMAIL), "HR can SEND_EMAIL");

  const hrAllowedRoles = getAllowedRolesToCreate(hrUser);
  assert(hrAllowedRoles.includes("INTERN"), "HR is authorized to create INTERN");
  assert(hrAllowedRoles.includes("EMPLOYEE"), "HR is authorized to create EMPLOYEE");
  assert(!hrAllowedRoles.includes("FOUNDER"), "HR CANNOT create FOUNDER");
  assert(!hrAllowedRoles.includes("CO_FOUNDER"), "HR CANNOT create CO_FOUNDER");
  assert(!hasPermission(hrUser, Permission.MANAGE_SECURITY), "HR CANNOT MANAGE_SECURITY");

  // ─── 6. TEST COO READ-ONLY RESTRICTIONS ─────────────────────────────────────
  console.log("\n--- 6. Testing COO Read-Only Access & Restrictions ---");
  const cooUser = { email: "varunparlapalli2008@gmail.com", role: "COO" };

  assert(hasPermission(cooUser, Permission.VIEW_DASHBOARD), "COO can VIEW_DASHBOARD");
  assert(hasPermission(cooUser, Permission.VIEW_PROJECTS), "COO can VIEW_PROJECTS");
  assert(hasPermission(cooUser, Permission.VIEW_PROFILES), "COO can VIEW_PROFILES");
  assert(hasPermission(cooUser, Permission.VIEW_CREW), "COO can VIEW_CREW");
  assert(hasPermission(cooUser, Permission.VIEW_EMPLOYEES), "COO can VIEW_EMPLOYEES");
  assert(hasPermission(cooUser, Permission.VIEW_INTERNS), "COO can VIEW_INTERNS");
  assert(hasPermission(cooUser, Permission.VIEW_REPORTS), "COO can VIEW_REPORTS");
  assert(hasPermission(cooUser, Permission.SEND_EMAIL), "COO can SEND_EMAIL");

  // COO Restrictions (Read-only, no analytics, no security)
  assert(!hasPermission(cooUser, Permission.VIEW_ANALYTICS), "COO CANNOT VIEW_ANALYTICS");
  assert(!hasPermission(cooUser, Permission.VIEW_PROJECT_ANALYTICS), "COO CANNOT VIEW_PROJECT_ANALYTICS");
  assert(!hasPermission(cooUser, Permission.VIEW_HR_ANALYTICS), "COO CANNOT VIEW_HR_ANALYTICS");
  assert(!hasPermission(cooUser, Permission.EDIT_PROFILES), "COO CANNOT EDIT_PROFILES");
  assert(!hasPermission(cooUser, Permission.DELETE_USERS), "COO CANNOT DELETE_USERS");
  assert(!hasPermission(cooUser, Permission.CREATE_USERS), "COO CANNOT CREATE_USERS");
  assert(!hasPermission(cooUser, Permission.CHANGE_USER_ROLE), "COO CANNOT CHANGE_USER_ROLE");
  assert(!hasPermission(cooUser, Permission.MANAGE_SECURITY), "COO CANNOT MANAGE_SECURITY");

  // ─── 7. TEST HIGH-LEVEL ACCOUNT PROTECTION ──────────────────────────────────
  console.log("\n--- 7. Testing High-Level Account Protection ---");
  const targetFounder = { email: PERMANENT_FOUNDER_EMAIL, username: "ashu", role: "OWNER" };
  const targetCoFounder = { email: CO_FOUNDER_EMAIL, username: "sanjay", role: "CO_FOUNDER" };

  assert(isProtectedAccount(targetFounder), "Founder is identified as protected account");
  assert(isProtectedAccount(targetCoFounder), "Co-Founder is identified as protected account");

  // COO/CTO/HR/CEO trying to delete or change Founder
  const modCheck1 = canModifyTargetUser(ceoUser, targetFounder, "DELETE");
  assert(!modCheck1.allowed, "CEO CANNOT DELETE Founder (blocked by protection)");

  const modCheck2 = canModifyTargetUser(ctoUser, targetFounder, "ROLE_CHANGE");
  assert(!modCheck2.allowed, "CTO CANNOT change Founder role (blocked by protection)");

  const modCheck3 = canModifyTargetUser(hrUser, targetCoFounder, "DELETE");
  assert(!modCheck3.allowed, "HR CANNOT DELETE Co-Founder (blocked by protection)");

  // Founder itself cannot be deleted even by Co-Founder
  const modCheck4 = canModifyTargetUser(coFounderUser, targetFounder, "DELETE");
  assert(!modCheck4.allowed, "Permanent Founder cannot be deleted even by Co-Founder");

  // ─── 8. TEST SELF-PROMOTION PREVENTION ──────────────────────────────────────
  console.log("\n--- 8. Testing Self-Promotion Prevention ---");
  const ctoSelfTarget = { id: "cto-123", email: "amruthadivvela@gmail.com", role: "CTO" };
  const selfCheck = canModifyTargetUser({ id: "cto-123", email: "amruthadivvela@gmail.com", role: "CTO" }, ctoSelfTarget, "ROLE_CHANGE");
  assert(!selfCheck.allowed, "Self-promotion is forbidden for CTO");

  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (e) => {
  console.error("Test execution failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
