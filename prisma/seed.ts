/**
 * CodeXa Agency — Seed Script (Prisma 5)
 * Run with: npx tsx prisma/seed.ts
 *
 * What this does:
 * 1. Clears old data
 * 2. Creates Owner user account
 * 3. Seeds leadership profiles (Founder, Co-Founder, CEO)
 * 4. Creates an initial Owner Access Key and shows it ONCE in the terminal
 */
// Load .env.local FIRST
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const BCRYPT_ROUNDS = 12;

function generateRawKey(): string {
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CXA-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw.trim()).digest("hex");
}

async function main() {
  const db = new PrismaClient();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         CODEXA CORE TEAM SYSTEM — SECURE SETUP           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Clear old data (order matters for FK constraints)
  await db.accessKeyAuditLog.deleteMany({});
  await db.accessKey.deleteMany({});
  await db.preAuthSession.deleteMany({});
  await db.profileAuditLog.deleteMany({});
  await db.session.deleteMany({});
  await db.teamProfile.deleteMany({});
  await db.user.deleteMany({});
  process.stdout.write("  ✓ Cleared old data\n");

  const ownerUsername = (process.env.ADMIN_USERNAME ?? "ashu.codexa-9999").toLowerCase().trim();
  const ownerEmail = process.env.ADMIN_EMAIL ?? "ashu@codexa.agency";
  const ownerPassword = process.env.ADMIN_PASSWORD ?? "CodeXaOwner2024!";
  const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);

  // 1. Create Owner user
  const owner = await db.user.create({
    data: {
      username: ownerUsername,
      email: ownerEmail.toLowerCase().trim(),
      fullName: "Ashu",
      passwordHash,
      role: "OWNER",
      isActive: true,
    },
  });
  process.stdout.write(`  ✓ Created OWNER user: ${owner.username} / ${owner.email}\n`);

  // 2. Generate initial Owner Access Key
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);

  await db.accessKey.create({
    data: {
      userId: owner.id,
      label: "Owner Primary Key (auto-seeded)",
      keyHash,
      role: "OWNER",
      isActive: true,
      maxUses: null,
      expiresAt: null,
    },
  });
  process.stdout.write("  ✓ Created Owner Access Key (shown below — save it!)\n");

  // 3. Seed leadership profiles
  await db.teamProfile.create({
    data: {
      userId: owner.id,
      memberType: "LEADERSHIP",
      leadershipPosition: "FOUNDER",
      displayName: "Ashu",
      publicBio: "I don't just write code. I engineer digital futures.",
      mediaUrl: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
      mediaMimeType: "image/jpeg",
      isPublic: true,
      displayOrder: 1,
    },
  });
  process.stdout.write("  ✓ Created Founder profile (linked to Owner user)\n");

  await db.teamProfile.create({
    data: {
      userId: null,
      memberType: "LEADERSHIP",
      leadershipPosition: "CO_FOUNDER",
      displayName: "Deepak",
      publicBio: "Helping every developer grow together.",
      mediaUrl: "/assets/images/2299fdd2a1d01339a71af61a2c7e9cac.jpg",
      mediaMimeType: "image/jpeg",
      isPublic: true,
      displayOrder: 2,
    },
  });
  process.stdout.write("  ✓ Created Co-Founder profile\n");

  await db.teamProfile.create({
    data: {
      userId: null,
      memberType: "LEADERSHIP",
      leadershipPosition: "CEO",
      displayName: "Venu",
      publicBio: "Vision creates companies. Execution builds them.",
      mediaUrl: "/assets/images/2306fc1d8f6ea04d1ddd4ebfafd003f2.jpg",
      mediaMimeType: "image/jpeg",
      isPublic: true,
      displayOrder: 3,
    },
  });
  process.stdout.write("  ✓ Created CEO profile\n");

  await db.$disconnect();

  const keyLine = rawKey.padEnd(46);
  const userLine = ownerUsername.padEnd(46);
  const passLine = ownerPassword.padEnd(46);
  const emailLine = ownerEmail.padEnd(46);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         ✅  SETUP COMPLETED SUCCESSFULLY  ✅             ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Username : ${userLine}║`);
  console.log(`║  Email    : ${emailLine}║`);
  console.log(`║  Password : ${passLine}║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  ⚠  SAVE YOUR ACCESS KEY — NEVER SHOWN AGAIN  ⚠         ║");
  console.log(`║  Access Key: ${keyLine}║`);
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n  Login at: http://localhost:3000/login");
  console.log("  Step 1: Enter the Access Key above");
  console.log("  Step 2: Enter username/email + password\n");
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
