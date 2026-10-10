import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
export const APK_BUCKET_NAME = process.env.SUPABASE_APK_BUCKET || "mobile-releases";

/** Maximum APK file size: 1 GB (1024 MB) */
export const MAX_APK_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB
export const MAX_APK_FILE_SIZE_LABEL = "1 GB";

/**
 * Returns an authenticated Supabase admin client with service-role permissions.
 */
export function getStorageClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase Storage credentials not configured.");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Ensures the dedicated APK release bucket exists with public access.
 */
export async function ensureApkReleaseBucket(): Promise<boolean> {
  try {
    const supabase = getStorageClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError && buckets) {
      const exists = buckets.some((b) => b.name === APK_BUCKET_NAME);
      if (exists) return true;
    }

    const { error: createError } = await supabase.storage.createBucket(APK_BUCKET_NAME, {
      public: true,
      allowedMimeTypes: [
        "application/vnd.android.package-archive",
        "application/octet-stream",
        "application/zip",
      ],
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      console.warn("[ensureApkReleaseBucket]", createError);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("[ensureApkReleaseBucket exception]", err?.message);
    return false;
  }
}

/**
 * Creates an authorized upload session with a signed URL for direct-to-cloud APK uploads.
 * This completely avoids serverless payload limit restrictions (e.g. 4.5MB on Vercel).
 */
export async function createApkUploadSession({
  channel = "stable",
  versionName,
  versionCode,
  fileName,
}: {
  channel: string;
  versionName: string;
  versionCode: number;
  fileName: string;
}) {
  await ensureApkReleaseBucket();
  const supabase = getStorageClient();

  const cleanChannel = channel.toLowerCase().includes("beta") ? "beta" : "stable";
  const cleanVersion = versionName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const safeFilename = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || `codexa-${cleanVersion}.apk`;
  const storageKey = `codexa-apk/${cleanChannel}/${cleanVersion}/${timestamp}_${safeFilename}`;

  // Generate signed upload URL (valid for 30 minutes)
  const { data, error } = await supabase.storage
    .from(APK_BUCKET_NAME)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    throw new Error(`Failed to generate cloud upload session: ${error?.message || "Unknown error"}`);
  }

  // Construct direct public CDN download URL
  const { data: urlData } = supabase.storage.from(APK_BUCKET_NAME).getPublicUrl(storageKey);

  return {
    provider: "SUPABASE",
    bucket: APK_BUCKET_NAME,
    storageKey,
    signedUploadUrl: data.signedUrl,
    token: data.token,
    publicDownloadUrl: urlData.publicUrl,
    expiresInSeconds: 1800,
  };
}

/**
 * Direct server-side upload helper (used when binary is passed directly or in testing).
 */
export async function uploadApkBufferDirect({
  buffer,
  channel,
  versionName,
  fileName,
}: {
  buffer: Buffer;
  channel: string;
  versionName: string;
  fileName: string;
}) {
  await ensureApkReleaseBucket();
  const supabase = getStorageClient();

  const cleanChannel = channel.toLowerCase().includes("beta") ? "beta" : "stable";
  const cleanVersion = versionName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storageKey = `codexa-apk/${cleanChannel}/${cleanVersion}/${timestamp}_${fileName}`;

  const { error } = await supabase.storage.from(APK_BUCKET_NAME).upload(storageKey, buffer, {
    contentType: "application/vnd.android.package-archive",
    upsert: true,
  });

  if (error) {
    throw new Error(`Cloud storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(APK_BUCKET_NAME).getPublicUrl(storageKey);

  return {
    provider: "SUPABASE",
    bucket: APK_BUCKET_NAME,
    storageKey,
    publicDownloadUrl: urlData.publicUrl,
  };
}

/**
 * Downloads APK buffer from storage for server-side verification and inspection.
 */
export async function fetchApkBufferFromStorage(
  bucket: string,
  storageKey: string
): Promise<Buffer> {
  const supabase = getStorageClient();
  const { data, error } = await supabase.storage.from(bucket).download(storageKey);

  if (error || !data) {
    throw new Error(`Failed to retrieve uploaded APK from cloud storage: ${error?.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Deletes an APK binary from cloud storage.
 */
export async function deleteApkFromStorage(bucket: string, storageKey: string): Promise<boolean> {
  if (!storageKey || !bucket) return false;
  try {
    const supabase = getStorageClient();
    const { data, error } = await supabase.storage.from(bucket).remove([storageKey]);
    if (error) {
      console.warn(`[deleteApkFromStorage] Warning removing ${storageKey}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[deleteApkFromStorage exception] ${storageKey}:`, err?.message);
    return false;
  }
}

/**
 * Deletes multiple APK binaries from cloud storage in one request.
 */
export async function deleteMultipleApksFromStorage(
  bucket: string,
  storageKeys: string[]
): Promise<number> {
  const validKeys = storageKeys.filter((k) => Boolean(k && k.trim()));
  if (validKeys.length === 0) return 0;

  try {
    const supabase = getStorageClient();
    const { data, error } = await supabase.storage.from(bucket).remove(validKeys);
    if (error) {
      console.warn("[deleteMultipleApksFromStorage warning]", error.message);
      return 0;
    }
    return data?.length || validKeys.length;
  } catch (err: any) {
    console.warn("[deleteMultipleApksFromStorage exception]", err?.message);
    return 0;
  }
}

/**
 * Scans storage partition for a channel and removes any previous or orphaned APK files,
 * preserving only the specified active storage key (or keys).
 */
export async function cleanChannelPreviousApks({
  channel = "stable",
  preserveStorageKeys = [],
}: {
  channel?: string;
  preserveStorageKeys?: string[];
}): Promise<string[]> {
  try {
    const supabase = getStorageClient();
    const cleanChannel = channel.toLowerCase().includes("beta") ? "beta" : "stable";
    const channelPrefix = `codexa-apk/${cleanChannel}`;

    const { data: subfolders, error: listError } = await supabase.storage
      .from(APK_BUCKET_NAME)
      .list(channelPrefix, { limit: 100 });

    if (listError || !subfolders) return [];

    const keysToDelete: string[] = [];

    for (const item of subfolders) {
      if (!item.id) {
        // It's a directory (e.g. version folder)
        const subPath = `${channelPrefix}/${item.name}`;
        const { data: files } = await supabase.storage
          .from(APK_BUCKET_NAME)
          .list(subPath, { limit: 100 });

        if (files) {
          for (const file of files) {
            const fullKey = `${subPath}/${file.name}`;
            if (!preserveStorageKeys.includes(fullKey)) {
              keysToDelete.push(fullKey);
            }
          }
        }
      } else {
        // It's a file at root of channel folder
        const fullKey = `${channelPrefix}/${item.name}`;
        if (!preserveStorageKeys.includes(fullKey)) {
          keysToDelete.push(fullKey);
        }
      }
    }

    if (keysToDelete.length > 0) {
      await deleteMultipleApksFromStorage(APK_BUCKET_NAME, keysToDelete);
    }

    return keysToDelete;
  } catch (err: any) {
    console.warn("[cleanChannelPreviousApks exception]", err?.message);
    return [];
  }
}

