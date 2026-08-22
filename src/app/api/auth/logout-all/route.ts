/**
 * POST /api/auth/logout-all
 * Revokes ALL active sessions for the current authenticated user.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, revokeAllUserSessions, destroySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    // Revoke all sessions in DB
    await revokeAllUserSessions(user.id);

    // Destroy current cookie
    await destroySession();

    const res = NextResponse.json({
      success: true,
      message: "All sessions have been revoked. Please log in again.",
    });

    res.cookies.set("cxa_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    console.error("[POST /api/auth/logout-all Error]", err);
    return NextResponse.json({ success: false, error: "Failed to revoke sessions." }, { status: 500 });
  }
}
