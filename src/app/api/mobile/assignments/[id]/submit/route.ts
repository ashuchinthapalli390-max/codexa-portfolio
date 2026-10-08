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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id: assignmentId } = await params;

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const assignmentRows = await db.$queryRawUnsafe<any[]>(
      `SELECT * FROM assignments WHERE id = $1`,
      assignmentId
    );
    if (assignmentRows.length === 0) {
      return NextResponse.json({ ok: false, error: { code: "NOT_FOUND", message: "Assignment not found." } }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    const assignment = assignmentRows[0];

    const body = await req.json().catch(() => ({}));
    const {
      submissionType = "TEXT",
      textContent,
      repositoryUrl,
      branch = "main",
      commitSha,
      notes,
    } = body;

    if (submissionType === "REPOSITORY") {
      if (!repositoryUrl || !repositoryUrl.startsWith("http")) {
        return NextResponse.json({ ok: false, error: { code: "INVALID_URL", message: "Please provide a valid repository URL (e.g. https://github.com/...)." } }, { status: 400, headers: NO_CACHE_HEADERS });
      }
    } else if (submissionType === "TEXT") {
      if (!textContent || !textContent.trim()) {
        return NextResponse.json({ ok: false, error: { code: "EMPTY_TEXT", message: "Text submission content cannot be empty." } }, { status: 400, headers: NO_CACHE_HEADERS });
      }
    }

    // Determine current revision count
    const existing = await db.$queryRawUnsafe<any[]>(
      `SELECT revision FROM assignment_submissions WHERE assignment_id = $1 AND user_id = $2 ORDER BY revision DESC LIMIT 1`,
      assignmentId,
      user.id
    );
    const nextRevision = existing.length > 0 ? (existing[0].revision + 1) : 1;
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Get intern ID if available
    const empProfile = await db.employmentProfile.findUnique({
      where: { userId: user.id },
      select: { employeeId: true },
    });
    const officialId = empProfile?.employeeId || null;

    await db.$executeRawUnsafe(`
      INSERT INTO assignment_submissions (
        id, assignment_id, user_id, user_name, user_role, intern_id,
        submission_type, text_content, repository_url, branch, commit_sha,
        notes, revision, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, 'SUBMITTED'
      )
    `,
      subId,
      assignmentId,
      user.id,
      user.displayName || user.username || 'Student',
      user.role || 'INTERN',
      officialId,
      submissionType,
      textContent || null,
      repositoryUrl || null,
      branch || null,
      commitSha || null,
      notes || null,
      nextRevision
    );

    return NextResponse.json({
      ok: true,
      message: "Assignment submitted successfully.",
      submission: {
        id: subId,
        revision: nextRevision,
        status: "SUBMITTED",
        submissionType,
        submittedAt: new Date().toISOString(),
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/assignments/${assignmentId}/submit] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit assignment." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
