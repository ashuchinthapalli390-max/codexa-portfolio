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
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const role = getEffectiveRole(user);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);

    if (!isLeadership) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Leadership permission required to view approval dashboard." } },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // optional: PENDING, APPROVED, REJECTED

    const whereClause: any = {};
    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter.toUpperCase())) {
      whereClause.status = statusFilter.toUpperCase();
    }

    const leaves = await db.leaveRequest.findMany({
      where: whereClause,
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

    const pending = leaves.filter((l) => l.status === "PENDING");
    const approved = leaves.filter((l) => l.status === "APPROVED");
    const rejected = leaves.filter((l) => l.status === "REJECTED");

    return NextResponse.json({
      ok: true,
      pending,
      approved,
      rejected,
      all: leaves,
      counts: {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        total: leaves.length,
      },
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/admin/leave]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to load leave approval requests." } },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
