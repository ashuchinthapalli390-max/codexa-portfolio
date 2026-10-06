/**
 * /api/mcp/clients
 * Management API for Registered MCP Clients & Agent Connections
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, canAccessMcp } from "@/lib/permissions";
import { generateMcpApiKey, hashMcpSecret } from "@/lib/mcp/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Connections are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  const clients = await prisma.mcpClient.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { fullName: true, username: true, email: true } },
    },
  });

  return NextResponse.json({
    success: true,
    clients: clients.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      name: c.name,
      description: c.description,
      clientType: c.clientType,
      apiKeyPrefix: c.apiKeyPrefix,
      scopes: c.scopes,
      allowedTools: c.allowedTools,
      status: c.status,
      owner: c.owner ? (c.owner.fullName || c.owner.username) : "System",
      lastConnectedAt: c.lastConnectedAt,
      createdAt: c.createdAt,
      stats: {
        toolCalls: 0,
        approvals: 0,
        jobs: 0,
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Connections are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, description, clientType = "API_KEY", scopes = ["*"], allowedTools = ["*"], ipRestrictions } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const clientId = `cxa_mcp_${randomSuffix}`;

    const { rawKey, keyHash, prefix } = generateMcpApiKey();

    const client = await prisma.mcpClient.create({
      data: {
        clientId,
        name: name.trim(),
        description: description?.trim() || null,
        clientType,
        clientSecretHash: keyHash,
        apiKeyPrefix: prefix,
        scopes,
        allowedTools,
        ipRestrictions: ipRestrictions || null,
        status: "ACTIVE",
        ownerUserId: auth.user.id,
        createdById: auth.user.id,
      },
    });

    await dataStore.logAudit(
      auth.user.id,
      "MCP_CLIENT_CREATED",
      `Registered MCP Client '${client.name}' (${client.clientId}). Type: ${clientType}.`
    ).catch(() => {});

    // Return raw secret key ONCE for modal display
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        apiKeyPrefix: prefix,
        scopes: client.scopes,
        allowedTools: client.allowedTools,
        status: client.status,
      },
      secretKey: rawKey,
      message: "Client registered successfully. Save the Secret API Key now; it will not be displayed again.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create MCP client." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permCheck = await requirePermission(auth.user, Permission.MANAGE_MCP_CONNECTIONS);
  if (!permCheck.authorized) return permCheck.response;

  try {
    const body = await req.json();
    const { clientId, status, scopes, allowedTools } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required." }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (scopes) data.scopes = scopes;
    if (allowedTools) data.allowedTools = allowedTools;

    const updated = await prisma.mcpClient.update({
      where: { clientId },
      data,
    });

    await dataStore.logAudit(
      auth.user.id,
      "MCP_CLIENT_UPDATED",
      `Updated MCP Client '${updated.name}' (${updated.clientId}). Status: ${updated.status}.`
    ).catch(() => {});

    return NextResponse.json({ success: true, client: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update MCP client." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Connections are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required." }, { status: 400 });
  }

  // Soft-revoke
  const updated = await prisma.mcpClient.update({
    where: { clientId },
    data: { status: "REVOKED" },
  });

  // Revoke all active sessions
  await prisma.mcpSession.updateMany({
    where: { clientId },
    data: { revokedAt: new Date() },
  });

  await dataStore.logAudit(
    auth.user.id,
    "MCP_CLIENT_REVOKED",
    `Revoked MCP Client '${updated.name}' (${updated.clientId}) and invalidated all active sessions.`
  ).catch(() => {});

  return NextResponse.json({ success: true, message: "Client revoked successfully." });
}
