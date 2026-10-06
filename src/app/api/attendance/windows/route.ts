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

export async function GET() {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const windows = await db.attendanceWindow.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const activeWindow = await db.attendanceWindow.findFirst({
      where: {
        status: "ACTIVE",
        endTime: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, windows, activeWindow },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/attendance/windows]", err);
    return NextResponse.json({ error: "Failed to load attendance windows." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canOpen =
    hasPermission(currentUser, Permission.OPEN_ATTENDANCE_WINDOW) ||
    hasPermission(currentUser, Permission.MANAGE_ATTENDANCE);

  if (!canOpen) {
    return NextResponse.json(
      { error: "Forbidden. Insufficient permissions to open attendance windows." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      durationMinutes = 30,
      eligibleRoles = ["EMPLOYEE", "INTERN"],
    } = body;

    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // Close any previous open window
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
        eligibleRoles,
        createdById: currentUser.id,
        createdByName: currentUser.displayName,
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: window.id,
      action: "ATTENDANCE_WINDOW_OPENED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) opened attendance window for ${durationMinutes} mins (until ${endTime.toLocaleTimeString()}).`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      window,
      message: `Attendance window opened until ${endTime.toLocaleTimeString()}.`,
    });
  } catch (err: any) {
    console.error("[POST /api/attendance/windows]", err);
    return NextResponse.json({ error: "Failed to open attendance window." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canManage =
    hasPermission(currentUser, Permission.OPEN_ATTENDANCE_WINDOW) ||
    hasPermission(currentUser, Permission.MANAGE_ATTENDANCE);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, action, extendMinutes } = body;

    const window = await db.attendanceWindow.findUnique({
      where: { id },
    });

    if (!window) {
      return NextResponse.json({ error: "Attendance window not found." }, { status: 404 });
    }

    let updatedWindow;

    if (action === "close") {
      updatedWindow = await db.attendanceWindow.update({
        where: { id },
        data: { status: "CLOSED", endTime: new Date() },
      });
    } else if (action === "cancel") {
      updatedWindow = await db.attendanceWindow.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    } else if (action === "extend") {
      const minutes = parseInt(extendMinutes, 10) || 10;
      const newEndTime = new Date(window.endTime.getTime() + minutes * 60 * 1000);
      updatedWindow = await db.attendanceWindow.update({
        where: { id },
        data: {
          endTime: newEndTime,
          status: "ACTIVE",
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: id,
      action: "ATTENDANCE_WINDOW_UPDATED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) performed "${action}" on attendance window.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, window: updatedWindow });
  } catch (err: any) {
    console.error("[PATCH /api/attendance/windows]", err);
    return NextResponse.json({ error: "Failed to update attendance window." }, { status: 500 });
  }
}
