import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { canManageMobile, canViewMobile } from "@/lib/permissions";
import { MOBILE_FEATURE_LIST } from "@/lib/mobile-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const SUPPORTED_ROLES = [
  "FOUNDER",
  "CO_FOUNDER",
  "CEO",
  "CTO",
  "HR",
  "COO",
  "EMPLOYEE",
  "INTERN",
];

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canViewMobile(auth.user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const overrides = await db.mobileFeatureOverride.findMany({
      where: { scope: "ROLE" },
      orderBy: { featureKey: "asc" },
    });

    // Group overrides by role: Record<Role, Record<FeatureKey, "ENABLED" | "DISABLED">>
    const roleOverrides: Record<string, Record<string, string>> = {};
    for (const role of SUPPORTED_ROLES) {
      roleOverrides[role] = {};
    }

    for (const ov of overrides) {
      if (ov.targetRole) {
        if (!roleOverrides[ov.targetRole]) {
          roleOverrides[ov.targetRole] = {};
        }
        roleOverrides[ov.targetRole][ov.featureKey] = ov.state;
      }
    }

    return NextResponse.json(
      {
        success: true,
        supportedRoles: SUPPORTED_ROLES,
        featuresList: MOBILE_FEATURE_LIST,
        roleOverrides,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/admin/apps/mobile/roles]", err);
    return NextResponse.json(
      { error: "Failed to load role overrides." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = auth.user;
  if (!canManageMobile(user)) {
    return NextResponse.json(
      { error: "Forbidden. Only Founder or Co-Founder can manage role overrides." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { role, featureKey, state } = body;

    if (!role || !SUPPORTED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    if (!featureKey) {
      return NextResponse.json({ error: "Feature key required." }, { status: 400 });
    }

    const actorName = user.displayName || user.username || "Admin";
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";

    if (state === "DEFAULT" || !state) {
      // Remove override, revert to default
      await db.mobileFeatureOverride.deleteMany({
        where: {
          scope: "ROLE",
          targetRole: role,
          featureKey,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: role,
        action: "MOBILE_ROLE_OVERRIDE_CHANGED",
        details: `${actorName} reset role override for ${role} on ${featureKey} to DEFAULT.`,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: `Override for ${role} on ${featureKey} reset to DEFAULT.`,
      });
    }

    if (state !== "ENABLED" && state !== "DISABLED") {
      return NextResponse.json({ error: "State must be ENABLED, DISABLED, or DEFAULT." }, { status: 400 });
    }

    // Upsert role override
    const existing = await db.mobileFeatureOverride.findFirst({
      where: {
        scope: "ROLE",
        targetRole: role,
        featureKey,
      },
    });

    if (existing) {
      await db.mobileFeatureOverride.update({
        where: { id: existing.id },
        data: { state, updatedBy: actorName },
      });
    } else {
      await db.mobileFeatureOverride.create({
        data: {
          scope: "ROLE",
          targetRole: role,
          featureKey,
          state,
          updatedBy: actorName,
        },
      });
    }

    // Bump configVersion
    const globalConfig = await db.mobileAppConfig.findFirst({ where: { targetType: "GLOBAL" } });
    if (globalConfig) {
      await db.mobileAppConfig.update({
        where: { id: globalConfig.id },
        data: { configVersion: (globalConfig.configVersion || 1) + 1 },
      });
    }

    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: role,
      action: "MOBILE_ROLE_OVERRIDE_CHANGED",
      details: `${actorName} set role override for ${role} on ${featureKey} to ${state}.`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Role override saved: ${role} -> ${featureKey} = ${state}`,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/apps/mobile/roles]", err);
    return NextResponse.json(
      { error: "Failed to update role override." },
      { status: 500 }
    );
  }
}
