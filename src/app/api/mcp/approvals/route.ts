/**
 * /api/mcp/approvals
 * Human-in-the-Loop Review & Decision API for MCP Actions
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { getPendingMcpApprovals, decideMcpApproval } from "@/lib/mcp/approvals";
import { executeMcpTool } from "@/lib/mcp/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approvals = await getPendingMcpApprovals();

  return NextResponse.json({
    success: true,
    total: approvals.length,
    approvals: approvals.map((a) => ({
      id: a.id,
      toolName: a.toolName,
      clientName: a.clientId || "Direct Client",
      clientId: a.clientId,
      riskLevel: a.riskLevel,
      summary: a.summary,
      parameters: a.parameters,
      affectedCount: a.affectedCount,
      status: a.status,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permCheck = await requirePermission(auth.user, Permission.APPROVE_MCP_ACTIONS);
  if (!permCheck.authorized) return permCheck.response;

  try {
    const body = await req.json();
    const { approvalId, decision, reviewNotes, executeNow = true } = body;

    if (!approvalId || !["APPROVED", "REJECTED"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid parameters. 'approvalId' and decision ('APPROVED'|'REJECTED') are required." },
        { status: 400 }
      );
    }

    const updated = await decideMcpApproval(approvalId, decision, {
      id: auth.user.id,
      fullName: auth.user.displayName,
      username: auth.user.username || "",
      email: auth.user.email || "",
    }, reviewNotes);

    let executionResult: any = null;
    if (decision === "APPROVED" && executeNow) {
      // Execute the approved action immediately
      try {
        const toolRes = await executeMcpTool(
          updated.toolName,
          { ...(updated.parameters as any), approvalId: updated.id },
          {
            clientId: updated.clientId || undefined,
            scopes: ["*"],
            allowedTools: ["*"],
            actingUser: {
              id: auth.user.id,
              email: auth.user.email || "",
              username: auth.user.username || "",
              fullName: auth.user.displayName,
              role: auth.user.orgRole || auth.user.role,
              orgRole: auth.user.orgRole || auth.user.role,
            },
          }
        );
        executionResult = toolRes;
      } catch (execErr: any) {
        executionResult = { error: execErr.message };
      }
    }

    return NextResponse.json({
      success: true,
      decision,
      approvalId: updated.id,
      toolName: updated.toolName,
      status: updated.status,
      executionResult,
      message: `Operation '${updated.toolName}' was ${decision.toLowerCase()} successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to decide approval." }, { status: 500 });
  }
}
