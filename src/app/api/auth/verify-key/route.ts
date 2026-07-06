/**
 * POST /api/auth/verify-key
 * Step 1 of two-step login.
 *
 * Accepts a raw access key, verifies it against SHA-256 hashed records in SQLite.
 * Also accepts OWNER_MASTER_KEY from env — permanent, never expires, never stored.
 * On success: creates a short-lived PreAuthSession (10 min) and sets an HTTP-only cookie.
 * Response is intentionally generic — never exposes role, username, or failure reason.
 *
 * Rate limit: 5 failed attempts per IP per 15 minutes.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

const PREAUTH_COOKIE = "cxa_preauth";
const PREAUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiter (per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw.trim()).digest("hex");
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }
  if (record.count >= RATE_LIMIT_MAX) return false; // blocked
  record.count++;
  return true; // allowed
}

function resetRateLimitOnSuccess(ip: string) {
  rateLimitMap.delete(ip);
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawKey = body.key?.trim();
  if (!rawKey) {
    return NextResponse.json({ error: "Access denied." }, { status: 401 });
  }

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  // ─── MASTER KEY CHECK (env-based, permanent, OWNER only) ────────────────────
  const masterKey = process.env.OWNER_MASTER_KEY?.trim();
  if (masterKey && rawKey === masterKey) {
    try {
      // Find the Owner user account directly
      const ownerUser = await db.user.findFirst({
        where: { role: "OWNER", isActive: true },
        select: { id: true },
      });

      if (!ownerUser) {
        return NextResponse.json({ error: "Access denied." }, { status: 401 });
      }

      // Create PreAuthSession for OWNER
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + PREAUTH_TTL_MS);

      await db.preAuthSession.create({
        data: {
          tokenHash,
          userId: ownerUser.id,
          role: "OWNER",
          expiresAt,
        },
      });

      resetRateLimitOnSuccess(ip);

      const res = NextResponse.json({ preAuthGranted: true });
      res.cookies.set(PREAUTH_COOKIE, rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PREAUTH_TTL_MS / 1000,
      });
      return res;
    } catch (err) {
      console.error("[POST /api/auth/verify-key] Master key error:", err);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  const hash = hashKey(rawKey);

  try {
    // Find active, non-expired access key
    const accessKey = await db.accessKey.findUnique({
      where: { keyHash: hash },
      include: { user: { select: { id: true, isActive: true, role: true } } },
    });

    const isValid =
      accessKey &&
      accessKey.isActive &&
      accessKey.user.isActive &&
      (!accessKey.expiresAt || new Date() < accessKey.expiresAt) &&
      (!accessKey.maxUses || accessKey.useCount < accessKey.maxUses);

    // Log the attempt
    await db.accessKeyAuditLog.create({
      data: {
        accessKeyId: accessKey?.id ?? null,
        userId: accessKey?.userId ?? null,
        action: isValid ? "VERIFY_SUCCESS" : "VERIFY_FAIL",
        success: !!isValid,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    if (!isValid) {
      // Generic error — never expose WHY it failed
      return NextResponse.json({ error: "Access denied." }, { status: 401 });
    }

    // Increment use count
    await db.accessKey.update({
      where: { id: accessKey!.id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    // Create PreAuthSession
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + PREAUTH_TTL_MS);

    await db.preAuthSession.create({
      data: {
        tokenHash,
        userId: accessKey!.userId,
        role: accessKey!.role,
        expiresAt,
      },
    });

    resetRateLimitOnSuccess(ip);

    // Set HTTP-only pre-auth cookie
    const res = NextResponse.json({ preAuthGranted: true });
    res.cookies.set(PREAUTH_COOKIE, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PREAUTH_TTL_MS / 1000,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/verify-key] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
