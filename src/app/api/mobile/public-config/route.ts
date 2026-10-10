import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGlobalMobileConfig } from "@/lib/mobile-features";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const globalConfig = await getOrCreateGlobalMobileConfig();

    const publishedRelease = await db.mobileAppRelease.findFirst({
      where: {
        platform: "ANDROID",
        releaseChannel: "STABLE",
        isCurrentPublished: true,
        status: "PUBLISHED",
      },
    });

    const latestVersion = publishedRelease?.versionName || globalConfig.currentVersion || "1.0.0";
    const latestVersionCode = publishedRelease?.versionCode || globalConfig.buildNumber || 1;
    const minVersionCode = publishedRelease?.minimumSupportedVersionCode || 1;
    const downloadUrl =
      publishedRelease?.apkDownloadUrl ||
      globalConfig.androidApkUrl ||
      globalConfig.downloadUrl ||
      "https://codxa-agency.online/downloads/CodeXa.apk";

    return NextResponse.json(
      {
        ok: true,
        configVersion: globalConfig.configVersion || 1,
        maintenance: {
          enabled: Boolean(globalConfig.maintenanceEnabled),
          title: "CodeXa Maintenance",
          message:
            globalConfig.maintenanceMessage ||
            "CodeXa is temporarily unavailable while we perform system upgrades.",
          expectedEndAt: globalConfig.expectedMaintenanceEnd
            ? globalConfig.expectedMaintenanceEnd.toISOString()
            : null,
        },
        version: {
          minimumSupported: globalConfig.minVersion || "1.0.0",
          latest: latestVersion,
          latestVersionCode,
          minimumSupportedVersionCode: minVersionCode,
          forceUpdate: Boolean(globalConfig.forceUpdateEnabled) || publishedRelease?.updateType === "MANDATORY",
          optionalUpdate: Boolean(globalConfig.softUpdateEnabled) || publishedRelease?.updateType !== "MANDATORY",
          updateUrl: downloadUrl,
          downloadUrl,
          sha256: publishedRelease?.apkSha256 || null,
          fileSizeBytes: publishedRelease ? Number(publishedRelease.apkFileSize || 0) : null,
          releaseNotes:
            publishedRelease?.releaseNotes ||
            globalConfig.releaseNotes ||
            "Production release with Core database synchronization and Daily Team Workspace features.",
        },
        serverTime: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/mobile/public-config error]", err);
    return NextResponse.json(
      {
        ok: false,
        error: { code: "SERVER_ERROR", message: "Failed to load public configuration." },
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
