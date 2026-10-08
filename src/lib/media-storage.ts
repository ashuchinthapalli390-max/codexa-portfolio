import path from "path";
import crypto from "crypto";
import { supabaseUploadFile, supabaseEnsureBucket, isSupabaseConfigured } from "./supabase";

export type MediaCategory =
  | "AVATAR"
  | "STORY"
  | "CHAT_IMAGE"
  | "CHAT_VIDEO"
  | "GROUP_ICON"
  | "DOCUMENT";

export interface MediaUploadParams {
  userId: string;
  category: MediaCategory;
  fileBuffer: Buffer;
  originalFilename?: string;
  mimeType?: string;
  contextId?: string; // conversationId, storyId, docId, etc.
}

export interface MediaUploadResult {
  success: boolean;
  publicUrl: string;
  storagePath: string;
  bucket: string;
  mimeType: string;
  fileSize: number;
  error?: string;
}

const CATEGORY_BUCKET_MAP: Record<MediaCategory, string> = {
  AVATAR: process.env.SUPABASE_AVATARS_BUCKET || "avatars",
  STORY: process.env.SUPABASE_POST_IMAGES_BUCKET || "post-images",
  CHAT_IMAGE: process.env.SUPABASE_CHAT_IMAGES_BUCKET || "chat-images",
  CHAT_VIDEO: process.env.SUPABASE_CHAT_IMAGES_BUCKET || "chat-images",
  GROUP_ICON: process.env.SUPABASE_AVATARS_BUCKET || "avatars",
  DOCUMENT: "documents",
};

const ALLOWED_MIME_TYPES: Record<MediaCategory, Set<string>> = {
  AVATAR: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  STORY: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"]),
  CHAT_IMAGE: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  CHAT_VIDEO: new Set(["video/mp4", "video/quicktime", "video/webm"]),
  GROUP_ICON: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  DOCUMENT: new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
};

const MAX_SIZE_BYTES: Record<MediaCategory, number> = {
  AVATAR: 10 * 1024 * 1024,      // 10 MB
  STORY: 50 * 1024 * 1024,       // 50 MB (supports videos)
  CHAT_IMAGE: 15 * 1024 * 1024,  // 15 MB
  CHAT_VIDEO: 50 * 1024 * 1024,  // 50 MB
  GROUP_ICON: 10 * 1024 * 1024,  // 10 MB
  DOCUMENT: 25 * 1024 * 1024,    // 25 MB
};

/**
 * Universal media upload function for CodeXa Agency backend & mobile app.
 * Uploads reliably to Supabase cloud storage buckets without touching serverless ephemeral disks.
 */
