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

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canViewMobile(auth.user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const search = req.nextUrl.searchParams.get("q")?.trim() || "";
    const targetUserId = req.nextUrl.searchParams.get("userId")?.trim() || "";

    if (targetUserId) {
      // Get overrides for specific user
      const [targetUser, userOverrides] = await Promise.all([
        db.user.findUnique({
          where: { id: targetUserId },
          include: { employmentProfile: true },
        }),
        db.mobileFeatureOverride.findMany({
          where: { scope: "USER", targetUserId },
        }),
      ]);

      if (!targetUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      const overridesMap: Record<string, string> = {};
      for (const ov of userOverrides) {
        overridesMap[ov.featureKey] = ov.state;
      }

      return NextResponse.json({
        success: true,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          fullName: targetUser.fullName,
          email: targetUser.email,
          role: targetUser.role,
          employeeId: targetUser.employmentProfile?.employeeId || null,
        },
        overrides: overridesMap,
      });
    }

    // Search users by name, email, employeeId
    const users = await db.user.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              {
                employmentProfile: {
                  employeeId: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : undefined,
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        employmentProfile: {
          select: {
            employeeId: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    // Also get all distinct users that currently have overrides
    const usersWithOverrides = await db.mobileFeatureOverride.findMany({
      where: { scope: "USER" },
      distinct: ["targetUserId"],
      select: { targetUserId: true },
    });

    return NextResponse.json(
      {
        success: true,
        users,
        usersWithOverrideIds: usersWithOverrides.map((u) => u.targetUserId).filter(Boolean),
        featuresList: MOBILE_FEATURE_LIST,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/admin/apps/mobile/users]", err);
    return NextResponse.json(
      { error: "Failed to load users for mobile overrides." },
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
      { error: "Forbidden. Only Founder or Co-Founder can manage user overrides." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { userId, featureKey, state } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required." }, { status: 400 });
    }

    if (!featureKey) {
      return NextResponse.json({ error: "Feature key required." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: { employmentProfile: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const actorName = user.displayName || user.username || "Admin";
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const targetLabel = `${targetUser.fullName || targetUser.username} (${targetUser.employmentProfile?.employeeId || targetUser.email})`;

    if (state === "DEFAULT" || !state) {
      // Revert to role/global default
      await db.mobileFeatureOverride.deleteMany({
        where: {
          scope: "USER",
          targetUserId: userId,
          featureKey,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: userId,
        action: "MOBILE_USER_OVERRIDE_CHANGED",
        details: `${actorName} reset user override for ${targetLabel} on ${featureKey} to DEFAULT.`,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: `Override for ${targetLabel} on ${featureKey} reset to DEFAULT.`,
      });
    }

    if (state !== "ENABLED" && state !== "DISABLED") {
      return NextResponse.json({ error: "State must be ENABLED, DISABLED, or DEFAULT." }, { status: 400 });
    }

    // Upsert user override
    const existing = await db.mobileFeatureOverride.findFirst({
      where: {
        scope: "USER",
        targetUserId: userId,
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
          scope: "USER",
          targetUserId: userId,
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
      targetId: userId,
      action: "MOBILE_USER_OVERRIDE_CHANGED",
      details: `${actorName} set user override for ${targetLabel} on ${featureKey} to ${state}.`,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `User override saved for ${targetLabel}: ${featureKey} = ${state}`,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/apps/mobile/users]", err);
    return NextResponse.json(
      { error: "Failed to update user override." },
      { status: 500 }
    );
  }
}
