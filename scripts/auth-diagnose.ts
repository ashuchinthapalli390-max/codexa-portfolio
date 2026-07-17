/**
 * scripts/auth-diagnose.ts
 *
 * Safe diagnostics script for verifying database status and credentials.
 * Checks for the presence of deterministic HMAC hashes.
 * Prints only yes/no checks — never prints secrets, hashes, or raw keys.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { hashAccessKey } from "../src/lib/accessKeyHash";

config({ path: ".env.local", override: true });
config({ override: true }); // Load .env file

async function main() {
  console.log("\n==================================================");
  console.log("          CODEXA AGENCY AUTH DIAGNOSTICS          ");
  console.log("==================================================\n");

  const authSecretLoaded    = (process.env.AUTH_SECRET || process.env.SESSION_SECRET) ? "yes" : "no";
  const databaseUrlLoaded   = process.env.DATABASE_URL ? "yes" : "no";
  const ownerEmailLoaded    = process.env.OWNER_EMAIL ? "yes" : "no";
  const ownerAccessKeyLoaded = process.env.OWNER_ACCESS_KEY ? "yes" : "no";
  const adminEmailLoaded    = process.env.ADMIN_EMAIL ? "yes" : "no";
  const adminAccessKeyLoaded = process.env.ADMIN_ACCESS_KEY ? "yes" : "no";
  const teamUsernameLoaded  = process.env.TEAM_USERNAME ? "yes" : "no";
  const teamAccessKeyLoaded = process.env.TEAM_ACCESS_KEY ? "yes" : "no";

  console.log("--- Environment Variables ---");
  console.log(`- DATABASE_URL loaded:        ${databaseUrlLoaded}`);
  console.log(`- AUTH_SECRET loaded:         ${authSecretLoaded}`);
  console.log(`- OWNER_EMAIL loaded:         ${ownerEmailLoaded}`);
  console.log(`- OWNER_ACCESS_KEY loaded:    ${ownerAccessKeyLoaded}`);
  console.log(`- ADMIN_EMAIL loaded:         ${adminEmailLoaded}`);
  console.log(`- ADMIN_ACCESS_KEY loaded:    ${adminAccessKeyLoaded}`);
  console.log(`- TEAM_USERNAME loaded:       ${teamUsernameLoaded}`);
  console.log(`- TEAM_ACCESS_KEY loaded:     ${teamAccessKeyLoaded}`);

  if (!process.env.DATABASE_URL) {
    console.log("\n- DB connected: no (missing DATABASE_URL)");
    process.exit(1);
  }

  if (!process.env.AUTH_SECRET && !process.env.SESSION_SECRET) {
    console.log("\n- Auth hash check: skipped (missing AUTH_SECRET)");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("\n--- Database ---");
    console.log("- DB connected: yes");

    const userCount = await prisma.user.count();
    const keyCount  = await prisma.accessKey.count();
    console.log(`- User count:      ${userCount}`);
    console.log(`- AccessKey count: ${keyCount}`);

    // Per-role user existence
    const ownerUser  = await prisma.user.findFirst({ where: { role: "OWNER" } });
    const adminUser  = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const teamUser   = await prisma.user.findFirst({ where: { role: "TEAM_MEMBER" } });
    const teamProfile = teamUser
      ? await prisma.teamProfile.findFirst({ where: { userId: teamUser.id } })
      : null;

    console.log(`\n--- Users ---`);
    console.log(`- OWNER user exists:        ${ownerUser ? "yes" : "no"}`);
    console.log(`- ADMIN user exists:        ${adminUser ? "yes" : "no"}`);
    console.log(`- TEAM user exists:         ${teamUser ? "yes" : "no"}`);
    console.log(`- TeamProfile exists:       ${teamProfile ? "yes" : "no"}`);

    // Per-role active HMAC key checks
    let activeOwnerKeyExists = "no";
    let activeAdminKeyExists = "no";
    let activeTeamKeyExists  = "no";

    try {
      if (process.env.OWNER_ACCESS_KEY) {
        const ownerHash = hashAccessKey(process.env.OWNER_ACCESS_KEY);
        const key = await prisma.accessKey.findFirst({
          where: { keyHash: ownerHash, isActive: true, role: "OWNER" }
        });
        if (key) activeOwnerKeyExists = "yes";
      }
    } catch (e) {
      activeOwnerKeyExists = "error (check AUTH_SECRET)";
    }

    try {
      if (process.env.ADMIN_ACCESS_KEY) {
        const adminHash = hashAccessKey(process.env.ADMIN_ACCESS_KEY);
        const key = await prisma.accessKey.findFirst({
          where: { keyHash: adminHash, isActive: true, role: "ADMIN" }
        });
        if (key) activeAdminKeyExists = "yes";
      }
    } catch (e) {
      activeAdminKeyExists = "error (check AUTH_SECRET)";
    }

    try {
      if (process.env.TEAM_ACCESS_KEY) {
        const teamHash = hashAccessKey(process.env.TEAM_ACCESS_KEY);
        const key = await prisma.accessKey.findFirst({
          where: { keyHash: teamHash, isActive: true, role: "TEAM_MEMBER" }
        });
        if (key) activeTeamKeyExists = "yes";
      }
    } catch (e) {
      activeTeamKeyExists = "error (check AUTH_SECRET)";
    }

    console.log("\n--- HMAC Key Verification ---");
    console.log(`- OWNER env key hash active:   ${activeOwnerKeyExists}`);
    console.log(`- ADMIN env key hash active:   ${activeAdminKeyExists}`);
    console.log(`- TEAM env key hash active:    ${activeTeamKeyExists}`);

    const allOk =
      ownerUser && adminUser && teamUser &&
      activeOwnerKeyExists === "yes" &&
      activeAdminKeyExists === "yes" &&
      activeTeamKeyExists === "yes";

    console.log(`\n--- Summary ---`);
    console.log(`- All checks passed: ${allOk ? "YES ✓" : "NO — see above"}`);

  } catch (err) {
    console.log("- DB connected: no");
    console.error("Error:", (err as Error).message);
  } finally {
    await prisma.$disconnect();
    console.log("\n==================================================\n");
  }
}

main();