export async function uploadMediaFile(params: MediaUploadParams): Promise<MediaUploadResult> {
  const { userId, category, fileBuffer, originalFilename = "upload.jpg", contextId } = params;

  let mimeType = params.mimeType?.toLowerCase() || "image/jpeg";
  if (mimeType.includes(";")) {
    mimeType = mimeType.split(";")[0].trim();
  }

  // 1. Validate MIME type
  const allowed = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.AVATAR;
  if (!allowed.has(mimeType)) {
    // If mimeType didn't match, check by extension
    const extFromFilename = path.extname(originalFilename).toLowerCase();
    if (extFromFilename === ".png") mimeType = "image/png";
    else if (extFromFilename === ".webp") mimeType = "image/webp";
    else if (extFromFilename === ".gif") mimeType = "image/gif";
    else if (extFromFilename === ".mp4") mimeType = "video/mp4";
    else if (extFromFilename === ".pdf") mimeType = "application/pdf";
    else mimeType = "image/jpeg";

    if (!allowed.has(mimeType)) {
      return {
        success: false,
        publicUrl: "",
        storagePath: "",
        bucket: "",
        mimeType,
        fileSize: fileBuffer.length,
        error: `Unsupported format for ${category}. Allowed: ${Array.from(allowed).join(", ")}`,
      };
    }
  }

  // 2. Validate Size
  const maxSize = MAX_SIZE_BYTES[category] || 10 * 1024 * 1024;
  if (fileBuffer.length > maxSize) {
    return {
      success: false,
      publicUrl: "",
      storagePath: "",
      bucket: "",
      mimeType,
      fileSize: fileBuffer.length,
      error: `File size (${Math.round(fileBuffer.length / 1024 / 1024)}MB) exceeds maximum limit (${Math.round(maxSize / 1024 / 1024)}MB).`,
    };
  }

  const bucket = CATEGORY_BUCKET_MAP[category] || "avatars";

  // 3. Generate sanitized remote path
  const fileExt = path.extname(originalFilename).toLowerCase() || (mimeType.includes("png") ? ".png" : mimeType.includes("mp4") ? ".mp4" : ".jpg");
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const timestamp = Date.now();
  const safeBase = `${category.toLowerCase()}_${timestamp}_${randomSuffix}${fileExt}`;

  let storagePath: string;
  if (category === "GROUP_ICON" || category === "CHAT_IMAGE" || category === "CHAT_VIDEO") {
    storagePath = contextId ? `conversations/${contextId}/${safeBase}` : `chat/${userId}/${safeBase}`;
  } else if (category === "STORY") {
    storagePath = `stories/${userId}/${safeBase}`;
  } else if (category === "DOCUMENT") {
    storagePath = `documents/${userId}/${safeBase}`;
  } else {
    // AVATAR
    storagePath = `users/${userId}/${safeBase}`;
  }

  // 4. Upload to Supabase Storage
  if (isSupabaseConfigured()) {
    try {
      await supabaseEnsureBucket(bucket, true);
      const uploadRes = await supabaseUploadFile(bucket, storagePath, fileBuffer, mimeType);

      if (!uploadRes.error && uploadRes.data?.publicUrl) {
        return {
          success: true,
          publicUrl: uploadRes.data.publicUrl,
          storagePath,
          bucket,
          mimeType,
          fileSize: fileBuffer.length,
        };
      }
      console.warn(`[uploadMediaFile] Supabase storage upload warning for ${storagePath}:`, uploadRes.error);
    } catch (supaErr: any) {
      console.warn(`[uploadMediaFile] Supabase upload exception:`, supaErr.message);
    }
  }

  // 5. Fallback: Vercel Blob if configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`${bucket}/${storagePath}`, fileBuffer, {
        access: "public",
        contentType: mimeType,
      });
      if (blob?.url) {
        return {
          success: true,
          publicUrl: blob.url,
          storagePath,
          bucket,
          mimeType,
          fileSize: fileBuffer.length,
        };
      }
    } catch (blobErr: any) {
      console.warn("[uploadMediaFile] Vercel Blob error:", blobErr.message);
    }
  }

  // 6. Resilient Serverless Inline Data URI Fallback (guarantees zero crashes on read-only serverless filesystems)
  if (fileBuffer.length <= 4 * 1024 * 1024) {
    const dataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    return {
      success: true,
      publicUrl: dataUri,
      storagePath,
      bucket,
      mimeType,
      fileSize: fileBuffer.length,
    };
  }

  return {
    success: false,
    publicUrl: "",
    storagePath: "",
    bucket,
    mimeType,
    fileSize: fileBuffer.length,
    error: "Media cloud storage is temporarily unavailable. Please retry shortly.",
  };
}

/**
 * Compatibility wrapper for existing routes calling saveMediaUpload
 */
export async function saveMediaUpload(
  categoryName: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string
): Promise<{ success: boolean; publicUrl: string; error?: string }> {
  const cat: MediaCategory = categoryName.toUpperCase().includes("STORY")
    ? "STORY"
    : categoryName.toUpperCase().includes("AVATAR")
    ? "AVATAR"
    : categoryName.toUpperCase().includes("CHAT")
    ? "CHAT_IMAGE"
    : categoryName.toUpperCase().includes("GROUP")
    ? "GROUP_ICON"
    : "DOCUMENT";

  const res = await uploadMediaFile({
    userId,
    category: cat,
    fileBuffer: buffer,
    originalFilename: filename,
    mimeType,
  });

  return {
    success: res.success,
    publicUrl: res.publicUrl,
    error: res.error,
  };
}

