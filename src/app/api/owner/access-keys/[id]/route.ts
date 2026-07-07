/**
 * PATCH  /api/owner/access-keys/[id]  — Update key (label, isActive, expiry, regenerate)
 * DELETE /api/owner/access-keys/[id]  — Revoke (permanently deactivate) a key
 *
 * OWNER role only.
 * Normalization (trim + uppercase) applied before hashing on regeneration.
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

// ─── PATCH: Update key ────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const denied = requireOwner(user);
  if (denied) return denied;

  const { id } = params;

  let body: {
    label?: string;
    isActive?: boolean;
    maxUses?: number | null;
    expiresAt?: string | null;
    regenerate?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const existing = await db.accessKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Key not found." }, { status: 404 });
    }

    let rawKey: string | undefined;

    const updateData: Record<string, unknown> = {};
    if (body.label !== undefined) updateData.label = body.label.trim();
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.maxUses !== undefined) updateData.maxUses = body.maxUses;
    if (body.expiresAt !== undefined) {
      updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    // Key regeneration — generates a new raw key, normalizes, hashes, resets useCount
    if (body.regenerate) {
      rawKey = generateRawKey();
      const normalizedKey = normalizeAccessKey(rawKey)!;
      updateData.keyHash = hashKey(normalizedKey);
      updateData.useCount = 0;
      updateData.lastUsedAt = null;
    }

    const updated = await db.accessKey.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await db.accessKeyAuditLog.create({
      data: {
        accessKeyId: id,
        userId: user!.id,
        action: body.regenerate ? "KEY_REGENERATED" : "KEY_UPDATED",
        success: true,
      },
    });

    const { keyHash: _hash, ...safeKey } = updated;

    return NextResponse.json({
      success: true,
      key: safeKey,
      ...(rawKey ? { rawKey } : {}), // Only present on regeneration
    });
  } catch (err) {
    console.error("[PATCH /api/owner/access-keys/[id]]", (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─── DELETE: Revoke key ───────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const denied = requireOwner(user);
  if (denied) return denied;

  const { id } = params;

  try {
    const existing = await db.accessKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Key not found." }, { status: 404 });
    }

    // Revoke = set isActive=false (keep for audit history)
    await db.accessKey.update({
      where: { id },
      data: { isActive: false },
    });

    await db.accessKeyAuditLog.create({
      data: {
        accessKeyId: id,
        userId: user!.id,
        action: "KEY_REVOKED",
        success: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/owner/access-keys/[id]]", (err as Error).message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
