/**
 * /api/mcp & /mcp
 * Standards-Compliant Remote Model Context Protocol (MCP) Server
 * Protocol Specification: 2024-11-05
 *
 * Supports:
 * 1. Server-Sent Events (SSE) Transport (GET with Accept: text/event-stream)
 * 2. Streamable HTTP JSON-RPC 2.0 Transport (POST /mcp and /mcp?sessionId=...)
 *
 * Strictly enforces Bearer API key authentication across all protocol methods.
 * Preserves Human-in-the-Loop approvals for Level 2/3 write tools.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resolveMcpAuthContext } from "@/lib/mcp/auth";
import { MCP_TOOLS, executeMcpTool } from "@/lib/mcp/registry";
import { JsonRpcRequest, McpAuthContext } from "@/lib/mcp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory active SSE sessions registry (process-level)
interface ActiveSseSession {
  sessionId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  auth: McpAuthContext;
  createdAt: number;
  lastActiveAt: number;
}

declare global {
  var __mcpActiveSessions: Map<string, ActiveSseSession> | undefined;
}

const activeSessions: Map<string, ActiveSseSession> =
  globalThis.__mcpActiveSessions || new Map<string, ActiveSseSession>();
globalThis.__mcpActiveSessions = activeSessions;

const ALLOWED_ORIGINS = new Set([
  "https://codxa-agency.online",
  "https://www.codxa-agency.online",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, mcp-session-id, cache-control, accept",
    "Access-Control-Expose-Headers": "Content-Type, mcp-session-id",
    Vary: "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * GET Handler:
 * - When Accept: text/event-stream -> Establishes remote MCP SSE transport stream
 * - Otherwise -> Returns standards-compliant MCP protocol discovery information
 * Authentication via 'Authorization: Bearer <API_KEY>' is strictly enforced.
 */
export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const url = new URL(req.url);
  const acceptHeader = req.headers.get("accept") || "";
  const isSseRequest =
    acceptHeader.includes("text/event-stream") ||
    url.searchParams.get("transport") === "sse";

  // Strict Bearer authentication check
  const auth = await resolveMcpAuthContext(req);

  if (!auth.success) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: `Unauthorized: ${auth.error}`,
          codeName: auth.code,
        },
      },
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Case 1: Server-Sent Events (SSE) Remote Transport
  if (isSseRequest) {
    const sessionId = crypto.randomUUID();
    const encoder = new TextEncoder();
    let keepAliveTimer: NodeJS.Timeout | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Register active session
        activeSessions.set(sessionId, {
          sessionId,
          controller,
          auth: auth.context,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
        });

        // 1. Initial endpoint event per Model Context Protocol SSE specification
        // Directs client to the URL for sending subsequent JSON-RPC POST messages
        const relativeEndpoint = `${url.pathname}?sessionId=${sessionId}`;
        const initialEvent = `event: endpoint\ndata: ${relativeEndpoint}\n\n`;
        controller.enqueue(encoder.encode(initialEvent));

        // 2. Heartbeat pings every 20 seconds to prevent proxy / cloud timeouts
        keepAliveTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            if (keepAliveTimer) clearInterval(keepAliveTimer);
            activeSessions.delete(sessionId);
          }
        }, 20000);
      },
      cancel() {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        activeSessions.delete(sessionId);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "mcp-session-id": sessionId,
      },
    });
  }

  // Case 2: Protocol Discovery Response (Non-SSE GET)
  const canonicalPath = url.pathname.includes("/api/mcp") ? "/api/mcp" : "/mcp";
  const allowedTools =
    auth.context.allowedTools && !auth.context.allowedTools.includes("*")
      ? MCP_TOOLS.filter((t) => auth.context.allowedTools.includes(t.name))
      : MCP_TOOLS;

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "codexa-mcp-server",
          version: "1.0.0",
        },
        capabilities: {
          tools: { listChanged: false },
        },
        transports: {
          sse: `${url.origin}${canonicalPath}`,
          httpJsonRpc: `${url.origin}${canonicalPath}`,
        },
        authenticatedClient: {
          clientId: auth.context.clientId,
          clientName: auth.context.clientName,
          clientType: auth.context.clientType,
          toolsAvailable: allowedTools.length,
        },
      },
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}

/**
 * POST Handler:
 * Standards-compliant JSON-RPC 2.0 remote dispatcher.
 * Handles: initialize, notifications/initialized, ping, tools/list, tools/call.
 * Dual-dispatches to active SSE streams when sessionId is present.
 */
