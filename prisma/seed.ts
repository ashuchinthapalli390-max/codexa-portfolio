/**
 * CodeXa Agency — Seed Script (Prisma 5 + MySQL/Aiven)
 * Run with: npx tsx prisma/seed.ts
 *
 * Idempotent seeder that uses deterministic HMAC-SHA256 access keys.
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

  try {
    await db.$connect();
    console.log("  ✓ Connected to database successfully.");
  } catch (err) {
    console.error("  ❌ Database connection failed:", (err as Error).message);
    process.exit(1);
  }

  // ─── 1. RESOLVE ENV VARIABLES / SAFE FALLBACKS ──────────────────────────────
  const ownerEmail = (process.env.OWNER_EMAIL || "owner@codexa.agency").toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD || "OwnerPassd36d3fc5!";
  const ownerName = process.env.OWNER_NAME || "Ashu";
  const ownerRawKey = process.env.OWNER_ACCESS_KEY || "CXA-65451FA8-A81763DB-88E54424-2AD50362";

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@codexa.agency").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminPassf828579a!";
  const adminName = process.env.ADMIN_NAME || "Read Only Admin";
  const adminRawKey = process.env.ADMIN_ACCESS_KEY || "CXA-599AA616-C3A2369B-0F6531A3-AE7194C9";

  const teamUsername = (process.env.TEAM_USERNAME || "teammember").toLowerCase().trim();
  const teamPassword = process.env.TEAM_PASSWORD || "TeamPass8de7c1ad!";
  const teamDisplayName = process.env.TEAM_DISPLAY_NAME || "Alex Rivera";
  const teamRawKey = process.env.TEAM_ACCESS_KEY || "CXA-A0E9FD06-5DE2571F-46D41FFA-88E8B06D";

  // ─── 2. SEED OWNER ACCOUNT ──────────────────────────────────────────────────
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
  } else {
    // Sync email/name if they changed in env
    owner = await db.user.update({
      where: { id: owner.id },
      data: { email: ownerEmail, fullName: ownerName }
    });
  }

  // Deactivate old duplicate Owner keys (e.g. bcrypt legacy keys)
  await db.accessKey.updateMany({
    where: { userId: owner.id, role: "OWNER", label: { startsWith: "Owner Primary" } },
    data: { isActive: false }
  });

  // Seed HMAC Owner Access Key
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

  // ─── 3. SEED ADMIN ACCOUNT ──────────────────────────────────────────────────
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
  } else {
    admin = await db.user.update({
      where: { id: admin.id },
      data: { email: adminEmail, fullName: adminName }
    });
  }

  // Deactivate old duplicate Admin keys
  await db.accessKey.updateMany({
    where: { userId: admin.id, role: "ADMIN", label: { startsWith: "Admin Test" } },
    data: { isActive: false }
  });

  // Seed HMAC Admin Access Key
  const adminHash = hashAccessKey(adminRawKey);
  const adminAccessKey = await db.accessKey.upsert({
    where: { keyHash: adminHash },
    update: { role: "ADMIN", isActive: true, expiresAt: null },
    create: {
      userId: admin.id,
      label: "Admin Test Key (HMAC)",
      keyHash: adminHash,
      role: "ADMIN",
      isActive: true,
      expiresAt: null
    }
  });

  // ─── 4. SEED TEAM_MEMBER ACCOUNT ────────────────────────────────────────────
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
  } else {
    teamUser = await db.user.update({
      where: { id: teamUser.id },
      data: { username: teamUsername, fullName: teamDisplayName }
    });
  }

  // Deactivate old duplicate Team keys
  await db.accessKey.updateMany({
    where: { userId: teamUser.id, role: "TEAM_MEMBER", label: { startsWith: "Team Member Test" } },
    data: { isActive: false }
  });

  // Seed HMAC Team Member Access Key
  const teamHash = hashAccessKey(teamRawKey);
  const teamAccessKey = await db.accessKey.upsert({
    where: { keyHash: teamHash },
    update: { role: "TEAM_MEMBER", isActive: true, expiresAt: null },
    create: {
      userId: teamUser.id,
      label: "Team Member Test Key (HMAC)",
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

  // ─── 5. SEED FIXED SITE CONFIG (LEADERSHIP PROFILES) ───────────────────────
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

  // ─── 6. REQUIRE SEED CONFIRMATION OUTPUT ────────────────────────────────────
  console.log(`OWNER user exists: ${owner ? "yes" : "no"}`);
  console.log(`OWNER access key exists: ${ownerAccessKey ? "yes" : "no"}`);
  console.log(`ADMIN user exists: ${admin ? "yes" : "no"}`);
  console.log(`ADMIN access key exists: ${adminAccessKey ? "yes" : "no"}`);
  console.log(`TEAM user exists: ${teamUser ? "yes" : "no"}`);
  console.log(`TEAM access key exists: ${teamAccessKey ? "yes" : "no"}`);

  await db.$disconnect();
  console.log("\n  ✓ Seed completed successfully.\n");
}

main().catch((err) => {
  console.error("  ❌ Seed failed:", err.message ?? err);
  process.exit(1);
});
