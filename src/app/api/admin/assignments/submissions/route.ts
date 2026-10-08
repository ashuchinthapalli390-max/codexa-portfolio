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

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const status = searchParams.get("status");

    const where: any = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (status && status !== "ALL") where.status = status;

    const submissions = await db.assignmentSubmission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        assignment: {
          select: {
            title: true,
            domain: true,
            dueDate: true,
            submissionType: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      submissions,
      totalCount: submissions.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/assignments/submissions]", err);
    return NextResponse.json({ ok: false, error: "Failed to load submissions: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canReview = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "EMPLOYEE"].includes(role);
    if (!canReview) {
      return NextResponse.json({ ok: false, error: "Forbidden. Not authorized to review." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { submissionId, status, grade, feedback } = body;

    if (!submissionId || !status) {
      return NextResponse.json({ ok: false, error: "submissionId and status required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const reviewerName = user.displayName || user.username || "Technical Mentor";

    const updated = await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        status, // "APPROVED" | "REVISION_REQUESTED" | "GRADED" | "REJECTED"
        grade: grade || null,
        feedback: feedback || null,
        reviewerId: user.id,
        reviewerName,
        reviewedAt: new Date(),
      },
      include: {
        assignment: { select: { title: true } },
      },
    });

    // Notify student of review decision
    try {
      const title = status === "APPROVED"
        ? "Assignment Approved!"
        : status === "REVISION_REQUESTED"
          ? "Assignment Revision Requested"
          : `Assignment Graded: ${grade || "Reviewed"}`;

      const message = feedback
        ? `${feedback.slice(0, 100)}`
        : `Your submission for "${updated.assignment.title}" was reviewed as ${status}.`;

      await db.notification.create({
        data: {
          userId: updated.userId,
          type: "ASSIGNMENT_REVIEWED",
          title,
          message,
          link: `/assignments/${updated.assignmentId}`,
        },
      });
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      message: "Submission review recorded successfully.",
      submission: updated,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/assignments/submissions]", err);
    return NextResponse.json({ ok: false, error: "Failed to review submission: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
