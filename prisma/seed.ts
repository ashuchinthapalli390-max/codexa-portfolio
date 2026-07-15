/**
 * CodeXa Agency — Seed Script (Prisma 5 + MySQL/Aiven)
 * Run with: npx tsx prisma/seed.ts
 *
 * Safe, idempotent seeder that configures Owner, Admin, and Team Member accounts
 * reading parameters from environment variables with secure fallbacks.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

function normalizeAccessKey(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

async function main() {
  const db = new PrismaClient();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         CODEXA CORE TEAM SYSTEM — DATABASE SEED          ║");
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
    console.log(`  ✓ Created OWNER user: ${owner.email}`);
  } else {
    console.log(`  ✓ OWNER user already exists: ${owner.email}`);
  }

  // Owner Access Key (Bcrypt hashed matching verify-key logic)
  const normOwnerKey = normalizeAccessKey(ownerRawKey);
  if (normOwnerKey) {
    const existingOwnerKey = await db.accessKey.findFirst({
      where: { userId: owner.id, role: "OWNER" }
    });
    if (!existingOwnerKey) {
      const keyHash = await bcrypt.hash(normOwnerKey, BCRYPT_ROUNDS);
      await db.accessKey.create({
        data: {
          userId: owner.id,
          label: "Owner Primary Key",
          keyHash,
          role: "OWNER",
          isActive: true,
        },
      });
      console.log("  ✓ Seeded Owner Access Key");
    } else {
      console.log("  ✓ Owner Access Key already seeded");
    }
  }

  // Seed Founder profile linked to Owner
  const existingOwnerProfile = await db.teamProfile.findFirst({
    where: { userId: owner.id }
  });
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
    console.log("  ✓ Seeded Founder profile (linked to Owner)");
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
    console.log(`  ✓ Created ADMIN user: ${admin.email}`);
  } else {
    console.log(`  ✓ ADMIN user already exists: ${admin.email}`);
  }

  // Admin Access Key
  const normAdminKey = normalizeAccessKey(adminRawKey);
  if (normAdminKey) {
    const existingAdminKey = await db.accessKey.findFirst({
      where: { userId: admin.id, role: "ADMIN" }
    });
    if (!existingAdminKey) {
      const keyHash = await bcrypt.hash(normAdminKey, BCRYPT_ROUNDS);
      await db.accessKey.create({
        data: {
          userId: admin.id,
          label: "Admin Test Key",
          keyHash,
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log("  ✓ Seeded Admin Access Key");
    } else {
      console.log("  ✓ Admin Access Key already seeded");
    }
  }

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
    console.log(`  ✓ Created TEAM_MEMBER user: ${teamUser.username}`);
  } else {
    console.log(`  ✓ TEAM_MEMBER user already exists: ${teamUser.username}`);
  }

  // Team Member Access Key
  const normTeamKey = normalizeAccessKey(teamRawKey);
  if (normTeamKey) {
    const existingTeamKey = await db.accessKey.findFirst({
      where: { userId: teamUser.id, role: "TEAM_MEMBER" }
    });
    if (!existingTeamKey) {
      const keyHash = await bcrypt.hash(normTeamKey, BCRYPT_ROUNDS);
      await db.accessKey.create({
        data: {
          userId: teamUser.id,
          label: "Team Member Test Key",
          keyHash,
          role: "TEAM_MEMBER",
          isActive: true,
        },
      });
      console.log("  ✓ Seeded Team Member Access Key");
    } else {
      console.log("  ✓ Team Member Access Key already seeded");
    }
  }

  // Team Profile row for Team Member
  const existingTeamProfile = await db.teamProfile.findFirst({
    where: { userId: teamUser.id }
  });
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
    console.log("  ✓ Seeded TeamProfile row for Team Member");
  }

  // ─── 5. SEED FIXED SITE CONFIG (LEADERSHIP PROFILES) ───────────────────────
  const existingCoFounder = await db.teamProfile.findFirst({
    where: { leadershipPosition: "CO_FOUNDER" }
  });
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
    console.log("  ✓ Seeded Co-Founder profile");
  }

  const existingCEO = await db.teamProfile.findFirst({
    where: { leadershipPosition: "CEO" }
  });
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
    console.log("  ✓ Seeded CEO profile");
  }

  await db.$disconnect();
  console.log("\n  ✓ Seed completed successfully.\n");
}

main().catch((err) => {
  console.error("  ❌ Seed failed:", err.message ?? err);
  process.exit(1);
});
