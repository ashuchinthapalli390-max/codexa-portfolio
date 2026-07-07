/**
 * scripts/load-mysql.ts
 *
 * Reads database dump from prisma/sqlite_dump.json and inserts it into
 * Aiven MySQL database using the MySQL Prisma Client.
 * Skips records that already exist to allow safe re-runs.
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const dumpPath = path.join(process.cwd(), "prisma", "sqlite_dump.json");

async function main() {
  console.log("Starting MySQL database load...");

  if (!fs.existsSync(dumpPath)) {
    console.error(`✗ Dump file not found at: ${dumpPath}`);
    console.error("Please run the SQLite dump script first: npx tsx scripts/dump-sqlite.ts");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.startsWith("mysql://")) {
    console.error("✗ DATABASE_URL must be a MySQL connection string (mysql://...)");
    process.exit(1);
  }

  const rawData = fs.readFileSync(dumpPath, "utf8");
  const data = JSON.parse(rawData);

  // Instantiate MySQL Prisma Client
  const prisma = new PrismaClient();

  const counts = {
    users: 0,
    teamProfiles: 0,
    accessKeys: 0,
    accessKeyAuditLogs: 0,
    profileAuditLogs: 0,
  };

  try {
    // 1. Users
    console.log("Loading Users...");
    for (const u of data.users) {
      try {
        await prisma.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            passwordHash: u.passwordHash,
            role: u.role,
            isActive: u.isActive,
            lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          },
          update: {},
        });
        counts.users++;
      } catch (err) {
        console.warn(`  ⚠ Skipped User id=${u.id}: ${(err as Error).message}`);
      }
    }

    // 2. TeamProfiles
    console.log("Loading TeamProfiles...");
    for (const p of data.teamProfiles) {
      try {
        await prisma.teamProfile.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            userId: p.userId,
            memberType: p.memberType,
            leadershipPosition: p.leadershipPosition,
            displayName: p.displayName,
            publicBio: p.publicBio,
            mediaUrl: p.mediaUrl,
            mediaMimeType: p.mediaMimeType,
            cropX: p.cropX,
            cropY: p.cropY,
            cropW: p.cropW,
            cropH: p.cropH,
            cropZoom: p.cropZoom,
            cropRotation: p.cropRotation,
            isPublic: p.isPublic,
            displayOrder: p.displayOrder,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          },
          update: {},
        });
        counts.teamProfiles++;
      } catch (err) {
        console.warn(`  ⚠ Skipped TeamProfile id=${p.id}: ${(err as Error).message}`);
      }
    }

    // 3. AccessKeys
    console.log("Loading AccessKeys...");
    for (const k of data.accessKeys) {
      try {
        await prisma.accessKey.upsert({
          where: { id: k.id },
          create: {
            id: k.id,
            userId: k.userId,
            label: k.label,
            keyHash: k.keyHash,
            role: k.role,
            isActive: k.isActive,
            maxUses: k.maxUses,
            useCount: k.useCount,
            expiresAt: k.expiresAt ? new Date(k.expiresAt) : null,
            lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt) : null,
            createdAt: new Date(k.createdAt),
            updatedAt: new Date(k.updatedAt),
          },
          update: {},
        });
        counts.accessKeys++;
      } catch (err) {
        console.warn(`  ⚠ Skipped AccessKey id=${k.id}: ${(err as Error).message}`);
      }
    }

    // 4. AccessKeyAuditLogs
    console.log("Loading AccessKeyAuditLogs...");
    for (const log of data.accessKeyAuditLogs) {
      try {
        await prisma.accessKeyAuditLog.upsert({
          where: { id: log.id },
          create: {
            id: log.id,
            accessKeyId: log.accessKeyId,
            userId: log.userId,
            action: log.action,
            success: log.success,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            createdAt: new Date(log.createdAt),
          },
          update: {},
        });
        counts.accessKeyAuditLogs++;
      } catch (err) {
        console.warn(`  ⚠ Skipped AccessKeyAuditLog id=${log.id}: ${(err as Error).message}`);
      }
    }

    // 5. ProfileAuditLogs
    console.log("Loading ProfileAuditLogs...");
    for (const log of data.profileAuditLogs) {
      try {
        await prisma.profileAuditLog.upsert({
          where: { id: log.id },
          create: {
            id: log.id,
            actorUserId: log.actorUserId,
            targetUserId: log.targetUserId,
            action: log.action,
            details: log.details,
            createdAt: new Date(log.createdAt),
          },
          update: {},
        });
        counts.profileAuditLogs++;
      } catch (err) {
        console.warn(`  ⚠ Skipped ProfileAuditLog id=${log.id}: ${(err as Error).message}`);
      }
    }

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║               LOAD TO MYSQL COMPLETED                    ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Users: ${counts.users}/${data.users.length}`.padEnd(56) + " ║");
    console.log(`║  TeamProfiles: ${counts.teamProfiles}/${data.teamProfiles.length}`.padEnd(56) + " ║");
    console.log(`║  AccessKeys: ${counts.accessKeys}/${data.accessKeys.length}`.padEnd(56) + " ║");
    console.log(`║  AccessKeyAuditLogs: ${counts.accessKeyAuditLogs}/${data.accessKeyAuditLogs.length}`.padEnd(56) + " ║");
    console.log(`║  ProfileAuditLogs: ${counts.profileAuditLogs}/${data.profileAuditLogs.length}`.padEnd(56) + " ║");
    console.log("╚══════════════════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("Error loading data to MySQL:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
