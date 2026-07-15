import crypto from "crypto";

export function normalizeAccessKey(key: string): string | null {
  const normalized = key.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function hashAccessKey(key: string): string {
  const normalized = normalizeAccessKey(key);
  if (!normalized) {
    throw new Error("Access key is empty");
  }

  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is missing");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(normalized)
    .digest("hex");
}
