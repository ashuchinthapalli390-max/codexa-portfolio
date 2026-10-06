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

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canManage =
    hasPermission(currentUser, Permission.MANAGE_AI_ENTITLEMENTS) ||
    hasPermission(currentUser, Permission.MANAGE_DESKTOP_ACCESS);

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || currentUser.id;

  if (!canManage && targetUserId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const entitlements = await db.modelEntitlement.findMany({
      where: { userId: targetUserId },
      orderBy: { modelName: "asc" },
    });

    return NextResponse.json({ success: true, entitlements }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/apps/ai-entitlements]", err);
    return NextResponse.json({ error: "Failed to load model entitlements." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  if (!hasPermission(currentUser, Permission.MANAGE_AI_ENTITLEMENTS)) {
    return NextResponse.json({ error: "Forbidden. Insufficient permissions to configure AI entitlements." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      userId,
      modelName,
      enabled = true,
      dailyLimit = 100,
      monthlyLimit = 3000,
      tokenLimit = 1000000,
      costLimit = 50.0,
    } = body;

    if (!userId || !modelName) {
      return NextResponse.json({ error: "userId and modelName are required." }, { status: 400 });
    }

    const entitlement = await db.modelEntitlement.upsert({
      where: {
        userId_modelName: {
          userId,
          modelName: modelName.trim(),
        },
      },
      update: {
        enabled,
        dailyLimit: parseInt(dailyLimit, 10),
        monthlyLimit: parseInt(monthlyLimit, 10),
        tokenLimit: tokenLimit ? parseInt(tokenLimit, 10) : null,
        costLimit: costLimit ? parseFloat(costLimit) : null,
      },
      create: {
        userId,
        modelName: modelName.trim(),
        enabled,
        dailyLimit: parseInt(dailyLimit, 10),
        monthlyLimit: parseInt(monthlyLimit, 10),
        tokenLimit: tokenLimit ? parseInt(tokenLimit, 10) : null,
        costLimit: costLimit ? parseFloat(costLimit) : null,
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: entitlement.id,
      action: "AI_ENTITLEMENT_UPDATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) set "${modelName}" entitlement for user ${userId} (Enabled: ${enabled}, Daily: ${dailyLimit}).`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, entitlement, message: "AI model entitlement saved." });
  } catch (err: any) {
    console.error("[POST /api/apps/ai-entitlements]", err);
    return NextResponse.json({ error: "Failed to save AI entitlement." }, { status: 500 });
  }
}
