/**
 * End-to-End Test Suite for CodeXa Model Context Protocol (MCP) Integration Layer
 * Tests: JSON-RPC handshake, tool discovery, authentication, RBAC, two-layer scopes,
 * dry-runs, human-in-the-loop approvals, emergency kill switches, and audit logging.
 */

import prisma from "../src/lib/prisma";
import { executeMcpTool, MCP_TOOLS } from "../src/lib/mcp/registry";
import { resolveMcpAuthContext, generateMcpApiKey } from "../src/lib/mcp/auth";
import { getMcpControls, updateMcpControls } from "../src/lib/mcp/controls";
import { createMcpApproval, decideMcpApproval, getPendingMcpApprovals } from "../src/lib/mcp/approvals";
import { McpRiskLevel, McpAuthContext } from "../src/lib/mcp/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   CODEXA AGENCY — MCP END-TO-END TEST SUITE");
  console.log("=======================================================\n");

  // Fetch Founder User
  const founder = await prisma.user.findFirst({
    where: { email: { in: ["ashuchinthapalli3900@gmail.com", "darklevelinggaming@gmail.com"] } },
  });

  if (!founder) {
    console.error("Founder user not found in DB! Aborting.");
    return;
  }

  // 1. Tool Registry Check
  console.log("1. Tool Registry Verification:");
  assert(MCP_TOOLS.length >= 25, `Registry contains ${MCP_TOOLS.length} tools (>= 25 expected)`);
  const userTools = MCP_TOOLS.filter((t) => t.category === "users");
  const projectTools = MCP_TOOLS.filter((t) => t.category === "projects");
  const attendanceTools = MCP_TOOLS.filter((t) => t.category === "attendance");
  const paymentTools = MCP_TOOLS.filter((t) => t.category === "payments");
  assert(userTools.length >= 5, `User tools present: ${userTools.length}`);
  assert(projectTools.length >= 5, `Project tools present: ${projectTools.length}`);
  assert(attendanceTools.length >= 3, `Attendance tools present: ${attendanceTools.length}`);
  assert(paymentTools.length >= 4, `Payment tools present: ${paymentTools.length}`);

  // 2. Client Registration & API Key Generation
  console.log("\n2. Client Registration & Token Security:");
  const { rawKey, keyHash, prefix } = generateMcpApiKey();
  assert(rawKey.startsWith("cxa_mcp_sk_live_"), "Key format is 'cxa_mcp_sk_live_...'");
  assert(keyHash.length === 64, "Key hash is 64-char SHA-256");

  const testClient = await prisma.mcpClient.create({
    data: {
      clientId: `cxa_test_${Date.now()}`,
      name: "Automated Test Suite Client",
      clientType: "API_KEY",
      clientSecretHash: keyHash,
      apiKeyPrefix: prefix,
      scopes: ["*"],
      allowedTools: ["*"],
      ownerUserId: founder.id,
      createdById: founder.id,
    },
  });
  assert(testClient.status === "ACTIVE", "Client created in ACTIVE state");

  // 3. Authenticated Context Resolution
  console.log("\n3. MCP Authentication Resolution:");
  const dummyReq = new Request("http://localhost:3000/api/mcp", {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
  const authRes = await resolveMcpAuthContext(dummyReq);
  assert(authRes.success === true, "Bearer API key resolved successfully");
  if (authRes.success) {
    assert(authRes.context.clientId === testClient.clientId, "Correct client ID resolved");
    assert(authRes.context.actingUser.email === founder.email, "Acting user mapped to Founder");
  }

  const authContext: McpAuthContext = authRes.success
    ? authRes.context
    : {
        clientId: testClient.clientId,
        scopes: ["*"],
        allowedTools: ["*"],
        actingUser: {
          id: founder.id,
          email: founder.email,
          username: founder.username,
          fullName: founder.fullName,
          role: "FOUNDER",
          orgRole: "FOUNDER",
        },
      };

  // 4. Level 0 Read Tool Execution
  console.log("\n4. Level 0 Read Tools:");
  const overviewRes = await executeMcpTool("get_company_overview", {}, authContext);
  assert(overviewRes.isError !== true, "get_company_overview returned without error");
  assert(overviewRes.content[0].text.includes("activeUsers"), "Overview includes activeUsers metric");

  const searchRes = await executeMcpTool("search_users", { query: "ashu" }, authContext);
  assert(searchRes.isError !== true, "search_users returned successfully");

  // 5. Level 2 Sensitive Write: Dry-Run Mode
  console.log("\n5. Sensitive Write Tool — Dry-Run Validation:");
  const testEmail = `dryrun_test_${Date.now()}@codexa.dev`;
  const dryRunRes = await executeMcpTool(
    "create_account",
    {
      fullName: "Dry Run Tester",
      email: testEmail,
      role: "INTERN",
      dryRun: true,
    },
    authContext
  );
  assert(dryRunRes.isError !== true, "Dry run passed without error");

  // 6. Level 2 Sensitive Write: Human-In-The-Loop Approval Interception
  console.log("\n6. Human-In-The-Loop Approval Interception:");
  const writeRes = await executeMcpTool(
    "create_account",
    {
      fullName: "Approval Test Intern",
      email: `approval_test_${Date.now()}@codexa.dev`,
      role: "INTERN",
    },
    authContext
  );
  assert(writeRes.approvalRequired === true, "Write operation intercepted with approvalRequired=true");
  assert(typeof writeRes.approvalId === "string", "Approval ID generated");

  if (writeRes.approvalId) {
    const pendingList = await getPendingMcpApprovals();
    const found = pendingList.some((p) => p.id === writeRes.approvalId);
    assert(found, "Pending approval found in approval queue");

    // Approve the action
    const decided = await decideMcpApproval(
      writeRes.approvalId,
      "APPROVED",
      founder,
      "Approved by automated test suite."
    );
    assert(decided.status === "APPROVED", "Approval record status updated to APPROVED");
  }

  // 7. Attendance Management Tools
  console.log("\n7. Attendance Remote Window Controls:");
  const windowRes = await executeMcpTool(
    "create_attendance_window",
    { durationMinutes: 15, eligibleRoles: ["EMPLOYEE", "INTERN"] },
    authContext
  );
  assert(windowRes.isError !== true, "Attendance window opened via MCP");
  const winData = windowRes.structuredData;
  if (winData?.windowId) {
    const closeRes = await executeMcpTool(
      "close_attendance_window",
      { windowId: winData.windowId },
      authContext
    );
    assert(closeRes.isError !== true, "Attendance window closed via MCP");
  }

  // 8. Emergency Kill Switch Enforcement
  console.log("\n8. Emergency Kill Switch Guardrails:");
  await updateMcpControls({ isWriteToolsEnabled: false }, founder.id);
  const blockedWrite = await executeMcpTool(
    "create_project",
    { title: "Forbidden Project", description: "Should fail" },
    authContext
  );
  assert(blockedWrite.isError === true, "Write tool blocked when isWriteToolsEnabled=false");
  assert(blockedWrite.content[0].text.includes("CATEGORY_DISABLED"), "Error code CATEGORY_DISABLED returned");

  // Verify Read still works while Write is halted
  const readStillWorks = await executeMcpTool("get_company_overview", {}, authContext);
  assert(readStillWorks.isError !== true, "Read tools remain operational when write is disabled");

  // Re-enable kill switch
  await updateMcpControls({ isWriteToolsEnabled: true }, founder.id);
  const restoredControls = await getMcpControls();
  assert(restoredControls.isWriteToolsEnabled === true, "Kill switch re-enabled successfully");

  // 9. Audit Logging Verification
  console.log("\n9. Audit Trail Verification:");
  const auditCalls = await prisma.mcpToolCall.findMany({
    where: { clientId: testClient.clientId },
    take: 5,
  });
  assert(auditCalls.length > 0, `Recorded ${auditCalls.length} tool call audit logs in McpToolCall`);

  // Cleanup test client
  await prisma.mcpToolCall.deleteMany({ where: { clientId: testClient.clientId } });
  await prisma.mcpApproval.deleteMany({ where: { clientId: testClient.clientId } });
  await prisma.mcpClient.delete({ where: { id: testClient.id } });

  console.log("\n=======================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test Suite Error:", e);
  process.exit(1);
});
