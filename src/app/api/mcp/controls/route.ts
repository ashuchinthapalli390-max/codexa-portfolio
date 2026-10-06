/**
 * /api/mcp/controls
 * Emergency Kill Switch & Platform Guardrails API
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, getEffectiveRole } from "@/lib/permissions";
import { getMcpControls, updateMcpControls } from "@/lib/mcp/controls";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const controls = await getMcpControls();
  return NextResponse.json({ success: true, controls });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = getEffectiveRole(auth.user);
  if (!["FOUNDER", "CO_FOUNDER"].includes(role)) {
    return NextResponse.json(
      { error: "Forbidden. Only Founder or Co-Founder can toggle MCP Emergency Kill Switches." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const updated = await updateMcpControls(body, auth.user.id);

    await dataStore.logAudit(
      auth.user.id,
      "MCP_EMERGENCY_SWITCH_TOGGLED",
      `MCP Emergency Controls updated by ${auth.user.email}: Master=${updated.isMcpEnabled}, Read=${updated.isReadToolsEnabled}, Write=${updated.isWriteToolsEnabled}, Bulk=${updated.isBulkActionsEnabled}, Email=${updated.isEmailActionsEnabled}, Payment=${updated.isPaymentActionsEnabled}.`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      controls: updated,
      message: "Emergency kill switch settings updated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update kill switches." }, { status: 500 });
  }
}
