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

    const blackouts = await db.studentExamBlackout.findMany({
      orderBy: { examStartDate: "asc" }
    });

    const profiles = await db.employmentProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { fullName: true, email: true } }
      }
    });

    const cohorts = blackouts.map(b => {
      const matchingInterns = profiles.filter(p => 
        p.college && p.yearOfStudy &&
        p.college.toLowerCase().includes(b.college.toLowerCase()) &&
        parseYear(p.yearOfStudy) === b.yearBatch
      );

      return {
        id: b.id,
        college: b.college,
        yearBatch: b.yearBatch,
        examStartDate: b.examStartDate.toISOString().split("T")[0],
        examEndDate: b.examEndDate.toISOString().split("T")[0],
        blackoutStart: b.blackoutStart.toISOString().split("T")[0],
        blackoutEnd: b.blackoutEnd.toISOString().split("T")[0],
        verifiedBy: b.verifiedBy,
        notes: b.notes,
        status: b.status,
        affectedInternsCount: matchingInterns.length,
        affectedInterns: matchingInterns.map(m => ({
          internId: m.employeeId,
          name: m.user?.fullName || m.employeeId,
          domain: m.internshipDomain
        }))
      };
    });

    const unverifiedInterns = profiles
      .filter(p => !p.college || !p.yearOfStudy)
      .map(p => ({
        internId: p.employeeId,
        name: p.user?.fullName || p.employeeId,
        college: p.college || "Missing",
        yearOfStudy: p.yearOfStudy || "Missing",
        domain: p.internshipDomain
      }));

    return NextResponse.json({
      ok: true,
      cohorts,
      unverifiedInterns,
      totalUnverified: unverifiedInterns.length
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/training/exams]", err);
    return NextResponse.json({ ok: false, error: "Failed to load exam blackouts: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(role);
    if (!canManage) {
      return NextResponse.json({ ok: false, error: "Forbidden. Trainer or leadership only." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { college, yearBatch, examStartDate, examEndDate, notes, applyToAttendance = true } = body;

    if (!college || !yearBatch || !examStartDate || !examEndDate) {
      return NextResponse.json({ ok: false, error: "college, yearBatch, examStartDate, and examEndDate are required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const targetYear = parseInt(yearBatch, 10);
    const startDateObj = new Date(examStartDate + "T00:00:00.000Z");
    const blackoutStartObj = new Date(startDateObj);
    blackoutStartObj.setUTCDate(blackoutStartObj.getUTCDate() - 4);
    const blackoutStartStr = blackoutStartObj.toISOString().split("T")[0];

    const examEndDateObj = new Date(examEndDate + "T00:00:00.000Z");

    const actorName = user.displayName || user.username || "CodeXa Admin";

    // Create blackout record
    const blackout = await db.studentExamBlackout.create({
      data: {
        college,
        yearBatch: targetYear,
        examStartDate: startDateObj,
        examEndDate: examEndDateObj,
        blackoutStart: blackoutStartObj,
        blackoutEnd: examEndDateObj,
        verifiedBy: actorName,
        notes: notes || `${college} Year ${yearBatch} Exam Exemption`,
        status: "ACTIVE"
      }
    });

    let affectedStudentsCount = 0;
    let excusedClassesCount = 0;

    if (applyToAttendance) {
      // Find matching verified students in memory using parseYear
      const candidateInterns = await db.employmentProfile.findMany({
        where: {
          status: "ACTIVE",
          college: { contains: college, mode: "insensitive" }
        }
      });

      const matchingInterns = candidateInterns.filter(p => parseYear(p.yearOfStudy) === targetYear);
      affectedStudentsCount = matchingInterns.length;

      // Find classes in blackout window
      const classesInWindow = await db.scheduledClass.findMany({
        where: {
          classDate: {
            gte: blackoutStartObj,
            lte: examEndDateObj
          },
          status: { not: "SUPERSEDED_LEGACY_DRAFT" }
        }
      });

      excusedClassesCount = classesInWindow.length;

      for (const cls of classesInWindow) {
        for (const intern of matchingInterns) {
          await db.trainingClassAttendance.upsert({
            where: {
              classId_internId: {
                classId: cls.id,
                internId: intern.employeeId
              }
            },
            create: {
              classId: cls.id,
              internId: intern.employeeId,
              userId: intern.userId,
              status: "EXCUSED",
              recordedBy: `SYSTEM_EXAM_BLACKOUT: ${college} Y${yearBatch}`,
              notes: notes || "Semester Exam Blackout Exemption"
            },
            update: {
              status: "EXCUSED",
              notes: notes || "Semester Exam Blackout Exemption"
            }
          });

          await db.trainingMakeupQueue.upsert({
            where: {
              originalClassId_internId: {
                originalClassId: cls.id,
                internId: intern.employeeId
              }
            },
            create: {
              originalClassId: cls.id,
              internId: intern.employeeId,
              userId: intern.userId,
              reason: `SEMESTER_EXAM: ${college} Year ${yearBatch}`,
              status: "PENDING"
            },
            update: {
              status: "PENDING",
              reason: `SEMESTER_EXAM: ${college} Year ${yearBatch}`
            }
          });
        }
      }
    }

    // Audit log
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "CREATE_EXAM_BLACKOUT",
        entityType: "EXAM_BLACKOUT",
        entityId: blackout.id,
        before: undefined,
        after: {
          college,
          yearBatch,
          blackoutStart: blackoutStartStr,
          blackoutEnd: examEndDate,
          affectedStudentsCount,
          excusedClassesCount
        }
      }
    });

    return NextResponse.json({
      ok: true,
      message: `Exam blackout created. Blackout window: ${blackoutStartStr} to ${examEndDate}. ${affectedStudentsCount} students excused across ${excusedClassesCount} classes.`,
      blackout,
      affectedStudentsCount,
      excusedClassesCount
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/training/exams]", err);
    return NextResponse.json({ ok: false, error: "Failed to create exam blackout: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
