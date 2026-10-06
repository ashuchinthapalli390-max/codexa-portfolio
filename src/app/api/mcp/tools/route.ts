/**
 * /api/mcp/tools
 * Tool Registry & Security Policy Management API
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, canAccessMcp } from "@/lib/permissions";
import { MCP_TOOLS } from "@/lib/mcp/registry";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Tools are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  // Load custom database policies
  const customPolicies = await prisma.mcpToolPolicy.findMany();
  const policyMap = new Map(customPolicies.map((p) => [p.toolName, p]));

  const merged = MCP_TOOLS.map((t) => {
    const custom = policyMap.get(t.name);
    return {
      name: t.name,
      description: t.description,
      category: t.category,
      requiredScope: t.requiredScope,
      requiredPermission: t.requiredPermission,
      riskLevel: custom ? custom.approvalLevel : t.riskLevel,
      approvalLevel: custom ? custom.approvalLevel : t.defaultApprovalLevel,
      bulkThreshold: custom ? custom.bulkThreshold : t.bulkThreshold,
      rateLimitPerMin: custom ? custom.rateLimitPerMin : 60,
      isEnabled: custom ? custom.isEnabled : true,
      allowedRoles: custom && Array.isArray(custom.allowedRoles) ? custom.allowedRoles : ["FOUNDER", "CO_FOUNDER", "CTO", "HR"],
      hasCustomPolicy: !!custom,
      inputSchema: t.inputSchema,
    };
  });

  return NextResponse.json({
    success: true,
    totalTools: merged.length,
    tools: merged,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Tools are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { toolName, isEnabled, allowedRoles, approvalLevel, bulkThreshold, rateLimitPerMin } = body;

    if (!toolName) {
      return NextResponse.json({ error: "toolName is required." }, { status: 400 });
    }

    const toolDef = MCP_TOOLS.find((t) => t.name === toolName);
    if (!toolDef) {
      return NextResponse.json({ error: "Tool not found in registry." }, { status: 404 });
    }

    const updated = await prisma.mcpToolPolicy.upsert({
      where: { toolName },
      create: {
        toolName,
        category: toolDef.category,
        requiredScope: toolDef.requiredScope,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        allowedRoles: allowedRoles || ["FOUNDER", "CO_FOUNDER", "CTO", "HR"],
        approvalLevel: approvalLevel !== undefined ? approvalLevel : toolDef.defaultApprovalLevel,
        bulkThreshold: bulkThreshold !== undefined ? bulkThreshold : toolDef.bulkThreshold,
        rateLimitPerMin: rateLimitPerMin !== undefined ? rateLimitPerMin : 60,
      },
      update: {
        isEnabled: isEnabled !== undefined ? isEnabled : undefined,
        allowedRoles: allowedRoles !== undefined ? allowedRoles : undefined,
        approvalLevel: approvalLevel !== undefined ? approvalLevel : undefined,
        bulkThreshold: bulkThreshold !== undefined ? bulkThreshold : undefined,
        rateLimitPerMin: rateLimitPerMin !== undefined ? rateLimitPerMin : undefined,
      },
    });

    await dataStore.logAudit(
      auth.user.id,
      "MCP_TOOL_POLICY_UPDATED",
      `Updated MCP policy for '${toolName}' (Enabled: ${updated.isEnabled}, Approval: L${updated.approvalLevel}, Bulk: ${updated.bulkThreshold}).`
    ).catch(() => {});

    return NextResponse.json({ success: true, policy: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update tool policy." }, { status: 500 });
  }
}
