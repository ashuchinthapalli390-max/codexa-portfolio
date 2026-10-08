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

    const todayStr = new Date().toISOString().split("T")[0];

    const todayClasses = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        id, title, domain, batch, topic, subtopics, instructor_id, instructor_name,
        to_char(class_date, 'YYYY-MM-DD') as class_date,
        start_time, end_time, duration, status, mode, meeting_link, learning_objectives, resources, recording_url,
        created_at
      FROM scheduled_classes
      WHERE class_date = $1::date
      ORDER BY start_time ASC
    `, todayStr);

    const upcomingClasses = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        id, title, domain, batch, topic, subtopics, instructor_id, instructor_name,
        to_char(class_date, 'YYYY-MM-DD') as class_date,
        start_time, end_time, duration, status, mode, meeting_link, learning_objectives, resources, recording_url,
        created_at
      FROM scheduled_classes
      WHERE class_date > $1::date
      ORDER BY class_date ASC, start_time ASC
      LIMIT 20
    `, todayStr);

    const pastClasses = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        id, title, domain, batch, topic, subtopics, instructor_id, instructor_name,
        to_char(class_date, 'YYYY-MM-DD') as class_date,
        start_time, end_time, duration, status, mode, meeting_link, learning_objectives, resources, recording_url,
        created_at
      FROM scheduled_classes
      WHERE class_date < $1::date
      ORDER BY class_date DESC
      LIMIT 10
    `, todayStr);

    return NextResponse.json({
      ok: true,
      today: todayClasses,
      upcoming: upcomingClasses,
      past: pastClasses,
      count: todayClasses.length + upcomingClasses.length,
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
