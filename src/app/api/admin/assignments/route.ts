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

    const assignments = await db.assignment.findMany({
      orderBy: { dueDate: "desc" },
      include: {
        submissions: {
          select: {
            id: true,
            userId: true,
            userName: true,
            userRole: true,
            internId: true,
            submissionType: true,
            status: true,
            revision: true,
            grade: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      assignments: assignments.map((a) => {
        const submittedCount = a.submissions.length;
        const approvedCount = a.submissions.filter((s) => s.status === "APPROVED").length;
        const pendingCount = a.submissions.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;
        const revisionCount = a.submissions.filter((s) => s.status === "REVISION_REQUESTED").length;

        return {
          ...a,
          submittedCount,
          approvedCount,
          pendingCount,
          revisionCount,
        };
      }),
      totalCount: assignments.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/assignments]", err);
    return NextResponse.json({ ok: false, error: "Failed to load assignments" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canCreate = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canCreate) {
      return NextResponse.json({ ok: false, error: "Forbidden. Leadership only." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      domain = "All Domains",
      submissionType = "BOTH",
      dueDate,
      lateCutoff,
      requirements,
      classId,
      projectId,
    } = body;

    if (!title || !description || !dueDate) {
      return NextResponse.json({ ok: false, error: "Title, description, and dueDate are required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const id = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assignedByName = user.displayName || user.username || "Technical Lead";

    const assignment = await db.assignment.create({
      data: {
        id,
        title,
        description,
        assignedBy: user.id,
        assignedByName,
        domain,
        submissionType,
        dueDate: new Date(dueDate),
        lateCutoff: lateCutoff ? new Date(lateCutoff) : null,
        requirements: requirements || null,
        classId: classId || null,
        projectId: projectId || null,
        status: "ACTIVE",
      },
    });

    // Notify interns
    try {
      const interns = await db.user.findMany({
        where: { role: "INTERN", isActive: true },
        select: { id: true },
      });

      if (interns.length > 0) {
        await db.notification.createMany({
          data: interns.map((intern) => ({
            userId: intern.id,
            type: "ASSIGNMENT_CREATED",
            title: `New Assignment: ${title}`,
            message: `Due on ${new Date(dueDate).toLocaleDateString()}. Submission type: ${submissionType}.`,
            link: "/assignments",
          })),
        });
      }
    } catch (_) {}

    return NextResponse.json({
      ok: true,
      message: "Assignment created successfully.",
      assignment,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/assignments]", err);
    return NextResponse.json({ ok: false, error: "Failed to create assignment: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canManage = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canManage) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { id, title, description, requirements, status, dueDate, submissionType } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Assignment id is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (status) updateData.status = status;
    if (submissionType) updateData.submissionType = submissionType;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    const updated = await db.assignment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: "Assignment updated successfully.",
      assignment: updated,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[PATCH /api/admin/assignments]", err);
    return NextResponse.json({ ok: false, error: "Failed to update assignment: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
