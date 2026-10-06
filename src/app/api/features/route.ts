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

const DEFAULT_FLAGS = [
  { flagKey: "MOBILE_ATTENDANCE", name: "Mobile Attendance Check-in", description: "Enables attendance marking in Mobile App during open windows.", isEnabled: true },
  { flagKey: "MOBILE_DM", name: "Mobile Direct Messages", description: "Enables team direct messaging & conversations in Mobile App.", isEnabled: true },
  { flagKey: "MOBILE_POSTS", name: "Mobile Team Posts & Feed", description: "Enables social sharing and updates on Mobile feed.", isEnabled: true },
  { flagKey: "MOBILE_PUSH", name: "Mobile Push Notifications", description: "Delivers background alerts to registered mobile devices.", isEnabled: true },
  { flagKey: "DESKTOP_AI", name: "Desktop AI Engine Access", description: "Master switch for CodeXa AI Desktop client connectivity.", isEnabled: true },
  { flagKey: "DESKTOP_CODE_MODELS", name: "Code Assistant Models", description: "Allows access to autonomous coding models on desktop.", isEnabled: true },
  { flagKey: "DESKTOP_RESEARCH_MODELS", name: "Deep Research Models", description: "Allows access to research and document reasoning models.", isEnabled: false },
  { flagKey: "INTERN_PROJECT_CREATION", name: "Intern Project Drafts", description: "Permits interns to submit project drafts for approval.", isEnabled: true },
  { flagKey: "EMPLOYEE_PROJECT_CREATION", name: "Employee Project Publishing", description: "Permits core engineers to initiate project publishing.", isEnabled: true },
];

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    let flags = await db.featureFlag.findMany({
      orderBy: { flagKey: "asc" },
    });

    // Seed defaults if empty
    if (flags.length === 0) {
      for (const df of DEFAULT_FLAGS) {
        await db.featureFlag.upsert({
          where: { flagKey: df.flagKey },
          update: {},
          create: df,
        });
      }
      flags = await db.featureFlag.findMany({ orderBy: { flagKey: "asc" } });
    }

    return NextResponse.json({ success: true, flags }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/features]", err);
    return NextResponse.json({ error: "Failed to load feature flags." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.MANAGE_PLATFORM_SETTINGS)) {
    return NextResponse.json({ error: "Forbidden. Platform settings management required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { flagKey, isEnabled, targetType = "GLOBAL", targetValue = "ALL", name, description } = body;

    if (!flagKey) {
      return NextResponse.json({ error: "flagKey is required." }, { status: 400 });
    }

    const flag = await db.featureFlag.upsert({
      where: { flagKey },
      update: {
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        targetType,
        targetValue,
        ...(name && { name }),
        ...(description && { description }),
      },
      create: {
        flagKey,
        name: name || flagKey,
        description: description || null,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        targetType,
        targetValue,
        createdById: currentUser.id,
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: flag.id,
      action: "FEATURE_FLAG_TOGGLED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) set feature flag ${flagKey} = ${flag.isEnabled}. Target: ${targetType}.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, flag, message: `Feature flag ${flagKey} updated.` });
  } catch (err: any) {
    console.error("[POST /api/features]", err);
    return NextResponse.json({ error: "Failed to update feature flag." }, { status: 500 });
  }
}
