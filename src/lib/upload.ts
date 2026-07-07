/**
 * src/lib/upload.ts
 * Server-only Vercel Blob upload/delete helper for profile media.
 *
 * SECURITY:
 * - Uses BLOB_READ_WRITE_TOKEN (server-only, never NEXT_PUBLIC_).
 * - Never logs blob token, DATABASE_URL, raw keys, or file contents.
 * - Logs only safe diagnostic reason codes.
 *
 * Organised blob paths: profiles/{userId}/{timestamp}.{ext}
 */
import { put, del } from "@vercel/blob";

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_SIZE_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_SIZE_GIF = 15 * 1024 * 1024;   // 15 MB

export type UploadDiagnosticCode =
  | "BLOB_TOKEN_MISSING"
  | "INVALID_MEDIA_TYPE"
  | "FILE_TOO_LARGE"
  | "BLOB_UPLOAD_FAILED"
  | "MEDIA_DELETE_FAILED";

export class UploadError extends Error {
  code: UploadDiagnosticCode;
  constructor(code: UploadDiagnosticCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Validates and uploads a File to Vercel Blob.
 * Returns the public Blob URL and MIME type.
 * Throws UploadError on any validation or upload failure.
 */
export async function uploadProfileMedia(
  file: File,
  userId: string
): Promise<{ url: string; mimeType: string }> {
  // Guard: token must exist server-side
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[upload] DIAGNOSTIC: BLOB_TOKEN_MISSING");
    throw new UploadError("BLOB_TOKEN_MISSING", "Blob storage is not configured.");
  }

  // Validate MIME type
  const mimeType = file.type as AllowedMimeType;
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    console.warn(`[upload] DIAGNOSTIC: INVALID_MEDIA_TYPE — received: ${file.type}`);
    throw new UploadError(
      "INVALID_MEDIA_TYPE",
      "Invalid file type. Only PNG, JPG, WEBP, and GIF are allowed."
    );
  }

  // Validate file size
  const isGif = mimeType === "image/gif";
  const maxSize = isGif ? MAX_SIZE_GIF : MAX_SIZE_IMAGE;
  if (file.size > maxSize) {
    console.warn(`[upload] DIAGNOSTIC: FILE_TOO_LARGE — size=${file.size} max=${maxSize}`);
    throw new UploadError(
      "FILE_TOO_LARGE",
      `File too large. Maximum is ${isGif ? "15 MB for GIFs" : "10 MB"}.`
    );
  }

  // Build organised blob path
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const blobPath = `profiles/${userId}/profile-${Date.now()}.${ext}`;

  try {
    const blob = await put(blobPath, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // GIFs are stored as-is — do NOT use addRandomSuffix: false since
      // we already include a timestamp making the path unique.
      addRandomSuffix: false,
    });
    return { url: blob.url, mimeType };
  } catch (err) {
    console.error("[upload] DIAGNOSTIC: BLOB_UPLOAD_FAILED —", (err as Error).message);
    throw new UploadError("BLOB_UPLOAD_FAILED", "Profile media could not be saved. Please try again.");
  }
}

/**
 * Deletes a blob by its URL.
 * Safe to call with null/local paths — skips silently.
 * Only deletes URLs that start with the Vercel Blob CDN hostname.
 */
export async function deleteProfileMedia(url: string | null): Promise<void> {
  if (!url) return;
  // Only attempt deletion of actual Vercel Blob URLs
  if (!url.includes("blob.vercel-storage.com") && !url.includes("public.blob.vercel-storage.com")) {
    // Legacy local /uploads/ path — cannot delete on Vercel, skip silently
    return;
  }
  try {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    // Non-fatal — log but do not surface to user
    console.warn("[upload] DIAGNOSTIC: MEDIA_DELETE_FAILED —", (err as Error).message);
  }
}
