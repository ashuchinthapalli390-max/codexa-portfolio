/**
 * PATCH  /api/owner/access-keys/[id]  — Update key (label, isActive, expiry, regenerate)
 * DELETE /api/owner/access-keys/[id]  — Revoke (permanently deactivate) a key
 *
 * OWNER role only.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";

interface StoredKey {
  id: string;
  userId: string;
  label: string;
  role: string;
  isActive: boolean;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  keyHash: string;
}

const g = globalThis as unknown as { __cxa_access_keys?: StoredKey[] };
if (!g.__cxa_access_keys) {
  g.__cxa_access_keys = [];
}

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

  const existingIndex = (g.__cxa_access_keys || []).findIndex(k => k.id === id);
  if (existingIndex === -1) {
    return NextResponse.json({ error: "Key not found." }, { status: 404 });
  }

  const existing = g.__cxa_access_keys![existingIndex];
  let rawKey: string | undefined;

  if (body.label !== undefined) existing.label = body.label.trim();
  if (body.isActive !== undefined) existing.isActive = body.isActive;
  if (body.maxUses !== undefined) existing.maxUses = body.maxUses;
  if (body.expiresAt !== undefined) {
    existing.expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;
  }

  if (body.regenerate) {
    rawKey = generateRawKey();
    existing.keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    existing.useCount = 0;
    existing.lastUsedAt = null;
  }

  const profiles = await dataStore.getProfiles();
  const p = profiles.find(pr => pr.id === existing.userId) || {
    id: existing.userId,
    username: "user",
    email: "user@codexa.agency",
    displayName: "Team User",
    role: existing.role,
  };

  const safeKey = {
    id: existing.id,
    label: existing.label,
    role: existing.role,
    isActive: existing.isActive,
    maxUses: existing.maxUses,
    useCount: existing.useCount,
    expiresAt: existing.expiresAt,
    lastUsedAt: existing.lastUsedAt,
    createdAt: existing.createdAt,
    user: {
      id: p.id,
      username: p.username,
      email: p.email,
      fullName: p.displayName,
      role: p.role,
    },
  };

  return NextResponse.json({
    success: true,
    key: safeKey,
    ...(rawKey ? { rawKey } : {}),
  });
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
  const existing = (g.__cxa_access_keys || []).find(k => k.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Key not found." }, { status: 404 });
  }

  existing.isActive = false;

  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
