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

const DOMAIN_CODE_TO_PROFILE_PATTERNS: Record<string, string[]> = {
  FS_AI: ["full-stack development with ai", "fs_ai", "vibe"],
  PY: ["python", "programming full stack - python", "programming full stack — python"],
  AIML: ["ai & machine learning", "aiml", "machine learning"],
  CY2: ["cybersecurity", "cy2"],
  PENTEST: ["penetration testing", "ethical hacking + penetration testing", "pentest"],
  AI9: ["generative ai & ai agents", "ai & machine learning + generative ai & ai agents", "ai9"],
  ETH: ["ethical hacking", "eth"],
  AG3: ["generative ai & ai agents", "ag3"],
  MOBILE: ["mobile app development", "mobile", "flutter"],
  JAVA: ["java", "programming full stack - java", "programming full stack — java"],
  UIUX: ["ui/ux design", "uiux"],
  WEB: ["web development", "web"]
};

function matchesDomain(internDomain: string | null | undefined, attendingDomainCodes: string[]): boolean {
  if (!internDomain) return false;
  const lower = internDomain.toLowerCase();
  for (const code of attendingDomainCodes) {
    const patterns = DOMAIN_CODE_TO_PROFILE_PATTERNS[code] || [code.toLowerCase()];
    if (patterns.some(p => lower.includes(p))) {
      return true;
    }
  }
  return false;
}

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

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ ok: false, error: "classId parameter is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cls = await db.scheduledClass.findUnique({
      where: { id: classId }
    });

    if (!cls) {
      return NextResponse.json({ ok: false, error: "Class not found" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const isCommon = cls.sequenceNumber !== null && cls.sequenceNumber <= 14;
    const attendingCodes: string[] = Array.isArray(cls.attendingDomains) 
      ? (cls.attendingDomains as string[]) 
      : [];

    // Load all active intern profiles
    const profiles = await db.employmentProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, isActive: true }
        }
      },
      orderBy: { employeeId: "asc" }
    });

    // Filter eligible interns: either common class OR domain matches
    const eligibleProfiles = profiles.filter(p => {
      if (isCommon) return true;
      return matchesDomain(p.internshipDomain, attendingCodes);
    });

    // Existing attendance records
    const existingRecords = await db.trainingClassAttendance.findMany({
      where: { classId }
    });
    const recordMap = new Map(existingRecords.map(r => [r.internId, r]));

    // Check active exam blackouts for this class date
    const classDateStr = cls.classDate.toISOString().split("T")[0];
    const classDateObj = new Date(classDateStr + "T00:00:00.000Z");

    const activeBlackouts = await db.studentExamBlackout.findMany({
      where: {
        status: "ACTIVE",
        blackoutStart: { lte: classDateObj },
        blackoutEnd: { gte: classDateObj }
      }
    });

    const students = eligibleProfiles.map(p => {
      const internId = p.employeeId;
      const rec = recordMap.get(internId);
      
      let isExamBlackout = false;
      let examReason = "";
      if (p.college && p.yearOfStudy) {
        const yr = parseYear(p.yearOfStudy);
        const match = activeBlackouts.find(b => 
          p.college?.toLowerCase().includes(b.college.toLowerCase()) && 
          yr === b.yearBatch
        );
        if (match) {
          isExamBlackout = true;
          examReason = match.notes || `${match.college} Year ${match.yearBatch} Semester Exam Blackout`;
        }
      }

      const defaultStatus = isExamBlackout ? "EXCUSED" : "PENDING";
      const currentStatus = rec ? rec.status : defaultStatus;

      return {
        internId,
        userId: p.userId,
        fullName: p.user?.fullName || internId,
        email: p.user?.email,
        college: p.college || "Verification Required",
        yearOfStudy: p.yearOfStudy || "Verification Required",
        domain: p.internshipDomain || "Unassigned",
        status: currentStatus,
        recordedBy: rec?.recordedBy || null,
        notes: rec?.notes || (isExamBlackout ? examReason : null),
        isExamBlackout,
        examReason,
        attendanceId: rec?.id || null
      };
    });

    return NextResponse.json({
      ok: true,
      class: {
        id: cls.id,
        sourceKey: cls.sourceKey,
        sequenceNumber: cls.sequenceNumber,
        title: cls.title,
        classDate: cls.classDate,
        startTime: cls.startTime,
        endTime: cls.endTime,
        status: cls.status,
        isCommon,
        attendingDomains: attendingCodes
      },
      students,
      stats: {
        totalEligible: students.length,
        presentCount: students.filter(s => s.status === "PRESENT").length,
        absentCount: students.filter(s => s.status === "ABSENT").length,
        excusedCount: students.filter(s => s.status === "EXCUSED").length,
        makeupPendingCount: students.filter(s => s.status === "MAKEUP_PENDING").length,
        pendingCount: students.filter(s => s.status === "PENDING").length
      }
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/training/attendance]", err);
    return NextResponse.json({ ok: false, error: "Failed to load attendance: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
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
    const { classId, records } = body;

    if (!classId || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ ok: false, error: "classId and records array are required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const cls = await db.scheduledClass.findUnique({
      where: { id: classId }
    });
    if (!cls) {
      return NextResponse.json({ ok: false, error: "Class not found" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const isCommon = cls.sequenceNumber !== null && cls.sequenceNumber <= 14;
    const attendingCodes: string[] = Array.isArray(cls.attendingDomains) 
      ? (cls.attendingDomains as string[]) 
      : [];

    const actorName = user.displayName || user.username || "CodeXa Trainer";
    let updatedCount = 0;

    for (const r of records) {
      const { internId, status, notes } = r;
      if (!internId || !status) continue;

      // Verify domain permission using employeeId
      const profile = await db.employmentProfile.findFirst({
        where: { employeeId: internId }
      });

      if (!profile) {
        continue;
      }

      if (!isCommon && !matchesDomain(profile.internshipDomain, attendingCodes)) {
        return NextResponse.json({ 
          ok: false, 
          error: `Permission error: Intern ${internId} (${profile.internshipDomain}) does not belong to attending domains for this class.` 
        }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      // Upsert attendance record
      await db.trainingClassAttendance.upsert({
        where: {
          classId_internId: {
            classId,
            internId
          }
        },
        create: {
          classId,
          internId,
          userId: profile.userId,
          status,
          recordedBy: actorName,
          notes: notes || null
        },
        update: {
          status,
          recordedBy: actorName,
          notes: notes || null
        }
      });

      // Makeup queue management: if EXCUSED or MAKEUP_PENDING, queue for live makeup
      if (status === "EXCUSED" || status === "MAKEUP_PENDING") {
        await db.trainingMakeupQueue.upsert({
          where: {
            originalClassId_internId: {
              originalClassId: classId,
              internId
            }
          },
          create: {
            originalClassId: classId,
            internId,
            userId: profile.userId,
            reason: notes || "SEMESTER_EXAM_EXCUSED",
            status: "PENDING"
          },
          update: {
            status: "PENDING",
            reason: notes || "SEMESTER_EXAM_EXCUSED"
          }
        });
      } else if (status === "PRESENT") {
        await db.trainingMakeupQueue.updateMany({
          where: {
            originalClassId: classId,
            internId
          },
          data: {
            status: "COMPLETED"
          }
        });
      }

      updatedCount++;
    }

    // Record audit
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "RECORD_ATTENDANCE",
        entityType: "CLASS_ATTENDANCE",
        entityId: classId,
        before: undefined,
        after: { updatedCount, timestamp: new Date().toISOString() }
      }
    });

    return NextResponse.json({
      ok: true,
      message: `Successfully recorded attendance for ${updatedCount} students.`,
      updatedCount
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/training/attendance]", err);
    return NextResponse.json({ ok: false, error: "Failed to record attendance: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
