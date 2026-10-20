import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AuthenticatedUser } from "./auth";

export interface ManagedStickerItem {
  id: string;
  mimeType: string;
  animated: boolean;
  sha256: string;
  byteLength: number;
  width?: number;
  height?: number;
  url?: string;
}

export interface ManagedStickerPack {
  id: string;
  name: string;
  description?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  coverStickerId?: string;
  coverUrl?: string;
  stickers: ManagedStickerItem[];
  stickerCount: number;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  audience: "ALL" | "LEADERSHIP" | "EMPLOYEES";
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

const DATA_FILE = path.join(process.cwd(), "data", "managed-sticker-packs.json");

export function isLeadershipRole(role: string, orgRole?: string | null): boolean {
  const normalizedRole = (role || "").trim().toUpperCase();
  const normalizedOrgRole = (orgRole || "").trim().toUpperCase();
  const leadershipRoles = new Set([
    "FOUNDER",
    "CO_FOUNDER",
    "CTO",
    "HR",
    "CEO",
    "COO",
    "OWNER",
    "ADMIN",
  ]);
  return leadershipRoles.has(normalizedRole) || leadershipRoles.has(normalizedOrgRole);
}

export function getStickerRolePermissions(role: string, orgRole?: string | null) {
  const isLeader = isLeadershipRole(role, orgRole);
  return {
    CAN_USE_STICKERS: true,
    CAN_IMPORT_PERSONAL_STICKER_PACK: isLeader,
    CAN_CREATE_STICKER_PACK: isLeader,
    CAN_EDIT_STICKER_PACK: isLeader,
    CAN_PUBLISH_STICKER_PACK: isLeader,
    CAN_UNPUBLISH_STICKER_PACK: isLeader,
    CAN_DELETE_MANAGED_STICKER_PACK: isLeader,
    CAN_MANAGE_PACK_AUDIENCE: isLeader,
  };
}

function loadPacksFromDisk(): ManagedStickerPack[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[StickerPacks] Failed to load sticker packs:", err);
    return [];
  }
}

function savePacksToDisk(packs: ManagedStickerPack[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(packs, null, 2), "utf-8");
  } catch (err) {
    console.error("[StickerPacks] Failed to save sticker packs:", err);
  }
}

export function getManagedStickerPacks(user: AuthenticatedUser): {
  packs: ManagedStickerPack[];
  permissions: ReturnType<typeof getStickerRolePermissions>;
} {
  const permissions = getStickerRolePermissions(user.role, user.orgRole);
  const allPacks = loadPacksFromDisk();

  if (permissions.CAN_CREATE_STICKER_PACK) {
    return {
      packs: allPacks,
      permissions,
    };
  }

  // Regular members: only published packs with compatible audience
  const filtered = allPacks.filter((p) => {
    if (p.status !== "PUBLISHED") return false;
    if (p.audience === "ALL") return true;
    if (p.audience === "EMPLOYEES" && user.role !== "INTERN") return true;
    return false;
  });

  return {
    packs: filtered,
    permissions,
  };
}

