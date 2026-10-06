import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, revokeAllUserSessions } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import {
  Permission,
  requirePermission,
  hasPermission,
  getEffectiveRole,
  isPermanentFounder,
} from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { userId } = params;
  const currentUser = auth.user;
  const isSelf = currentUser.id === userId;
  const canView =
    hasPermission(currentUser, Permission.VIEW_EMPLOYEES) ||
    hasPermission(currentUser, Permission.VIEW_INTERNS) ||
    hasPermission(currentUser, Permission.VIEW_USERS);

  if (!isSelf && !canView) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const profile = await db.employmentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            orgRole: true,
            isActive: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Employment profile not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/employment/:userId]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { userId } = params;
  const currentUser = auth.user;
  const actorRole = getEffectiveRole(currentUser);

  try {
    const body = await req.json();

    // Offboarding / Member Deactivation Action
    if (body.action === "deactivate") {
      const canManage =
        hasPermission(currentUser, Permission.MANAGE_EMPLOYEES) ||
        hasPermission(currentUser, Permission.MANAGE_INTERNS);

      if (!canManage) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to deactivate staff." }, { status: 403 });
      }

      const targetUser = await db.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "Target member not found." }, { status: 404 });
      }

      // Safeguard: Never allow deactivating Permanent Founder or Co-Founder
      if (isPermanentFounder(targetUser.email) || targetUser.role === "OWNER" || targetUser.orgRole === "FOUNDER" || targetUser.orgRole === "CO_FOUNDER") {
        return NextResponse.json({ error: "High-level account protection: Founder / Co-Founder accounts cannot be deactivated." }, { status: 403 });
      }

      const deactivationStatus = body.status || "TERMINATED"; // "TERMINATED" | "RESIGNED" | "SUSPENDED"

      // 1. Disable user login
      await db.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // 2. Update employment status (preserves history)
      await db.employmentProfile.updateMany({
        where: { userId },
        data: {
          status: deactivationStatus,
          endDate: new Date(),
        },
      });

      // 3. Revoke active desktop licenses
      await db.desktopLicense.updateMany({
        where: { userId },
        data: { status: "REVOKED" },
      });

      // 4. Revoke active web sessions
      await revokeAllUserSessions(userId);

      const targetName = targetUser.fullName || targetUser.username;

      // 5. Audit log
      await dataStore.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        targetId: userId,
        action: "MEMBER_DEACTIVATED",
        details: `${actorRole} (${currentUser.displayName}) executed member deactivation for ${targetName} (@${targetUser.username}). Status: ${deactivationStatus}. Sessions & desktop licenses revoked.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        message: `Member ${targetName} has been deactivated (${deactivationStatus}). All sessions and licenses revoked; history preserved.`,
      });
    }

    return NextResponse.json({ error: "Unrecognized action." }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/employment/:userId]", err);
    return NextResponse.json({ error: "Failed to process employment action." }, { status: 500 });
  }
}
