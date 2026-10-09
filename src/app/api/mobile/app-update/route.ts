import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGlobalMobileConfig } from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const platform = (url.searchParams.get("platform") || req.headers.get("x-platform") || "ANDROID").toUpperCase();
    const channel = (url.searchParams.get("channel") || "STABLE").toUpperCase();
    const rawClientCode =
      url.searchParams.get("versionCode") ||
      req.headers.get("x-app-version-code") ||
      url.searchParams.get("buildNumber") ||
      req.headers.get("x-build-number");
    const rawClientVersion = url.searchParams.get("versionName") || req.headers.get("x-app-version") || "";
    const deviceId = req.headers.get("x-device-id") || url.searchParams.get("deviceId") || null;

    const clientVersionCode = rawClientCode ? parseInt(rawClientCode, 10) : 0;

    // 1. Fetch current published release from Core database
    const publishedRelease = await db.mobileAppRelease.findFirst({
      where: {
        platform: platform === "IOS" ? "IOS" : "ANDROID",
        releaseChannel: channel.includes("BETA") ? "BETA" : "STABLE",
        isCurrentPublished: true,
        status: "PUBLISHED",
      },
    });

    const globalConfig = await getOrCreateGlobalMobileConfig();

    let latestVersion = globalConfig.currentVersion || "1.0.0";
    let latestVersionCode = globalConfig.buildNumber || 1;
    let minVersionCode = 1;
    let releaseNotes = globalConfig.releaseNotes || "Performance enhancements and stability updates.";
    let downloadUrl = globalConfig.androidApkUrl || globalConfig.downloadUrl || "";
    let sha256 = "";
    let fileSizeBytes = 0;
    let signingFingerprint = null;
    let releaseId = publishedRelease?.id || null;
    let isMandatoryConfig = Boolean(globalConfig.forceUpdateEnabled);

    if (publishedRelease) {
      latestVersion = publishedRelease.versionName;
      latestVersionCode = publishedRelease.versionCode;
      minVersionCode = publishedRelease.minimumSupportedVersionCode || 1;
      releaseNotes = publishedRelease.releaseNotes || releaseNotes;
      downloadUrl = publishedRelease.apkDownloadUrl || downloadUrl;
      sha256 = publishedRelease.apkSha256;
      fileSizeBytes = Number(publishedRelease.apkFileSize || 0);
      signingFingerprint = publishedRelease.signingCertificateFingerprint || null;
      if (publishedRelease.updateType === "MANDATORY") {
        isMandatoryConfig = true;
      }
    }

    // Determine update availability
    const updateAvailable = clientVersionCode > 0 ? clientVersionCode < latestVersionCode : false;
    const forceUpdate =
      (clientVersionCode > 0 && clientVersionCode < minVersionCode) ||
      (updateAvailable && isMandatoryConfig);

    // Track check update telemetry in background
    if (releaseId && deviceId) {
      db.mobileReleaseEvent.create({
        data: {
          releaseId,
          eventType: "CHECK_UPDATE",
          deviceId,
          versionCode: clientVersionCode,
          metadata: {
            clientVersion: rawClientVersion,
            clientVersionCode,
            updateAvailable,
            forceUpdate,
          },
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      {
        ok: true,
        app: {
          platform: platform.toLowerCase(),
          currentInstalledVersionCode: clientVersionCode,
          latestVersion,
          latestVersionCode,
          minimumSupportedVersionCode: minVersionCode,
          updateAvailable,
          forceUpdate,
          releaseNotes,
          downloadUrl: downloadUrl || `${url.origin}/api/mobile/app-update/download?releaseId=${releaseId || ""}`,
          directDownloadUrl: downloadUrl,
          sha256,
          fileSizeBytes,
          signingCertificateFingerprint: signingFingerprint,
          publishedAt: publishedRelease?.publishedAt?.toISOString() || null,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/mobile/app-update]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to evaluate app update status." },
      { status: 500 }
    );
  }
}
