/**
 * POST /api/auth/verify-key
 * Legacy access key verification endpoint - redirects/notifies to use /api/login
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { message: "CodeXa now uses unified session login via /api/login", preAuthGranted: false },
    { status: 200 }
  );
}
