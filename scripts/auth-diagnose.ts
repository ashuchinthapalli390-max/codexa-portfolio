/**
 * scripts/auth-diagnose.ts
 *
 * Safe diagnostics script for verifying database status and credentials.
 * Checks for the presence of deterministic HMAC hashes.
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

  const authSecretLoaded = (process.env.AUTH_SECRET || process.env.SESSION_SECRET) ? "yes" : "no";
  const ownerAccessKeyLoaded = process.env.OWNER_ACCESS_KEY ? "yes" : "no";
  const adminAccessKeyLoaded = process.env.ADMIN_ACCESS_KEY ? "yes" : "no";
  const teamAccessKeyLoaded = process.env.TEAM_ACCESS_KEY ? "yes" : "no";
  const databaseUrlLoaded = process.env.DATABASE_URL ? "yes" : "no";

  console.log(`- AUTH_SECRET loaded: ${authSecretLoaded}`);
  console.log(`- OWNER_ACCESS_KEY loaded: ${ownerAccessKeyLoaded}`);
  console.log(`- ADMIN_ACCESS_KEY loaded: ${adminAccessKeyLoaded}`);
  console.log(`- TEAM_ACCESS_KEY loaded: ${teamAccessKeyLoaded}`);
  console.log(`- DATABASE_URL loaded: ${databaseUrlLoaded}`);

  if (!process.env.DATABASE_URL) {
    console.log("- DB connected: no (missing DATABASE_URL)");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("- DB connected: yes");

    const keyCount = await prisma.accessKey.count();
    console.log(`- AccessKey count: ${keyCount}`);

    let activeOwnerKeyExists = "no";
    let activeAdminKeyExists = "no";
    let activeTeamKeyExists = "no";

    try {
      if (process.env.OWNER_ACCESS_KEY) {
        const ownerHash = hashAccessKey(process.env.OWNER_ACCESS_KEY);
        const key = await prisma.accessKey.findFirst({
          where: { keyHash: ownerHash, isActive: true, role: "OWNER" }
        });
        if (key) activeOwnerKeyExists = "yes";
      }
    } catch (e) {}

    try {
      if (process.env.ADMIN_ACCESS_KEY) {
        const adminHash = hashAccessKey(process.env.ADMIN_ACCESS_KEY);
        const key = await prisma.accessKey.findFirst({
          where: { keyHash: adminHash, isActive: true, role: "ADMIN" }
        });
        if (key) activeAdminKeyExists = "yes";
      }
    } catch (e) {}

    try {
      if (process.env.TEAM_ACCESS_KEY) {
        const teamHash = hashAccessKey(process.env.TEAM_ACCESS_KEY);
        const key = await prisma.accessKey.findFirst({
          where: { keyHash: teamHash, isActive: true, role: "TEAM_MEMBER" }
        });
        if (key) activeTeamKeyExists = "yes";
      }
    } catch (e) {}

    console.log(`- Active OWNER key exists for env hash: ${activeOwnerKeyExists}`);
    console.log(`- Active ADMIN key exists for env hash: ${activeAdminKeyExists}`);
    console.log(`- Active TEAM key exists for env hash: ${activeTeamKeyExists}`);

  } catch (err) {
    console.log("- DB connected: no");
    console.error("Error:", (err as Error).message);
  } finally {
    await prisma.$disconnect();
    console.log("\n==================================================\n");
  }
}

main();
