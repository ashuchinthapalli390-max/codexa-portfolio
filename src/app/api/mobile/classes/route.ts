import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

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
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const isTrainerOrAdmin = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(role);

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD
    const monthParam = searchParams.get("month"); // YYYY-MM
    const domainParam = searchParams.get("domain");

    let internProfile: any = null;
    if (!isTrainerOrAdmin) {
      internProfile = await db.employmentProfile.findFirst({
        where: { userId: user.id }
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Build Prisma query
    const whereClause: any = {
      status: { not: "SUPERSEDED_LEGACY_DRAFT" }
    };

    if (!isTrainerOrAdmin) {
      // Mobile interns only see released/upcoming/live/completed classes
      whereClause.status = { in: ["UPCOMING", "LIVE", "COMPLETED", "RESCHEDULED"] };
    }

    if (dateParam) {
      whereClause.classDate = new Date(dateParam + "T00:00:00.000Z");
    }

    const classes = await db.scheduledClass.findMany({
      where: whereClause,
      orderBy: [{ classDate: "asc" }, { startTime: "asc" }],
      include: {
        domainLinks: {
          select: {
            domainId: true,
            domain: {
              select: {
                id: true,
                code: true,
                name: true,
                displayName: true,
              }
            }
          }
        },
        assignments: {
          where: isTrainerOrAdmin ? undefined : { status: { in: ["PUBLISHED", "ACTIVE"] } },
          select: {
            id: true,
            sourceKey: true,
            title: true,
            status: true,
            releaseAt: true,
            dueDate: true,
            evidenceRequired: true,
          }
        }
      }
    });

    // Domain filtering
    let filtered = classes;
    if (!isTrainerOrAdmin) {
      const studentDomainId = internProfile?.domainId;
      filtered = filtered.filter(c => {
        const isCommon = c.sequenceNumber !== null && c.sequenceNumber <= 14;
        if (isCommon) return true;
        if (studentDomainId && c.domainLinks?.some((l: any) => l.domainId === studentDomainId)) return true;
        return false;
      });
    } else if (domainParam && domainParam !== "ALL" && domainParam !== "All Domains") {
      filtered = filtered.filter(c => {
        const isCommon = c.sequenceNumber !== null && c.sequenceNumber <= 14;
        if (isCommon) return true;
        return c.domainLinks?.some((l: any) => 
          l.domainId === domainParam || 
          l.domain.code === domainParam || 
          l.domain.name.toLowerCase() === domainParam.toLowerCase()
        );
      });
    }

    if (monthParam) {
      filtered = filtered.filter(c => {
        const dStr = c.classDate.toISOString().split("T")[0];
        return dStr.startsWith(monthParam);
      });
    }

    // Format for mobile client
    const formatted = filtered.map(c => ({
      id: c.id,
      sourceKey: c.sourceKey,
      sequenceNumber: c.sequenceNumber,
      title: c.title,
      domain: c.domain,
      domains: c.domainLinks.map((l: any) => l.domain),
      batch: c.batch,
      topic: c.topic,
      subtopics: c.subtopics,
      instructorId: c.instructorId,
      instructorName: c.instructorName,
      classDate: c.classDate.toISOString().split("T")[0],
      startTime: c.startTime,
      endTime: c.endTime,
      duration: c.duration,
      status: c.status,
      mode: c.mode,
      meetingLink: c.meetingLink,
      learningObjectives: c.learningObjectives,
      learningGoals: c.learningGoals,
      trainerDemo: c.trainerDemo,
      isCommon: c.sequenceNumber !== null && c.sequenceNumber <= 14,
      assignments: c.assignments,
      recordingUrl: null, // Strictly nullified per 100% live policy
      createdAt: c.createdAt,
    }));

    if (dateParam) {
      return NextResponse.json({
        ok: true,
        selectedDate: dateParam,
        today: formatted,
        classes: formatted,
        upcoming: [],
        count: formatted.length,
      }, { headers: NO_CACHE_HEADERS });
    }

    const todayClasses = formatted.filter(c => c.classDate === todayStr && c.status !== "CANCELLED");
    const upcomingClasses = formatted.filter(c => c.classDate > todayStr && c.status !== "CANCELLED");
    const pastClasses = formatted.filter(c => c.classDate < todayStr || c.status === "COMPLETED");

    // Scheduled dates indicator
    const dateCounts: Record<string, number> = {};
    for (const c of formatted) {
      dateCounts[c.classDate] = (dateCounts[c.classDate] || 0) + 1;
    }
    const scheduledDates = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      ok: true,
      today: todayClasses,
      upcoming: upcomingClasses,
      past: pastClasses,
      scheduledDates,
      count: todayClasses.length + upcomingClasses.length,
      totalClasses: formatted.length,
      internDomain: internProfile?.internshipDomain || null,
      internDomainId: internProfile?.domainId || null,
      syncStatus: "MOBILE_BACKEND_SYNCED",
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load scheduled classes." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canSchedule = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canSchedule) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Only leadership or instructors can schedule classes." } }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      domain = "All Domains",
      batch = "Batch-2026",
      topic,
      subtopics = [],
      classDate,
      startTime,
      endTime,
      duration = "1h 30m",
      mode = "ONLINE",
      meetingLink,
      learningObjectives,
      resources = [],
    } = body;

    if (!title || !topic || !classDate || !startTime || !endTime) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing required class fields." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const id = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.$executeRawUnsafe(`
      INSERT INTO scheduled_classes (
        id, title, domain, batch, topic, subtopics, instructor_id, instructor_name,
        class_date, start_time, end_time, duration, status, mode, meeting_link,
        learning_objectives, resources
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8,
        $9::date, $10, $11, $12, 'UPCOMING', $13, $14,
        $15, $16::jsonb
      )
    `,
      id,
      title,
      domain,
      batch,
      topic,
      JSON.stringify(subtopics),
      user.id,
      user.displayName || user.username || 'Instructor',
      classDate,
      startTime,
      endTime,
      duration,
      mode,
      meetingLink || null,
      learningObjectives || null,
      JSON.stringify(resources)
    );

    return NextResponse.json({
      ok: true,
      message: "Class scheduled successfully.",
      classId: id,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to schedule class." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canSchedule = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canSchedule) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Leadership permission required." } }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { id, title, topic, subtopics, classDate, startTime, endTime, status, meetingLink, resources } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Class ID is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (topic) updateData.topic = topic;
    if (subtopics) updateData.subtopics = subtopics;
    if (status) updateData.status = status;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (resources !== undefined) updateData.resources = resources;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (classDate) updateData.classDate = new Date(classDate);

    const updated = await db.scheduledClass.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: "Class updated successfully.",
      class: updated,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error(`[PATCH /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to update class: " + err.message } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canDelete = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER"].includes(role);
    if (!canDelete) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Leadership permission required to delete class." } }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Class ID is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    await db.scheduledClass.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Class removed successfully.",
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error(`[DELETE /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to delete class: " + err.message } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
