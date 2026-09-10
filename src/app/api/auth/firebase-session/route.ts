import { NextRequest, NextResponse } from "next/server";
import { handleFirebaseSession } from "@/lib/firebase-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, authorized: false, error: "Firebase ID token is required." },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || undefined;

    const result = await handleFirebaseSession(idToken, { userAgent, ip });

    if (!result.success || !result.authorized) {
      return NextResponse.json(
        {
          success: false,
          authorized: false,
          error: result.message || "Unauthorized account.",
        },
        { status: result.message?.includes("Invalid") || result.message?.includes("expired") ? 401 : 403 }
      );
    }

    return NextResponse.json({
      success: true,
      authorized: true,
      redirectUrl: result.redirectUrl,
      user: result.user,
    });
  } catch (err: any) {
    console.error("[POST /api/auth/firebase-session] Error:", err);
    return NextResponse.json(
      { success: false, authorized: false, error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
