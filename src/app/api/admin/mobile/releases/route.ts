import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageMobile, canViewMobile } from "@/lib/permissions";
import { serializeRelease } from "@/lib/apk-releases";
import { APK_BUCKET_NAME } from "@/lib/apk-storage";
import { getOrCreateGlobalMobileConfig } from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    if (!canViewMobile(user)) {
      return NextResponse.json(
        { error: "Forbidden. Access restricted to Founder, Co-Founder, or CTO." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const isEditor = canManageMobile(user);

    // Fetch all releases ordered by newest first
    const releases = await db.mobileAppRelease.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const serializedReleases = releases.map(serializeRelease);

    // Find current published stable and beta releases
    const publishedStable = serializedReleases.find(
      (r) => r.isCurrentPublished && r.releaseChannel === "STABLE"
    ) || null;
    const publishedBeta = serializedReleases.find(
      (r) => r.isCurrentPublished && r.releaseChannel === "BETA"
    ) || null;

    // Fetch global mobile config
    const globalConfig = await getOrCreateGlobalMobileConfig();

    // Fetch aggregate analytics
    const totalDownloads = serializedReleases.reduce((sum, r) => sum + (r.downloadCount || 0), 0);
    const totalPublished = serializedReleases.filter((r) => r.status === "PUBLISHED").length;
    const totalDrafts = serializedReleases.filter((r) => r.status === "DRAFT").length;

    // Fetch recent APK audit logs
    const auditLogs = await db.auditLog.findMany({
      where: {
        action: { startsWith: "MOBILE_APP_RELEASE" },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    // Fetch recent events
    const recentEvents = await db.mobileReleaseEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        release: {
          select: { versionName: true, versionCode: true, releaseChannel: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        isEditor,
        currentPublished: publishedStable || publishedBeta,
        publishedStable,
        publishedBeta,
        globalConfig: {
          currentVersion: globalConfig.currentVersion,
          minVersion: globalConfig.minVersion,
          buildNumber: globalConfig.buildNumber,
          forceUpdateEnabled: globalConfig.forceUpdateEnabled,
          softUpdateEnabled: globalConfig.softUpdateEnabled,
          androidApkUrl: globalConfig.androidApkUrl,
        },
        storage: {
          provider: "SUPABASE",
          bucket: APK_BUCKET_NAME,
          status: "CONNECTED",
        },
        stats: {
          totalReleases: serializedReleases.length,
          totalPublished,
          totalDrafts,
          totalDownloads,
        },
        releases: serializedReleases,
        auditLogs,
        recentEvents,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/admin/mobile/releases]", err);
    return NextResponse.json({ error: "Failed to load mobile releases." }, { status: 500 });
  }
}
