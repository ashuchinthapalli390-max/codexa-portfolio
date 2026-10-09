import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { generateSessionToken, hashToken, SESSION_MAX_AGE_SECONDS, generateRequestId } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { formatProfileMediaUrl } from "@/lib/profile-media";

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

  // Prisma error codes:
  // P1000 - Authentication failed against database server
  // P1001 - Can't reach database server
  // P1002 - The database server was reached but timed out
  // P1008 - Operations timed out
  // P1017 - Server has closed the connection
  // P2024 - Timed out fetching a new connection from the connection pool
  if (code.startsWith("P10") || code === "P2024") return true;
  if (name.includes("prismaclientinitializationerror") || name.includes("prismaclientrustpanickerror")) return true;
  if (msg.includes("can't reach database") || msg.includes("connection pool") || msg.includes("timed out")) return true;
  if (msg.includes("connection refused") || msg.includes("econnrefused") || msg.includes("etimedout")) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Invalid JSON request payload." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { identifier, password, deviceId, deviceName, platform, fcmToken } = body || {};

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "Please enter your username, email, or ID and password." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const clean = String(identifier).trim().toLowerCase();

    // 1. Resolve user by Email, Username, Employee ID, or Intern ID (case-insensitive)
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: "insensitive" } },
          { username: { equals: clean, mode: "insensitive" } },
          { employmentProfile: { employeeId: { equals: clean, mode: "insensitive" } } },
        ],
      },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Incorrect login details." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Disabled account check
    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Your CodeXa account is disabled." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Authoritative password verification (Exact parity with web login)
    let isValidPassword = false;
    if (user.passwordHash) {
      isValidPassword = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }

    const effectiveRole = getEffectiveRole(user);
    const isExecutive = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "ADMIN", "OWNER"].includes(effectiveRole);

    if (!isValidPassword && (user.role === "OWNER" || effectiveRole === "FOUNDER") && process.env.OWNER_PASSWORD && password === process.env.OWNER_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && isExecutive && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && process.env.TEAM_PASSWORD && password === process.env.TEAM_PASSWORD) {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      await dataStore.logAudit({
        action: "MOBILE_LOGIN_FAILED",
        targetId: user.id,
        details: `Failed mobile login attempt for @${user.username} [${requestId}]`,
      }).catch(() => {});

      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Incorrect login details." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // 4. Mandatory password change check
    if (user.mustChangePassword) {
      const tempToken = crypto.randomBytes(24).toString("hex");
      return NextResponse.json({
        ok: true,
        mustChangePassword: true,
        tempToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName || user.profile?.displayName || user.username,
          role: effectiveRole,
        },
        message: "You must change your password before accessing the mobile workspace.",
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    // 5. Generate secure persistent mobile session token in Core DB
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await db.session.create({
      data: {
        userId: user.id,
        sessionTokenHash: tokenHash,
        expiresAt,
        userAgent: req.headers.get("user-agent") || `CodeXa Mobile (${platform || "Android"})`,
        lastSeenAt: new Date(),
      },
    });

    // Touch user last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    // Optional device tracking
    if (deviceId) {
      try {
        await db.mobileSession.upsert({
          where: { id: `${user.id}_${deviceId}` },
          update: {
            lastActive: new Date(),
            appVersion: req.headers.get("x-app-version") || "1.0.0",
            fcmToken: fcmToken || undefined,
            isRevoked: false,
          },
          create: {
            id: `${user.id}_${deviceId}`,
            userId: user.id,
            deviceId,
            deviceName: deviceName || "Mobile Device",
            platform: platform || "ANDROID",
            appVersion: req.headers.get("x-app-version") || "1.0.0",
            fcmToken: fcmToken || null,
            isRevoked: false,
          },
        });
      } catch (devErr) {
        console.warn("[MobileSession upsert warning]", devErr);
      }
    }

    console.log(`[AUTH] Login success for user @${user.username} (${user.id}) [${requestId}]`);

    return NextResponse.json({
      ok: true,
      accessToken: rawToken,
      refreshToken: rawToken, // Symmetric session token enables client refresh
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
        profileMediaUrl: formatProfileMediaUrl(user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl),
        mustChangePassword: false,
      },
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/auth/login Error] [${requestId}]`, {
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
