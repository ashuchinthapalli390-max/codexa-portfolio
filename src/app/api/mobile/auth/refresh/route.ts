import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  generateSessionToken,
  hashToken,
  SESSION_MAX_AGE_SECONDS,
  generateRequestId,
} from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function isDatabaseError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const name = String(err.name || "").toLowerCase();
  const code = String(err.code || "");
  if (code.startsWith("P10") || code === "P2024") return true;
  if (name.includes("prismaclientinitializationerror") || name.includes("prismaclientrustpanickerror")) return true;
  if (msg.includes("can't reach database") || msg.includes("connection pool") || msg.includes("timed out")) return true;
  if (msg.includes("connection refused") || msg.includes("econnrefused") || msg.includes("etimedout")) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    let token: string | undefined;

    // 1. Try JSON body
    try {
      const body = await req.json();
      token = body?.refreshToken || body?.accessToken || body?.token;
    } catch {}

    // 2. Try Authorization header
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token || !token.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TOKEN", message: "Session token required for refresh." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const tokenClean = token.trim();
    const tokenHash = hashToken(tokenClean);
    const now = new Date();

    // 3. Lookup active session in Core DB
    const session = await db.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: {
        user: {
          include: {
            profile: true,
            employmentProfile: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Session invalid or expired." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    if (session.revokedAt) {
      return NextResponse.json(
        { ok: false, error: { code: "REVOKED", message: "Session has been revoked." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    if (now > session.expiresAt) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
      return NextResponse.json(
        { ok: false, error: { code: "EXPIRED", message: "Session has expired. Please sign in again." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    if (!session.user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Your CodeXa account is disabled." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Extend active session expiry (30 days from now) without invalidating concurrent in-flight requests
    const newExpiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

    await db.session.update({
      where: { id: session.id },
      data: {
        expiresAt: newExpiresAt,
        lastSeenAt: now,
      },
    });

    const user = session.user;
    const effectiveRole = getEffectiveRole(user);

    return NextResponse.json({
      ok: true,
      accessToken: tokenClean,
      refreshToken: tokenClean,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.profile?.displayName || user.username,
        role: effectiveRole,
        orgRole: user.orgRole,
        department: user.department || user.employmentProfile?.department,
        designation: user.employmentProfile?.designation || user.profile?.primaryRole,
        employeeId: user.employmentProfile?.employeeId,
        profileMediaUrl: user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl,
        mustChangePassword: user.mustChangePassword,
      },
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/auth/refresh Error] [${requestId}]`, {
      message: err?.message,
      code: err?.code,
    });

    if (isDatabaseError(err)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "CodeXa is temporarily unable to connect to its database.",
          },
          requestId,
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "CodeXa encountered a server error.",
        },
        requestId,
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
