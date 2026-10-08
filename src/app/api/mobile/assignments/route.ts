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

    // Get assignments with current user's latest submission
    const assignments = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        a.id, a.title, a.description, a.assigned_by_name, a.domain, a.submission_type,
        a.due_date, a.late_cutoff, a.requirements, a.status, a.created_at,
        s.id as submission_id,
        s.submission_type as user_submission_type,
        s.text_content,
        s.repository_url,
        s.branch,
        s.commit_sha,
        s.status as user_submission_status,
        s.grade,
        s.feedback,
        s.reviewer_name,
        s.submitted_at
      FROM assignments a
      LEFT JOIN LATERAL (
        SELECT id, submission_type, text_content, repository_url, branch, commit_sha, status, grade, feedback, reviewer_name, submitted_at
        FROM assignment_submissions
        WHERE assignment_id = a.id AND user_id = $1
        ORDER BY revision DESC
        LIMIT 1
      ) s ON true
      WHERE a.status = 'ACTIVE'
      ORDER BY a.due_date ASC
    `, user.id);

    return NextResponse.json({
      ok: true,
      assignments,
      count: assignments.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/assignments] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load assignments." } }, { status: 500, headers: NO_CACHE_HEADERS });
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
    const canCreate = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canCreate) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Only leadership or mentors can create assignments." } }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      domain = "All Domains",
      submissionType = "BOTH",
      dueDate,
      requirements,
      classId,
      projectId,
    } = body;

    if (!title || !description || !dueDate) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Title, description, and dueDate are required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const id = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.$executeRawUnsafe(`
      INSERT INTO assignments (
        id, title, description, assigned_by, assigned_by_name, domain,
        submission_type, due_date, requirements, class_id, project_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8::timestamptz, $9, $10, $11, 'ACTIVE'
      )
    `,
      id,
      title,
      description,
      user.id,
      user.displayName || user.username || 'Lead',
      domain,
      submissionType,
      dueDate,
      requirements || null,
      classId || null,
      projectId || null
    );

    return NextResponse.json({
      ok: true,
      message: "Assignment created successfully.",
      assignmentId: id,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/assignments] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to create assignment." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
