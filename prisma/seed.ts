/**
 * CodeXa Agency — Seed Script (Prisma 5 + MySQL/Aiven)
 * Run with: npx tsx prisma/seed.ts
 *
 * Idempotent seeder that uses deterministic HMAC-SHA256 access keys.
 * Validates all required env variables before touching the database.
 * Updates passwords for existing users if env credentials changed.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { hashAccessKey } from "../src/lib/accessKeyHash";

const BCRYPT_ROUNDS = 12;

async function main() {
  config({ path: ".env.local", override: true });
  config({ override: true });
  const db = new PrismaClient();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       CODEXA CORE TEAM SYSTEM — SECURE HMAC SEED         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ─── 1. VALIDATE REQUIRED ENV VARIABLES ─────────────────────────────────────
  const missing: string[] = [];

  if (!process.env.AUTH_SECRET)       missing.push("AUTH_SECRET");
  if (!process.env.DATABASE_URL)      missing.push("DATABASE_URL");
  if (!process.env.OWNER_EMAIL)       missing.push("OWNER_EMAIL");
  if (!process.env.OWNER_PASSWORD)    missing.push("OWNER_PASSWORD");
  if (!process.env.OWNER_ACCESS_KEY)  missing.push("OWNER_ACCESS_KEY");
  if (!process.env.ADMIN_EMAIL)       missing.push("ADMIN_EMAIL");
  if (!process.env.ADMIN_PASSWORD)    missing.push("ADMIN_PASSWORD");
  if (!process.env.ADMIN_ACCESS_KEY)  missing.push("ADMIN_ACCESS_KEY");
  if (!process.env.TEAM_USERNAME)     missing.push("TEAM_USERNAME");
  if (!process.env.TEAM_PASSWORD)     missing.push("TEAM_PASSWORD");
  if (!process.env.TEAM_ACCESS_KEY)   missing.push("TEAM_ACCESS_KEY");

  if (missing.length > 0) {
    console.error("  ❌ SEED ABORTED — Missing required environment variables:");
    for (const key of missing) {
      console.error(`     - ${key}`);
    }
    console.error("\n  Add these to Vercel Environment Variables (Production) or .env.local (local dev).\n");
    process.exit(1);
  }

  // ─── 2. RESOLVE ENV VARIABLES ───────────────────────────────────────────────
  const ownerEmail       = process.env.OWNER_EMAIL!.toLowerCase().trim();
  const ownerPassword    = process.env.OWNER_PASSWORD!;
  const ownerName        = process.env.OWNER_NAME || "Ashu";
  const ownerRawKey      = process.env.OWNER_ACCESS_KEY!;

  const adminEmail       = process.env.ADMIN_EMAIL!.toLowerCase().trim();
  const adminPassword    = process.env.ADMIN_PASSWORD!;
  const adminName        = process.env.ADMIN_NAME || "Read Only Admin";
  const adminRawKey      = process.env.ADMIN_ACCESS_KEY!;

  const teamUsername     = process.env.TEAM_USERNAME!.toLowerCase().trim();
  const teamPassword     = process.env.TEAM_PASSWORD!;
  const teamDisplayName  = process.env.TEAM_DISPLAY_NAME || "Team Member";
  const teamRawKey       = process.env.TEAM_ACCESS_KEY!;

  // ─── 3. CONNECT ─────────────────────────────────────────────────────────────
  try {
    await db.$connect();
    console.log("  ✓ DATABASE connected: yes\n");
  } catch (err) {
    console.error("  ❌ DATABASE connected: no —", (err as Error).message);
    process.exit(1);
  }

  // ─── 4. SEED OWNER ACCOUNT ──────────────────────────────────────────────────
  let owner = await db.user.findFirst({ where: { role: "OWNER" } });
  if (!owner) {
    const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);
    owner = await db.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
        isActive: true,
        fullName: ownerName,
      },
    });
    console.log("  ✓ OWNER user created.");
  } else {
    // Always sync email, name, AND password from env
    const passwordHash = await bcrypt.hash(ownerPassword, BCRYPT_ROUNDS);
    owner = await db.user.update({
      where: { id: owner.id },
      data: { email: ownerEmail, fullName: ownerName, passwordHash },
    });
    console.log("  ✓ OWNER user updated (email, name, password synced from env).");
  }

  // Deactivate any old non-HMAC Owner keys
  await db.accessKey.updateMany({
    where: { userId: owner.id, role: "OWNER", label: { startsWith: "Owner Primary" } },
    data: { isActive: false }
  });

  // Upsert HMAC Owner Access Key
  const ownerHash = hashAccessKey(ownerRawKey);
  const ownerAccessKey = await db.accessKey.upsert({
    where: { keyHash: ownerHash },
    update: { role: "OWNER", isActive: true, expiresAt: null },
    create: {
      userId: owner.id,
      label: "Owner Primary Key (HMAC)",
      keyHash: ownerHash,
      role: "OWNER",
      isActive: true,
      expiresAt: null
    }
  });

  // Seed Founder profile
  const existingOwnerProfile = await db.teamProfile.findFirst({ where: { userId: owner.id } });
  if (!existingOwnerProfile) {
    await db.teamProfile.create({
      data: {
        userId: owner.id,
        memberType: "LEADERSHIP",
        leadershipPosition: "FOUNDER",
        displayName: ownerName,
        publicBio: "I don't just write code. I engineer digital futures.",
        mediaUrl: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
        mediaMimeType: "image/jpeg",
        isPublic: true,
        displayOrder: 1,
      },
    });
  }

  // ─── 5. SEED ADMIN ACCOUNT ──────────────────────────────────────────────────
  let admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    admin = await db.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        fullName: adminName,
      },
    });
    console.log("  ✓ ADMIN user created.");
  } else {
    // Always sync email, name, AND password from env
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    admin = await db.user.update({
      where: { id: admin.id },
      data: { email: adminEmail, fullName: adminName, passwordHash },
    });
    console.log("  ✓ ADMIN user updated (email, name, password synced from env).");
  }

  // Deactivate old non-HMAC Admin keys
  await db.accessKey.updateMany({
    where: { userId: admin.id, role: "ADMIN", label: { startsWith: "Admin Test" } },
    data: { isActive: false }
  });

  // Upsert HMAC Admin Access Key
  const adminHash = hashAccessKey(adminRawKey);
  const adminAccessKey = await db.accessKey.upsert({
    where: { keyHash: adminHash },
    update: { role: "ADMIN", isActive: true, expiresAt: null },
    create: {
      userId: admin.id,
      label: "Admin Primary Key (HMAC)",
      keyHash: adminHash,
      role: "ADMIN",
      isActive: true,
      expiresAt: null
    }
  });

  // ─── 6. SEED TEAM_MEMBER ACCOUNT ────────────────────────────────────────────
  let teamUser = await db.user.findFirst({ where: { role: "TEAM_MEMBER" } });
  if (!teamUser) {
    const passwordHash = await bcrypt.hash(teamPassword, BCRYPT_ROUNDS);
    teamUser = await db.user.create({
      data: {
        username: teamUsername,
        passwordHash,
        role: "TEAM_MEMBER",
        isActive: true,
        fullName: teamDisplayName,
      },
    });
    console.log("  ✓ TEAM_MEMBER user created.");
  } else {
    // Always sync username, name, AND password from env
    const passwordHash = await bcrypt.hash(teamPassword, BCRYPT_ROUNDS);
    teamUser = await db.user.update({
      where: { id: teamUser.id },
      data: { username: teamUsername, fullName: teamDisplayName, passwordHash },
    });
    console.log("  ✓ TEAM_MEMBER user updated (username, name, password synced from env).");
  }

  // Deactivate old non-HMAC Team keys
  await db.accessKey.updateMany({
    where: { userId: teamUser.id, role: "TEAM_MEMBER", label: { startsWith: "Team Member Test" } },
    data: { isActive: false }
  });

  // Upsert HMAC Team Member Access Key
  const teamHash = hashAccessKey(teamRawKey);
  const teamAccessKey = await db.accessKey.upsert({
    where: { keyHash: teamHash },
    update: { role: "TEAM_MEMBER", isActive: true, expiresAt: null },
    create: {
      userId: teamUser.id,
      label: "Team Member Primary Key (HMAC)",
      keyHash: teamHash,
      role: "TEAM_MEMBER",
      isActive: true,
      expiresAt: null
    }
  });

  // Seed Team Profile row
  const existingTeamProfile = await db.teamProfile.findFirst({ where: { userId: teamUser.id } });
  if (!existingTeamProfile) {
    await db.teamProfile.create({
      data: {
        userId: teamUser.id,
        memberType: "CORE_TEAM",
        displayName: teamDisplayName,
        publicBio: "Full-stack engineer focusing on high-performance web applications and databases.",
        isPublic: true,
        displayOrder: 10,
      },
    });
  }

  // ─── 7. SEED FIXED SITE CONFIG (LEADERSHIP PROFILES) ───────────────────────
  const existingCoFounder = await db.teamProfile.findFirst({ where: { leadershipPosition: "CO_FOUNDER" } });
  if (!existingCoFounder) {
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
  }

  const existingCEO = await db.teamProfile.findFirst({ where: { leadershipPosition: "CEO" } });
  if (!existingCEO) {
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
  }

  // ─── 8. SEED CONFIRMATION OUTPUT (safe — no secrets printed) ────────────────
  console.log("");
  console.log(`  DATABASE connected: yes`);
  console.log(`  OWNER user exists: ${owner ? "yes" : "no"}`);
  console.log(`  OWNER key active: ${ownerAccessKey ? "yes" : "no"}`);
  console.log(`  ADMIN user exists: ${admin ? "yes" : "no"}`);
  console.log(`  ADMIN key active: ${adminAccessKey ? "yes" : "no"}`);
  console.log(`  TEAM user exists: ${teamUser ? "yes" : "no"}`);
  console.log(`  TEAM key active: ${teamAccessKey ? "yes" : "no"}`);

  await db.$disconnect();
  console.log("\n  ✓ Seed completed successfully.\n");
}

main().catch((err) => {
  console.error("  ❌ Seed failed:", err.message ?? err);
  process.exit(1);
});
