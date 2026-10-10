import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateGlobalMobileConfig } from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_PUBLIC_CDN_APK =
  "https://vdpbdveensbnyahjougj.supabase.co/storage/v1/object/public/mobile-releases/codexa-apk/stable/1.0.5/CodeXa.apk";

export async function GET(req: NextRequest) {
  try {
    const release = await db.mobileAppRelease.findFirst({
      where: {
        platform: "ANDROID",
        releaseChannel: "STABLE",
        isCurrentPublished: true,
      },
      orderBy: { versionCode: "desc" },
    });

    let downloadUrl = release?.apkDownloadUrl;

    if (!downloadUrl) {
      const globalConfig = await getOrCreateGlobalMobileConfig();
      downloadUrl = globalConfig.androidApkUrl || globalConfig.downloadUrl;
    }

    if (!downloadUrl) {
      downloadUrl = FALLBACK_PUBLIC_CDN_APK;
    }

    if (release) {
      db.mobileAppRelease
        .update({
          where: { id: release.id },
          data: { downloadCount: { increment: 1 } },
        })
        .catch((err) => console.warn("[Download Tracker]", err));
    }

    return NextResponse.redirect(downloadUrl, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=60",
        "Content-Disposition": 'attachment; filename="CodeXa.apk"',
      },
    });
  } catch (err: any) {
    console.error("[GET /downloads/CodeXa.apk]", err);
    return NextResponse.redirect(FALLBACK_PUBLIC_CDN_APK, { status: 302 });
  }
}
