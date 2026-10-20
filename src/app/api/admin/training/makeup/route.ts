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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const queueItems = await db.trainingMakeupQueue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        originalClass: {
          select: {
            id: true,
            sourceKey: true,
            title: true,
            classDate: true,
            domain: true
          }
        },
        makeupClass: {
          select: {
            id: true,
            title: true,
            classDate: true,
            startTime: true,
            meetingLink: true,
            status: true
          }
        }
      }
    });

    const internIds = Array.from(new Set(queueItems.map(q => q.internId)));
    const profiles = await db.employmentProfile.findMany({
      where: { employeeId: { in: internIds } },
      include: {
        user: { select: { fullName: true, email: true } }
      }
    });
    const profileMap = new Map(profiles.map(p => [p.employeeId, p]));

    const enrichedQueue = queueItems.map(q => {
      const p = profileMap.get(q.internId);
      return {
        id: q.id,
        internId: q.internId,
        studentName: p?.user?.fullName || q.internId,
        studentEmail: p?.user?.email,
        college: p?.college || "Unknown",
        year: p?.yearOfStudy || "Unknown",
        domain: p?.internshipDomain || "Unknown",
        reason: q.reason,
        status: q.status,
        originalClass: {
          id: q.originalClass.id,
          sourceKey: q.originalClass.sourceKey,
          title: q.originalClass.title,
          date: q.originalClass.classDate.toISOString().split("T")[0]
        },
        makeupClass: q.makeupClass ? {
          id: q.makeupClass.id,
          title: q.makeupClass.title,
          date: q.makeupClass.classDate.toISOString().split("T")[0],
          startTime: q.makeupClass.startTime,
          meetingLink: q.makeupClass.meetingLink,
          status: q.makeupClass.status
        } : null,
        createdAt: q.createdAt.toISOString()
      };
    });

    return NextResponse.json({
      ok: true,
      queue: enrichedQueue,
      stats: {
        totalPending: enrichedQueue.filter(q => q.status === "PENDING").length,
        totalScheduled: enrichedQueue.filter(q => q.status === "SCHEDULED").length,
        totalCompleted: enrichedQueue.filter(q => q.status === "COMPLETED").length
      }
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/training/makeup]", err);
    return NextResponse.json({ ok: false, error: "Failed to load makeup queue: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
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
    const { queueIds, makeupDate, startTime = "19:30", endTime = "21:30", meetingLink, title } = body;

    if (!Array.isArray(queueIds) || queueIds.length === 0 || !makeupDate) {
      return NextResponse.json({ ok: false, error: "queueIds array and makeupDate are required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const makeupDateObj = new Date(makeupDate + "T00:00:00.000Z");
    if (makeupDateObj.getUTCDay() === 0) {
      return NextResponse.json({ ok: false, error: "Scheduling error: Sundays are off days. Please choose an open weekday or Saturday." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // SINGLE-TRAINER COLLISION CHECK: Ensure no active class exists on makeupDate
    const existingClassOnDate = await db.scheduledClass.findFirst({
      where: {
        classDate: makeupDateObj,
        status: { in: ["UPCOMING", "LIVE", "COMPLETED", "DRAFT"] },
        id: { notIn: ["SUPERSEDED_LEGACY_DRAFT"] }
      }
    });

    if (existingClassOnDate) {
      return NextResponse.json({ 
        ok: false, 
        error: `Trainer Conflict: The sole trainer already has class "${existingClassOnDate.title}" scheduled on ${makeupDate}. Live make-ups must be scheduled on an open evening.` 
      }, { status: 409, headers: NO_CACHE_HEADERS });
    }

    const queueRecords = await db.trainingMakeupQueue.findMany({
      where: { id: { in: queueIds } },
      include: { originalClass: true }
    });

    if (queueRecords.length === 0) {
      return NextResponse.json({ ok: false, error: "No matching makeup queue records found" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const originalClass = queueRecords[0].originalClass;
    const makeupClassId = `CXA-MAKEUP-${Date.now()}`;
    const makeupTitle = title || `Live Make-up: ${originalClass.title}`;
    const actorName = user.displayName || user.username || "CodeXa Lead Instructor";

    const makeupClass = await db.scheduledClass.create({
      data: {
        id: makeupClassId,
        sourceKey: makeupClassId,
        title: makeupTitle,
        domain: originalClass.domain,
        batch: "Batch-2026",
        topic: `Live Make-Up: ${originalClass.topic}`,
        subtopics: originalClass.subtopics ?? undefined,
        instructorId: user.id,
        instructorName: actorName,
        classDate: makeupDateObj,
        startTime,
        endTime,
        duration: "2h 00m",
        status: "UPCOMING",
        mode: "ONLINE",
        meetingLink: meetingLink || null,
        learningObjectives: originalClass.learningObjectives,
        attendingDomains: originalClass.attendingDomains ?? undefined,
        learningGoals: originalClass.learningGoals ?? undefined,
        trainerDemo: originalClass.trainerDemo || null,
        timeZone: "Asia/Kolkata",
        instructorNotes: `Live Make-up session for ${queueRecords.length} students excused due to exams.`
      }
    });

    await db.trainingMakeupQueue.updateMany({
      where: { id: { in: queueIds } },
      data: {
        status: "SCHEDULED",
        makeupClassId: makeupClass.id
      }
    });

    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "SCHEDULE_LIVE_MAKEUP",
        entityType: "MAKEUP_SESSION",
        entityId: makeupClass.id,
        before: undefined,
        after: {
          makeupDate,
          scheduledCount: queueRecords.length,
          originalClassId: originalClass.id
        }
      }
    });

    return NextResponse.json({
      ok: true,
      message: `Live make-up session scheduled on ${makeupDate} for ${queueRecords.length} students.`,
      makeupClass
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/training/makeup]", err);
    return NextResponse.json({ ok: false, error: "Failed to schedule makeup: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
