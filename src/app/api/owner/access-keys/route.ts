/**
 * GET  /api/owner/access-keys  — List all access keys
 * POST /api/owner/access-keys  — Create a new access key
 *
 * OWNER role only. Raw keys are never stored — only SHA-256 hashes.
 * Raw key is returned ONCE on creation; never retrievable again.
 * Normalization (trim + uppercase) applied before hashing — same function used at verification.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

function requireOwner(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

function generateRawKey(): string {
  // Format: CXA-XXXX-XXXX-XXXX-XXXX (hex segments, uppercase)
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CXA-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

/**
 * Canonical normalization — must match verify-key/route.ts exactly.
 */
function normalizeAccessKey(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function hashKey(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// ─── GET: List all access keys ────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  const denied = requireOwner(user);
  if (denied) return denied;

  try {
    const keys = await db.accessKey.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    // Never return keyHash
    const safeKeys = keys.map(({ keyHash: _hash, ...k }) => k);

    return NextResponse.json({ success: true, keys: safeKeys });
  } catch (err) {
    console.error("[GET /api/owner/access-keys]", (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─── POST: Create new access key ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const denied = requireOwner(user);
  if (denied) return denied;

  let body: {
    userId: string;
    label: string;
    role: string;
    maxUses?: number | null;
    expiresAt?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, label, role, maxUses, expiresAt } = body;

  if (!userId || !label?.trim() || !role) {
    return NextResponse.json(
      { error: "userId, label, and role are required." },
      { status: 400 }
    );
  }

  const validRoles = ["OWNER", "ADMIN", "TEAM_MEMBER"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const rawKey = generateRawKey();
    const normalizedKey = normalizeAccessKey(rawKey)!; // generated keys are always valid
    const keyHash = hashKey(normalizedKey);

    const created = await db.accessKey.create({
      data: {
        userId,
        label: label.trim(),
        keyHash,
        role,
        isActive: true,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Audit log
    await db.accessKeyAuditLog.create({
      data: {
        accessKeyId: created.id,
        userId: user!.id,
        action: "KEY_CREATED",
        success: true,
      },
    });

    // Return raw key ONCE — never stored, never retrievable again
    const { keyHash: _hash, ...safeKey } = created;

    return NextResponse.json({
      success: true,
      key: safeKey,
      rawKey, // ← shown ONCE only
    });
  } catch (err) {
    console.error("[POST /api/owner/access-keys]", (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
