/**
 * scripts/recover-owner-access.ts
 *
 * Secure one-time server-side script to recover Owner Access.
 * - Connects to the database configured via process.env.DATABASE_URL.
 * - Finds the OWNER user by process.env.OWNER_EMAIL.
 * - If no OWNER user exists, creates one using process.env.OWNER_EMAIL and process.env.OWNER_PASSWORD_HASH.
 * - Generates a new strong OWNER Access Key.
 * - Normalizes and hashes the key using bcrypt (12 rounds).
 * - Saves the hash to the AccessKey table.
 * - Outputs the raw key exactly once in the terminal.
 *
 * Usage:
 *   npx tsx scripts/recover-owner-access.ts
 */
import { config } from "dotenv";
config(); // Load .env file

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function generateRawKey(): string {
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CXA-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

function normalizeAccessKey(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         OWNER RECOVERY ACCESS KEY GENERATOR              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("  ❌ Error: DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  const ownerPasswordHash = process.env.OWNER_PASSWORD_HASH?.trim();

  if (!ownerEmail || !ownerPasswordHash) {
    console.error("  ❌ Error: OWNER_EMAIL or OWNER_PASSWORD_HASH is missing in the environment.");
    process.exit(1);
  }

  console.log(`  Target Database: ${databaseUrl.split("@")[1] || "MySQL"}`);
  console.log(`  Owner Email    : ${ownerEmail}\n`);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("  ✓ Connected to MySQL database successfully.");

    // 1. Find or create OWNER user
    let owner = await prisma.user.findFirst({
      where: { role: "OWNER" },
    });

    if (!owner) {
      // Create owner user
      owner = await prisma.user.create({
        data: {
          email: ownerEmail,
          passwordHash: ownerPasswordHash,
          role: "OWNER",
          isActive: true,
          fullName: "Owner",
        },
      });
      console.log(`  ✓ Created new OWNER user account (ID: ${owner.id}).`);
    } else {
      console.log(`  ✓ Found existing OWNER user account (ID: ${owner.id}, Email: ${owner.email}).`);
    }

    // 2. Generate a new strong Access Key
    const rawKey = generateRawKey();
    const normalizedKey = normalizeAccessKey(rawKey);
    if (!normalizedKey) {
      throw new Error("Failed to normalize generated key.");
    }

    // Hash the key using bcrypt (12 rounds)
    const keyHash = await bcrypt.hash(normalizedKey, 12);

    // Save key hash to target database
    const createdKey = await prisma.accessKey.create({
      data: {
        userId: owner.id,
        label: "Owner Recovery Key (Admin Command)",
        keyHash,
        role: "OWNER",
        isActive: true,
        maxUses: null,
        expiresAt: null,
      },
    });

    console.log(`  ✓ Registered AccessKey ID: ${createdKey.id} in MySQL.`);

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  ⚠  SAVE THIS RECOVERY ACCESS KEY — SHOWN ONLY ONCE  ⚠   ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Access Key: ${rawKey.padEnd(43)} ║`);
    console.log("╚══════════════════════════════════════════════════════════╝\n");

  } catch (error: any) {
    console.error("  ❌ Script failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
