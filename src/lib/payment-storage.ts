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

  // Try Supabase Storage if configured and available
  if (isSupabaseConfigured()) {
    try {
      const bucket = process.env.SUPABASE_PAYMENTS_BUCKET || "payment-proofs";
      const remotePath = `proofs/${safeFilename}`;
      const uploadRes = await supabaseUploadFile(bucket, remotePath, buffer, normalizedMime);
      if (!uploadRes.error && uploadRes.data?.publicUrl) {
        return {
          success: true,
          filePath: uploadRes.data.publicUrl,
          fileHash,
          mimeType: normalizedMime,
          fileSize: buffer.length,
        };
      }
    } catch {
      // Fallback to local / tmp disk
    }
  }

  // Fallback to local / tmp disk
  try {
    const targetDir = getTargetStorageDir();
    const fullPath = path.join(targetDir, safeFilename);
    fs.writeFileSync(fullPath, buffer);

    return {
      success: true,
      filePath: safeFilename, // Stored filename
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
 */
export async function getPaymentProofBuffer(storedFilePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    // If stored as a remote URL (e.g. Supabase Storage)
    if (storedFilePath.startsWith("http://") || storedFilePath.startsWith("https://")) {
      const res = await fetch(storedFilePath);
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return { buffer: Buffer.from(arrayBuf), mimeType: contentType };
    }

    // Prevent path traversal
    const safeBase = path.basename(storedFilePath);

    // Check primary local storage
    const primaryPath = path.join(LOCAL_PROOFS_DIR, safeBase);
    if (fs.existsSync(primaryPath)) {
      const buffer = fs.readFileSync(primaryPath);
      const ext = path.extname(safeBase).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { buffer, mimeType };
    }

    // Check tmp storage (serverless)
    const tmpPath = path.join(TMP_PROOFS_DIR, safeBase);
    if (fs.existsSync(tmpPath)) {
      const buffer = fs.readFileSync(tmpPath);
      const ext = path.extname(safeBase).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { buffer, mimeType };
    }

    return null;
  } catch {
    return null;
  }
}

