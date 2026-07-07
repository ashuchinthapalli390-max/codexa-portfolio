/**
 * POST /api/auth/verify-key
 * Step 1 of two-step login.
 *
 * Accepts a raw access key, normalizes it (trim + uppercase), and verifies
 * it against SHA-256 hashed records in MySQL.
 * Also accepts OWNER_MASTER_KEY from env — permanent, never expires, never stored.
 * On success: creates a short-lived PreAuthSession (10 min) and sets an HTTP-only cookie.
 *
 * Diagnostic logging uses request IDs only — never logs secrets, hashes, or keys.
 * Rate limit: 5 failed attempts per IP per 15 minutes.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

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

/**
 * Canonical normalization applied BOTH at key creation and verification.
 * - Trim outer whitespace
 * - Convert to uppercase
 * - Preserve internal hyphens
 * - Return null if empty after normalization
 */
function normalizeAccessKey(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function hashKey(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

function resetRateLimitOnSuccess(ip: string) {
  rateLimitMap.delete(ip);
}

function makeRequestId(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const reqId = makeRequestId();
  const env = process.env.NODE_ENV ?? "unknown";

  console.log(`[verify-key][${reqId}] env=${env} ip=${ip} — request received`);

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    console.warn(`[verify-key][${reqId}] PARSE_ERROR — invalid JSON body`);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // ─── Normalize submitted key ─────────────────────────────────────────────
  const normalizedKey = normalizeAccessKey(body.key ?? "");
  if (!normalizedKey) {
    console.warn(`[verify-key][${reqId}] EMPTY_KEY — blank key submitted`);
    return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
  }

  // ─── Rate limit ──────────────────────────────────────────────────────────
  if (!checkRateLimit(ip)) {
    console.warn(`[verify-key][${reqId}] RATE_LIMITED — ip=${ip}`);
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  // ─── MASTER KEY CHECK (env-based, permanent, OWNER only) ─────────────────
  const masterKeyRaw = process.env.OWNER_MASTER_KEY;
  const normalizedMasterKey = masterKeyRaw ? normalizeAccessKey(masterKeyRaw) : null;

  if (normalizedMasterKey && normalizedKey === normalizedMasterKey) {
    console.log(`[verify-key][${reqId}] MASTER_KEY_MATCH — looking up OWNER user`);
    try {
      const ownerUser = await db.user.findFirst({
        where: { role: "OWNER", isActive: true },
        select: { id: true },
      });

      if (!ownerUser) {
        console.error(`[verify-key][${reqId}] NO_OWNER_USER — OWNER user not found in DB`);
        return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + PREAUTH_TTL_MS);

      await db.preAuthSession.create({
        data: { tokenHash, userId: ownerUser.id, role: "OWNER", expiresAt },
      });

      resetRateLimitOnSuccess(ip);
      console.log(`[verify-key][${reqId}] MASTER_KEY_SUCCESS — preAuthSession created`);

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
      console.error(`[verify-key][${reqId}] DB_UNAVAILABLE — master key DB error:`, (err as Error).message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
  }

  // ─── DB ACCESS KEY CHECK ─────────────────────────────────────────────────
  const hash = hashKey(normalizedKey);

  try {
    const accessKey = await db.accessKey.findUnique({
      where: { keyHash: hash },
      include: { user: { select: { id: true, isActive: true, role: true } } },
    });

    // Detailed stage logging (no secrets)
    if (!accessKey) {
      console.warn(`[verify-key][${reqId}] NO_ACTIVE_KEY_FOUND — no DB record matched hash`);
    } else if (!accessKey.isActive) {
      console.warn(`[verify-key][${reqId}] KEY_REVOKED — keyId=${accessKey.id}`);
    } else if (!accessKey.user.isActive) {
      console.warn(`[verify-key][${reqId}] USER_DISABLED — keyId=${accessKey.id}`);
    } else if (accessKey.expiresAt && new Date() >= accessKey.expiresAt) {
      console.warn(`[verify-key][${reqId}] KEY_EXPIRED — keyId=${accessKey.id}`);
    } else if (accessKey.maxUses !== null && accessKey.useCount >= accessKey.maxUses) {
      console.warn(`[verify-key][${reqId}] MAX_USES_REACHED — keyId=${accessKey.id}`);
    }

    const isValid =
      accessKey &&
      accessKey.isActive &&
      accessKey.user.isActive &&
      (!accessKey.expiresAt || new Date() < accessKey.expiresAt) &&
      (accessKey.maxUses === null || accessKey.useCount < accessKey.maxUses);

    // Audit log — always
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
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
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
    console.log(`[verify-key][${reqId}] DB_KEY_SUCCESS — role=${accessKey!.role} keyId=${accessKey!.id}`);

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
    console.error(`[verify-key][${reqId}] DB_UNAVAILABLE — error:`, (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
