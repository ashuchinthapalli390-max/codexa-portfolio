import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole, hasPermission, Permission } from "@/lib/permissions";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const authUser = await resolveRequestUser(req);
    if (!authUser) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Account is disabled." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const role = getEffectiveRole(user);
    const canManage =
      ["FOUNDER", "CO_FOUNDER", "CEO", "HR", "OWNER", "ADMIN"].includes(role) ||
      hasPermission(user, Permission.OPEN_ATTENDANCE_WINDOW) ||
      hasPermission(user, Permission.MANAGE_ATTENDANCE);

    if (!canManage) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Only leadership/HR can control attendance windows." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();
    const action = (body.action || "OPEN").toUpperCase();
    const now = new Date();

    if (action === "OPEN") {
      const durationMinutes = Math.min(120, Math.max(5, parseInt(body.durationMinutes || "30", 10)));
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // Close previous open windows
      await db.attendanceWindow.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "CLOSED" },
      });

      const window = await db.attendanceWindow.create({
        data: {
          date: now,
          startTime: now,
          endTime,
          status: "ACTIVE",
          eligibleRoles: ["EMPLOYEE", "INTERN"],
          createdById: user.id,
          createdByName: user.fullName || user.profile?.displayName || user.username,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName: user.fullName || user.username,
        targetId: window.id,
        action: "ATTENDANCE_WINDOW_OPENED",
        details: `${role} opened attendance window for ${durationMinutes} minutes from mobile app.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        ok: true,
        message: `Attendance window opened for ${durationMinutes} minutes.`,
        window: {
          id: window.id,
          status: "ACTIVE",
          startTime: window.startTime.toISOString(),
          endTime: window.endTime.toISOString(),
        },
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    } else if (action === "CLOSE") {
      const windowId = body.id;
      if (windowId) {
        await db.attendanceWindow.update({
          where: { id: windowId },
          data: { status: "CLOSED", endTime: now },
        });
      } else {
        await db.attendanceWindow.updateMany({
          where: { status: "ACTIVE" },
          data: { status: "CLOSED", endTime: now },
        });
      }

      await dataStore.logAudit({
        actorId: user.id,
        actorName: user.fullName || user.username,
        targetId: windowId || "ALL_ACTIVE",
        action: "ATTENDANCE_WINDOW_CLOSED",
        details: `${role} closed active attendance window from mobile app.`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        ok: true,
        message: "Attendance window has been closed.",
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(
      { ok: false, error: { code: "INVALID_ACTION", message: "Invalid action. Use OPEN or CLOSE." }, requestId },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[POST /api/mobile/attendance/window error]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to control attendance window." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
