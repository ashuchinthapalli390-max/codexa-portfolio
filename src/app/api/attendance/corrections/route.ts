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

  const currentUser = auth.user;
  const canManage =
    hasPermission(currentUser, Permission.MANAGE_ATTENDANCE) ||
    hasPermission(currentUser, Permission.EDIT_ATTENDANCE);

  try {
    const corrections = await db.attendanceCorrection.findMany({
      where: canManage ? {} : { userId: currentUser.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, corrections }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/attendance/corrections]", err);
    return NextResponse.json({ error: "Failed to load corrections." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;

  try {
    const body = await req.json();
    const { date, reason, requestedStatus = "PRESENT", currentStatus = "ABSENT" } = body;

    if (!date || !reason) {
      return NextResponse.json({ error: "Date and reason are required." }, { status: 400 });
    }

    const correction = await db.attendanceCorrection.create({
      data: {
        userId: currentUser.id,
        date: new Date(date),
        currentStatus,
        requestedStatus,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      correction,
      message: "Attendance correction request submitted to HR / Leadership.",
    });
  } catch (err: any) {
    console.error("[POST /api/attendance/corrections]", err);
    return NextResponse.json({ error: "Failed to submit correction request." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canManage =
    hasPermission(currentUser, Permission.MANAGE_ATTENDANCE) ||
    hasPermission(currentUser, Permission.EDIT_ATTENDANCE);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status, reviewNotes } = body; // status: "APPROVED" | "REJECTED"

    const existing = await db.attendanceCorrection.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Correction request not found." }, { status: 404 });
    }

    const updated = await db.attendanceCorrection.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
        reviewedBy: currentUser.displayName,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes?.trim() || null,
      },
    });

    // If APPROVED, update or insert corresponding AttendanceRecord
    if (status.toUpperCase() === "APPROVED") {
      await db.attendanceRecord.create({
        data: {
          userId: existing.userId,
          date: existing.date,
          status: existing.requestedStatus,
          source: "MANUAL",
          editedBy: currentUser.displayName,
          editReason: `Correction approved: ${existing.reason}`,
        },
      });
    }

    const targetName = existing.user?.fullName || existing.user?.username || "Member";

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: id,
      action: "ATTENDANCE_CORRECTION_REVIEWED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) ${status.toUpperCase()} attendance correction for ${targetName}.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      correction: updated,
      message: `Correction request marked as ${status}.`,
    });
  } catch (err: any) {
    console.error("[PATCH /api/attendance/corrections]", err);
    return NextResponse.json({ error: "Failed to review correction." }, { status: 500 });
  }
}
