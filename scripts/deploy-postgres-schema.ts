/**
 * scripts/deploy-postgres-schema.ts
 *
 * Safe database inspection and schema deployment script for Supabase PostgreSQL.
 * Performs read-only verification of existing tables and applies safe additive migrations.
 * Never drops tables or resets production data.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env.local", override: true });
config({ override: true });

async function main() {
  console.log("\n=======================================================");
  console.log("       CODEXA AGENCY — POSTGRESQL SCHEMA CHECK         ");
  console.log("=======================================================\n");

  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: Neither DIRECT_URL nor DATABASE_URL is defined.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    await prisma.$connect();
    console.log("✓ Connected to PostgreSQL database successfully.\n");

    // 1. Read-only environment and table existence verification
    const dbInfo: any = await prisma.$queryRawUnsafe(`
      SELECT 
        current_database() AS database,
        current_schema() AS schema,
        to_regclass('public."User"') AS user_table,
        to_regclass('public."Session"') AS session_table,
        to_regclass('public."Project"') AS project_table,
        to_regclass('public."TeamProfile"') AS profile_table;
    `);

    console.log("Database Info:", {
      database: dbInfo[0]?.database,
      schema: dbInfo[0]?.schema,
      user_table: dbInfo[0]?.user_table ? "EXISTS" : "MISSING",
      session_table: dbInfo[0]?.session_table ? "EXISTS" : "MISSING",
      project_table: dbInfo[0]?.project_table ? "EXISTS" : "MISSING",
      profile_table: dbInfo[0]?.profile_table ? "EXISTS" : "MISSING",
    });

    const isSessionMissing = !dbInfo[0]?.session_table;
    const isUserMissing = !dbInfo[0]?.user_table;

    if (isSessionMissing || isUserMissing) {
      console.log("\n→ Required tables missing. Applying PostgreSQL migration...");
      const migrationPath = path.join(
        process.cwd(),
        "prisma",
        "migrations",
        "20260910000000_init_postgresql",
        "migration.sql"
      );

      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, "utf-8");
        // Execute the migration SQL safely
        await prisma.$executeRawUnsafe(sql);
        console.log("✓ PostgreSQL migration applied successfully.");
      } else {
        console.error("Migration file not found at:", migrationPath);
      }
    } else {
      console.log("\n✓ All core tables are present.");
    }

    // 2. Post-verification row counts
    const counts: any = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT count(*) FROM public."User") AS users,
        (SELECT count(*) FROM public."Session") AS sessions,
        (SELECT count(*) FROM public."Project") AS projects,
        (SELECT count(*) FROM public."TeamProfile") AS profiles;
    `).catch(() => null);

    if (counts && counts[0]) {
      console.log("\nTable Record Counts:");
      console.log(`- User count:         ${counts[0].users}`);
      console.log(`- Session count:      ${counts[0].sessions}`);
      console.log(`- Project count:      ${counts[0].projects}`);
      console.log(`- TeamProfile count:  ${counts[0].profiles}`);
    }

    console.log("\n=======================================================");
    console.log("              DATABASE CHECK COMPLETE                  ");
    console.log("=======================================================\n");
  } catch (err: any) {
    console.error("\nDatabase inspection error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
