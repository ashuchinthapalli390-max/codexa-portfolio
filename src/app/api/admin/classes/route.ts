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
    const monthFilter = searchParams.get("month");
    const includeLegacy = searchParams.get("includeLegacy") === "true";

    let internProfile: any = null;
    if (!isTrainerOrAdmin) {
      internProfile = await db.employmentProfile.findFirst({
        where: { userId: user.id }
      });
    }

    const whereClause: any = {};
    if (!includeLegacy) {
      whereClause.status = { not: "SUPERSEDED_LEGACY_DRAFT" };
    }

    if (!isTrainerOrAdmin) {
      // Interns NEVER see DRAFT classes
      whereClause.status = { in: ["UPCOMING", "LIVE", "COMPLETED", "RESCHEDULED"] };
    } else if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
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
            _count: {
              select: { submissions: true }
            }
          }
        },
        trainingAttendance: isTrainerOrAdmin ? { select: { status: true } } : false
      }
    });

    // Check student exam blackouts
    const activeBlackouts = await db.studentExamBlackout.findMany({
      where: { status: "ACTIVE" }
    });

    // Resolve domain filter to canonical domain if provided
    let targetDomainId: string | null = null;
    let targetDomainCode: string | null = null;
    let targetDomainName: string | null = null;

    if (domainFilter && domainFilter !== "ALL" && domainFilter !== "All Domains") {
      const dom = await db.trainingDomain.findFirst({
        where: {
          OR: [
            { id: { equals: domainFilter, mode: "insensitive" } },
            { code: { equals: domainFilter, mode: "insensitive" } },
            { name: { equals: domainFilter, mode: "insensitive" } },
            { displayName: { contains: domainFilter, mode: "insensitive" } },
          ]
        }
      });
      if (dom) {
        targetDomainId = dom.id;
        targetDomainCode = dom.code;
        targetDomainName = dom.name;
      }
    }

    let filtered = classes;

    // Student domain-filtering enforcement
    if (!isTrainerOrAdmin) {
      const studentDomainId = internProfile?.domainId;
      const studentDomainStr = internProfile?.internshipDomain || "";
      filtered = filtered.filter(c => {
        const isCommon = c.sequenceNumber !== null && c.sequenceNumber <= 14;
        if (isCommon) return true;
        if (studentDomainId && c.domainLinks?.some((l: any) => l.domainId === studentDomainId)) return true;
        const attendingCodes = Array.isArray(c.attendingDomains) ? (c.attendingDomains as string[]) : [];
        return matchesDomain(studentDomainStr, attendingCodes);
      });
    } else if (domainFilter && domainFilter !== "ALL" && domainFilter !== "All Domains") {
      filtered = filtered.filter(c => {
        const isCommon = c.sequenceNumber !== null && c.sequenceNumber <= 14;
        if (isCommon) return true;
        if (targetDomainId && c.domainLinks?.some((l: any) => l.domainId === targetDomainId)) return true;
        const attendingCodes = Array.isArray(c.attendingDomains) ? (c.attendingDomains as string[]) : [];
        if (targetDomainCode && attendingCodes.includes(targetDomainCode)) return true;
        if (targetDomainName && c.domain.toLowerCase().includes(targetDomainName.toLowerCase())) return true;
        return c.domain.toLowerCase().includes(domainFilter.toLowerCase());
      });
    }

    if (monthFilter) {
      filtered = filtered.filter(c => {
        const dStr = c.classDate.toISOString().split("T")[0];
        return dStr.startsWith(monthFilter);
      });
    }

    // Enrich with intern blackout status
    const enrichedClasses = filtered.map(c => {
      let isStudentExcused = false;
      let excuseReason = "";

      if (internProfile && internProfile.college && internProfile.yearOfStudy) {
        const classDateStr = c.classDate.toISOString().split("T")[0];
        const classDateObj = new Date(classDateStr + "T00:00:00.000Z");

        const matchingBlackout = activeBlackouts.find(b => 
          classDateObj >= b.blackoutStart &&
          classDateObj <= b.blackoutEnd &&
          internProfile.college?.toLowerCase().includes(b.college.toLowerCase()) &&
          internProfile.yearOfStudy === b.yearBatch
        );

        if (matchingBlackout) {
          isStudentExcused = true;
          excuseReason = `Excused for Semester Exams (${matchingBlackout.college} Year ${matchingBlackout.yearBatch})`;
        }
      }

      const isCommon = c.sequenceNumber !== null && c.sequenceNumber <= 14;

      return {
        ...c,
        isCommon,
        isStudentExcused,
        excuseReason,
        meetingLink: c.meetingLink,
        recordingUrl: null, // Strictly nullified per 100% live policy
      };
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const todayClasses = enrichedClasses.filter(c => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr === todayStr && c.status !== "CANCELLED";
    });

    const upcomingClasses = enrichedClasses.filter(c => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr > todayStr && c.status !== "CANCELLED" && c.status !== "DRAFT";
    });

    const draftClasses = enrichedClasses.filter(c => c.status === "DRAFT");

    const pastClasses = enrichedClasses.filter(c => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return (dStr < todayStr || c.status === "COMPLETED") && c.status !== "DRAFT";
    });

    // Global stats across all 231 live sessions (excluding superseded legacy)
    const totalValidClassesInDb = await db.scheduledClass.count({
      where: { status: { not: "SUPERSEDED_LEGACY_DRAFT" } }
    });

    const completedInDb = await db.scheduledClass.count({
      where: { status: "COMPLETED" }
    });

    const liveTodayInDb = await db.scheduledClass.count({
      where: {
        status: { in: ["LIVE", "UPCOMING"] },
        classDate: new Date(todayStr + "T00:00:00.000Z")
      }
    });

    return NextResponse.json({
      ok: true,
      classes: enrichedClasses,
      today: todayClasses,
      upcoming: upcomingClasses,
      drafts: draftClasses,
      past: pastClasses,
      totalCount: enrichedClasses.length,
      globalStats: {
        totalLiveSessions: totalValidClassesInDb, // 231
        completed: completedInDb,
        liveToday: liveTodayInDb,
        activeDomains: 12,
        enrolledInterns: 50,
      },
      selectedDomainInfo: targetDomainId ? {
        id: targetDomainId,
        code: targetDomainCode,
        name: targetDomainName,
        totalClassesForDomain: enrichedClasses.length,
      } : null,
      dbSyncStatus: "CONNECTED_HEALTHY",
      userRole: role,
      internDomain: internProfile?.internshipDomain || null,
      internDomainId: internProfile?.domainId || null,
      internCollege: internProfile?.college || null,
      internYear: internProfile?.yearOfStudy || null
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/classes]", err);
    return NextResponse.json({ ok: false, error: "Failed to load classes: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canSchedule = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN", "INSTRUCTOR"].includes(role);
    if (!canSchedule) {
      return NextResponse.json({ ok: false, error: "Forbidden. Leadership or Trainer only." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      domain = "All Domains",
      attendingDomains = [],
      topic,
      classDate,
      startTime = "19:30",
      endTime = "21:30",
      meetingLink,
      learningGoals = [],
      trainerDemo,
      instructorNotes
    } = body;

    if (!title || !topic || !classDate) {
      return NextResponse.json({ ok: false, error: "Title, topic, and classDate are required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const classDateObj = new Date(classDate + "T00:00:00.000Z");

    // Sunday check
    if (classDateObj.getUTCDay() === 0) {
      return NextResponse.json({ ok: false, error: "Sunday is an off day. Exactly one class per day, Mon-Sat only." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // SINGLE-TRAINER COLLISION CHECK: Exactly ONE live class per day
    const existingClassOnDate = await db.scheduledClass.findFirst({
      where: {
        classDate: classDateObj,
        status: { in: ["UPCOMING", "LIVE", "COMPLETED", "DRAFT"] }
      }
    });

    if (existingClassOnDate) {
      return NextResponse.json({
        ok: false,
        error: `Trainer Conflict: The sole trainer already has class "${existingClassOnDate.title}" scheduled on ${classDate}. Only ONE live class per day is permitted.`
      }, { status: 409, headers: NO_CACHE_HEADERS });
    }

    const id = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const instructorName = user.displayName || user.username || "CodeXa Lead Instructor";

    const newClass = await db.scheduledClass.create({
      data: {
        id,
        sourceKey: id,
        title,
        domain: Array.isArray(attendingDomains) && attendingDomains.length > 0 ? attendingDomains.join(", ") : domain,
        batch: "Batch-2026",
        topic,
        subtopics: Array.isArray(learningGoals) ? learningGoals : [],
        instructorId: user.id,
        instructorName,
        classDate: classDateObj,
        startTime,
        endTime,
        duration: "2h 00m",
        status: "DRAFT",
        mode: "ONLINE",
        meetingLink: meetingLink || null,
        learningObjectives: Array.isArray(learningGoals) ? learningGoals.join("\n") : null,
        attendingDomains: Array.isArray(attendingDomains) ? attendingDomains : [],
        learningGoals: Array.isArray(learningGoals) ? learningGoals : [],
        trainerDemo: trainerDemo || null,
        timeZone: "Asia/Kolkata",
        instructorNotes: instructorNotes || null
      }
    });

    // Create corresponding draft assignment
    const assignId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dueDate = new Date(classDateObj);
    dueDate.setUTCDate(dueDate.getUTCDate() + 2);
    dueDate.setUTCHours(18, 29, 0, 0);

    const releaseAt = new Date(classDateObj);
    releaseAt.setUTCHours(16, 5, 0, 0);

    await db.assignment.create({
      data: {
        id: assignId,
        sourceKey: assignId,
        title: `Assignment: ${title}`,
        description: `Hands-on practical exercise for ${title}.`,
        assignedBy: user.id,
        assignedByName: instructorName,
        domain: newClass.domain,
        classId: newClass.id,
        submissionType: "BOTH",
        dueDate,
        status: "DRAFT",
        evidenceRequired: "Source code repository and test evidence",
        releaseAt,
        attendingDomains: newClass.attendingDomains ?? undefined
      }
    });

    // Audit log
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "CREATE_CLASS",
        entityType: "CLASS",
        entityId: newClass.id,
        before: undefined,
        after: { title, classDate, startTime, endTime }
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Draft class and assignment created successfully.",
      class: newClass
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/classes]", err);
    return NextResponse.json({ ok: false, error: "Failed to schedule class: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
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
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { id, status, meetingLink, classDate, startTime, endTime, topic, title, learningGoals, trainerDemo } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Class id is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const existing = await db.scheduledClass.findUnique({
      where: { id }
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Class not found" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const updateData: any = {};
    const now = new Date();

    if (classDate) {
      const targetDateObj = new Date(classDate + "T00:00:00.000Z");
      if (targetDateObj.getUTCDay() === 0) {
        return NextResponse.json({ ok: false, error: "Cannot reschedule to a Sunday. Sundays are off days." }, { status: 400, headers: NO_CACHE_HEADERS });
      }

      const collision = await db.scheduledClass.findFirst({
        where: {
          id: { not: id },
          classDate: targetDateObj,
          status: { in: ["UPCOMING", "LIVE", "COMPLETED", "DRAFT"] }
        }
      });

      if (collision) {
        return NextResponse.json({
          ok: false,
          error: `Trainer Conflict: Class "${collision.title}" is already scheduled on ${classDate}. Sole trainer cannot have overlapping sessions.`
        }, { status: 409, headers: NO_CACHE_HEADERS });
      }

      updateData.classDate = targetDateObj;

      const dueDate = new Date(targetDateObj);
      dueDate.setUTCDate(dueDate.getUTCDate() + 2);
      dueDate.setUTCHours(18, 29, 0, 0);

      const releaseAt = new Date(targetDateObj);
      releaseAt.setUTCHours(16, 5, 0, 0);

      await db.assignment.updateMany({
        where: { classId: id },
        data: { dueDate, releaseAt }
      });
    }

    if (title) updateData.title = title;
    if (topic) updateData.topic = topic;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (learningGoals !== undefined) updateData.learningGoals = learningGoals;
    if (trainerDemo !== undefined) updateData.trainerDemo = trainerDemo;

    if (status) {
      updateData.status = status;
      if (status === "LIVE" && !existing.startAt) {
        updateData.startAt = now;
      }
      if (status === "COMPLETED") {
        updateData.completedAt = now;
      }
      if (status === "CANCELLED") {
        updateData.cancelledAt = now;
      }
      if (status === "UPCOMING" && existing.status === "DRAFT") {
        updateData.publishedAt = now;
      }
    }

    const updated = await db.scheduledClass.update({
      where: { id },
      data: updateData
    });

    // If class marked COMPLETED, check assignment release
    if (status === "COMPLETED") {
      const linkedAssignment = await db.assignment.findFirst({
        where: { classId: id }
      });

      if (linkedAssignment && linkedAssignment.status === "DRAFT") {
        if (!linkedAssignment.releaseAt || now >= linkedAssignment.releaseAt) {
          await db.assignment.update({
            where: { id: linkedAssignment.id },
            data: {
              status: "PUBLISHED",
              publishedAt: now
            }
          });
        }
      }
    }

    // Audit log
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: status === "COMPLETED" ? "COMPLETE_CLASS" : (classDate ? "RESCHEDULE_CLASS" : "UPDATE_CLASS"),
        entityType: "CLASS",
        entityId: id,
        before: { status: existing.status, classDate: existing.classDate, meetingLink: existing.meetingLink },
        after: updateData
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Class updated successfully.",
      class: updated
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[PATCH /api/admin/classes]", err);
    return NextResponse.json({ ok: false, error: "Failed to update class: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
