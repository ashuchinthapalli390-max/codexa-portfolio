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

    const role = getEffectiveRole(user);
    const canReview = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "EMPLOYEE"].includes(role);
    if (!canReview) {
      return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Not authorized to review assignments." } }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      submissionId,
      status = "APPROVED", // "APPROVED" | "REVISION_REQUESTED" | "GRADED"
      grade,
      feedback,
    } = body;

    if (!submissionId) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "submissionId is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    await db.$executeRawUnsafe(`
      UPDATE assignment_submissions
      SET 
        status = $1,
        grade = $2,
        feedback = $3,
        reviewer_id = $4,
        reviewer_name = $5,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $6
    `,
      status,
      grade || null,
      feedback || null,
      user.id,
      user.displayName || user.username || 'Mentor',
      submissionId
    );

    return NextResponse.json({
      ok: true,
      message: "Feedback submitted successfully.",
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/assignments/${assignmentId}/feedback] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit feedback." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
