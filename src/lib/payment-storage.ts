import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { isSupabaseConfigured, supabaseUploadFile } from "./supabase";

export const ALLOWED_PROOF_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const LOCAL_PROOFS_DIR = path.join(process.cwd(), "storage", "payment-proofs");
const TMP_PROOFS_DIR = path.join(os.tmpdir(), "codexa-payment-proofs");

/**
 * Resolves a writable directory for local proof storage.
 * Defaults to ./storage/payment-proofs, but falls back to os.tmpdir() in serverless (e.g. Vercel).
 */
function getTargetStorageDir(): string {
  try {
    if (!fs.existsSync(LOCAL_PROOFS_DIR)) {
      fs.mkdirSync(LOCAL_PROOFS_DIR, { recursive: true });
    }
    return LOCAL_PROOFS_DIR;
  } catch {
    if (!fs.existsSync(TMP_PROOFS_DIR)) {
      fs.mkdirSync(TMP_PROOFS_DIR, { recursive: true });
    }
    return TMP_PROOFS_DIR;
  }
}

export interface SaveProofResult {
  success: boolean;
  filePath: string;
  fileHash: string; // SHA-256
  mimeType: string;
  fileSize: number;
  error?: string;
}

/**
 * Securely saves an uploaded payment proof to private storage.
 * Does NOT store file in public/ directory.
 * Computes SHA-256 for duplicate detection.
 */
export async function savePaymentProof(
  paymentId: string,
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<SaveProofResult> {
  const normalizedMime = mimeType.toLowerCase().trim();

  // Validate MIME type
  if (!ALLOWED_PROOF_MIME_TYPES.has(normalizedMime)) {
    return {
      success: false,
      filePath: "",
      fileHash: "",
      mimeType: normalizedMime,
      fileSize: buffer.length,
      error: "Unsupported file format. Please upload JPG, PNG, or WebP payment screenshots.",
    };
  }

  // Validate File Size
  if (buffer.length > MAX_PROOF_SIZE_BYTES) {
    return {
      success: false,
      filePath: "",
      fileHash: "",
      mimeType: normalizedMime,
      fileSize: buffer.length,
      error: "Screenshot is too large. Maximum allowed size is 10 MB.",
    };
  }

  // Calculate SHA-256 hash
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const ext = normalizedMime === "image/png" ? ".png" : normalizedMime === "image/webp" ? ".webp" : ".jpg";
  const safeFilename = `${paymentId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;

  // Try Supabase Storage first if configured
  if (isSupabaseConfigured()) {
    try {
      const bucket = process.env.SUPABASE_PAYMENTS_BUCKET || "payment-proofs";
      const remotePath = `proofs/${safeFilename}`;
      const uploadRes = await supabaseUploadFile(bucket, remotePath, buffer, normalizedMime);
      if (!uploadRes.error) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
        const storageRefUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${remotePath}`;

        // Also write to local cache if possible
        try {
          const targetDir = getTargetStorageDir();
          fs.writeFileSync(path.join(targetDir, safeFilename), buffer);
        } catch {}

        return {
          success: true,
          filePath: storageRefUrl,
          fileHash,
          mimeType: normalizedMime,
          fileSize: buffer.length,
        };
      }
    } catch (sbErr) {
      console.warn("[savePaymentProof] Supabase storage upload warning:", sbErr);
    }
  }

  // Fallback to local / tmp disk
  try {
    const targetDir = getTargetStorageDir();
    const fullPath = path.join(targetDir, safeFilename);
    fs.writeFileSync(fullPath, buffer);

    return {
      success: true,
      filePath: safeFilename,
      fileHash,
      mimeType: normalizedMime,
      fileSize: buffer.length,
    };
  } catch (err: any) {
    return {
      success: false,
      filePath: "",
      fileHash: "",
      mimeType: normalizedMime,
      fileSize: buffer.length,
      error: err?.message || "Failed to save payment proof image.",
    };
  }
}

/**
 * Retrieves the raw buffer of a stored payment proof for authenticated streaming.
 * Securely handles private Supabase bucket access, legacy URLs, and local fallbacks.
 */
export async function getPaymentProofBuffer(
  storedFilePath: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!storedFilePath || typeof storedFilePath !== "string") return null;

  try {
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY;
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

    // 1. If stored as a remote URL (Supabase or HTTPS)
    if (storedFilePath.startsWith("http://") || storedFilePath.startsWith("https://")) {
      const isSupabaseUrl =
        storedFilePath.includes(".supabase.co") ||
        (supabaseUrl && storedFilePath.includes(supabaseUrl.replace(/^https?:\/\//, "")));

      if (isSupabaseUrl && supabaseKey) {
        // Strip "/public/" from Supabase object path because payment-proofs is a private bucket!
        const authenticatedUrl = storedFilePath.replace(
          "/storage/v1/object/public/",
          "/storage/v1/object/"
        );

        const res = await fetch(authenticatedUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          cache: "no-store",
        });

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          return { buffer: Buffer.from(arrayBuf), mimeType: contentType };
        }
      }

      // Standard HTTP fetch fallback
      try {
        const res = await fetch(storedFilePath, { cache: "no-store" });
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const contentType = res.headers.get("content-type") || "image/jpeg";
          return { buffer: Buffer.from(arrayBuf), mimeType: contentType };
        }
      } catch {}
    }

    // 2. If stored as a filename or key, check Supabase Storage directly with service key
    const safeBase = path.basename(storedFilePath);
    if (supabaseUrl && supabaseKey) {
      const bucket = process.env.SUPABASE_PAYMENTS_BUCKET || "payment-proofs";
      const candidatePaths = [
        `proofs/${safeBase}`,
        safeBase,
        storedFilePath.startsWith("proofs/") ? storedFilePath : null,
      ].filter(Boolean) as string[];

      for (const rPath of candidatePaths) {
        const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${rPath}`;
        try {
          const res = await fetch(downloadUrl, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
            cache: "no-store",
          });
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const contentType = res.headers.get("content-type") || "image/jpeg";
            return { buffer: Buffer.from(arrayBuf), mimeType: contentType };
          }
        } catch {}
      }
    }

    // 3. Check primary local storage
    const primaryPath = path.join(LOCAL_PROOFS_DIR, safeBase);
    if (fs.existsSync(primaryPath)) {
      const buffer = fs.readFileSync(primaryPath);
      const ext = path.extname(safeBase).toLowerCase();
      const mimeType =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { buffer, mimeType };
    }

    // 4. Check tmp storage (serverless)
    const tmpPath = path.join(TMP_PROOFS_DIR, safeBase);
    if (fs.existsSync(tmpPath)) {
      const buffer = fs.readFileSync(tmpPath);
      const ext = path.extname(safeBase).toLowerCase();
      const mimeType =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { buffer, mimeType };
    }

    return null;
  } catch (err) {
    console.error("[getPaymentProofBuffer Error]", err);
    return null;
  }
}
