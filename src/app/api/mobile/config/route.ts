import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectiveRole } from "@/lib/permissions";
import {
  getOrCreateGlobalMobileConfig,
  resolveFullMobilePackage,
} from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Extracts and validates user session from either:
 * 1. Bearer Token in Authorization header: `Bearer <token>`
 * 2. `cxa_session` HttpOnly cookie
 */
async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") {
        return res.user;
      }
    }
  }

  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") {
    return cookieRes.user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Valid CodeXa mobile session required." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Load full user details with employment profile
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!fullUser || !fullUser.isActive) {
      return NextResponse.json(
        { error: "User account inactive or not found." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const globalConfig = await getOrCreateGlobalMobileConfig();
    const effectiveRole = getEffectiveRole(fullUser);

    // Maintenance Mode enforcement:
    // If maintenance is ON and user is NOT Founder or Co-Founder, block normal access
    if (globalConfig.maintenanceEnabled && effectiveRole !== "FOUNDER" && effectiveRole !== "CO_FOUNDER") {
      return NextResponse.json(
        {
          maintenance: true,
          message: globalConfig.maintenanceMessage || "CodeXa is currently under scheduled maintenance.",
          app: {
            name: globalConfig.appName || "CodeXa",
            version: globalConfig.currentVersion,
            minimumVersion: globalConfig.minVersion,
            maintenance: true,
            forceUpdate: false,
          },
          serverTime: new Date().toISOString(),
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    // Platform disabled enforcement
    if (globalConfig.platformStatus === "DISABLED" && effectiveRole !== "FOUNDER" && effectiveRole !== "CO_FOUNDER") {
      return NextResponse.json(
        {
          disabled: true,
          message: "CodeXa mobile application services are currently offline.",
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    // Check version requirement if client specified version in headers
    const clientVersion = req.headers.get("x-app-version") || req.nextUrl.searchParams.get("version");
    let updateRequired = false;
    if (clientVersion && globalConfig.minVersion) {
      // Basic semver compare or inequality
      if (clientVersion < globalConfig.minVersion) {
        updateRequired = true;
      }
    }

    const payload = await resolveFullMobilePackage(fullUser, globalConfig);

    // Register or touch mobile device session if device headers sent
    const deviceId = req.headers.get("x-device-id");
    const deviceName = req.headers.get("x-device-name");
    const platform = req.headers.get("x-platform"); // ANDROID, IOS

    if (deviceId) {
      try {
        const existingSession = await db.mobileSession.findFirst({
          where: { userId: fullUser.id, deviceId },
        });

        if (existingSession) {
          if (existingSession.isRevoked) {
            return NextResponse.json(
              { error: "This mobile device session has been revoked by leadership." },
              { status: 401, headers: NO_CACHE_HEADERS }
            );
          }
          await db.mobileSession.update({
            where: { id: existingSession.id },
            data: {
              lastActive: new Date(),
              appVersion: clientVersion || existingSession.appVersion,
            },
          });
        } else {
          // Verify max devices limit
          const activeCount = await db.mobileSession.count({
            where: { userId: fullUser.id, isRevoked: false },
          });

          if (activeCount >= (globalConfig.maxDevicesPerUser || 2)) {
            // Cannot register new device
            // If leadership permits multiple, maybe revoke oldest or warn
          } else {
            await db.mobileSession.create({
              data: {
                userId: fullUser.id,
                deviceId,
                deviceName: deviceName || "Mobile Device",
                platform: platform || "ANDROID",
                appVersion: clientVersion || "1.0.0",
              },
            });
          }
        }
      } catch (sessionErr) {
        console.warn("[MobileSession tracking warning]", sessionErr);
      }
    }

    return NextResponse.json(
      {
        ...payload,
        updateRequired,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/mobile/config]", err);
    return NextResponse.json(
      { error: "Failed to resolve mobile app configuration." },
      { status: 500 }
    );
  }
}
