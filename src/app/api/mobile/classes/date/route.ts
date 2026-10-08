import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";

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
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date")?.trim() || new Date().toISOString().split("T")[0];

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATE", message: "Date must be formatted as YYYY-MM-DD." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const userRecord = await db.user.findUnique({
      where: { id: user.id },
      include: { employmentProfile: true },
    });

    const userDomain = userRecord?.employmentProfile?.internshipDomain || userRecord?.department || "All Domains";

    // Query classes for this date
    const classes = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        id, title, domain, batch, topic, subtopics, instructor_id, instructor_name,
        to_char(class_date, 'YYYY-MM-DD') as class_date,
        start_time, end_time, duration, status, mode, meeting_link, learning_objectives, resources, recording_url,
        created_at
      FROM scheduled_classes
      WHERE class_date = $1::date
      AND (
        domain = 'All Domains' 
        OR domain ILIKE '%' || $2 || '%' 
        OR $2 = 'All Domains'
        OR domain = 'Technical Track'
        OR domain = 'Full Stack'
      )
      ORDER BY start_time ASC
    `, dateParam, userDomain);

    // Fetch any assignments linked to these classes
    const classIds = classes.map((c) => c.id);
    let linkedAssignments: any[] = [];
    if (classIds.length > 0) {
      linkedAssignments = await db.assignment.findMany({
        where: {
          classId: { in: classIds },
          status: "ACTIVE",
        },
        select: {
          id: true,
          title: true,
          description: true,
          submissionType: true,
          dueDate: true,
          classId: true,
        },
      });
    }

    // Build rich date-wise response
    const topicsList = classes.map((c) => {
      let parsedSubtopics = [];
      try {
        parsedSubtopics = typeof c.subtopics === "string" ? JSON.parse(c.subtopics) : (c.subtopics || []);
      } catch (_) {}

      let parsedResources = [];
      try {
        parsedResources = typeof c.resources === "string" ? JSON.parse(c.resources) : (c.resources || []);
      } catch (_) {}

      const assignmentsForClass = linkedAssignments.filter((a) => a.classId === c.id);

      return {
        classId: c.id,
        classTitle: c.title,
        domain: c.domain,
        instructor: c.instructor_name || "CodeXa Lead Instructor",
        startTime: c.start_time,
        endTime: c.end_time,
        duration: c.duration,
        status: c.status,
        mode: c.mode,
        meetingLink: c.meeting_link,
        mainTopic: c.topic,
        subtopics: parsedSubtopics,
        learningObjectives: c.learning_objectives,
        resources: parsedResources,
        recordingUrl: c.recording_url,
        assignments: assignmentsForClass,
      };
    });

    return NextResponse.json({
      ok: true,
      date: dateParam,
      classesCount: classes.length,
      classes,
      topics: topicsList,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/classes/date] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to retrieve date-wise topics." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
