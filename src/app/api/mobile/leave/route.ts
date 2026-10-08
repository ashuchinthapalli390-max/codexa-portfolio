import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
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
      if (res.status === "authenticated") {
        return res.user;
      }
    }
  }

  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") {
    return cookieRes.user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const role = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);

    // Fetch user's own leave requests
    const myLeaveRequests = await db.leaveRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    let pendingApprovals: any[] = [];
    let leadershipStats: any = null;

    if (isLeadership) {
      const allApprovals = await db.leaveRequest.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              role: true,
              profileMediaUrl: true,
              employmentProfile: {
                select: {
                  employeeId: true,
                  internshipDomain: true,
                  internshipStartDate: true,
                  internshipEndDate: true,
                  mentorName: true,
                },
              },
            },
          },
        },
      });

      pendingApprovals = allApprovals.filter((l) => l.status === "PENDING");
      leadershipStats = {
        pendingCount: pendingApprovals.length,
        approvedCount: allApprovals.filter((l) => l.status === "APPROVED").length,
        rejectedCount: allApprovals.filter((l) => l.status === "REJECTED").length,
        totalCount: allApprovals.length,
      };
    }

    return NextResponse.json({
      ok: true,
      leaveRequests: myLeaveRequests,
      isLeadership,
      pendingApprovals,
      leadershipStats,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/mobile/leave]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load leave requests." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { startDate, endDate, leaveType = "CASUAL", reason } = body;

    if (!startDate || !endDate || !reason || !reason.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "Start date, end date, and reason are required." } },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATE", message: "Invalid date format." } },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATES", message: "End date must be on or after start date." } },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Check for overlapping pending or approved requests
    const overlapping = await db.leaveRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "OVERLAPPING_LEAVE",
            message: `You already have an active or pending leave request for this period (${overlapping.startDate.toISOString().split("T")[0]} to ${overlapping.endDate.toISOString().split("T")[0]}).`,
          },
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const request = await db.leaveRequest.create({
      data: {
        userId: user.id,
        startDate: start,
        endDate: end,
        leaveType: leaveType.toUpperCase(),
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    // Notify Founder and Leadership
    try {
      const leaders = await db.user.findMany({
        where: {
          role: { in: ["OWNER", "FOUNDER", "CO_FOUNDER", "CEO", "HR"] },
          isActive: true,
        },
        select: { id: true },
      });

      const applicantName = user.displayName || user.username || "Team Member";
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      if (leaders.length > 0) {
        await db.notification.createMany({
          data: leaders.map((l) => ({
            userId: l.id,
            type: "LEAVE_REQUESTED",
            title: `New Leave Request: ${applicantName}`,
            message: `${applicantName} requested ${leaveType} leave from ${startStr} to ${endStr}: ${reason.trim().substring(0, 80)}`,
            link: "/dashboard/leave",
          })),
        });

        // Send FCM Push to leaders
        const { sendFcmPushToUser } = await import("@/lib/firebase-admin");
        for (const l of leaders) {
          await sendFcmPushToUser(l.id, {
            title: "New Leave Application 📝",
            body: `${applicantName} requested ${leaveType} leave (${startStr} to ${endStr}). Tap to review.`,
            data: {
              type: "LEAVE_APPROVAL",
              leaveId: request.id,
            },
          }).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.warn("[Leave request notification warning]", notifErr);
    }

    return NextResponse.json({
      ok: true,
      leaveRequest: request,
      message: "Leave request submitted to leadership.",
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/mobile/leave]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit leave request." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
