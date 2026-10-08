import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole, hasPermission, Permission } from "@/lib/permissions";

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

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const authUser = await resolveRequestUser(req);
    if (!authUser) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Please log in to view attendance." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { employmentProfile: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Account is disabled." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const role = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(role);
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Active or today's window
    const [activeWindow, todayWindow] = await Promise.all([
      db.attendanceWindow.findFirst({
        where: {
          status: "ACTIVE",
          startTime: { lte: now },
          endTime: { gt: now },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.attendanceWindow.findFirst({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // If Leadership / Founder: Return management controls, today's breakdown, and monthly calendar
    if (isLeadership) {
      const totalEligible = await db.user.count({
        where: {
          role: { in: ["INTERN", "EMPLOYEE"] },
          isActive: true,
        },
      });

      const todayRecords = await db.attendanceRecord.findMany({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
              profileMediaUrl: true,
              employmentProfile: {
                select: { employeeId: true, department: true, designation: true },
              },
            },
          },
        },
        orderBy: { markedAt: "desc" },
      });

      const presentCount = todayRecords.filter((r) => r.status === "PRESENT").length;
      const lateCount = todayRecords.filter((r) => r.status === "LATE").length;
      const leaveCount = todayRecords.filter((r) => r.status === "LEAVE" || r.status === "EXCUSED").length;
      const notMarkedCount = Math.max(0, totalEligible - (presentCount + lateCount + leaveCount));

      // Month calendar aggregated counts
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthRecords = await db.attendanceRecord.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfToday },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      const daySummaryMap: Record<string, { present: number; late: number; leave: number; date: string }> = {};
      monthRecords.forEach((rec) => {
        const dStr = rec.createdAt.toISOString().split("T")[0];
        if (!daySummaryMap[dStr]) {
          daySummaryMap[dStr] = { present: 0, late: 0, leave: 0, date: dStr };
        }
        if (rec.status === "PRESENT") daySummaryMap[dStr].present++;
        else if (rec.status === "LATE") daySummaryMap[dStr].late++;
        else if (rec.status === "LEAVE" || rec.status === "EXCUSED") daySummaryMap[dStr].leave++;
      });

      return NextResponse.json({
        ok: true,
        isManagement: true,
        role,
        window: activeWindow
          ? {
              id: activeWindow.id,
              status: "ACTIVE",
              startTime: activeWindow.startTime.toISOString(),
              endTime: activeWindow.endTime.toISOString(),
              remainingSeconds: Math.max(0, Math.floor((activeWindow.endTime.getTime() - now.getTime()) / 1000)),
            }
          : todayWindow
          ? {
              id: todayWindow.id,
              status: todayWindow.status,
              startTime: todayWindow.startTime.toISOString(),
              endTime: todayWindow.endTime.toISOString(),
              remainingSeconds: 0,
            }
          : null,
        metrics: {
          totalEligible,
          presentCount,
          lateCount,
          leaveCount,
          notMarkedCount,
        },
        todayRecords: todayRecords.map((r: any) => ({
          id: r.id,
          userId: r.userId,
          name: r.user?.fullName || r.user?.username || "Colleague",
          employeeId: r.user?.employmentProfile?.employeeId || null,
          role: r.user?.role || "INTERN",
          avatarUrl: r.user?.profileMediaUrl || null,
          status: r.status,
          checkInTime: (r.markedAt || r.createdAt).toISOString(),
        })),
        calendar: Object.values(daySummaryMap),
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    // For Intern / Employee: State machine
    let state = "NOT_OPENED";
    let message = "Attendance window is not open.";
    let startDate: string | null = null;
    let daysUntilStart = 0;

    // Check internship dates
    const joiningDate = user.employmentProfile?.joiningDate || user.employmentProfile?.internshipStartDate;
    const endDate = user.employmentProfile?.endDate || user.employmentProfile?.internshipEndDate;

    if (role === "INTERN" && joiningDate) {
      const startD = new Date(joiningDate);
      if (now < startD) {
        state = "BEFORE_START";
        startDate = startD.toISOString();
        daysUntilStart = Math.max(1, Math.ceil((startD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        message = "Attendance will become available when your internship begins.";
      }
    }

    if (state !== "BEFORE_START" && endDate && now > new Date(endDate)) {
      state = "COMPLETED";
      message = "Internship completed. Attendance marking has concluded.";
    }

    // If not before start or completed, check today's record
    let myRecordToday = null;
    if (state !== "BEFORE_START" && state !== "COMPLETED") {
      myRecordToday = await db.attendanceRecord.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      });

      if (myRecordToday) {
        state = "MARKED";
        message = `You marked attendance as ${myRecordToday.status}.`;
      } else if (activeWindow) {
        state = "OPEN";
        message = "Attendance is open. Mark yourself present.";
      } else if (todayWindow && todayWindow.status === "CLOSED") {
        state = "CLOSED";
        message = "Today's attendance window has ended.";
      } else {
        state = "NOT_OPENED";
        message = "Attendance window not opened yet.";
      }
    }

    // Individual personal attendance statistics
    const allMyRecords = await db.attendanceRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    const presentCount = allMyRecords.filter((r) => r.status === "PRESENT").length;
    const lateCount = allMyRecords.filter((r) => r.status === "LATE").length;
    const leaveCount = allMyRecords.filter((r) => r.status === "LEAVE" || r.status === "EXCUSED").length;
    const absentCount = allMyRecords.filter((r) => r.status === "ABSENT").length;
    const totalMarkedSlots = presentCount + lateCount + leaveCount + absentCount;
    const percentage = totalMarkedSlots > 0 ? Math.round(((presentCount + lateCount) / totalMarkedSlots) * 100) : 100;

    return NextResponse.json({
      ok: true,
      isManagement: false,
      role,
      state,
      message,
      startDate,
      daysUntilStart,
      window: activeWindow
        ? {
            id: activeWindow.id,
            status: "ACTIVE",
            startTime: activeWindow.startTime.toISOString(),
            endTime: activeWindow.endTime.toISOString(),
            remainingSeconds: Math.max(0, Math.floor((activeWindow.endTime.getTime() - now.getTime()) / 1000)),
          }
        : null,
      myRecord: myRecordToday
        ? {
            id: myRecordToday.id,
            status: myRecordToday.status,
            checkInTime: (myRecordToday.markedAt || myRecordToday.createdAt).toISOString(),
          }
        : null,
      stats: {
        presentCount,
        lateCount,
        leaveCount,
        absentCount,
        percentage,
      },
      history: allMyRecords.map((r: any) => ({
        id: r.id,
        date: r.createdAt.toISOString().split("T")[0],
        status: r.status,
        checkInTime: (r.markedAt || r.createdAt).toISOString(),
      })),
      requestId,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/mobile/attendance error] [${requestId}]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load attendance." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
