import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    const leaveRequests = await db.leaveRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, leaveRequests });
  } catch (err: any) {
    console.error("[GET /api/mobile/leave]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load leave requests." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate, leaveType = "CASUAL", reason } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "Start date, end date, and reason are required." } },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_DATES", message: "End date must be on or after start date." } },
        { status: 400 }
      );
    }

    const request = await db.leaveRequest.create({
      data: {
        userId: user.id,
        startDate: start,
        endDate: end,
        leaveType,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      leaveRequest: request,
      message: "Leave request submitted to HR.",
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/leave]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit leave request." } }, { status: 500 });
  }
}
