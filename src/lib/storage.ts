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
 * Upload an avatar to Supabase Storage (avatars bucket) or local public uploads fallback.
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

  // Try Supabase Storage if configured
  if (isSupabaseConfigured()) {
    const uploadRes = await supabaseUploadFile(bucket, storagePath, fileBuffer, mimeType);
    if (!uploadRes.error && uploadRes.data) {
      return {
        success: true,
        publicUrl: uploadRes.data.publicUrl,
        storagePath,
        storageBucket: bucket,
        mimeType,
        fileSize: fileBuffer.length,
      };
    }
  }

  // Fallback to local disk (public/uploads/avatars/userId/filename)
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
      storageBucket: bucket,
      mimeType,
      fileSize: fileBuffer.length,
    };
  } catch (err: any) {
    return {
      success: false,
      publicUrl: "",
      storagePath: "",
      storageBucket: bucket,
      mimeType,
      fileSize: fileBuffer.length,
      error: err.message || "Failed to save image file.",
    };
  }
}
