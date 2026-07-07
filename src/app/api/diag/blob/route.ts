/**
 * GET /api/diag/blob
 * Safe diagnostic endpoint — checks if BLOB_READ_WRITE_TOKEN is present and valid.
 * Does NOT return the token value. Returns only its presence/length for debugging.
 * REMOVE THIS FILE after confirming uploads work in production.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  // Only accessible to logged-in OWNER
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  return NextResponse.json({
    BLOB_READ_WRITE_TOKEN: {
      present: !!token,
      length: token ? token.length : 0,
      prefix: token ? token.substring(0, 18) + "..." : null,
    },
    NODE_ENV: process.env.NODE_ENV,
  });
}

export const dynamic = "force-dynamic";
