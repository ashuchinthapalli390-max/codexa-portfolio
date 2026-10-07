import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Public Mobile Health Check Endpoint for CodeXa Core
 * Confirms CodeXa server reachability and Core database connectivity.
 * Safe unauthenticated endpoint - never leaks internal database URLs or secrets.
 */
export async function GET() {
  try {
    // 1. Safe Diagnostic test: Verify Core DB connection via SELECT 1
    await db.$queryRawUnsafe("SELECT 1 as connected");

    return NextResponse.json(
      {
        ok: true,
        service: "codexa-core",
        version: "1.0.0",
        database: "connected",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/mobile/health] Core DB Health Check Failed:", {
      message: err?.message,
      code: err?.code,
    });

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
        },
      },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }
}
