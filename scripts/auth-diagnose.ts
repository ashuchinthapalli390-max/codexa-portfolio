/**
 * scripts/auth-diagnose.ts
 *
 * Safe diagnostics script for verifying database status and credentials.
 * Prints only status checks — never prints secrets or passwords.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ override: true }); // Load .env file

async function main() {
  console.log("\n==================================================");
  console.log("          CODEXA AGENCY AUTH DIAGNOSTICS          ");
  console.log("==================================================\n");

  const authSecretLoaded    = (process.env.AUTH_SECRET || process.env.SESSION_SECRET) ? "yes" : "no";
  const databaseUrlLoaded   = process.env.DATABASE_URL ? "yes" : "no";
  const ownerEmailLoaded    = process.env.OWNER_EMAIL ? "yes" : "no";
  const adminEmailLoaded    = process.env.ADMIN_EMAIL ? "yes" : "no";
  const teamUsernameLoaded  = process.env.TEAM_USERNAME ? "yes" : "no";

  console.log("--- Environment Variables ---");
  console.log(`- DATABASE_URL loaded:        ${databaseUrlLoaded}`);
  console.log(`- AUTH_SECRET loaded:         ${authSecretLoaded}`);
  console.log(`- OWNER_EMAIL loaded:         ${ownerEmailLoaded}`);
  console.log(`- ADMIN_EMAIL loaded:         ${adminEmailLoaded}`);
  console.log(`- TEAM_USERNAME loaded:       ${teamUsernameLoaded}`);

  if (!process.env.DATABASE_URL) {
    console.log("\n- DB connected: no (missing DATABASE_URL)");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("\n--- Database ---");
    console.log("- DB connected: yes");

    const userCount = await prisma.user.count();
    const profileCount = await prisma.teamProfile.count();
    console.log(`- User count:         ${userCount}`);
    console.log(`- TeamProfile count:  ${profileCount}`);

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

    const allOk = Boolean(ownerUser && adminUser && teamUser);

    console.log(`\n--- Summary ---`);
    console.log(`- All essential accounts verified: ${allOk ? "YES ✓" : "NO — run npm run seed"}`);

  } catch (err) {
    console.log("- DB connected: no");
    console.error("Error:", (err as Error).message);
  } finally {
    await prisma.$disconnect();
    console.log("\n==================================================\n");
  }
}

main();
