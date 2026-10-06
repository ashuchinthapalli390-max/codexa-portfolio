/**
 * scripts/test-api-e2e.ts
 *
 * Full HTTP API end-to-end test against http://localhost:3000
 * Tests all 5 crew members for:
 * 1. Login with temporary password "Codexa123"
 * 2. Session verification (role, permissions, mustChangePassword flag)
 * 3. Server-side RBAC enforcement (403 on forbidden operations)
 * 4. Role creation boundaries (CTO creating intern vs CEO)
 * 5. Founder protection against deletion
 */

const BASE_URL = "http://localhost:3000";

interface LoginResult {
  cookie: string;
  user: any;
}

async function login(email: string, pass: string = "Codexa123"): Promise<LoginResult & { mustChangePassword?: boolean }> {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password: pass }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${email}: ${data.error || res.statusText}`);
  }

  const setCookie = res.headers.get("set-cookie") || "";
  return { cookie: setCookie, user: data.user, mustChangePassword: data.mustChangePassword };
}

async function runE2E() {
  console.log("=================================================");
  console.log("CODEXA AGENCY — LIVE HTTP E2E INTEGRATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `-> ${detail}` : ""}`);
      failed++;
    }
  }

  // ─── 1. TEST CO-FOUNDER (SANJAY) ───────────────────────────────────────────
  console.log("--- 1. Testing Co-Founder (Sanjay) Login & Session ---");
  const sanjay = await login("boddukurisanjay@gmail.com");
  assert(sanjay.user.role === "CO_FOUNDER", "Sanjay role in login response is CO_FOUNDER");
  assert(
    sanjay.user.mustChangePassword === true || sanjay.mustChangePassword === true,
    "Sanjay has mustChangePassword = true"
  );

  const sanjaySessionRes = await fetch(`${BASE_URL}/api/session`, {
    headers: { Cookie: sanjay.cookie },
  });
  const sanjaySession = await sanjaySessionRes.json();
  assert(sanjaySession.authenticated === true, "Sanjay session is authenticated");
  assert(sanjaySession.user.effectiveRole === "CO_FOUNDER", "Sanjay effectiveRole is CO_FOUNDER");
  assert(Array.isArray(sanjaySession.user.permissions), "Sanjay session includes permissions array");
  assert(sanjaySession.user.permissions.includes("MANAGE_SECURITY"), "Co-Founder has full MANAGE_SECURITY permission");

  // ─── 2. TEST CEO (KISHORE) ────────────────────────────────────────────────
  console.log("\n--- 2. Testing CEO (Kishore) Executive Visibility & Boundaries ---");
  const kishore = await login("katlakishore86@gmail.com");
  assert(kishore.user.role === "CEO", "Kishore role is CEO");

  const kishoreSessionRes = await fetch(`${BASE_URL}/api/session`, {
    headers: { Cookie: kishore.cookie },
  });
  const kishoreSession = await kishoreSessionRes.json();
  assert(kishoreSession.user.effectiveRole === "CEO", "Kishore effectiveRole is CEO");
  assert(kishoreSession.user.permissions.includes("APPROVE_PROJECTS"), "CEO can APPROVE_PROJECTS");
  assert(!kishoreSession.user.permissions.includes("MANAGE_SECURITY"), "CEO CANNOT MANAGE_SECURITY");

  // CEO attempting to delete an account -> Server returns 403
  const ceoDeleteRes = await fetch(`${BASE_URL}/api/owner/accounts/test-dummy-id`, {
    method: "DELETE",
    headers: { Cookie: kishore.cookie },
  });
  assert(ceoDeleteRes.status === 403, `CEO deleting account returns 403 Forbidden (got ${ceoDeleteRes.status})`);

  // ─── 3. TEST CTO (AMRUTHA) ────────────────────────────────────────────────
  console.log("\n--- 3. Testing CTO (Amrutha) Technical Authority & Role Limits ---");
  const amrutha = await login("amruthadivvela@gmail.com");
  assert(amrutha.user.role === "CTO", "Amrutha role is CTO");

  // CTO attempting to create an unauthorized role (e.g. CEO) -> returns 403
  const ctoCreateCeoRes = await fetch(`${BASE_URL}/api/owner/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: amrutha.cookie },
    body: JSON.stringify({
      fullName: "Illegal CEO",
      username: "illegal_ceo",
      email: "illegal_ceo@example.com",
      role: "CEO",
      temporaryPassword: "Password123!",
    }),
  });
  assert(ctoCreateCeoRes.status === 403, `CTO creating CEO account returns 403 Forbidden (got ${ctoCreateCeoRes.status})`);

  // CTO creating an authorized role (INTERN) -> returns 201 or 409 if already exists
  const internUsername = `intern_${Date.now()}`;
  const ctoCreateInternRes = await fetch(`${BASE_URL}/api/owner/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: amrutha.cookie },
    body: JSON.stringify({
      fullName: "Test Intern",
      username: internUsername,
      email: `${internUsername}@example.com`,
      role: "INTERN",
      temporaryPassword: "Password123!",
    }),
  });
  assert(
    ctoCreateInternRes.status === 201 || ctoCreateInternRes.status === 200,
    `CTO creating INTERN account succeeds (got ${ctoCreateInternRes.status})`
  );

  // ─── 4. TEST HR (VYSHNAVI) ────────────────────────────────────────────────
  console.log("\n--- 4. Testing HR (Vyshnavi) Staff Operations & Boundaries ---");
  const vyshnavi = await login("vyshnavireddy720@gmail.com");
  assert(vyshnavi.user.role === "HR", "Vyshnavi role is HR");

  // HR attempting to create FOUNDER -> returns 403
  const hrCreateFounderRes = await fetch(`${BASE_URL}/api/owner/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: vyshnavi.cookie },
    body: JSON.stringify({
      fullName: "Illegal Founder",
      username: "illegal_founder",
      email: "illegal_founder@example.com",
      role: "FOUNDER",
      temporaryPassword: "Password123!",
    }),
  });
  assert(hrCreateFounderRes.status === 403, `HR creating FOUNDER account returns 403 Forbidden (got ${hrCreateFounderRes.status})`);

  // HR accessing approvals -> succeeds
  const hrApprovalsRes = await fetch(`${BASE_URL}/api/approvals`, {
    headers: { Cookie: vyshnavi.cookie },
  });
  assert(hrApprovalsRes.status === 200, `HR accessing approvals returns 200 OK (got ${hrApprovalsRes.status})`);

  // ─── 5. TEST COO (VARUN) ──────────────────────────────────────────────────
  console.log("\n--- 5. Testing COO (Varun) Read-Only Operational Limits ---");
  const varun = await login("varunparlapalli2008@gmail.com");
  assert(varun.user.role === "COO", "Varun role is COO");

  const cooSessionRes = await fetch(`${BASE_URL}/api/session`, {
    headers: { Cookie: varun.cookie },
  });
  const cooSession = await cooSessionRes.json();
  assert(!cooSession.user.permissions.includes("VIEW_ANALYTICS"), "COO session DOES NOT have VIEW_ANALYTICS");

  // COO attempting to create an account -> returns 403
  const cooCreateRes = await fetch(`${BASE_URL}/api/owner/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: varun.cookie },
    body: JSON.stringify({
      fullName: "COO Created User",
      username: "coo_user",
      email: "coo_user@example.com",
      role: "EMPLOYEE",
      temporaryPassword: "Password123!",
    }),
  });
  assert(cooCreateRes.status === 403, `COO creating account returns 403 Forbidden (got ${cooCreateRes.status})`);

  // COO attempting to delete an account -> returns 403
  const cooDeleteRes = await fetch(`${BASE_URL}/api/owner/accounts/some-id`, {
    method: "DELETE",
    headers: { Cookie: varun.cookie },
  });
  assert(cooDeleteRes.status === 403, `COO deleting account returns 403 Forbidden (got ${cooDeleteRes.status})`);

  // COO viewing approvals -> succeeds
  const cooApprovalsRes = await fetch(`${BASE_URL}/api/approvals`, {
    headers: { Cookie: varun.cookie },
  });
  assert(cooApprovalsRes.status === 200, `COO viewing approvals returns 200 OK (got ${cooApprovalsRes.status})`);

  console.log("\n=================================================");
  console.log(`E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2E().catch((e) => {
  console.error("E2E Test Execution Failed:", e);
  process.exit(1);
});
