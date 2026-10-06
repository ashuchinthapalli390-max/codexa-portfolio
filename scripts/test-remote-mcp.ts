/**
 * Integration Test Suite for Remote Model Context Protocol (MCP) Server
 * Tests:
 * 1. Unauthenticated GET request rejection (HTTP 401, protocol error, no HTML/redirect)
 * 2. Unauthenticated POST request rejection (HTTP 401, JSON-RPC error -32001)
 * 3. Invalid API key rejection (HTTP 401, JSON-RPC error -32001)
 * 4. Revoked API key rejection (HTTP 401, KEY_REVOKED)
 * 5. Authenticated protocol handshake (initialize, ping)
 * 6. Tool discovery (tools/list with Bearer auth)
 * 7. Harmless read-only tool call (tools/call -> get_company_overview)
 * 8. Write tool call human approval interception (tools/call -> create_account -> APPROVAL_REQUIRED)
 * 9. Server-Sent Events (SSE) remote transport handshake (GET with Accept: text/event-stream)
 */

import prisma from "../src/lib/prisma";
import { generateMcpApiKey } from "../src/lib/mcp/auth";

const TARGET_URL = process.env.MCP_TEST_URL || "http://localhost:3000/mcp";

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string, details?: any) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    if (details) console.error("    Details:", details);
    failed++;
  }
}

