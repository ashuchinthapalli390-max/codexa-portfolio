import { NextRequest, NextResponse } from "next/server";
import { handleFirebaseSession } from "@/lib/firebase-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, authorized: false, error: "Invalid or malformed request body." },
        { status: 401 }
      );
    }

    const { idToken } = body || {};

    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { success: false, authorized: false, error: "Firebase ID token is required." },
        { status: 401 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || undefined;

    const result = await handleFirebaseSession(idToken, { userAgent, ip });

    if (!result.success || !result.authorized) {
      const isTokenError =
        result.message?.toLowerCase().includes("invalid") ||
        result.message?.toLowerCase().includes("expired") ||
        result.message?.toLowerCase().includes("malformed") ||
        result.message?.toLowerCase().includes("token") ||
        result.message?.toLowerCase().includes("decode");

      return NextResponse.json(
        {
          success: false,
          authorized: false,
          error: result.message || "Unauthorized account.",
        },
        { status: isTokenError ? 401 : 403 }
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
