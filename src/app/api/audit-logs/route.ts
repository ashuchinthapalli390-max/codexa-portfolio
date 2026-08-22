/**
 * /api/audit-logs
 * GET: Owner-only fetch of security and activity audit logs
 */
import { NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Forbidden. Owner access required." },
      { status: 403, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const logs = await dataStore.getAuditLogs();
    return NextResponse.json({ success: true, logs }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/audit-logs]", err);
    return NextResponse.json({ error: "Failed to load audit logs from database." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