async function runIntegrationChecks() {
  console.log("\n=======================================================");
  console.log("   CODEXA AGENCY — REMOTE MCP INTEGRATION TEST SUITE");
  console.log(`   Target Endpoint: ${TARGET_URL}`);
  console.log("=======================================================\n");

  // Fetch Founder User for test client ownership
  const owner = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!owner) {
    console.error("No active user found in DB to own test client. Aborting.");
    process.exit(1);
  }

  // Create active test client in DB
  const { rawKey: activeRawKey, keyHash: activeKeyHash, prefix: activePrefix } = generateMcpApiKey();
  const testActiveClient = await prisma.mcpClient.create({
    data: {
      clientId: `cxa_test_active_${Date.now()}`,
      name: "Remote MCP Active Test Client",
      clientType: "API_KEY",
      clientSecretHash: activeKeyHash,
      apiKeyPrefix: activePrefix,
      scopes: ["*"],
      allowedTools: ["*"],
      status: "ACTIVE",
      ownerUserId: owner.id,
      createdById: owner.id,
    },
  });

  // Create revoked test client in DB
  const { rawKey: revokedRawKey, keyHash: revokedKeyHash, prefix: revokedPrefix } = generateMcpApiKey();
  const testRevokedClient = await prisma.mcpClient.create({
    data: {
      clientId: `cxa_test_revoked_${Date.now()}`,
      name: "Remote MCP Revoked Test Client",
      clientType: "API_KEY",
      clientSecretHash: revokedKeyHash,
      apiKeyPrefix: revokedPrefix,
      scopes: ["*"],
      allowedTools: ["*"],
      status: "REVOKED",
      ownerUserId: owner.id,
      createdById: owner.id,
    },
  });

  try {
    // -------------------------------------------------------------
    // Check 1: Unauthenticated GET Request
    // -------------------------------------------------------------
    console.log("1. Unauthenticated GET Request Check:");
    const unauthGetRes = await fetch(TARGET_URL);
    assert(
      unauthGetRes.status === 401,
      `Unauthenticated GET returned HTTP 401 (got ${unauthGetRes.status})`
    );
    const unauthGetContentType = unauthGetRes.headers.get("content-type") || "";
    assert(
      unauthGetContentType.includes("application/json"),
      `Response is JSON, not HTML or login redirect (Content-Type: ${unauthGetContentType})`
    );
    const unauthGetBody = await unauthGetRes.json().catch(() => ({}));
    assert(
      unauthGetBody.error?.code === -32001 || unauthGetBody.error === "Unauthorized",
      "Contains standard protocol authentication failure payload"
    );

    // -------------------------------------------------------------
    // Check 2: Unauthenticated POST Request (tools/list)
    // -------------------------------------------------------------
    console.log("\n2. Unauthenticated POST Request (tools/list) Check:");
    const unauthPostRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert(
      unauthPostRes.status === 401,
      `Unauthenticated POST tools/list returned HTTP 401 (got ${unauthPostRes.status})`
    );
    const unauthPostBody = await unauthPostRes.json().catch(() => ({}));
    assert(
      unauthPostBody.error?.code === -32001,
      "Returned JSON-RPC protocol error code -32001 (Unauthorized)"
    );
    assert(
      !unauthPostBody.result?.tools,
      "Tools list is NOT exposed to unauthenticated callers"
    );

    // -------------------------------------------------------------
    // Check 3: Invalid API Key Rejection
    // -------------------------------------------------------------
    console.log("\n3. Invalid API Key Rejection Check:");
    const invalidKeyRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer cxa_mcp_sk_live_completely_fake_invalid_key_9999",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    });
    assert(
      invalidKeyRes.status === 401,
      `Invalid key returned HTTP 401 (got ${invalidKeyRes.status})`
    );
    const invalidKeyBody = await invalidKeyRes.json().catch(() => ({}));
    assert(
      invalidKeyBody.error?.code === -32001,
      "Returned protocol error -32001 for non-existent key"
    );

    // -------------------------------------------------------------
    // Check 4: Revoked API Key Rejection
    // -------------------------------------------------------------
    console.log("\n4. Revoked API Key Rejection Check:");
    const revokedKeyRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revokedRawKey}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" }),
    });
    assert(
      revokedKeyRes.status === 401,
      `Revoked key returned HTTP 401 (got ${revokedKeyRes.status})`
    );
    const revokedKeyBody = await revokedKeyRes.json().catch(() => ({}));
    assert(
      revokedKeyBody.error?.code === -32001 &&
        (revokedKeyBody.error?.message?.toLowerCase().includes("revoked") ||
          revokedKeyBody.error?.codeName === "KEY_REVOKED"),
      "Returned clean revocation error message without exposing key data"
    );

    // -------------------------------------------------------------
    // Check 5: Authenticated Protocol Handshake (initialize & ping)
    // -------------------------------------------------------------
    console.log("\n5. Authenticated Protocol Handshake Check:");
    const initRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeRawKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "integration-test-runner", version: "1.0.0" },
        },
      }),
    });
    assert(initRes.status === 200, `initialize returned HTTP 200 (got ${initRes.status})`);
    const initBody = await initRes.json().catch(() => ({}));
    assert(
      initBody.result?.protocolVersion === "2024-11-05",
      `Protocol version negotiated: ${initBody.result?.protocolVersion}`
    );
    assert(
      initBody.result?.serverInfo?.name === "codexa-mcp-server",
      `Server name identified: ${initBody.result?.serverInfo?.name}`
    );

    const pingRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeRawKey}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 5, method: "ping" }),
    });
    assert(pingRes.status === 200, "ping method responded with HTTP 200");

    // -------------------------------------------------------------
    // Check 6: Authenticated Tool Discovery (tools/list)
    // -------------------------------------------------------------
    console.log("\n6. Authenticated Tool Discovery Check:");
    const listRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeRawKey}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 6, method: "tools/list" }),
    });
    assert(listRes.status === 200, `tools/list returned HTTP 200 (got ${listRes.status})`);
    const listBody = await listRes.json().catch(() => ({}));
    const tools = listBody.result?.tools || [];
    assert(tools.length >= 25, `Discovered ${tools.length} available tools (>= 25 expected)`);
    const hasCompanyOverview = tools.some((t: any) => t.name === "get_company_overview");
    const hasCreateAccount = tools.some((t: any) => t.name === "create_account");
    assert(hasCompanyOverview, "Found read-only tool: 'get_company_overview'");
    assert(hasCreateAccount, "Found sensitive write tool: 'create_account'");

    // -------------------------------------------------------------
    // Check 7: Harmless Read-Only Tool Execution (get_company_overview)
    // -------------------------------------------------------------
    console.log("\n7. Read-Only Tool Execution Check:");
    const readCallRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeRawKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: "get_company_overview",
          arguments: {},
        },
      }),
    });
    assert(readCallRes.status === 200, `tools/call returned HTTP 200 (got ${readCallRes.status})`);
    const readCallBody = await readCallRes.json().catch(() => ({}));
    assert(readCallBody.result?.isError !== true, "Execution completed with isError=false");
    const overviewText = readCallBody.result?.content?.[0]?.text || "";
    assert(
      overviewText.includes("activeUsers") || overviewText.includes("projects"),
      "Received valid agency overview statistics in response content"
    );

    // -------------------------------------------------------------
    // Check 8: Write Tool Call Human Approval Interception
    // -------------------------------------------------------------
    console.log("\n8. Sensitive Write Tool Approval Interception Check:");
    const writeCallRes = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeRawKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
          name: "create_account",
          arguments: {
            fullName: "Approval Check User",
            email: `approval_check_${Date.now()}@codexa.dev`,
            role: "INTERN",
          },
        },
      }),
    });
    assert(writeCallRes.status === 200, `tools/call returned HTTP 200 (got ${writeCallRes.status})`);
    const writeCallBody = await writeCallRes.json().catch(() => ({}));
    const writeContentText = writeCallBody.result?.content?.[0]?.text || "";
    let approvalPayload: any = {};
    try {
      approvalPayload = JSON.parse(writeContentText);
    } catch {}

    assert(
      approvalPayload.status === "APPROVAL_REQUIRED",
      `Intercepted write action with status: ${approvalPayload.status}`
    );
    assert(
      typeof approvalPayload.approvalId === "string" && approvalPayload.approvalId.length > 0,
      `Generated server-side Approval ID: ${approvalPayload.approvalId}`
    );

    // Verify record in database
    if (approvalPayload.approvalId) {
      const dbApproval = await prisma.mcpApproval.findUnique({
        where: { id: approvalPayload.approvalId },
      });
      assert(dbApproval !== null, "Approval record persisted in database");
      assert(dbApproval?.status === "PENDING", "Approval state is PENDING review");
      assert(
        dbApproval?.toolName === "create_account",
        "Approval record targets 'create_account'"
      );
    }

    // -------------------------------------------------------------
    // Check 9: Server-Sent Events (SSE) Remote Transport Handshake
    // -------------------------------------------------------------
    console.log("\n9. Remote SSE Transport Stream Handshake Check:");
    const sseRes = await fetch(TARGET_URL, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${activeRawKey}`,
      },
    });
    assert(sseRes.status === 200, `SSE GET returned HTTP 200 (got ${sseRes.status})`);
    const sseContentType = sseRes.headers.get("content-type") || "";
    assert(
      sseContentType.includes("text/event-stream"),
      `Content-Type is text/event-stream (got ${sseContentType})`
    );

    // Read the first chunk of the SSE stream
    const reader = sseRes.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const initialChunk = new TextDecoder().decode(value);
      assert(
        initialChunk.includes("event: endpoint"),
        "Stream emitted initial 'event: endpoint' event"
      );
      assert(
        initialChunk.includes("data: /mcp?sessionId=") || initialChunk.includes("data: /api/mcp?sessionId="),
        "Endpoint event points to sessionId query parameter URL"
      );
      await reader.cancel();
    } else {
      assert(false, "Could not acquire stream reader for SSE body");
    }

  } finally {
    // -------------------------------------------------------------
    // Cleanup: Delete test clients and approval records
    // -------------------------------------------------------------
    console.log("\nCleaning up test database records...");
    await prisma.mcpToolCall.deleteMany({
      where: { clientId: { in: [testActiveClient.clientId, testRevokedClient.clientId] } },
    }).catch(() => {});
    await prisma.mcpApproval.deleteMany({
      where: { clientId: { in: [testActiveClient.clientId, testRevokedClient.clientId] } },
    }).catch(() => {});
    await prisma.mcpClient.deleteMany({
      where: { id: { in: [testActiveClient.id, testRevokedClient.id] } },
    }).catch(() => {});
    console.log("Cleanup complete.");
  }

  console.log("\n=======================================================");
  console.log(`   TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationChecks().catch((err) => {
  console.error("Integration Check Exception:", err);
  process.exit(1);
});
