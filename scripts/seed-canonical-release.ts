import { db } from "../src/lib/db";

async function main() {
  console.log("=== SEEDING CANONICAL PUBLISHED APK RELEASE ===");

  const existing = await db.mobileAppRelease.findFirst({
    where: {
      platform: "ANDROID",
      releaseChannel: "STABLE",
      isCurrentPublished: true,
    },
  });

  const sha256 = "fc7a5dc832d1300c73db2d6321d43278b311f145f710a71c6ea5fa29d98f0ef1";
  const fileSize = BigInt(865409956);
  const downloadUrl = "https://codxa-agency.online/downloads/CodeXa.apk";

  if (existing) {
    console.log("Existing published release found:", existing.id, "v" + existing.versionName);
    const updated = await db.mobileAppRelease.update({
      where: { id: existing.id },
      data: {
        apkSha256: sha256,
        apkFileSize: fileSize,
        apkDownloadUrl: downloadUrl,
        isCurrentPublished: true,
        status: "PUBLISHED",
      },
    });
    console.log("Updated existing release with latest SHA and download URL.");
  } else {
    // Get founder account to associate as uploadedBy
    const founder = await db.user.findFirst({
      where: { role: { in: ["FOUNDER", "OWNER"] } },
    });

    const release = await db.mobileAppRelease.create({
      data: {
        appId: "codexa-mobile",
        platform: "ANDROID",
        packageName: "com.codexa.app",
        versionName: "1.0.5",
        versionCode: 105,
        releaseChannel: "STABLE",
        storageProvider: "LOCAL",
        storageBucket: "mobile-releases",
        storageKey: "codexa-apk/stable/1.0.5/CodeXa.apk",
        apkDownloadUrl: downloadUrl,
        apkFileSize: fileSize,
        apkSha256: sha256,
        releaseNotes: "Official CodeXa Mobile Production Release — Built-in CodeXa Store, Live Classes, Attendance, Projects & Assignments, Team Chat & Media Sync.",
        status: "PUBLISHED",
        updateType: "OPTIONAL",
        minimumSupportedVersionCode: 100,
        isCurrentPublished: true,
        uploadedById: founder?.id || "founder-system",
        uploadedByName: founder?.fullName || "Shaik Ashu (Founder)",
        publishedById: founder?.id || "founder-system",
        publishedByName: founder?.fullName || "Shaik Ashu (Founder)",
        publishedAt: new Date(),
      },
    });
    console.log("Created canonical release:", release.id, "v" + release.versionName);
  }

  // Ensure MobileAppConfig is synced
  const globalConfig = await db.mobileAppConfig.findFirst({
    where: { targetType: "GLOBAL" },
  });
  if (globalConfig) {
    await db.mobileAppConfig.update({
      where: { id: globalConfig.id },
      data: {
        currentVersion: "1.0.5",
        buildNumber: 105,
        minVersion: "1.0.0",
        downloadUrl,
        androidApkUrl: downloadUrl,
      },
    });
    console.log("Synced global MobileAppConfig (version 1.0.5, build 105).");
  }
}

main().catch(console.error).finally(() => db.$disconnect());
