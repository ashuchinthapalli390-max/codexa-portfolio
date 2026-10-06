/**
 * /api/mcp
 * Remote Model Context Protocol (MCP) Standards-Compliant Streamable Server
 * Supports JSON-RPC 2.0 over HTTP (protocol version 2024-11-05)
 * Compatible with ChatGPT, Claude-compatible MCP clients, Cursor, VS Code, and CodeXa Desktop
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveMcpAuthContext } from "@/lib/mcp/auth";
import { MCP_TOOLS, executeMcpTool } from "@/lib/mcp/registry";
import { JsonRpcRequest, JsonRpcResponse } from "@/lib/mcp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const auth = await resolveMcpAuthContext(req);

  return NextResponse.json(
    {
      status: "online",
      server: "codexa-mcp-server",
      version: "1.0.0",
      protocolVersion: "2024-11-05",
      endpoint: `${url.origin}/api/mcp`,
      canonicalUrl: "https://codxa-agency.online/mcp",
      authentication: {
        type: "Bearer",
        formats: [
          "cxa_mcp_sk_live_... (Client Secret API Key)",
          "cxa_sa_live_... (Service Account Key)",
          "cxa_mcp_tok_... (OAuth 2.0 Bearer Token)",
        ],
        isAuthenticated: auth.success,
        client: auth.success ? auth.context.clientName : null,
      },
      capabilities: {
        tools: {
          count: MCP_TOOLS.length,
          categories: [
            "users",
            "employees",
            "interns",
            "projects",
            "attendance",
            "payments",
            "documents",
            "email",
            "analytics",
            "feature_flags",
            "search",
            "jobs",
          ],
        },
      },
      documentation: "https://codxa-agency.online/dashboard/integrations/mcp",
    },
    { headers: CORS_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;

  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid JSON payload." },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== "2.0") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32600, message: "Invalid Request: 'jsonrpc' must be '2.0'." },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 1. MCP Initialization Handshake
  if (method === "initialize") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
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
            "CodeXa Agency Remote MCP Server. Manage users, employees, interns, projects, attendance windows, payroll, and offer letters securely via authorized agency tools.",
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  if (method === "notifications/initialized") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: id ?? null, result: {} },
      { headers: CORS_HEADERS }
    );
  }

  if (method === "ping") {
    return NextResponse.json(
      { jsonrpc: "2.0", id, result: {} },
      { headers: CORS_HEADERS }
    );
  }

  // 2. Discover Tools (tools/list)
  if (method === "tools/list") {
    const auth = await resolveMcpAuthContext(req);
    // If authenticated, we can optionally filter by client allowed tools, otherwise provide catalog
    const allowedTools =
      auth.success && !auth.context.allowedTools.includes("*")
        ? MCP_TOOLS.filter((t) => auth.context.allowedTools.includes(t.name))
        : MCP_TOOLS;

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          tools: allowedTools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  // 3. Call Tool (tools/call)
  if (method === "tools/call") {
    const auth = await resolveMcpAuthContext(req);

    if (!auth.success) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  code: auth.code,
                  error: auth.error,
                  message:
                    "Authentication failed. Please provide a valid CodeXa Bearer API key or OAuth access token.",
                }),
              },
            ],
            isError: true,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    if (!toolName) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Invalid params: 'name' is required for tools/call." },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const execResult = await executeMcpTool(toolName, toolArgs, auth.context);

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          content: execResult.content,
          isError: execResult.isError || false,
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  // Unhandled method
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32601, message: `Method '${method}' not found.` },
    },
    { status: 404, headers: CORS_HEADERS }
  );
}
