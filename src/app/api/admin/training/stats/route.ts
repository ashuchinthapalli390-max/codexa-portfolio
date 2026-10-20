import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function parseYear(yearStr: string | null | undefined): number {
  if (!yearStr) return 0;
  const match = yearStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canView = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(role);
    if (!canView) {
      return NextResponse.json({ ok: false, error: "Forbidden. Trainer or leadership only." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    // Load active rebuilt classes
    const classes = await db.scheduledClass.findMany({
      where: {
        status: { not: "SUPERSEDED_LEGACY_DRAFT" }
      },
      orderBy: [{ classDate: "asc" }, { startTime: "asc" }]
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const todayClass = classes.find(c => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr === todayStr && c.status !== "CANCELLED";
    }) || null;

    const draftsCount = classes.filter(c => c.status === "DRAFT").length;
    const upcomingCount = classes.filter(c => c.status === "UPCOMING").length;
    const liveCount = classes.filter(c => c.status === "LIVE").length;
    const completedCount = classes.filter(c => c.status === "COMPLETED").length;

    // Load assignments stats
    const assignments = await db.assignment.findMany({
      where: {
        status: { not: "SUPERSEDED_LEGACY" }
      }
    });

    const assignmentsDraftCount = assignments.filter(a => a.status === "DRAFT").length;
    const assignmentsPublishedCount = assignments.filter(a => a.status === "PUBLISHED" || a.status === "ACTIVE").length;

    // Load exam blackouts
    const activeBlackouts = await db.studentExamBlackout.findMany({
      where: { status: "ACTIVE" }
    });

    // Check which interns are currently in an active exam blackout window
    const todayDate = new Date(todayStr + "T00:00:00.000Z");
    const activeCohortsToday = activeBlackouts.filter(b => {
      return todayDate >= b.blackoutStart && todayDate <= b.blackoutEnd;
    });

    const internProfiles = await db.employmentProfile.findMany({
      where: {
        status: "ACTIVE"
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, isActive: true }
        }
      }
    });

    const internsOnExamLeave = internProfiles.filter(p => {
      if (!p.college || !p.yearOfStudy) return false;
      const yr = parseYear(p.yearOfStudy);
      return activeCohortsToday.some(c => 
        p.college?.toLowerCase().includes(c.college.toLowerCase()) && 
        yr === c.yearBatch
      );
    });

    const internsMissingAcademicRecord = internProfiles.filter(p => !p.college || !p.yearOfStudy);

    // Makeup queue pending count
    const makeupPendingCount = await db.trainingMakeupQueue.count({
      where: { status: "PENDING" }
    });

    return NextResponse.json({
      ok: true,
      stats: {
        totalClasses: classes.length,
        draftsCount,
        upcomingCount,
        liveCount,
        completedCount,
        todayClass,
        assignmentsDraftCount,
        assignmentsPublishedCount,
        internsOnExamLeaveCount: internsOnExamLeave.length,
        internsMissingAcademicRecordCount: internsMissingAcademicRecord.length,
        makeupPendingCount,
        activeBlackoutsCount: activeBlackouts.length
      },
      todayClass,
      internsOnExamLeave: internsOnExamLeave.map(p => ({
        internId: p.employeeId,
        name: p.user?.fullName || p.employeeId,
        college: p.college,
        year: p.yearOfStudy,
        domain: p.internshipDomain
      })),
      unresolvedInterns: internsMissingAcademicRecord.map(p => ({
        internId: p.employeeId,
        name: p.user?.fullName || p.employeeId,
        college: p.college || "Missing",
        year: p.yearOfStudy || "Missing",
        domain: p.internshipDomain
      }))
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/training/stats]", err);
    return NextResponse.json({ ok: false, error: "Failed to load training stats: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
