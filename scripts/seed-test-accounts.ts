/**
 * scripts/seed-test-accounts.ts
 *
 * Seeder script to configure all required test accounts for verification:
 * 1. OWNER (Access Key, Email, Password)
 * 2. ADMIN (Access Key, Email, Password - Read-only)
 * 3. TEAM_MEMBER (Access Key, Username, Password - Core Team profile)
 *
 * Hashing is done securely using bcrypt (12 rounds) for both passwords and keys.
 * Credentials are printed to the console so they can be shown to the user once.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateAccessKey(): string {
  const seg = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CXA-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}-${seg()}${seg()}`;
}

async function main() {
  console.log("\n==================================================");
  console.log("   CODEXA AGENCY DATABASE SEEDER (TEST ACCOUNTS)  ");
  console.log("==================================================\n");

  try {
    await prisma.$connect();
    console.log("✓ Successfully connected to the database.");
  } catch (err) {
    console.error("✗ Failed to connect to the database. Make sure DATABASE_URL is set correctly.");
    console.error("Error:", (err as Error).message);
    process.exit(1);
  }

  // --- 1. Generate Raw Credentials ---
  const ownerEmail = process.env.OWNER_EMAIL || "owner@codexa.agency";
  const ownerPassword = process.env.OWNER_PASSWORD || "OwnerPass" + crypto.randomBytes(4).toString("hex") + "!";
  const ownerKey = generateAccessKey();

  const adminEmail = "admin@codexa.agency";
  const adminPassword = "AdminPass" + crypto.randomBytes(4).toString("hex") + "!";
  const adminKey = generateAccessKey();

  const teamUsername = "teammember";
  const teamPassword = "TeamPass" + crypto.randomBytes(4).toString("hex") + "!";
  const teamKey = generateAccessKey();

  try {
    // --- 2. Seed OWNER Account ---
    let owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!owner) {
      const passwordHash = await bcrypt.hash(ownerPassword, 12);
      owner = await prisma.user.create({
        data: {
          email: ownerEmail,
          passwordHash,
          role: "OWNER",
          isActive: true,
          fullName: "Owner Account",
        },
      });
      console.log(`✓ Created new OWNER user (ID: ${owner.id})`);
    } else {
      console.log(`✓ Found existing OWNER user (ID: ${owner.id})`);
    }

    // Owner Access Key
    const ownerKeyHash = await bcrypt.hash(ownerKey, 12);
    await prisma.accessKey.create({
      data: {
        userId: owner.id,
        label: "Owner Primary Test Key",
        keyHash: ownerKeyHash,
        role: "OWNER",
        isActive: true,
      },
    });
    console.log("✓ Seeded Owner Access Key");

    // --- 3. Seed ADMIN Account ---
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (admin) {
      await prisma.user.delete({ where: { id: admin.id } }).catch(() => {});
    }
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        isActive: true,
        fullName: "Admin Account (Read-Only)",
      },
    });
    console.log(`✓ Created ADMIN user (ID: ${admin.id})`);

    // Admin Access Key
    const adminKeyHash = await bcrypt.hash(adminKey, 12);
    await prisma.accessKey.create({
      data: {
        userId: admin.id,
        label: "Admin Test Key",
        keyHash: adminKeyHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("✓ Seeded Admin Access Key");

    // --- 4. Seed TEAM_MEMBER Account ---
    let teamUser = await prisma.user.findUnique({ where: { username: teamUsername } });
    if (teamUser) {
      await prisma.user.delete({ where: { id: teamUser.id } }).catch(() => {});
    }
    const teamPasswordHash = await bcrypt.hash(teamPassword, 12);
    teamUser = await prisma.user.create({
      data: {
        username: teamUsername,
        passwordHash: teamPasswordHash,
        role: "TEAM_MEMBER",
        isActive: true,
        fullName: "Team Member Account",
      },
    });
    console.log(`✓ Created TEAM_MEMBER user (ID: ${teamUser.id})`);

    // Team Member Access Key
    const teamKeyHash = await bcrypt.hash(teamKey, 12);
    await prisma.accessKey.create({
      data: {
        userId: teamUser.id,
        label: "Team Member Test Key",
        keyHash: teamKeyHash,
        role: "TEAM_MEMBER",
        isActive: true,
      },
    });
    console.log("✓ Seeded Team Member Access Key");

    // Team Profile
    let teamProfile = await prisma.teamProfile.findFirst({ where: { userId: teamUser.id } });
    if (!teamProfile) {
      teamProfile = await prisma.teamProfile.create({
        data: {
          userId: teamUser.id,
          memberType: "CORE_TEAM",
          displayName: "Alex Rivera",
          publicBio: "Full-stack engineer focusing on high-performance web applications and databases.",
          isPublic: true,
          displayOrder: 10,
        },
      });
      console.log(`✓ Created TeamProfile row for Team Member (ID: ${teamProfile.id})`);
    } else {
      console.log(`✓ Found existing TeamProfile row for Team Member (ID: ${teamProfile.id})`);
    }

    console.log("\n==================================================");
    console.log("           SEEDING SUCCESSFUL - CREDENTIALS        ");
    console.log("==================================================");
    console.log("\n1. OWNER LOGIN:");
    console.log(`   - Access Key: ${ownerKey}`);
    console.log(`   - Email     : ${ownerEmail}`);
    console.log(`   - Password  : ${ownerPassword}`);
    console.log("\n2. ADMIN LOGIN (Read-Only):");
    console.log(`   - Access Key: ${adminKey}`);
    console.log(`   - Email     : ${adminEmail}`);
    console.log(`   - Password  : ${adminPassword}`);
    console.log("\n3. TEAM MEMBER LOGIN:");
    console.log(`   - Access Key: ${teamKey}`);
    console.log(`   - Username  : ${teamUsername}`);
    console.log(`   - Password  : ${teamPassword}`);
    console.log("\n==================================================\n");

  } catch (err) {
    console.error("✗ Seeding failed with database error:", (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