export function createManagedStickerPack(
  user: AuthenticatedUser,
  payload: {
    name: string;
    description?: string;
    coverStickerId?: string;
    stickers: ManagedStickerItem[];
    status?: "DRAFT" | "PUBLISHED";
    audience?: "ALL" | "LEADERSHIP" | "EMPLOYEES";
  }
): { ok: boolean; pack?: ManagedStickerPack; error?: string } {
  const permissions = getStickerRolePermissions(user.role, user.orgRole);
  if (!permissions.CAN_CREATE_STICKER_PACK) {
    return { ok: false, error: "Forbidden: Only CodeXa leadership (Founder, Co-Founder, CTO, HR) can create sticker packs." };
  }

  const name = (payload.name || "").trim();
  if (!name) {
    return { ok: false, error: "Pack name is required." };
  }

  const stickers = Array.isArray(payload.stickers) ? payload.stickers : [];
  if (stickers.length === 0) {
    return { ok: false, error: "Pack must contain at least one valid sticker." };
  }

  // Sanitize sticker metadata - NEVER store image bytes / base64
  const sanitizedStickers: ManagedStickerItem[] = stickers.map((s, idx) => ({
    id: String(s.id || crypto.randomBytes(16).toString("hex")),
    mimeType: s.mimeType === "image/png" ? "image/png" : "image/webp",
    animated: Boolean(s.animated),
    sha256: String(s.sha256 || s.id || crypto.randomBytes(16).toString("hex")),
    byteLength: Number(s.byteLength || 0),
    width: s.width ? Number(s.width) : undefined,
    height: s.height ? Number(s.height) : undefined,
    url: s.url ? String(s.url) : undefined,
  }));

  const packId = "cxa_pack_" + crypto.randomBytes(10).toString("hex");
  const now = new Date().toISOString();
  const status = payload.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  const newPack: ManagedStickerPack = {
    id: packId,
    name,
    description: payload.description?.trim(),
    authorId: user.id,
    authorName: user.displayName || user.username || "Leadership",
    authorRole: user.orgRole || user.role,
    coverStickerId: payload.coverStickerId || sanitizedStickers[0]?.id,
    coverUrl: sanitizedStickers[0]?.url,
    stickers: sanitizedStickers,
    stickerCount: sanitizedStickers.length,
    status,
    audience: payload.audience || "ALL",
    version: 1,
    createdAt: now,
    updatedAt: now,
    publishedAt: status === "PUBLISHED" ? now : null,
  };

  const packs = loadPacksFromDisk();
  packs.unshift(newPack);
  savePacksToDisk(packs);

  return { ok: true, pack: newPack };
}

export function updateManagedStickerPack(
  user: AuthenticatedUser,
  packId: string,
  payload: Partial<{
    name: string;
    description: string;
    coverStickerId: string;
    status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
    audience: "ALL" | "LEADERSHIP" | "EMPLOYEES";
    stickers: ManagedStickerItem[];
  }>
): { ok: boolean; pack?: ManagedStickerPack; error?: string } {
  const permissions = getStickerRolePermissions(user.role, user.orgRole);
  if (!permissions.CAN_EDIT_STICKER_PACK) {
    return { ok: false, error: "Forbidden: Leadership role required to edit sticker packs." };
  }

  const packs = loadPacksFromDisk();
  const index = packs.findIndex((p) => p.id === packId);
  if (index === -1) {
    return { ok: false, error: "Sticker pack not found." };
  }

  const existing = packs[index];
  const now = new Date().toISOString();

  let status = existing.status;
  let publishedAt = existing.publishedAt;
  if (payload.status) {
    if (payload.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      if (!permissions.CAN_PUBLISH_STICKER_PACK) {
        return { ok: false, error: "Forbidden: Cannot publish sticker pack." };
      }
      status = "PUBLISHED";
      publishedAt = now;
    } else if (payload.status === "UNPUBLISHED") {
      if (!permissions.CAN_UNPUBLISH_STICKER_PACK) {
        return { ok: false, error: "Forbidden: Cannot unpublish sticker pack." };
      }
      status = "UNPUBLISHED";
    } else {
      status = payload.status;
    }
  }

  const updated: ManagedStickerPack = {
    ...existing,
    name: payload.name ? payload.name.trim() : existing.name,
    description: payload.description !== undefined ? payload.description.trim() : existing.description,
    coverStickerId: payload.coverStickerId || existing.coverStickerId,
    status,
    publishedAt,
    audience: payload.audience || existing.audience,
    version: existing.version + 1,
    updatedAt: now,
  };

  if (Array.isArray(payload.stickers) && payload.stickers.length > 0) {
    updated.stickers = payload.stickers;
    updated.stickerCount = payload.stickers.length;
  }

  packs[index] = updated;
  savePacksToDisk(packs);

  return { ok: true, pack: updated };
}

export function deleteManagedStickerPack(
  user: AuthenticatedUser,
  packId: string
): { ok: boolean; error?: string } {
  const permissions = getStickerRolePermissions(user.role, user.orgRole);
  if (!permissions.CAN_DELETE_MANAGED_STICKER_PACK) {
    return { ok: false, error: "Forbidden: Only leadership can delete sticker packs." };
  }

  const packs = loadPacksFromDisk();
  const index = packs.findIndex((p) => p.id === packId);
  if (index === -1) {
    return { ok: false, error: "Sticker pack not found." };
  }

  packs.splice(index, 1);
  savePacksToDisk(packs);

  return { ok: true };
}
