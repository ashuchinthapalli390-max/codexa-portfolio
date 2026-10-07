import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { canManageMobile, canViewMobile } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canViewMobile(auth.user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const sessions = await db.mobileSession.findMany({
      orderBy: { lastActive: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            role: true,
            employmentProfile: {
              select: {
                employeeId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, sessions }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/admin/apps/mobile/sessions]", err);
    return NextResponse.json({ error: "Failed to load mobile sessions." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = auth.user;
  if (!canManageMobile(user)) {
    return NextResponse.json(
      { error: "Forbidden. Only Founder or Co-Founder can revoke mobile sessions." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { action, sessionId, userId } = body;
    const actorName = user.displayName || user.username || "Admin";
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";

    if (action === "revoke_one" && sessionId) {
      const session = await db.mobileSession.update({
        where: { id: sessionId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: actorName,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: session.id,
        action: "MOBILE_SESSION_REVOKED",
        details: `${actorName} revoked mobile session ${session.id} for user ${session.userId}.`,
        ipAddress,
      });

      return NextResponse.json({ success: true, message: "Device session revoked." });
    }

    if (action === "revoke_user_all" && userId) {
      await db.mobileSession.updateMany({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: actorName,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: userId,
        action: "MOBILE_SESSIONS_USER_REVOKED",
        details: `${actorName} revoked all mobile sessions for user ${userId}.`,
        ipAddress,
      });

      return NextResponse.json({ success: true, message: "All mobile sessions for user revoked." });
    }

    if (action === "revoke_all_global") {
      await db.mobileSession.updateMany({
        where: { isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: actorName,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: "GLOBAL",
        action: "MOBILE_ALL_SESSIONS_REVOKED",
        details: `${actorName} performed global forced logout of all mobile devices.`,
        ipAddress,
      });

      return NextResponse.json({ success: true, message: "All active mobile sessions have been revoked." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/admin/apps/mobile/sessions]", err);
    return NextResponse.json({ error: "Failed to manage mobile session." }, { status: 500 });
  }
}
