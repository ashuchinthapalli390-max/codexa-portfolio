/**
 * scripts/dump-sqlite.ts
 *
 * Reads all tables from the local SQLite database using the SQLite Prisma Client
 * and saves them into a JSON file for migration.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting SQLite database dump...");

  // Instantiate client pointing to the SQLite DB
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany();
    const teamProfiles = await prisma.teamProfile.findMany();
    const accessKeys = await prisma.accessKey.findMany();
    const accessKeyAuditLogs = await prisma.accessKeyAuditLog.findMany();
    const profileAuditLogs = await prisma.profileAuditLog.findMany();

    const data = {
      users,
      teamProfiles,
      accessKeys,
      accessKeyAuditLogs,
      profileAuditLogs,
    };

    const dumpPath = path.join(process.cwd(), "prisma", "sqlite_dump.json");
    fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2), "utf8");

    console.log(`\n✅ Database dumped successfully to: ${dumpPath}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - TeamProfiles: ${teamProfiles.length}`);
    console.log(`   - AccessKeys: ${accessKeys.length}`);
    console.log(`   - AccessKeyAuditLogs: ${accessKeyAuditLogs.length}`);
    console.log(`   - ProfileAuditLogs: ${profileAuditLogs.length}\n`);

  } catch (error) {
    console.error("Error dumping SQLite database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
