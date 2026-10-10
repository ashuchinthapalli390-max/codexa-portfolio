import { db } from "../src/lib/db";

async function main() {
  console.log("Creating MobileShowcaseMedia and MobileShowcaseContent tables safely in PostgreSQL...");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MobileShowcaseMedia" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "mediaCategory" TEXT NOT NULL DEFAULT 'SCREENSHOT',
      "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
      "storageProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
      "storageBucket" TEXT NOT NULL DEFAULT 'mobile-releases',
      "storageKey" TEXT NOT NULL,
      "publicUrl" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL DEFAULT 'image/png',
      "fileSize" BIGINT NOT NULL DEFAULT 0,
      "width" INTEGER,
      "height" INTEGER,
      "durationSeconds" DOUBLE PRECISION,
      "displayOrder" INTEGER NOT NULL DEFAULT 0,
      "title" TEXT,
      "caption" TEXT,
      "altText" TEXT,
      "thumbnailUrl" TEXT,
      "featureCategory" TEXT,
      "isCover" BOOLEAN NOT NULL DEFAULT false,
      "isFeatured" BOOLEAN NOT NULL DEFAULT false,
      "isPublished" BOOLEAN NOT NULL DEFAULT true,
      "associatedReleaseId" TEXT,
      "createdById" TEXT,
      "createdByName" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MobileShowcaseMedia_mediaCategory_idx" ON "MobileShowcaseMedia"("mediaCategory")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MobileShowcaseMedia_mediaType_idx" ON "MobileShowcaseMedia"("mediaType")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MobileShowcaseMedia_displayOrder_idx" ON "MobileShowcaseMedia"("displayOrder")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MobileShowcaseMedia_isPublished_idx" ON "MobileShowcaseMedia"("isPublished")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MobileShowcaseMedia_featureCategory_idx" ON "MobileShowcaseMedia"("featureCategory")`);

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MobileShowcaseContent" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'cxa_mobile_showcase_content',
      "appName" TEXT NOT NULL DEFAULT 'CodeXa Mobile',
      "appTagline" TEXT NOT NULL DEFAULT 'Official CodeXa Agency Workspace',
      "badgeText" TEXT NOT NULL DEFAULT 'Available Exclusively on Our Official Website',
      "developerName" TEXT NOT NULL DEFAULT 'CodeXa Agency',
      "platform" TEXT NOT NULL DEFAULT 'Android',
      "packageName" TEXT NOT NULL DEFAULT 'com.codexa.app',
      "shortDescription" TEXT NOT NULL DEFAULT 'Your complete CodeXa workspace, connected wherever you go. Attendance, Classes, Projects, Assignments, Communication. Everything in one place.',
      "fullDescription" TEXT NOT NULL,
      "compatibilityText" TEXT NOT NULL DEFAULT 'Android 8.0 or later • Compatible with SDK 26+',
      "officialWebsiteUrl" TEXT NOT NULL DEFAULT 'https://codxa-agency.online',
      "supportEmail" TEXT NOT NULL DEFAULT 'contact@codxa-agency.online',
      "supportPhone" TEXT NOT NULL DEFAULT '+91 7075920852',
      "featuresJson" JSONB,
      "installationStepsJson" JSONB,
      "troubleshootingJson" JSONB,
      "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT true,
      "contentRevision" INTEGER NOT NULL DEFAULT 1,
      "updatedById" TEXT,
      "updatedByName" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Tables created successfully. Testing prisma queries...");
  const mediaCount = await (db as any).mobileShowcaseMedia.count();
  console.log("MobileShowcaseMedia count:", mediaCount);

  const contentCount = await (db as any).mobileShowcaseContent.count();
  console.log("MobileShowcaseContent count:", contentCount);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  });
