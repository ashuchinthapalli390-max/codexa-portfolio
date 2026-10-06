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
  const canViewAll =
    hasPermission(currentUser, Permission.VIEW_ATTENDANCE) ||
    hasPermission(currentUser, Permission.MANAGE_ATTENDANCE);

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || currentUser.id;
  const monthParam = url.searchParams.get("month"); // 1-12
  const yearParam = url.searchParams.get("year");

  // Non-admins can only see their own attendance
  if (!canViewAll && targetUserId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam, 10) - 1 : now.getMonth();
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const records = await db.attendanceRecord.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: "desc" },
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    records.forEach((r) => {
      const s = r.status.toUpperCase();
      if (s === "PRESENT") present++;
      else if (s === "ABSENT") absent++;
      else if (s === "LATE") late++;
      else if (s === "LEAVE" || s === "EXCUSED") leave++;
    });

    // Approximate total working days so far
    const totalRecorded = records.length;
    const workingDays = Math.max(totalRecorded, 22); // Baseline month working days

    // Rate calculation: Present + 0.5 * Late
    const rateCalc = workingDays > 0 ? ((present + late * 0.5) / Math.max(present + absent + late, 1)) * 100 : 100;
    const attendanceRate = Math.min(100, Math.round(rateCalc * 10) / 10);
    const requiredRate = 75.0;
    const isEligible = attendanceRate >= requiredRate;

    const lastMarked = records[0] ? records[0].markedAt : null;

    return NextResponse.json(
      {
        success: true,
        stats: {
          month: targetMonth + 1,
          year: targetYear,
          workingDays,
          present,
          absent,
          late,
          leave,
          attendanceRate,
          requiredRate,
          status: isEligible ? "Eligible" : "Attendance Shortage",
          payrollEffect: isEligible ? "Full Payroll Entitlement" : "Requires HR Review",
          lastAttendanceMark: lastMarked,
        },
        records,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/attendance/records]", err);
    return NextResponse.json({ error: "Failed to load attendance records." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error" || auth.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const currentUser = auth.user;
  const canEdit =
    hasPermission(currentUser, Permission.EDIT_ATTENDANCE) ||
    hasPermission(currentUser, Permission.MANAGE_ATTENDANCE);

  if (!canEdit) {
    return NextResponse.json(
      {
        error: "Forbidden. Website does not support direct member check-in. Attendance marking is reserved for the CodeXa Mobile App.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { userId, date, status, editReason } = body;

    if (!userId || !date || !status) {
      return NextResponse.json({ error: "userId, date, and status are required." }, { status: 400 });
    }

    const recordDate = new Date(date);

    const record = await db.attendanceRecord.create({
      data: {
        userId,
        date: recordDate,
        status: status.toUpperCase(),
        source: "MANUAL",
        editedBy: currentUser.displayName,
        editReason: editReason?.trim() || "Manual adjustment by staff admin",
      },
    });

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: userId,
      action: "ATTENDANCE_EDITED",
      details: `${getEffectiveRole(currentUser)} (${currentUser.displayName}) manually logged attendance "${status}" for user ID ${userId} on ${recordDate.toLocaleDateString()}. Reason: ${editReason || "N/A"}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, record, message: "Attendance record updated." });
  } catch (err: any) {
    console.error("[POST /api/attendance/records]", err);
    return NextResponse.json({ error: "Failed to update attendance record." }, { status: 500 });
  }
}
