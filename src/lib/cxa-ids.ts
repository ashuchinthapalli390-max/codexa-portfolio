import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * Generates an official CodeXa Employee or Intern ID
 * Format: CXA-EMP-2026-001 or CXA-INT-2026-001
 */
export async function generateCodeXaId(role: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const isIntern = role.toUpperCase() === "INTERN";
  const prefix = isIntern ? `CXA-INT-${currentYear}-` : `CXA-EMP-${currentYear}-`;

  try {
    const existingCount = await db.employmentProfile.count({
      where: {
        employeeId: {
          startsWith: prefix,
        },
      },
    });

    const nextNum = (existingCount + 1).toString().padStart(3, "0");
    let candidate = `${prefix}${nextNum}`;

    // Ensure uniqueness
    const exists = await db.employmentProfile.findUnique({
      where: { employeeId: candidate },
    });

    if (exists) {
      const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      candidate = `${prefix}${nextNum}-${randomSuffix}`;
    }

    return candidate;
  } catch {
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${rand}`;
  }
}

/**
 * Generates an official Offer Letter number
 * Format: CXA/OFFER/2026/001
 */
export async function generateOfferNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CXA/OFFER/${currentYear}/`;

  try {
    const count = await db.offerLetter.count({
      where: {
        offerNumber: {
          startsWith: prefix,
        },
      },
    });

    const nextNum = (count + 1).toString().padStart(3, "0");
    let candidate = `${prefix}${nextNum}`;

    const exists = await db.offerLetter.findUnique({
      where: { offerNumber: candidate },
    });

    if (exists) {
      const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      candidate = `${prefix}${nextNum}-${randomSuffix}`;
    }

    return candidate;
  } catch {
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${rand}`;
  }
}

/**
 * Generates an official Payslip number
 * Format: CXA-PAY-2026-10-001
 */
export async function generatePayslipNumber(month: number, year: number): Promise<string> {
  const monthStr = month.toString().padStart(2, "0");
  const prefix = `CXA-PAY-${year}-${monthStr}-`;

  try {
    const count = await db.payslip.count({
      where: {
        slipNumber: {
          startsWith: prefix,
        },
      },
    });

    const nextNum = (count + 1).toString().padStart(3, "0");
    return `${prefix}${nextNum}`;
  } catch {
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${rand}`;
  }
}

/**
 * Generates an official CodeXa Payment Reference ID
 * Format: CXA-PAY-2026-0001
 */
export async function generatePaymentReferenceId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CXA-PAY-${currentYear}-`;

  try {
    const count = await db.paymentRequest.count({
      where: {
        referenceId: {
          startsWith: prefix,
        },
      },
    });

    const nextNum = (count + 1).toString().padStart(4, "0");
    let candidate = `${prefix}${nextNum}`;

    const exists = await db.paymentRequest.findUnique({
      where: { referenceId: candidate },
    });

    if (exists) {
      const randSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      candidate = `${prefix}${nextNum}-${randSuffix}`;
    }

    return candidate;
  } catch {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${rand}`;
  }
}

/**
 * Generates a verification code for offer letters and certificates
 * Format: CXA-V-7F82A1
 */
export function generateVerificationCode(): string {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CXA-V-${code}`;
}

/**
 * Generates a desktop activation key
 * Raw key: CXA-DESK-XXXX-XXXX-XXXX
 * Never stored raw in DB; only SHA-256 hash is saved
 */
export function generateDesktopActivationKey(): { rawKey: string; keyHash: string; keyDisplayPrefix: string } {
  const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const part3 = crypto.randomBytes(2).toString("hex").toUpperCase();

  const rawKey = `CXA-DESK-${part1}-${part2}-${part3}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyDisplayPrefix = `CXA-DESK-${part1}...`;

  return { rawKey, keyHash, keyDisplayPrefix };
}

/**
 * Generates short-lived Project Publish Authorization token (5-10 min expiry)
 * Format: CXA-PUBLISH-7F82A1
 */
export function generatePublishToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  const rawToken = `CXA-PUBLISH-${rand}`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return { rawToken, tokenHash, expiresAt };
}
