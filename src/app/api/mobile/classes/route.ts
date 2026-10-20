import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getEffectiveRole, hasPermission, Permission } from "@/lib/permissions";
import { resolveVisibleClassesForUser } from "@/lib/classes/class-visibility";

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
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized. Valid session required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date")?.trim(); // YYYY-MM-DD
    const monthParam = searchParams.get("month")?.trim(); // YYYY-MM
    const domainParam = searchParams.get("domain")?.trim();
    const includeDrafts = searchParams.get("includeDrafts") === "true";

    // Validate date format if passed
    if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATE", message: "Date must be in YYYY-MM-DD format." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Validate month format if passed
    if (monthParam && !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATE_RANGE", message: "Month must be in YYYY-MM format." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const resolved = await resolveVisibleClassesForUser({
      user,
      date: dateParam || null,
      month: monthParam || null,
      domain: domainParam || null,
      includeDrafts,
    });

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const todayStr = nowIST.toISOString().split("T")[0];

    // Single Date Request
    if (dateParam) {
      return NextResponse.json({
        ok: true,
        date: dateParam,
        selectedDate: dateParam,
        timezone: "Asia/Kolkata",
        classes: resolved.classes,
        today: resolved.classes,
        upcoming: [],
        count: resolved.classes.length,
        canManage: resolved.canManageClasses,
        userRole: resolved.userRole,
        internDomain: resolved.userDomain,
        internDomainId: resolved.userDomainId,
        internYear: resolved.userYear,
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    // Month or General Schedule Request
    const todayClasses = resolved.classes.filter(
      (c) => c.classDate === todayStr && c.lifecycleStatus !== "CANCELLED"
    );
    const upcomingClasses = resolved.classes.filter(
      (c) => c.classDate > todayStr && c.lifecycleStatus !== "CANCELLED" && c.publicationStatus === "PUBLISHED"
    );
    const pastClasses = resolved.classes.filter(
      (c) => c.classDate < todayStr || c.lifecycleStatus === "COMPLETED"
    );

    // Compute month date breakdown
    const dateCounts: Record<string, { count: number; hasLive: boolean; hasUpcoming: boolean }> = {};
    for (const c of resolved.classes) {
      if (!dateCounts[c.classDate]) {
        dateCounts[c.classDate] = { count: 0, hasLive: false, hasUpcoming: false };
      }
      dateCounts[c.classDate].count++;
      if (c.lifecycleStatus === "LIVE") dateCounts[c.classDate].hasLive = true;
      if (c.lifecycleStatus === "UPCOMING") dateCounts[c.classDate].hasUpcoming = true;
    }

    const scheduledDates = Object.entries(dateCounts).map(([date, meta]) => ({
      date,
      count: meta.count,
      hasLive: meta.hasLive,
      hasUpcoming: meta.hasUpcoming,
    }));

    const currentYear = nowIST.getFullYear();
    const currentMonthNum = (nowIST.getMonth() + 1).toString().padStart(2, "0");
    const activeMonth = monthParam || `${currentYear}-${currentMonthNum}`;

    return NextResponse.json({
      ok: true,
      year: parseInt(activeMonth.split("-")[0], 10),
      month: activeMonth,
      timezone: "Asia/Kolkata",
      classes: resolved.classes,
      today: todayClasses,
      upcoming: upcomingClasses,
      past: pastClasses,
      scheduledDates,
      count: todayClasses.length + upcomingClasses.length,
      totalClasses: resolved.classes.length,
      canManage: resolved.canManageClasses,
      userRole: resolved.userRole,
      internDomain: resolved.userDomain,
      internDomainId: resolved.userDomainId,
      internYear: resolved.userYear,
      syncStatus: "MOBILE_BACKEND_SYNCED",
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[GET /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load scheduled classes: " + err.message }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const canCreate = hasPermission(user, Permission.CAN_CREATE_CLASSES);
    if (!canCreate) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Only Founder, Co-Founder, or authorized staff may schedule classes." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      domain = "All Domains",
      attendingDomains = [],
      batch = "Batch-2026",
      topic,
      subtopics = [],
      classDate,
      startTime = "19:30",
      endTime = "21:30",
      duration = "2h 00m",
      mode = "ONLINE",
      meetingLink,
      learningObjectives,
      resources = [],
      learningGoals = [],
      trainerDemo,
      instructorNotes,
      publishImmediately = false,
    } = body;

    if (!title || !topic || !classDate || !startTime || !endTime) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Title, topic, classDate, startTime, and endTime are required." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const classDateObj = new Date(classDate + "T00:00:00.000Z");

    const id = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const instructorName = user.displayName || user.username || "CodeXa Lead Instructor";
    const now = new Date();

    const created = await db.scheduledClass.create({
      data: {
        id,
        sourceKey: id,
        title,
        domain: Array.isArray(attendingDomains) && attendingDomains.length > 0 ? attendingDomains.join(", ") : domain,
        batch,
        topic,
        subtopics: Array.isArray(subtopics) && subtopics.length > 0 ? subtopics : learningGoals,
        instructorId: user.id,
        instructorName,
        classDate: classDateObj,
        startTime,
        endTime,
        duration,
        status: publishImmediately ? "UPCOMING" : "DRAFT",
        mode,
        meetingLink: meetingLink || null,
        learningObjectives: learningObjectives || (Array.isArray(learningGoals) ? learningGoals.join("\n") : null),
        resources: Array.isArray(resources) ? resources : [],
        attendingDomains: Array.isArray(attendingDomains) ? attendingDomains : [],
        learningGoals: Array.isArray(learningGoals) ? learningGoals : [],
        trainerDemo: trainerDemo || null,
        timeZone: "Asia/Kolkata",
        instructorNotes: instructorNotes || null,
        publishedAt: publishImmediately ? now : null,
      },
    });

    // Create corresponding assignment
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
        description: `Practical hands-on exercise for ${title}.`,
        assignedBy: user.id,
        assignedByName: instructorName,
        domain: created.domain,
        classId: created.id,
        submissionType: "BOTH",
        dueDate,
        status: publishImmediately ? "PUBLISHED" : "DRAFT",
        evidenceRequired: "Source code repository and test evidence",
        releaseAt,
        publishedAt: publishImmediately ? now : null,
        attendingDomains: created.attendingDomains ?? undefined,
      },
    });

    // Audit log
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "CREATE_CLASS",
        entityType: "CLASS",
        entityId: created.id,
        before: undefined,
        after: { title, classDate, startTime, endTime, status: created.status },
      },
    });

    return NextResponse.json({
      ok: true,
      message: publishImmediately ? "Class published successfully." : "Draft class created successfully.",
      class: created,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to create class: " + err.message }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      id,
      action, // "PUBLISH", "UNPUBLISH", "RESCHEDULE", "CANCEL", "UPDATE"
      title,
      topic,
      subtopics,
      classDate,
      startTime,
      endTime,
      meetingLink,
      status,
      cancellationReason,
      resources,
      learningObjectives,
      attendingDomains,
    } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Class id is required." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existing = await db.scheduledClass.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "CLASS_NOT_FOUND", message: "Class not found." }, requestId },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const now = new Date();
    const updateData: any = {};

    // 1. Publish Action
    if (action === "PUBLISH" || (status === "UPCOMING" && existing.status === "DRAFT")) {
      if (!hasPermission(user, Permission.CAN_PUBLISH_CLASSES)) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to publish classes." }, requestId },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }
      updateData.status = "UPCOMING";
      updateData.publishedAt = now;

      // Also publish linked assignments
      await db.assignment.updateMany({
        where: { classId: id, status: "DRAFT" },
        data: { status: "PUBLISHED", publishedAt: now },
      });
    }

    // 2. Unpublish Action
    else if (action === "UNPUBLISH") {
      if (!hasPermission(user, Permission.CAN_PUBLISH_CLASSES)) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to unpublish classes." }, requestId },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }
      updateData.status = "DRAFT";
      updateData.publishedAt = null;

      await db.assignment.updateMany({
        where: { classId: id },
        data: { status: "DRAFT", publishedAt: null },
      });
    }

    // 3. Reschedule Action
    else if (action === "RESCHEDULE" || (classDate && classDate !== existing.classDate.toISOString().split("T")[0])) {
      if (!hasPermission(user, Permission.CAN_RESCHEDULE_CLASSES)) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to reschedule classes." }, requestId },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      const targetDateObj = new Date(classDate + "T00:00:00.000Z");
      updateData.classDate = targetDateObj;
      updateData.status = "RESCHEDULED";

      if (startTime) updateData.startTime = startTime;
      if (endTime) updateData.endTime = endTime;

      // Adjust assignment due date
      const dueDate = new Date(targetDateObj);
      dueDate.setUTCDate(dueDate.getUTCDate() + 2);
      dueDate.setUTCHours(18, 29, 0, 0);

      const releaseAt = new Date(targetDateObj);
      releaseAt.setUTCHours(16, 5, 0, 0);

      await db.assignment.updateMany({
        where: { classId: id },
        data: { dueDate, releaseAt },
      });
    }

    // 4. Cancel Action
    else if (action === "CANCEL" || status === "CANCELLED") {
      if (!hasPermission(user, Permission.CAN_CANCEL_CLASSES)) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to cancel classes." }, requestId },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      updateData.status = "CANCELLED";
      updateData.cancelledAt = now;
      if (cancellationReason) {
        updateData.instructorNotes = cancellationReason;
      }
    }

    // 5. General Edit Action
    else {
      if (!hasPermission(user, Permission.CAN_EDIT_CLASSES)) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to edit classes." }, requestId },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }

      if (title !== undefined) updateData.title = title;
      if (topic !== undefined) updateData.topic = topic;
      if (subtopics !== undefined) updateData.subtopics = subtopics;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
      if (resources !== undefined) updateData.resources = resources;
      if (learningObjectives !== undefined) updateData.learningObjectives = learningObjectives;
      if (attendingDomains !== undefined) updateData.attendingDomains = attendingDomains;
      if (status !== undefined) updateData.status = status;
    }

    const updated = await db.scheduledClass.update({
      where: { id },
      data: updateData,
    });

    // Record audit
    await db.trainingChangeAudit.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: action || "UPDATE_CLASS",
        entityType: "CLASS",
        entityId: id,
        before: {
          title: existing.title,
          classDate: existing.classDate,
          status: existing.status,
          publishedAt: existing.publishedAt,
        },
        after: updateData,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Class updated successfully.",
      class: updated,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[PATCH /api/mobile/classes] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to update class: " + err.message }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
