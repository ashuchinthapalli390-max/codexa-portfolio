/**
 * src/lib/upload.ts
 * Server-only helpers for profile media management.
 *
 * SECURITY:
 * - BLOB_READ_WRITE_TOKEN is read server-side only; never NEXT_PUBLIC_.
 * - Never logs token, DATABASE_URL, keys, passwords, file contents.
 * - Logs only safe diagnostic reason codes.
 */
import { del } from "@vercel/blob";
import crypto from "crypto";

// ─── Allowed types ─────────────────────────────────────────────────────────────
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_SIZE_IMAGE = 10 * 1024 * 1024; // 10 MB
export const MAX_SIZE_GIF   = 15 * 1024 * 1024; // 15 MB

// ─── HMAC-based stateless nonce (single-use via DB audit check) ────────────────
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Issue a signed upload nonce scoped to a specific actor + target profile.
 * Format: actingUserId:targetProfileId:expiresAt:signature
 */
export function issueUploadNonce(actingUserId: string, targetProfileId: string): string {
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const payload = `${actingUserId}:${targetProfileId}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", process.env.AUTH_SECRET || process.env.SESSION_SECRET || "default_secret")
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

/**
 * Validate a signed upload nonce.
 */
export function verifyUploadNonce(
  nonce: string,
  actingUserId: string,
  targetProfileId: string
): boolean {
  try {
    const parts = nonce.split(":");
    if (parts.length !== 4) return false;
    const [userId, profileId, expiresAtStr, signature] = parts;
    
    if (userId !== actingUserId || profileId !== targetProfileId) return false;
    if (Date.now() > Number(expiresAtStr)) return false;
    
    const expectedPayload = `${userId}:${profileId}:${expiresAtStr}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.AUTH_SECRET || process.env.SESSION_SECRET || "default_secret")
      .update(expectedPayload)
      .digest("hex");
      
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Generate a reference ID for upload error tracking (e.g. PM-4F3A12).
 * Safe to surface to users — contains no secrets.
 */
export function generateUploadRef(): string {
  return "PM-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

// ─── Blob deletion ─────────────────────────────────────────────────────────────

/**
 * Safely delete a blob by URL. Non-fatal — logs on failure only.
 * Skips local/legacy /uploads/ paths silently.
 * Only acts on real Vercel Blob CDN URLs.
 */
export async function deleteProfileMedia(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (
    !url.includes("blob.vercel-storage.com") &&
    !url.includes("public.blob.vercel-storage.com")
  ) {
    // Legacy local /uploads/ path or unrecognised URL — skip silently
    return;
  }
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    console.warn("[upload] MEDIA_DELETE_FAILED —", (err as Error).message);
  }
}

/**
 * Validate a Vercel Blob URL belongs to the expected profile path prefix.
 * Prevents cross-profile URL injection attacks.
 */
export function isValidBlobUrl(url: string, targetProfileId: string): boolean {
  try {
    const parsed = new URL(url);
    const isBlobHost =
      parsed.hostname.endsWith("blob.vercel-storage.com") ||
      parsed.hostname.endsWith("public.blob.vercel-storage.com");
    
    // Check if path starts with or contains /profiles/{targetProfileId}/
    const hasCorrectPath = parsed.pathname.includes(`/profiles/${targetProfileId}/`);
    return isBlobHost && hasCorrectPath;
  } catch {
    return false;
  }
}
