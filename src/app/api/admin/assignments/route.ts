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

const DOMAIN_CODE_TO_PATTERNS: Record<string, string[]> = {
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

function matchesDomain(internDomain: string, attendingDomainCodes: string[]): boolean {
  if (!internDomain) return false;
  const lower = internDomain.toLowerCase();
  for (const code of attendingDomainCodes) {
    const patterns = DOMAIN_CODE_TO_PATTERNS[code] || [code.toLowerCase()];
    if (patterns.some(p => lower.includes(p))) {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const isTrainerOrAdmin = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(role);

    const { searchParams } = new URL(req.url);
    const domainFilter = searchParams.get("domain");
    const statusFilter = searchParams.get("status");
    const includeLegacy = searchParams.get("includeLegacy") === "true";

    let internProfile: any = null;
    if (!isTrainerOrAdmin) {
      internProfile = await db.employmentProfile.findFirst({
        where: { userId: user.id }
      });
    }

    const whereClause: any = {};
    if (!includeLegacy) {
      whereClause.status = { not: "SUPERSEDED_LEGACY" };
    }

    if (!isTrainerOrAdmin) {
      // Interns ONLY see released assignments
      whereClause.status = { in: ["PUBLISHED", "ACTIVE"] };
    } else if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const assignments = await db.assignment.findMany({
      where: whereClause,
      orderBy: { dueDate: "asc" },
      include: {
        class: {
          select: {
            id: true,
            sourceKey: true,
            sequenceNumber: true,
            title: true,
            classDate: true,
            status: true,
            attendingDomains: true
          }
        },
        submissions: {
          where: isTrainerOrAdmin ? undefined : { userId: user.id }, // Interns only see their OWN submissions!
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    // Check student exam blackouts
    const activeBlackouts = await db.studentExamBlackout.findMany({
      where: { status: "ACTIVE" }
    });

    let filtered = assignments;
    if (!isTrainerOrAdmin) {
      const studentDomain = internProfile?.internshipDomain || "";
      filtered = filtered.filter(a => {
        const isCommon = Boolean(a.class?.sequenceNumber && a.class.sequenceNumber <= 14);
        if (isCommon) return true;
        const attendingCodes = Array.isArray(a.attendingDomains) ? (a.attendingDomains as string[]) : [];
        return matchesDomain(studentDomain, attendingCodes) || a.domain.toLowerCase().includes(studentDomain.toLowerCase());
      });
    } else if (domainFilter && domainFilter !== "ALL" && domainFilter !== "All Domains") {
      filtered = filtered.filter(a => {
        const isCommon = Boolean(a.class?.sequenceNumber && a.class.sequenceNumber <= 14);
        if (isCommon) return true;
        const attendingCodes = Array.isArray(a.attendingDomains) ? (a.attendingDomains as string[]) : [];
        return attendingCodes.includes(domainFilter) || a.domain.toLowerCase().includes(domainFilter.toLowerCase());
      });
    }

    return NextResponse.json({
      ok: true,
      assignments: filtered.map((a) => {
        const submittedCount = a.submissions.length;
        const approvedCount = a.submissions.filter((s) => s.status === "APPROVED" || s.status === "GRADED").length;
        const pendingCount = a.submissions.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;
        const revisionCount = a.submissions.filter((s) => s.status === "REVISION_REQUESTED").length;

        // Check blackout for this student on class date
        let isStudentExcused = false;
        let excuseReason = "";
        if (internProfile && a.class?.classDate && internProfile.college && internProfile.yearOfStudy) {
          const classDateStr = a.class.classDate.toISOString().split("T")[0];
          const classDateObj = new Date(classDateStr + "T00:00:00.000Z");

          const matchingBlackout = activeBlackouts.find(b => 
            classDateObj >= b.blackoutStart &&
            classDateObj <= b.blackoutEnd &&
            internProfile.college?.toLowerCase().includes(b.college.toLowerCase()) &&
            internProfile.yearOfStudy === b.yearBatch
          );

          if (matchingBlackout) {
            isStudentExcused = true;
            excuseReason = `Excused for Semester Exams (${matchingBlackout.college} Year ${matchingBlackout.yearBatch}) — No mandatory homework penalty`;
          }
        }

        return {
          id: a.id,
          sourceKey: a.sourceKey,
          title: a.title,
          description: a.description,
          assignedByName: a.assignedByName,
          domain: a.domain,
          attendingDomains: a.attendingDomains,
          classId: a.classId,
          dueDate: a.dueDate,
          releaseAt: a.releaseAt,
          publishedAt: a.publishedAt,
          evidenceRequired: a.evidenceRequired || a.requirements,
          status: a.status,
          class: a.class,
          submittedCount,
          approvedCount,
          pendingCount,
          revisionCount,
          submissions: a.submissions,
          mySubmission: isTrainerOrAdmin ? null : (a.submissions[0] || null),
          isStudentExcused,
          excuseReason
        };
      }),
      totalCount: filtered.length,
      userRole: role,
      internDomain: internProfile?.internshipDomain || null
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/assignments]", err);
    return NextResponse.json({ ok: false, error: "Failed to load assignments: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const body = await req.json().catch(() => ({}));

    // Check if this is an INTERN submitting an assignment!
    if (role === "INTERN" || body.action === "SUBMIT") {
      const { assignmentId, textContent, repositoryUrl, notes } = body;
      if (!assignmentId || (!textContent && !repositoryUrl)) {
        return NextResponse.json({ ok: false, error: "assignmentId and either textContent or repositoryUrl are required." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const assignment = await db.assignment.findUnique({
        where: { id: assignmentId },
        include: { class: true }
      });

      if (!assignment) {
        return NextResponse.json({ ok: false, error: "Assignment not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // Ensure assignment is published before allowing submission
      if (assignment.status !== "PUBLISHED" && assignment.status !== "ACTIVE") {
        return NextResponse.json({ ok: false, error: "Assignment is not yet open for submission." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const profile = await db.employmentProfile.findFirst({
        where: { userId: user.id }
      });

      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const submission = await db.assignmentSubmission.upsert({
        where: {
          assignmentId_userId_revision: {
            assignmentId,
            userId: user.id,
            revision: 1
          }
        },
        create: {
          id: submissionId,
          assignmentId,
          userId: user.id,
          userName: user.displayName || user.username || "Intern",
          userRole: "INTERN",
          internId: profile?.employeeId || null,
          submissionType: repositoryUrl ? (textContent ? "BOTH" : "REPOSITORY") : "TEXT",
          textContent: textContent || null,
          repositoryUrl: repositoryUrl || null,
          notes: notes || null,
          status: "SUBMITTED",
          revision: 1
        },
        update: {
          submissionType: repositoryUrl ? (textContent ? "BOTH" : "REPOSITORY") : "TEXT",
          textContent: textContent || null,
          repositoryUrl: repositoryUrl || null,
          notes: notes || null,
          status: "SUBMITTED",
          submittedAt: new Date()
        }
      });

      return NextResponse.json({
        ok: true,
        message: "Assignment submitted successfully.",
        submission
      }, { headers: NO_CACHE_HEADERS });
    }

    // Otherwise, instructor creating assignment
    const canCreate = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(role);
    if (!canCreate) {
      return NextResponse.json({ ok: false, error: "Forbidden. Leadership or Trainer only." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const {
      title,
      description,
      domain = "All Domains",
      submissionType = "BOTH",
      dueDate,
      requirements,
      classId,
    } = body;

    if (!title || !description || !dueDate) {
      return NextResponse.json({ ok: false, error: "Title, description, and dueDate are required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const id = `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assignedByName = user.displayName || user.username || "CodeXa Technical Lead";

    const newAssignment = await db.assignment.create({
      data: {
        id,
        sourceKey: id,
        title,
        description,
        assignedBy: user.id,
        assignedByName,
        domain,
        classId: classId || null,
        submissionType,
        dueDate: new Date(dueDate),
        requirements: requirements || null,
        evidenceRequired: requirements || null,
        status: "DRAFT"
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Assignment created successfully.",
      assignment: newAssignment,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/assignments]", err);
    return NextResponse.json({ ok: false, error: "Failed to process assignment: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { id, title, description, evidenceRequired, dueDate, status, submissionId, grade, feedback } = body;

    // Review/grade a submission if submissionId provided
    if (submissionId) {
      const reviewerName = user.displayName || user.username || "Technical Lead";
      const updatedSubmission = await db.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          grade: grade || null,
          feedback: feedback || null,
          status: grade ? "GRADED" : "UNDER_REVIEW",
          reviewerId: user.id,
          reviewerName,
          reviewedAt: new Date()
        }
      });

      return NextResponse.json({
        ok: true,
        message: "Submission evaluated successfully.",
        submission: updatedSubmission
      }, { headers: NO_CACHE_HEADERS });
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: "Assignment id or submissionId is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (evidenceRequired) updateData.evidenceRequired = evidenceRequired;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (status) {
      updateData.status = status;
      if (status === "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
    }

    const updated = await db.assignment.update({
      where: { id },
      data: updateData
    });

    // Audit log
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "UPDATE_ASSIGNMENT",
        entityType: "ASSIGNMENT",
        entityId: id,
        before: undefined,
        after: updateData
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Assignment updated successfully.",
      assignment: updated
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[PATCH /api/admin/assignments]", err);
    return NextResponse.json({ ok: false, error: "Failed to update assignment: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
