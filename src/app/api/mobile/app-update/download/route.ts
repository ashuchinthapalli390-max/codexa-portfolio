import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGlobalMobileConfig } from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const releaseId = url.searchParams.get("releaseId");
    const deviceId = req.headers.get("x-device-id") || url.searchParams.get("deviceId") || null;
    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || null;
    const userAgent = req.headers.get("user-agent") || null;

    let release = null;
    if (releaseId) {
      release = await db.mobileAppRelease.findUnique({ where: { id: releaseId } });
    }

    if (!release) {
      // Find current published stable Android release
      release = await db.mobileAppRelease.findFirst({
        where: {
          platform: "ANDROID",
          releaseChannel: "STABLE",
          isCurrentPublished: true,
          status: "PUBLISHED",
        },
      });
    }

    let downloadUrl = release?.apkDownloadUrl;

    if (!downloadUrl) {
      const globalConfig = await getOrCreateGlobalMobileConfig();
      downloadUrl = globalConfig.androidApkUrl || globalConfig.downloadUrl;
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "No published APK download available." },
        { status: 404 }
      );
    }

    // Increment download count and track event asynchronously
    if (release) {
      Promise.all([
        db.mobileAppRelease.update({
          where: { id: release.id },
          data: { downloadCount: { increment: 1 } },
        }),
        db.mobileReleaseEvent.create({
          data: {
            releaseId: release.id,
            eventType: "DOWNLOAD_START",
            deviceId,
            ipAddress,
            userAgent,
            versionCode: release.versionCode,
            metadata: {
              versionName: release.versionName,
              downloadUrl,
            },
          },
        }),
      ]).catch((err) => console.warn("[APK Download Tracking]", err));
    }

    // Redirect directly to high-speed cloud CDN object
    return NextResponse.redirect(downloadUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/app-update/download]", err);
    return NextResponse.json({ error: "Failed to initiate download." }, { status: 500 });
  }
}
