/**
 * /api/mcp/activity
 * Real-time Audit Stream of MCP Tool Calls
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, canAccessMcp } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Activity is restricted to Founder and Co-Founder." }, { status: 403 });
  }

  const url = new URL(req.url);
  const toolName = url.searchParams.get("tool");
  const status = url.searchParams.get("status");
  const risk = url.searchParams.get("risk");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "30", 10);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (toolName) where.toolName = toolName;
  if (status) where.status = status.toUpperCase();
  if (risk) where.riskLevel = parseInt(risk, 10);

  const [total, calls] = await Promise.all([
    prisma.mcpToolCall.count({ where }),
    prisma.mcpToolCall.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    total,
    page,
    limit,
    calls: calls.map((c) => ({
      id: c.id,
      requestId: c.requestId,
      clientName: c.clientId || "Direct API",
      actorName: c.actorName || "Automated Identity",
      toolName: c.toolName,
      category: c.category,
      riskLevel: c.riskLevel,
      status: c.status,
      durationMs: c.durationMs,
      target: c.target,
      approvalId: c.approvalId,
      errorMessage: c.errorMessage,
      safeParams: c.safeParams,
      resultSummary: c.resultSummary,
      createdAt: c.createdAt,
    })),
  });
}
