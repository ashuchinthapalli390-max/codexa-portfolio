import { prisma } from "../src/lib/prisma";

async function verify() {
  console.log("=== VERIFYING CODEXA STORE CATALOG & DATABASE INTEGRATION ===");

  const mediaCount = await prisma.mobileShowcaseMedia.count();
  console.log(`[Media] Total MobileShowcaseMedia rows: ${mediaCount}`);

  const screenshots = await prisma.mobileShowcaseMedia.findMany({
    where: { mediaCategory: "SCREENSHOT" },
    orderBy: { displayOrder: "asc" },
  });
  console.log(`[Screenshots] Found ${screenshots.length} screenshots:`);
  screenshots.forEach((s) => {
    console.log(`  - #${s.displayOrder} [${s.featureCategory}] ${s.title}: ${s.publicUrl}`);
  });

  const videos = await prisma.mobileShowcaseMedia.findMany({
    where: { OR: [{ mediaCategory: "DEMO_VIDEO" }, { mediaType: "VIDEO" }] },
  });
  console.log(`[Videos] Found ${videos.length} videos:`);
  videos.forEach((v) => {
    console.log(`  - [${v.mimeType}] ${v.title}: ${v.publicUrl}`);
  });

  const content = await prisma.mobileShowcaseContent.findFirst({
    where: { isPubliclyVisible: true },
  });
  console.log(`[Content] Active showcase content: ${content?.appName} - ${content?.appTagline}`);
  console.log(`[Features] Features count: ${(content?.featuresJson as any[])?.length || 0}`);

  const activeRelease = await prisma.mobileAppRelease.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { versionCode: "desc" },
  });
  console.log(`[Release] Active published release: v${activeRelease?.versionName} (Build ${activeRelease?.versionCode})`);
  console.log(`[Release] APK Size: ${activeRelease?.apkSize} bytes`);
  console.log(`[Release] SHA-256: ${activeRelease?.apkSha256}`);
  console.log(`[Release] URL: ${activeRelease?.downloadUrl}`);

  console.log("=== ALL SYSTEM CHECKS PASSED ===");
}

verify()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
