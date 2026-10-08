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
  { params }: { params: { id: string } }
) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized. Please log in." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const role = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!isLeadership) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Leadership permission required to approve leave." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const leaveId = params?.id;
    if (!leaveId) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Missing leave request ID." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const existing = await db.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        user: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Leave request not found." }, requestId },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ALREADY_REVIEWED",
            message: `This leave request has already been ${existing.status.toLowerCase()} by another reviewer.`,
            currentStatus: existing.status,
          },
          requestId,
        },
        { status: 409, headers: NO_CACHE_HEADERS }
      );
    }

    const now = new Date();
    const updated = await db.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: "APPROVED",
        reviewedBy: user.id,
        reviewedAt: now,
        reviewNotes: notes || "Approved by leadership",
      },
    });

    // Create in-app Notification for applicant
    try {
      const startStr = existing.startDate.toISOString().split("T")[0];
      const endStr = existing.endDate.toISOString().split("T")[0];
      await db.notification.create({
        data: {
          userId: existing.userId,
          type: "LEAVE_APPROVED",
          title: "Leave Request Approved",
          message: `Your ${existing.leaveType} leave request for ${startStr} to ${endStr} has been approved.`,
          link: "/leave",
        },
      });

      const { sendFcmPushToUser } = await import("@/lib/firebase-admin");
      await sendFcmPushToUser(existing.userId, {
        title: "Leave Approved ✅",
        body: `Your leave from ${startStr} to ${endStr} has been approved by ${user.displayName || user.username || "Leadership"}.`,
        data: {
          type: "LEAVE_STATUS",
          leaveId: existing.id,
          status: "APPROVED",
        },
      }).catch(() => {});
    } catch (notifErr) {
      console.warn("[Mobile leave approval notification warning]", notifErr);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Leave request approved successfully.",
        leaveRequest: updated,
        requestId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error(`[POST /api/mobile/leave/[id]/approve] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to approve leave request." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
