import { NextRequest, NextResponse } from "next/server";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { resolveVisibleClassesForUser } from "@/lib/classes/class-visibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date")?.trim() || new Date().toISOString().split("T")[0];

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATE", message: "Date must be formatted as YYYY-MM-DD." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Call canonical shared visibility resolver
    const resolved = await resolveVisibleClassesForUser({
      user,
      date: dateParam,
      includeDrafts: false,
    });

    return NextResponse.json({
      ok: true,
      date: dateParam,
      classes: resolved.classes,
      count: resolved.classes.length,
      canManage: resolved.canManageClasses,
      userRole: resolved.userRole,
      internDomain: resolved.userDomain,
      internDomainId: resolved.userDomainId,
      internYear: resolved.userYear,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/classes/by-date] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load classes for date: " + err.message }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
