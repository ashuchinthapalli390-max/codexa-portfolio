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

    const classes = await db.scheduledClass.findMany({
      orderBy: [{ classDate: "desc" }, { startTime: "asc" }],
      include: {
        questions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const todayClasses = classes.filter((c) => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr === todayStr;
    });

    const upcomingClasses = classes.filter((c) => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr > todayStr && c.status !== "CANCELLED";
    });

    const pastClasses = classes.filter((c) => {
      const dStr = c.classDate.toISOString().split("T")[0];
      return dStr < todayStr || c.status === "COMPLETED";
    });

    return NextResponse.json({
      ok: true,
      classes,
      today: todayClasses,
      upcoming: upcomingClasses,
      past: pastClasses,
      totalCount: classes.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/classes]", err);
    return NextResponse.json({ ok: false, error: "Failed to load classes" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canSchedule = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canSchedule) {
      return NextResponse.json({ ok: false, error: "Forbidden. Leadership only." }, { status: 403, headers: NO_CACHE_HEADERS });
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
      recordingUrl,
    } = body;

    if (!title || !topic || !classDate || !startTime || !endTime) {
      return NextResponse.json({ ok: false, error: "Title, topic, date, start time and end time are required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const id = `class_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const instructorName = user.displayName || user.username || "CodeXa Lead Instructor";

    const newClass = await db.scheduledClass.create({
      data: {
        id,
        title,
        domain,
        batch,
        topic,
        subtopics: Array.isArray(subtopics) ? subtopics : [],
        instructorId: user.id,
        instructorName,
        classDate: new Date(classDate),
        startTime,
        endTime,
        duration,
        status: "UPCOMING",
        mode,
        meetingLink: meetingLink || null,
        learningObjectives: learningObjectives || null,
        resources: Array.isArray(resources) ? resources : [],
        recordingUrl: recordingUrl || null,
      },
    });

    // Notify all active interns in domain
    try {
      const targetWhere: any = { role: "INTERN", isActive: true };
      const interns = await db.user.findMany({
        where: targetWhere,
        select: { id: true },
      });

      if (interns.length > 0) {
        await db.notification.createMany({
          data: interns.map((intern) => ({
            userId: intern.id,
            type: "CLASS_SCHEDULED",
            title: `New Class: ${title}`,
            message: `${topic} scheduled on ${classDate} at ${startTime}.`,
            link: "/classes",
          })),
        });
      }
    } catch (notifErr) {
      console.warn("[Class creation notification warning]", notifErr);
    }

    return NextResponse.json({
      ok: true,
      message: "Scheduled class created successfully.",
      class: newClass,
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
    const canSchedule = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canSchedule) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { id, status, recordingUrl, resources, meetingLink, classDate, startTime, endTime, topic } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Class id is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (recordingUrl !== undefined) updateData.recordingUrl = recordingUrl;
    if (resources !== undefined) updateData.resources = resources;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (topic) updateData.topic = topic;
    if (classDate) updateData.classDate = new Date(classDate);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;

    const updated = await db.scheduledClass.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: "Class updated successfully.",
      class: updated,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[PATCH /api/admin/classes]", err);
    return NextResponse.json({ ok: false, error: "Failed to update class: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canDelete = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER"].includes(role);
    if (!canDelete) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Class id is required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    await db.scheduledClass.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Class removed successfully.",
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[DELETE /api/admin/classes]", err);
    return NextResponse.json({ ok: false, error: "Failed to delete class: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
