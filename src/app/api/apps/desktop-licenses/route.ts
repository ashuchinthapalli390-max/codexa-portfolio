import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  hasPermission,
  getEffectiveRole,
} from "@/lib/permissions";
import { generateDesktopActivationKey } from "@/lib/cxa-ids";

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
    hasPermission(currentUser, Permission.MANAGE_DESKTOP_ACCESS) ||
    hasPermission(currentUser, Permission.MANAGE_LICENSES);

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || currentUser.id;

  try {
    if (!canManage) {
      // Member can only view their own license
      const license = await db.desktopLicense.findFirst({
        where: { userId: currentUser.id },
        include: { activations: true },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        { success: true, license, isSelfOnly: true },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Admin view
    const whereClause: any = {};
    if (url.searchParams.get("userId")) {
      whereClause.userId = targetUserId;
    }

    const licenses = await db.desktopLicense.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        activations: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, licenses }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/apps/desktop-licenses]", err);
    return NextResponse.json({ error: "Failed to load desktop licenses." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canManage =
    hasPermission(currentUser, Permission.MANAGE_DESKTOP_ACCESS) ||
    hasPermission(currentUser, Permission.MANAGE_LICENSES);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden. Insufficient permissions to manage desktop licenses." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, userId, licenseId, deviceLimit = 2 } = body;

    // 1. GENERATE NEW LICENSE KEY
    if (action === "generate") {
      if (!userId) {
        return NextResponse.json({ error: "userId is required to generate license." }, { status: 400 });
      }

      const targetUser = await db.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      // Expire previous active licenses for user
      await db.desktopLicense.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      // Generate key pair (rawKey shown once; only hash persisted)
      const { rawKey, keyHash, keyDisplayPrefix } = generateDesktopActivationKey();

      const newLicense = await db.desktopLicense.create({
        data: {
          userId,
          licenseKeyHash: keyHash,
          keyDisplayPrefix,
          status: "ACTIVE",
          deviceLimit: parseInt(deviceLimit, 10) || 2,
          createdById: currentUser.id,
        },
      });

      const targetName = targetUser.fullName || targetUser.username;

      await dataStore.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        targetId: newLicense.id,
        action: "DESKTOP_LICENSE_GENERATED",
        details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) provisioned CodeXa AI Desktop license for ${targetName} (${keyDisplayPrefix}).`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        license: newLicense,
        oneTimeKey: rawKey, // Crucial: shown once to administrator
        message: "Desktop activation key generated. Please copy it now as the plaintext key will not be displayed again.",
      });
    }

    // 2. REVOKE LICENSE
    if (action === "revoke") {
      if (!licenseId) {
        return NextResponse.json({ error: "licenseId is required to revoke." }, { status: 400 });
      }

      const license: any = await db.desktopLicense.update({
        where: { id: licenseId },
        data: { status: "REVOKED" },
        include: { user: true },
      });

      const licenseeName = license.user?.fullName || license.user?.username || "Member";

      await dataStore.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        targetId: licenseId,
        action: "DESKTOP_LICENSE_REVOKED",
        details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) revoked desktop license for ${licenseeName}.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({ success: true, license, message: "Desktop license revoked." });
    }

    // 3. RESET DEVICES
    if (action === "reset_devices") {
      if (!licenseId) {
        return NextResponse.json({ error: "licenseId is required to reset devices." }, { status: 400 });
      }

      await db.deviceActivation.updateMany({
        where: { licenseId },
        data: { status: "DEACTIVATED" },
      });

      return NextResponse.json({ success: true, message: "Activated devices have been reset." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/apps/desktop-licenses]", err);
    return NextResponse.json({ error: "Failed to process desktop license operation." }, { status: 500 });
  }
}
