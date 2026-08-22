/**
 * CodeXa RFC 6238 TOTP Two-Factor Authentication & Single-Use Backup Codes
 * Securely generates secrets, QR codes, verifies 6-digit TOTP tokens, and manages single-use backup codes.
 */

import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || process.env.DATABASE_URL || "codexa-production-totp-master-encryption-key-32b";
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a TOTP secret before saving to PostgreSQL.
 */
export function encryptTotpSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a stored TOTP secret from PostgreSQL.
 */
export function decryptTotpSecret(encryptedData: string): string {
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
    if (!ivHex || !authTagHex || !encrypted) {
      return encryptedData;
    }
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return encryptedData;
  }
}

/**
 * Generate a new random base32 TOTP secret and otpauth URI.
 */
export function generateTotpSecret(username: string, issuer: string = "CodeXa Agency") {
  const secret = generateSecret({ length: 20 });
  const otpauthUrl = generateURI({
    strategy: "totp",
    issuer,
    label: username,
    secret,
  });
  return { secret, otpauthUrl };
}

/**
 * Generate a high-contrast Cyber Dark QR Code Data URL.
 */
export async function generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Verify a 6-digit TOTP code against a decrypted secret.
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const cleanToken = token.replace(/\s+/g, "");
    const result = verifySync({
      token: cleanToken,
      secret,
      epochTolerance: 30,
    });
    return !!result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate 10 single-use Backup Codes formatted as CXA-XXXX-XXXX.
 */
export function generateBackupCodes(count: number = 10): { plaintextCodes: string[]; hashedCodes: string[] } {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable unambiguous chars
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    let part1 = "";
    let part2 = "";
    const randBytes = crypto.randomBytes(8);
    for (let j = 0; j < 4; j++) {
      part1 += charset[randBytes[j] % charset.length];
      part2 += charset[randBytes[j + 4] % charset.length];
    }
    const code = `CXA-${part1}-${part2}`;
    const hash = crypto.createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
    plaintextCodes.push(code);
    hashedCodes.push(hash);
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Hash a user-supplied backup code for constant-time comparison against DB records.
 */
export function hashBackupCode(code: string): string {
  const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9-]/g, "");
  return crypto.createHash("sha256").update(cleanCode).digest("hex");
}
