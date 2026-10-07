import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { resolveAllMobileFeatures } from "@/lib/mobile-features";

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

export async function POST(req: NextRequest) {
  try {
    const authUser = await resolveRequestUser(req);
    if (!authUser) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Please log in to mark attendance." } },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: { employmentProfile: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "Your CodeXa account is currently disabled." } },
        { status: 403 }
      );
    }

    const effectiveRole = getEffectiveRole(user);
    const featureFlags = await resolveAllMobileFeatures(user);

    if (!featureFlags.MOBILE_ATTENDANCE) {
      return NextResponse.json(
        { ok: false, error: { code: "FEATURE_DISABLED", message: "Mobile attendance is currently disabled by administrator." } },
        { status: 403 }
      );
    }

    const now = new Date();

    // 1. Mandatory Rule: Intern attendance BEFORE start date must be rejected
    if ((effectiveRole === "INTERN" || user.employmentProfile?.employmentType === "INTERN") && user.employmentProfile?.joiningDate) {
      const startDate = new Date(user.employmentProfile.joiningDate);
      if (now < startDate) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INTERNSHIP_NOT_STARTED",
              message: "Your attendance will become available when your internship begins.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 2. Active Attendance Window check
    const activeWindow = await db.attendanceWindow.findFirst({
      where: {
        status: "ACTIVE",
        startTime: { lte: now },
        endTime: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeWindow) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "WINDOW_CLOSED",
            message: "No active attendance window. Check back during scheduled check-in hours.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Eligibility check
    if (activeWindow.eligibleRoles) {
      const roles = Array.isArray(activeWindow.eligibleRoles) ? activeWindow.eligibleRoles : [];
      if (!roles.includes(effectiveRole) && !roles.includes("ALL")) {
        return NextResponse.json(
          { ok: false, error: { code: "NOT_ELIGIBLE", message: "Your role is not eligible for this attendance window." } },
          { status: 403 }
        );
      }
    }

    // 4. Duplicate prevention & Idempotency
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const existingRecord = await db.attendanceRecord.findFirst({
      where: {
        userId: user.id,
        OR: [
          { windowId: activeWindow.id },
          { date: { gte: todayStart, lte: todayEnd } },
        ],
      },
    });

    if (existingRecord) {
      // Idempotency: Return existing successful attendance instead of creating a duplicate
      return NextResponse.json({
        ok: true,
        alreadyMarked: true,
        record: existingRecord,
        status: "PRESENT",
        markedAt: existingRecord.markedAt,
        message: "Attendance was already marked for today.",
      });
    }

    // 5. Create Attendance Record
    const record = await db.attendanceRecord.create({
      data: {
        userId: user.id,
        windowId: activeWindow.id,
        date: now,
        status: "PRESENT",
        source: "MOBILE",
        markedAt: now,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "PRESENT",
      markedAt: record.markedAt,
      record: {
        id: record.id,
        status: record.status,
        markedAt: record.markedAt,
        source: record.source,
      },
      message: "Attendance marked successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/attendance/mark]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to mark attendance." } },
      { status: 500 }
    );
  }
}
