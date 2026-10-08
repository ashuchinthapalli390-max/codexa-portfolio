import { db } from "../src/lib/db";

async function main() {
  console.log("Migrating MobileAppConfig table in PostgreSQL...");
  await db.$executeRawUnsafe(`
    ALTER TABLE "MobileAppConfig" ADD COLUMN IF NOT EXISTS "expectedMaintenanceEnd" TIMESTAMP WITH TIME ZONE;
  `);
  console.log("Added column expectedMaintenanceEnd.");

  await db.$executeRawUnsafe(`
    ALTER TABLE "MobileAppConfig" ADD COLUMN IF NOT EXISTS "releaseNotes" TEXT DEFAULT 'Production release with Core database synchronization and Daily Team Workspace features.';
  `);
  console.log("Added column releaseNotes.");

  console.log("Migration complete!");
}

main().catch(console.error).finally(() => db.$disconnect());
