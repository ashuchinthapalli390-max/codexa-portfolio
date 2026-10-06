import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// Default role-to-role DM matrix
const DEFAULT_DM_MATRIX = {
  INTERN_TO_INTERN: true,
  INTERN_TO_EMPLOYEE: true,
  INTERN_TO_CTO: true,
  INTERN_TO_HR: true,
  INTERN_TO_FOUNDER: false, // Protected by default
  EMPLOYEE_TO_EMPLOYEE: true,
  EMPLOYEE_TO_HR: true,
  EMPLOYEE_TO_CTO: true,
  EMPLOYEE_TO_FOUNDER: true,
  LEADERSHIP_TO_ALL: true,
};

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    let config = await db.mobileAppConfig.findFirst({
      where: { targetType: "GLOBAL" },
    });

    if (!config) {
      config = await db.mobileAppConfig.create({
        data: {
          targetType: "GLOBAL",
          attendanceEnabled: true,
          dmEnabled: true,
          postsEnabled: true,
          commentsEnabled: true,
          pushEnabled: true,
          dmRoleMatrix: DEFAULT_DM_MATRIX,
          minVersion: "1.0.0",
          currentVersion: "1.0.0",
          downloadUrl: "",
        },
      });
    }

    return NextResponse.json({ success: true, config }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/apps/mobile-config]", err);
    return NextResponse.json({ error: "Failed to load mobile app configuration." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.MANAGE_MOBILE_FEATURES)) {
    return NextResponse.json({ error: "Forbidden. Insufficient permissions to manage mobile features." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      attendanceEnabled,
      dmEnabled,
      postsEnabled,
      commentsEnabled,
      pushEnabled,
      dmRoleMatrix,
      currentVersion,
      minVersion,
      downloadUrl,
    } = body;

    let config = await db.mobileAppConfig.findFirst({
      where: { targetType: "GLOBAL" },
    });

    if (!config) {
      config = await db.mobileAppConfig.create({
        data: {
          targetType: "GLOBAL",
          attendanceEnabled: attendanceEnabled ?? true,
          dmEnabled: dmEnabled ?? true,
          postsEnabled: postsEnabled ?? true,
          commentsEnabled: commentsEnabled ?? true,
          pushEnabled: pushEnabled ?? true,
          dmRoleMatrix: dmRoleMatrix || DEFAULT_DM_MATRIX,
          currentVersion: currentVersion || "1.0.0",
          minVersion: minVersion || "1.0.0",
          downloadUrl: downloadUrl || "",
        },
      });
    } else {
      config = await db.mobileAppConfig.update({
        where: { id: config.id },
        data: {
          ...(attendanceEnabled !== undefined && { attendanceEnabled }),
          ...(dmEnabled !== undefined && { dmEnabled }),
          ...(postsEnabled !== undefined && { postsEnabled }),
          ...(commentsEnabled !== undefined && { commentsEnabled }),
          ...(pushEnabled !== undefined && { pushEnabled }),
          ...(dmRoleMatrix && { dmRoleMatrix }),
          ...(currentVersion && { currentVersion }),
          ...(minVersion && { minVersion }),
          ...(downloadUrl !== undefined && { downloadUrl }),
        },
      });
    }

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: config.id,
      action: "MOBILE_CONFIG_UPDATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) updated Mobile App feature toggles & DM permissions.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, config, message: "Mobile App configuration updated." });
  } catch (err: any) {
    console.error("[POST /api/apps/mobile-config]", err);
    return NextResponse.json({ error: "Failed to update mobile app configuration." }, { status: 500 });
  }
}
