/**
 * /api/mcp/service-accounts
 * Management API for Automated Agent & Bot Service Accounts
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, getEffectiveRole } from "@/lib/permissions";
import { generateServiceAccountKey } from "@/lib/mcp/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permCheck = await requirePermission(auth.user, Permission.MANAGE_MCP_CONNECTIONS);
  if (!permCheck.authorized) return permCheck.response;

  const accounts = await prisma.serviceAccount.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    total: accounts.length,
    serviceAccounts: accounts.map((sa) => ({
      id: sa.id,
      serviceId: sa.serviceId,
      name: sa.name,
      description: sa.description,
      orgRole: sa.orgRole,
      scopes: sa.scopes,
      keyPrefix: sa.keyPrefix,
      status: sa.status,
      lastUsedAt: sa.lastUsedAt,
      createdAt: sa.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permCheck = await requirePermission(auth.user, Permission.MANAGE_MCP_CONNECTIONS);
  if (!permCheck.authorized) return permCheck.response;

  try {
    const body = await req.json();
    const { name, description, orgRole = "HR", scopes = [] } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Service account name is required." }, { status: 400 });
    }

    const effectiveRole = getEffectiveRole(auth.user);
    if (!["FOUNDER", "CO_FOUNDER", "CTO"].includes(effectiveRole)) {
      return NextResponse.json(
        { error: "Only Founder, Co-Founder, or CTO can create service accounts." },
        { status: 403 }
      );
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 20);
    const serviceId = `cxa_sa_${slug}_${Math.floor(100 + Math.random() * 900)}`;

    const { rawKey, keyHash, prefix } = generateServiceAccountKey();

    const created = await prisma.serviceAccount.create({
      data: {
        serviceId,
        name: name.trim(),
        description: description?.trim() || null,
        orgRole,
        scopes: scopes.length > 0 ? scopes : ["users:read", "projects:read"],
        apiKeyHash: keyHash,
        keyPrefix: prefix,
        status: "ACTIVE",
        createdById: auth.user.id,
      },
    });

    await dataStore.logAudit(
      auth.user.id,
      "MCP_SERVICE_ACCOUNT_CREATED",
      `Created Service Account '${created.name}' (${created.serviceId}) with bounded role '${orgRole}'.`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      serviceAccount: {
        id: created.id,
        serviceId: created.serviceId,
        name: created.name,
        orgRole: created.orgRole,
        keyPrefix: prefix,
        scopes: created.scopes,
      },
      secretKey: rawKey,
      message: "Service Account created. Save the secret key now; it will not be displayed again.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create service account." }, { status: 500 });
  }
}
