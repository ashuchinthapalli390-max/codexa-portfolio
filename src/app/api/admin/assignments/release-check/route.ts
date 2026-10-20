import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  return handleReleaseCheck(req);
}

export async function POST(req: NextRequest) {
  return handleReleaseCheck(req);
}

async function handleReleaseCheck(req: NextRequest) {
  try {
    const now = new Date();

    // Find all assignments that are still in DRAFT
    const draftAssignments = await db.assignment.findMany({
      where: {
        status: "DRAFT",
        classId: { not: null }
      },
      include: {
        class: true
      }
    });

    const released = [];
    const pendingClassCompletion = [];
    const pendingReleaseTime = [];

    for (const assignment of draftAssignments) {
      const cls = assignment.class;
      if (!cls) continue;

      // Rule 1: Class must be explicitly marked COMPLETED
      if (cls.status !== "COMPLETED") {
        pendingClassCompletion.push({
          assignmentId: assignment.id,
          classId: cls.id,
          classStatus: cls.status
        });
        continue;
      }

      // Rule 2: Current time must be >= releaseAt (if specified)
      if (assignment.releaseAt && now < assignment.releaseAt) {
        pendingReleaseTime.push({
          assignmentId: assignment.id,
          classId: cls.id,
          releaseAt: assignment.releaseAt.toISOString()
        });
        continue;
      }

      // Both conditions satisfied! Release assignment
      await db.assignment.update({
        where: { id: assignment.id },
        data: {
          status: "PUBLISHED",
          publishedAt: now
        }
      });

      released.push({
        assignmentId: assignment.id,
        title: assignment.title,
        classId: cls.id,
        publishedAt: now.toISOString()
      });
    }

    if (released.length > 0) {
      await db.trainingChangeAudit.create({
        data: {
          actorId: "SYSTEM_ASSIGNMENT_WORKER",
          actorEmail: "system@codexa.agency",
          action: "RELEASE_ASSIGNMENTS",
          entityType: "ASSIGNMENT_BATCH",
          entityId: `RELEASE_${Date.now()}`,
          before: undefined,
          after: { releasedCount: released.length, released }
        }
      });
    }

    return NextResponse.json({
      ok: true,
      releasedCount: released.length,
      released,
      pendingClassCompletionCount: pendingClassCompletion.length,
      pendingReleaseTimeCount: pendingReleaseTime.length,
      timestamp: now.toISOString()
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET/POST /api/admin/assignments/release-check]", err);
    return NextResponse.json({ ok: false, error: "Failed to run release check: " + err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