export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const url = new URL(req.url);
  const querySessionId = url.searchParams.get("sessionId");
  const headerSessionId = req.headers.get("mcp-session-id");
  const targetSessionId = querySessionId || headerSessionId;

  // 1. Verify Bearer Authentication
  const auth = await resolveMcpAuthContext(req);

  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Unable to read request body." },
      },
      { status: 400, headers: corsHeaders }
    );
  }

  let body: Partial<JsonRpcRequest> = {};
  if (rawBodyText.trim()) {
    try {
      body = JSON.parse(rawBodyText);
    } catch {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: Invalid JSON payload." },
        },
        { status: 400, headers: corsHeaders }
      );
    }
  }

  const reqId = body.id !== undefined ? body.id : null;

  // Enforce authentication rejection cleanly with HTTP 401 and JSON-RPC error
  if (!auth.success) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: reqId,
        error: {
          code: -32001,
          message: `Unauthorized: ${auth.error}`,
          codeName: auth.code,
        },
      },
      { status: 401, headers: corsHeaders }
    );
  }

  const { jsonrpc, method, params } = body;

  if (jsonrpc !== "2.0") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: reqId,
        error: { code: -32600, message: "Invalid Request: 'jsonrpc' must be '2.0'." },
      },
      { status: 400, headers: corsHeaders }
    );
  }

  // 2. Dispatch Protocol Methods
  let responsePayload: any;

  switch (method) {
    // ── Handshake: initialize ──
    case "initialize": {
      responsePayload = {
        jsonrpc: "2.0",
        id: reqId,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "codexa-mcp-server",
            version: "1.0.0",
          },
          capabilities: {
            tools: { listChanged: false },
          },
          instructions:
            "CodeXa Agency Remote MCP Server. Manage agency operations, attendance windows, projects, accounts, payroll, and documentation securely via authorized agency tools.",
        },
      };
      break;
    }

    // ── Notifications: initialized ──
    case "notifications/initialized": {
      responsePayload = {
        jsonrpc: "2.0",
        id: reqId,
        result: {},
      };
      break;
    }

    // ── Heartbeat: ping ──
    case "ping": {
      responsePayload = {
        jsonrpc: "2.0",
        id: reqId,
        result: {},
      };
      break;
    }

    // ── Discovery: tools/list ──
    case "tools/list": {
      const allowedTools =
        auth.context.allowedTools && !auth.context.allowedTools.includes("*")
          ? MCP_TOOLS.filter((t) => auth.context.allowedTools.includes(t.name))
          : MCP_TOOLS;

      responsePayload = {
        jsonrpc: "2.0",
        id: reqId,
        result: {
          tools: allowedTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };
      break;
    }

    // ── Execution: tools/call ──
    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName || typeof toolName !== "string") {
        responsePayload = {
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: -32602,
            message: "Invalid params: 'name' string is required for tools/call.",
          },
        };
        break;
      }

      // Execute tool via registry (approval checks, permissions, and audit logging happen here)
      const execResult = await executeMcpTool(toolName, toolArgs, auth.context);

      responsePayload = {
        jsonrpc: "2.0",
        id: reqId,
        result: {
          content: execResult.content,
          isError: execResult.isError || false,
        },
      };
      break;
    }

    // ── Unknown Method ──
    default: {
      responsePayload = {
        jsonrpc: "2.0",
        id: reqId,
        error: {
          code: -32601,
          message: `Method '${method}' not found.`,
        },
      };
      break;
    }
  }

  // 3. Dual-dispatch over active SSE stream if connected via session
  if (targetSessionId && activeSessions.has(targetSessionId)) {
    const sseSession = activeSessions.get(targetSessionId);
    if (sseSession) {
      try {
        const encoder = new TextEncoder();
        const sseMessage = `event: message\ndata: ${JSON.stringify(responsePayload)}\n\n`;
        sseSession.controller.enqueue(encoder.encode(sseMessage));
        sseSession.lastActiveAt = Date.now();
      } catch {
        activeSessions.delete(targetSessionId);
      }
    }
  }

  // 4. Return standard JSON-RPC 2.0 response in HTTP body
  const httpStatus = responsePayload.error && responsePayload.error.code === -32601 ? 404 : 200;
  return NextResponse.json(responsePayload, {
    status: httpStatus,
    headers: corsHeaders,
  });
}
