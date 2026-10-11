import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { serveDirectApkBinary } from "@/lib/apk-database-streamer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Increment download count asynchronously
    db.mobileAppRelease
      .findFirst({
        where: {
          platform: "ANDROID",
          releaseChannel: "STABLE",
          isCurrentPublished: true,
        },
      })
      .then((release) => {
        if (release) {
          db.mobileAppRelease
            .update({
              where: { id: release.id },
              data: { downloadCount: { increment: 1 } },
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // 2. Stream the binary directly from disk or PostgreSQL database
    // (Never redirects to GitHub; preserves official domain & direct installation)
    return await serveDirectApkBinary(req, {
      fallbackFilename: "CodeXa.apk",
    });
  } catch (err: any) {
    console.error("[GET /downloads/CodeXa.apk]", err);
    return await serveDirectApkBinary(req);
  }
}

export async function HEAD(req: NextRequest) {
  return await serveDirectApkBinary(req);
}
