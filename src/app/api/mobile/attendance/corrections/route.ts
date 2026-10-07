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

    const corrections = await db.attendanceCorrection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, corrections });
  } catch (err: any) {
    console.error("[GET /api/mobile/attendance/corrections]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load corrections." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401 });
    }

    const body = await req.json();
    const { date, reason, explanation, proofImageUrl } = body;

    if (!date || !reason) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "Date and reason are required." } },
        { status: 400 }
      );
    }

    const correction = await db.attendanceCorrection.create({
      data: {
        userId: user.id,
        date: new Date(date),
        currentStatus: "ABSENT",
        requestedStatus: "PRESENT",
        reason: `${reason}: ${explanation || ""}`.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      correction,
      message: "Attendance correction request submitted for admin review.",
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/attendance/corrections]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit correction." } }, { status: 500 });
  }
}
