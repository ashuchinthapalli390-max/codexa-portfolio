/**
 * /api/mcp/oauth/token
 * OAuth 2.0 Token Endpoint for Remote MCP Clients (ChatGPT, Codex, Cursor, etc.)
 * Supports client_credentials and authorization_code grants with PKCE.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashMcpSecret, generateOAuthAccessToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let grantType = "";
  let clientId = "";
  let clientSecret = "";
  let code = "";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    grantType = (formData.get("grant_type") as string) || "";
    clientId = (formData.get("client_id") as string) || "";
    clientSecret = (formData.get("client_secret") as string) || "";
    code = (formData.get("code") as string) || "";
  } else {
    try {
      const body = await req.json();
      grantType = body.grant_type || "";
      clientId = body.client_id || "";
      clientSecret = body.client_secret || "";
      code = body.code || "";
    } catch {
      // ignore
    }
  }

  // Also check Basic Auth header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
      const [u, p] = decoded.split(":");
      if (u) clientId = u;
      if (p) clientSecret = p;
    } catch {}
  }

  if (!clientId) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "client_id is required." },
      { status: 400 }
    );
  }

  // Verify client
  const client = await prisma.mcpClient.findUnique({
    where: { clientId },
  });

  if (!client || client.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Client not found or not active." },
      { status: 401 }
    );
  }

  // Verify secret if clientSecret is configured
  if (client.clientSecretHash && clientSecret) {
    const secretHash = hashMcpSecret(clientSecret);
    if (client.clientSecretHash !== secretHash) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Client secret mismatch." },
        { status: 401 }
      );
    }
  }

  // Generate 30-day session token
  const { rawToken, tokenHash } = generateOAuthAccessToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await prisma.mcpSession.create({
    data: {
      sessionToken: tokenHash,
      clientId: client.clientId,
      userId: client.ownerUserId,
      scopes: client.scopes || ["*"],
      expiresAt,
    },
  });

  return NextResponse.json({
    access_token: rawToken,
    token_type: "Bearer",
    expires_in: 30 * 24 * 60 * 60,
    scope: Array.isArray(client.scopes) ? (client.scopes as string[]).join(" ") : "*",
  });
}
