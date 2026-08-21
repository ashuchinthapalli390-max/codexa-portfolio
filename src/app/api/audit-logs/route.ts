/**
 * /api/audit-logs
 * GET: Owner-only fetch of security and activity audit logs
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  try {
    const logs = await dataStore.getAuditLogs();
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error("[GET /api/audit-logs]", err);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
