import path from "path";
import fs from "fs";
import { supabaseUploadFile, isSupabaseConfigured } from "./supabase";

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface StorageUploadResult {
  success: boolean;
  publicUrl: string;
  storagePath: string;
  storageBucket: string;
  mimeType: string;
  fileSize: number;
  error?: string;
}

/**
 * Upload an avatar with robust multi-tier fallback:
 * 1. Supabase Storage (avatars bucket) - primary cloud storage
 * 2. Vercel Blob (if BLOB_READ_WRITE_TOKEN is configured)
 * 3. Local disk (local dev only - NEVER on serverless /var/task)
 * 4. Inline Base64 Data URI (resilient zero-filesystem serverless fallback)
 */
export async function uploadAvatarFile(
  userId: string,
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<StorageUploadResult> {
  // Validate MIME type
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      success: false,
      publicUrl: "",
      storagePath: "",
      storageBucket: "avatars",
      mimeType,
      fileSize: fileBuffer.length,
      error: "Unsupported image format. Please upload JPG, PNG, WebP, or GIF.",
    };
  }

  // Validate file size
  if (fileBuffer.length > MAX_AVATAR_SIZE_BYTES) {
    return {
      success: false,
      publicUrl: "",
      storagePath: "",
      storageBucket: "avatars",
      mimeType,
      fileSize: fileBuffer.length,
      error: "Image is too large. Maximum profile image size is 5 MB.",
    };
  }

  // Generate safe filename
  const ext = path.extname(originalFilename).toLowerCase() || (mimeType === "image/gif" ? ".gif" : mimeType === "image/png" ? ".png" : ".webp");
  const cleanExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".webp";
  const filename = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
  const storagePath = `${userId}/${filename}`;
  const bucket = "avatars";

  // 1. Try Supabase Storage if configured
  if (isSupabaseConfigured()) {
    try {
      const uploadRes = await supabaseUploadFile(bucket, storagePath, fileBuffer, mimeType);
      if (!uploadRes.error && uploadRes.data?.publicUrl) {
        return {
          success: true,
          publicUrl: uploadRes.data.publicUrl,
          storagePath,
          storageBucket: bucket,
          mimeType,
          fileSize: fileBuffer.length,
        };
      }
      console.warn(`[STORAGE] Supabase upload failed for ${storagePath}:`, uploadRes.error);
    } catch (supaErr: any) {
      console.warn(`[STORAGE] Supabase exception for ${storagePath}:`, supaErr.message);
    }
  }

  // 2. Try Vercel Blob if configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(storagePath, fileBuffer, {
        access: "public",
        contentType: mimeType,
      });
      if (blob?.url) {
        return {
          success: true,
          publicUrl: blob.url,
          storagePath,
          storageBucket: "vercel-blob",
          mimeType,
          fileSize: fileBuffer.length,
        };
      }
    } catch (blobErr: any) {
      console.warn(`[STORAGE] Vercel Blob upload failed for ${storagePath}:`, blobErr.message);
    }
  }

  // 3. Detect serverless runtime (read-only filesystem like /var/task on Vercel or AWS Lambda)
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  // 4. Try local disk only in local dev (NEVER on serverless)
  if (!isServerless) {
    try {
      const localDir = path.join(process.cwd(), "public", "uploads", "avatars", userId);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const localFilePath = path.join(localDir, filename);
      fs.writeFileSync(localFilePath, fileBuffer);

      const publicUrl = `/uploads/avatars/${userId}/${filename}`;
      return {
        success: true,
        publicUrl,
        storagePath,
        storageBucket: "local",
        mimeType,
        fileSize: fileBuffer.length,
      };
    } catch (diskErr: any) {
      console.warn(`[STORAGE] Local disk write skipped/failed (${diskErr.code || diskErr.message}), falling back to Data URI`);
    }
  }

  // 5. Fail-proof serverless fallback: Inline Base64 Data URI
  // Requires zero filesystem writes, runs perfectly on Vercel serverless, and renders natively everywhere.
  try {
    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    return {
      success: true,
      publicUrl: dataUrl,
      storagePath: `inline/${filename}`,
      storageBucket: "inline",
      mimeType,
      fileSize: fileBuffer.length,
    };
  } catch (dataUriErr: any) {
    return {
      success: false,
      publicUrl: "",
      storagePath: "",
      storageBucket: bucket,
      mimeType,
      fileSize: fileBuffer.length,
      error: dataUriErr.message || "Failed to process image file.",
    };
  }
}

