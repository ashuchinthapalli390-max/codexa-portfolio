/**
 * POST /api/auth/bootstrap
 * Secure one-time Owner bootstrap for production.
 *
 * Used when the production database has no Owner user or no active Owner access key.
 * Requires the BOOTSTRAP_SECRET env variable to match the request body secret.
 * Shows the generated raw access key EXACTLY ONCE — never stored, never logged.
 *
 * Lock behavior:
 * - If an active OWNER user with at least one active AccessKey already exists → blocked.
 * - If OWNER user exists but no active AccessKey → creates a new key for them.
 * - If no OWNER user exists → creates user + access key from env variables.
 *
 * Required env variables (set in Vercel Production):
 *   BOOTSTRAP_SECRET        — one-time secret to authorize this call
 *   OWNER_EMAIL             — email for the Owner account
 *   OWNER_PASSWORD_HASH     — bcrypt hash of Owner's password (never store plaintext)
 *
 * SECURITY RULES:
 * - Never log: secrets, passwords, hashes, raw keys, or database URLs
 * - Response includes raw key ONCE only; caller must copy it immediately
 * - After first successful bootstrap with an active key, endpoint is permanently locked
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function normalizeAccessKey(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function hashKey(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function generateRawKey(): string {
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CXA-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

export async function POST(req: NextRequest) {
  // ── Secret guard ──────────────────────────────────────────────────────────
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    console.error("[bootstrap] BOOTSTRAP_SECRET not configured in environment");
    return NextResponse.json(
      { error: "Bootstrap is not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Constant-time comparison to prevent timing attacks
  const submittedSecret = body.secret ?? "";
  const secretBuffer = Buffer.from(bootstrapSecret);
  const submittedBuffer = Buffer.from(submittedSecret.padEnd(bootstrapSecret.length, "\0").slice(0, bootstrapSecret.length));
  const match = secretBuffer.length === submittedBuffer.length
    && crypto.timingSafeEqual(secretBuffer, submittedBuffer);

  if (!match) {
    console.warn("[bootstrap] Invalid bootstrap secret submitted");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── Env variable checks ───────────────────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  const ownerPasswordHash = process.env.OWNER_PASSWORD_HASH?.trim();

  if (!ownerEmail || !ownerPasswordHash) {
    console.error("[bootstrap] Missing OWNER_EMAIL or OWNER_PASSWORD_HASH in environment");
    return NextResponse.json(
      { error: "Owner credentials not configured. Set OWNER_EMAIL and OWNER_PASSWORD_HASH in Vercel." },
      { status: 503 }
    );
  }

  try {
    // ── Check for existing Owner + active key (lock condition) ────────────
    const existingOwner = await db.user.findFirst({
      where: { role: "OWNER", isActive: true },
      include: {
        accessKeys: {
          where: {
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      },
    });

    if (existingOwner && existingOwner.accessKeys.length > 0) {
      console.log("[bootstrap] Already bootstrapped — owner and active key exist");
      return NextResponse.json(
        { error: "Bootstrap already completed. Owner and active access key exist." },
        { status: 409 }
      );
    }

    // ── Upsert Owner user ─────────────────────────────────────────────────
    let owner = existingOwner;
    if (!owner) {
      // Check if email already taken by non-owner
      const emailConflict = await db.user.findFirst({ where: { email: ownerEmail } });
      if (emailConflict) {
        console.error(`[bootstrap] Email conflict — ${ownerEmail} already exists as role=${emailConflict.role}`);
        return NextResponse.json(
          { error: "Owner email is already in use by another account." },
          { status: 409 }
        );
      }

      owner = await db.user.create({
        data: {
          email: ownerEmail,
          passwordHash: ownerPasswordHash,
          role: "OWNER",
          isActive: true,
          fullName: "Owner",
        },
        include: { accessKeys: true },
      });
      console.log("[bootstrap] Created OWNER user — id=" + owner.id);
    } else {
      console.log("[bootstrap] OWNER user already exists — id=" + owner.id + " — creating new key only");
    }

    // ── Create a new Owner access key ─────────────────────────────────────
    const rawKey = generateRawKey();
    const normalizedKey = normalizeAccessKey(rawKey)!;
    const keyHash = hashKey(normalizedKey);

    const accessKey = await db.accessKey.create({
      data: {
        userId: owner.id,
        label: "Owner Bootstrap Key",
        keyHash,
        role: "OWNER",
        isActive: true,
        maxUses: null,
        expiresAt: null,
      },
    });

    console.log("[bootstrap] SUCCESS — new OWNER AccessKey created id=" + accessKey.id);

    // Return raw key ONCE — caller must save it immediately
    return NextResponse.json({
      success: true,
      message: "Bootstrap complete. Save your access key — it will NOT be shown again.",
      ownerEmail,
      rawKey, // shown exactly once
    });
  } catch (err) {
    console.error("[bootstrap] DB error:", (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
