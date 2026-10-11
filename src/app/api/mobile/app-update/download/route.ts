import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serveDirectApkBinary } from "@/lib/apk-database-streamer";

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
              source: "official-direct-stream",
            },
          },
        }),
      ]).catch((err) => console.warn("[APK Download Tracking]", err));
    }

    // Stream APK binary directly from database/disk with zero third-party redirects
    return await serveDirectApkBinary(req, {
      fallbackFilename: "CodeXa.apk",
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/app-update/download]", err);
    return await serveDirectApkBinary(req);
  }
}

export async function HEAD(req: NextRequest) {
  return await serveDirectApkBinary(req);
}
