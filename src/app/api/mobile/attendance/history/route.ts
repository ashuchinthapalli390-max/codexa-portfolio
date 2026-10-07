import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") {
        return res.user;
      }
    }
  }

  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") {
    return cookieRes.user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) - 1 : now.getMonth();
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : now.getFullYear();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const emp = await db.employmentProfile.findUnique({
      where: { userId: user.id },
    });

    // Check if internship hasn't started yet
    if (emp?.employmentType === "INTERN" && emp?.joiningDate) {
      const joining = new Date(emp.joiningDate);
      if (now < joining) {
        return NextResponse.json({
          ok: true,
          lifecycleStatus: "COMING_SOON",
          message: "Attendance history will be available once your internship begins.",
          records: [],
          stats: null,
        });
      }
    }

    const effectiveStart = (emp?.joiningDate && new Date(emp.joiningDate) > startOfMonth)
      ? new Date(emp.joiningDate)
      : startOfMonth;

    const records = await db.attendanceRecord.findMany({
      where: {
        userId: user.id,
        date: { gte: effectiveStart, lte: endOfMonth },
      },
      orderBy: { date: "desc" },
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;
    let excused = 0;

    records.forEach((r) => {
      const s = r.status.toUpperCase();
      if (s === "PRESENT") present++;
      else if (s === "ABSENT") absent++;
      else if (s === "LATE") late++;
      else if (s === "LEAVE") leave++;
      else if (s === "EXCUSED") excused++;
    });

    const totalEligible = present + absent + late + leave + excused;
    const rateCalc = totalEligible > 0 ? ((present + late * 0.5) / Math.max(present + absent + late, 1)) * 100 : 100;
    const attendancePercentage = Math.min(100, Math.round(rateCalc * 10) / 10);

    return NextResponse.json({
      ok: true,
      stats: {
        month: month + 1,
        year,
        present,
        absent,
        late,
        leave,
        excused,
        attendanceRate: attendancePercentage,
      },
      records: records.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        markedAt: r.markedAt,
        source: r.source,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/attendance/history]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to fetch attendance history." } }, { status: 500 });
  }
}
