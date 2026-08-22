/**
 * GET /api/session
 * Returns the current authenticated session state (source of truth from PostgreSQL).
 * Never cached (no-store).
 *
 * Status Codes:
 * - 200: Authenticated session confirmed
 * - 401: Positively unauthenticated (no cookie, expired, revoked, or disabled)
 * - 503: Database or auth service temporarily unavailable
 */
import { NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const result = await getCurrentSessionResult();

  if (result.status === "error") {
    return NextResponse.json(
      {
        authenticated: null,
        error: "AUTH_SERVICE_UNAVAILABLE",
        message: "We temporarily couldn't verify your secure session. Retrying...",
        requestId: result.requestId,
      },
      {
        status: 503,
        headers: NO_CACHE_HEADERS,
      }
    );
  }

  if (result.status === "unauthenticated") {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: "SESSION_INVALID",
        reason: result.reason,
      },
      {
        status: 401,
        headers: NO_CACHE_HEADERS,
      }
    );
  }

  const user = result.user;

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        mediaUrl: user.mediaUrl,
        leadershipPosition: user.leadershipPosition,
        primaryRole: user.primaryRole,
      },
    },
    {
      status: 200,
      headers: NO_CACHE_HEADERS,
    }
  );
}
