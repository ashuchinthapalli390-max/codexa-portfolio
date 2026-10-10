import { db } from "../src/lib/db";
import { serializeRelease } from "../src/lib/apk-releases";

async function main() {
  const latestRelease = await db.mobileAppRelease.findFirst({
    where: {
      platform: "ANDROID",
      releaseChannel: "STABLE",
      isCurrentPublished: true,
    },
    orderBy: { versionCode: "desc" },
  });

  const media = await db.mobileShowcaseMedia.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  const screenshots = media
    .filter((m) => m.mediaCategory === "SCREENSHOT" || m.mediaType === "IMAGE")
    .map((s) => ({
      id: s.id,
      title: s.title || "CodeXa Mobile Screenshot",
      caption: s.caption,
      altText: s.altText,
      url: s.publicUrl,
      thumbnailUrl: s.thumbnailUrl || s.publicUrl,
      displayOrder: s.displayOrder,
      featureCategory: s.featureCategory || "General",
      isCover: s.isCover,
      fileSize: Number(s.fileSize || 0),
      width: s.width,
      height: s.height,
    }));

  const videos = media
    .filter((m) => m.mediaCategory === "DEMO_VIDEO" || m.mediaType === "VIDEO")
    .map((v) => ({
      id: v.id,
      title: v.title || "CodeXa Mobile Demo Video",
      description: v.caption,
      url: v.publicUrl,
      thumbnailUrl: v.thumbnailUrl || "/appstore/screenshot-1.png",
      durationSeconds: v.durationSeconds || 120,
      displayOrder: v.displayOrder,
      isFeatured: v.isFeatured,
      width: v.width,
      height: v.height,
    }));

  const content = await db.mobileShowcaseContent.findUnique({
    where: { id: "cxa_mobile_showcase_content" },
  });

  const responsePayload = {
    ok: true,
    application: {
      name: content?.appName || "CodeXa Mobile",
      tagline: content?.appTagline || "Official CodeXa Agency Workspace",
      badgeText: content?.badgeText || "Available Exclusively on Our Official Website",
      platform: "android",
      packageName: content?.packageName || "com.codexa.app",
      developer: content?.developerName || "CodeXa Agency",
      distribution: "official_website",
      officialWebsiteUrl: content?.officialWebsiteUrl || "https://codxa-agency.online",
      compatibility: content?.compatibilityText || "Android 8.0 (Oreo) or later • SDK 26+",
      supportEmail: content?.supportEmail || "contact@codxa-agency.online",
      supportPhone: content?.supportPhone || "+91 7075920852",
      shortDescription: content?.shortDescription || "",
    },
    release: latestRelease ? serializeRelease(latestRelease) : null,
    catalog: {
      revision: (content?.contentRevision || 1) + (latestRelease?.versionCode || 100),
      updatedAt: content?.updatedAt?.toISOString() || new Date().toISOString(),
      screenshotsCount: screenshots.length,
      videosCount: videos.length,
      firstScreenshot: screenshots[0],
      firstVideo: videos[0],
    },
  };

  console.log("=== CATALOG API RESPONSE SIMULATION ===");
  console.log(JSON.stringify(responsePayload, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
