import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { uploadMediaFile } from "@/lib/media-storage";

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
    const dateParam = searchParams.get("date");
    const domainParam = searchParams.get("domain");

    const where: any = {};
    if (dateParam) {
      where.classDate = new Date(dateParam);
    }
    if (domainParam && domainParam !== "All Domains") {
      where.domain = domainParam;
    }

    const classes = await db.scheduledClass.findMany({
      where,
      orderBy: [{ classDate: "desc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      ok: true,
      classes,
      count: classes.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/classes/topics]", err);
    return NextResponse.json({ ok: false, error: "Failed to load topics" }, { status: 500, headers: NO_CACHE_HEADERS });
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
      return NextResponse.json({ ok: false, error: "Leadership permissions required." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const {
      classId,
      mainTopic,
      subtopics,
      learningObjectives,
      resources,
      status,
    } = body;

    if (!classId) {
      return NextResponse.json({ ok: false, error: "Class ID required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updateData: any = {};
    if (mainTopic !== undefined) updateData.topic = mainTopic;
    if (subtopics !== undefined) updateData.subtopics = Array.isArray(subtopics) ? subtopics : [];
    if (learningObjectives !== undefined) updateData.learningObjectives = learningObjectives;
    if (resources !== undefined) updateData.resources = Array.isArray(resources) ? resources : [];
    if (status !== undefined) updateData.status = status;

    const updated = await db.scheduledClass.update({
      where: { id: classId },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      message: "Daily topics updated successfully.",
      class: updated,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[PATCH /api/admin/classes/topics]", err);
    return NextResponse.json({ ok: false, error: "Failed to update daily topics: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
