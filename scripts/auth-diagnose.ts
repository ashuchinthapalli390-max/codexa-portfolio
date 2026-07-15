/**
 * scripts/auth-diagnose.ts
 *
 * Safe diagnostics script for verifying database status and credentials.
 * Does NOT print any passwords, keys, or secret tokens.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config(); // Load .env file

async function main() {
  console.log("\n==================================================");
  console.log("          CODEXA AGENCY AUTH DIAGNOSTICS          ");
  console.log("==================================================\n");

  const databaseUrlLoaded = process.env.DATABASE_URL ? "yes" : "no";
  console.log(`- DATABASE_URL loaded: ${databaseUrlLoaded}`);

  const seedEnvVars = [
    "OWNER_EMAIL", "OWNER_PASSWORD", "OWNER_NAME", "OWNER_ACCESS_KEY",
    "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_NAME", "ADMIN_ACCESS_KEY",
    "TEAM_USERNAME", "TEAM_PASSWORD", "TEAM_DISPLAY_NAME", "TEAM_ACCESS_KEY"
  ];
  const missingSeedEnv = seedEnvVars.filter(v => !process.env[v]);
  const seedEnvLoaded = missingSeedEnv.length === 0 ? "yes" : `no (missing: ${missingSeedEnv.join(", ")})`;
  console.log(`- Seed env variables loaded: ${seedEnvLoaded}`);

  if (!process.env.DATABASE_URL) {
    console.log("- Database connected: no (missing DATABASE_URL)");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("- Database connected: yes");

    const userCount = await prisma.user.count();
    const keyCount = await prisma.accessKey.count();
    console.log(`- User count: ${userCount}`);
    console.log(`- AccessKey count: ${keyCount}`);

    const activeOwnerKey = await prisma.accessKey.findFirst({
      where: { role: "OWNER", isActive: true }
    });
    const activeAdminKey = await prisma.accessKey.findFirst({
      where: { role: "ADMIN", isActive: true }
    });
    const activeTeamKey = await prisma.accessKey.findFirst({
      where: { role: "TEAM_MEMBER", isActive: true }
    });

    console.log(`- Active Owner access key exists: ${activeOwnerKey ? "yes" : "no"}`);
    console.log(`- Active Admin access key exists: ${activeAdminKey ? "yes" : "no"}`);
    console.log(`- Active Team access key exists: ${activeTeamKey ? "yes" : "no"}`);

    // Check hash method consistency by testing if the keyHash starts with bcrypt identifier $2
    const allKeys = await prisma.accessKey.findMany({ take: 5 });
    const inconsistent = allKeys.filter(k => !k.keyHash.startsWith("$2"));
    const hashConsistent = inconsistent.length === 0 ? "yes" : "no (some keys are not bcrypt-hashed)";
    console.log(`- Hash method consistent: ${hashConsistent}`);

  } catch (err) {
    console.log("- Database connected: no");
    console.error("Error:", (err as Error).message);
  } finally {
    await prisma.$disconnect();
    console.log("\n==================================================\n");
  }
}

main();
