import { NextRequest, NextResponse } from "next/server";
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
    const globalConfig = await getOrCreateGlobalMobileConfig();

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
          expectedEndAt: null,
        },
        version: {
          minimumSupported: globalConfig.minVersion || "1.0.0",
          latest: globalConfig.currentVersion || "1.0.0",
          forceUpdate: Boolean(globalConfig.forceUpdateEnabled),
          optionalUpdate: Boolean(globalConfig.softUpdateEnabled),
          updateUrl:
            globalConfig.androidApkUrl ||
            globalConfig.downloadUrl ||
            "https://codxa-agency.online/downloads/CodeXa.apk",
          releaseNotes:
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
