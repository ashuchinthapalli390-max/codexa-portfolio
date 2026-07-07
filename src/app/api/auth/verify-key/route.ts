/**
 * POST /api/auth/verify-key
 * Step 1 of two-step login.
 *
 * Accepts a raw access key, normalizes it (trim + uppercase), and verifies
 * it against bcrypt-hashed records in MySQL.
 * Also accepts OWNER_MASTER_KEY from env — permanent, never expires, never stored.
 * On success: creates a short-lived PreAuthSession (10 min) and sets an HTTP-only cookie.
 *
 * Diagnostic logging uses request IDs only — never logs secrets, hashes, or keys.
 * Rate limit: 5 failed attempts per IP per 15 minutes.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { normalizeAccessKey } from "@/lib/normalize";

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

  if (!process.env.DATABASE_URL) {
    console.error(`[verify-key][${reqId}] DIAGNOSTIC: DATABASE_URL_MISSING`);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }

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
        console.error(`[verify-key][${reqId}] DIAGNOSTIC: NO_MATCHING_ACTIVE_KEY (OWNER user disabled/missing)`);
        return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + PREAUTH_TTL_MS);

      await db.preAuthSession.create({
        data: { tokenHash, userId: ownerUser.id, role: "OWNER", expiresAt },
      });

      resetRateLimitOnSuccess(ip);
      console.log(`[verify-key][${reqId}] DIAGNOSTIC: ACCESS_GRANTED (MASTER_KEY)`);

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
      console.error(`[verify-key][${reqId}] DIAGNOSTIC: DB_CONNECTION_FAILED — error:`, (err as Error).message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
  }

  // ─── DB BCRYPT ACCESS KEY CHECK ──────────────────────────────────────────
  try {
    // 1. Fetch active keys from MySQL
    const activeKeys = await db.accessKey.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            role: true,
          },
        },
      },
    });

    if (activeKeys.length === 0) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: ACCESS_KEY_TABLE_EMPTY`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    // 2. Loop through candidate keys and compare using bcrypt
    let matchedKey = null;
    let matchFound = false;

    for (const key of activeKeys) {
      try {
        const isMatch = await bcrypt.compare(normalizedKey, key.keyHash);
        if (isMatch) {
          matchedKey = key;
          matchFound = true;
          break;
        }
      } catch (err) {
        console.error(`[verify-key][${reqId}] DIAGNOSTIC: HASH_COMPARE_FAILED`);
      }
    }

    if (!matchFound || !matchedKey) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: NO_MATCHING_ACTIVE_KEY`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    // 3. Check constraints
    if (!matchedKey.isActive) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: KEY_DISABLED`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    if (!matchedKey.user.isActive) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: LINKED_USER_DISABLED`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    if (matchedKey.expiresAt && new Date() >= matchedKey.expiresAt) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: KEY_EXPIRED`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    if (matchedKey.maxUses !== null && matchedKey.useCount >= matchedKey.maxUses) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: KEY_MAX_USES_REACHED`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    if (matchedKey.role !== matchedKey.user.role) {
      console.warn(`[verify-key][${reqId}] DIAGNOSTIC: NO_MATCHING_ACTIVE_KEY (role mismatch)`);
      return NextResponse.json({ error: "Access denied. Check your access key and try again." }, { status: 401 });
    }

    // 4. Audit log log entry
    await db.accessKeyAuditLog.create({
      data: {
        accessKeyId: matchedKey.id,
        userId: matchedKey.userId,
        action: "VERIFY_SUCCESS",
        success: true,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    // 5. Increment use count
    await db.accessKey.update({
      where: { id: matchedKey.id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    // 6. Create PreAuthSession
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + PREAUTH_TTL_MS);

    try {
      await db.preAuthSession.create({
        data: {
          tokenHash,
          userId: matchedKey.userId,
          role: matchedKey.role,
          expiresAt,
        },
      });
    } catch (err) {
      console.error(`[verify-key][${reqId}] DIAGNOSTIC: PREAUTH_SESSION_FAILED — error:`, (err as Error).message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    resetRateLimitOnSuccess(ip);
    console.log(`[verify-key][${reqId}] DIAGNOSTIC: ACCESS_GRANTED — role=${matchedKey.role}`);

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
    console.error(`[verify-key][${reqId}] DIAGNOSTIC: DB_CONNECTION_FAILED — error:`, (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
