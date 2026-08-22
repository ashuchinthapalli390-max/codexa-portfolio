/**
 * GET  /api/owner/access-keys  — List all access keys
 * POST /api/owner/access-keys  — Create a new access key
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

// ─── GET: List all access keys ────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  const denied = requireOwner(user);
  if (denied) return denied;

  const profiles = await dataStore.getProfiles();
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  const keys = (g.__cxa_access_keys || []).map(k => {
    const p = profileMap.get(k.userId) || {
      id: k.userId,
      username: "user",
      email: "user@codexa.agency",
      displayName: "Team User",
      role: k.role,
    };
    return {
      id: k.id,
      label: k.label,
      role: k.role,
      isActive: k.isActive,
      maxUses: k.maxUses,
      useCount: k.useCount,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      user: {
        id: p.id,
        username: p.username,
        email: p.email,
        fullName: p.displayName,
        role: p.role,
      },
    };
  });

  return NextResponse.json({ success: true, keys });
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

  const rawKey = generateRawKey();
  const newKey: StoredKey = {
    id: `key-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    userId,
    label: label.trim(),
    role,
    isActive: true,
    maxUses: maxUses ?? null,
    useCount: 0,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    keyHash: crypto.createHash("sha256").update(rawKey).digest("hex"),
  };

  g.__cxa_access_keys = [newKey, ...(g.__cxa_access_keys || [])];

  const profiles = await dataStore.getProfiles();
  const p = profiles.find(pr => pr.id === userId) || {
    id: userId,
    username: "user",
    email: "user@codexa.agency",
    displayName: "Team User",
    role,
  };

  const safeKey = {
    id: newKey.id,
    label: newKey.label,
    role: newKey.role,
    isActive: newKey.isActive,
    maxUses: newKey.maxUses,
    useCount: newKey.useCount,
    expiresAt: newKey.expiresAt,
    lastUsedAt: newKey.lastUsedAt,
    createdAt: newKey.createdAt,
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
    rawKey,
  });
}

export const dynamic = "force-dynamic";
