import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeRelease } from "@/lib/apk-releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch latest published release for Android STABLE
    const latestRelease = await db.mobileAppRelease.findFirst({
      where: {
        platform: "ANDROID",
        releaseChannel: "STABLE",
        isCurrentPublished: true,
      },
      orderBy: { versionCode: "desc" },
    });

    // 2. Fetch published showcase media
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
        thumbnailUrl: v.thumbnailUrl || "/appstore/codexa-demo-poster.jpg",
        durationSeconds: v.durationSeconds || 30.02,
        displayOrder: v.displayOrder,
        isFeatured: v.isFeatured,
        mimeType: v.mimeType || "video/mp4",
        width: v.width || 1080,
        height: v.height || 1920,
        fileSize: Number(v.fileSize || 0),
      }));

    // 3. Fetch showcase content
    const content = await db.mobileShowcaseContent.findUnique({
      where: { id: "cxa_mobile_showcase_content" },
    });

    const revision = (content?.contentRevision || 1) + (latestRelease?.versionCode || 100);

    return NextResponse.json({
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
        shortDescription: content?.shortDescription || "Attendance, Classes, Projects, Assignments, Communication. Everything in one place.",
        fullDescription: content?.fullDescription || "",
      },
      release: latestRelease ? serializeRelease(latestRelease) : null,
      catalog: {
        revision,
        updatedAt: content?.updatedAt?.toISOString() || new Date().toISOString(),
        screenshots,
        videos,
        features: content?.featuresJson || [],
        installationSteps: content?.installationStepsJson || [],
        troubleshooting: content?.troubleshootingJson || [],
      },
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/store/catalog]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to load catalog." }, { status: 500 });
  }
}
