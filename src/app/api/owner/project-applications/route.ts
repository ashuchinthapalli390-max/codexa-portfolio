import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSessionResult } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentSessionResult();

    if (auth.status !== "authenticated") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login to access owner panel." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    if (auth.user.role !== "OWNER" && auth.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Owner or Admin privileges required." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "ALL";
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // Build prisma where query
    const where: any = {};

    if (statusFilter === "PAID" || statusFilter === "QUALIFIED") {
      where.OR = [
        { status: "QUALIFIED" },
        { status: "UNDER_REVIEW" },
        { payments: { some: { status: "PAID" } } },
      ];
    } else if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (searchQuery) {
      where.OR = [
        { referenceId: { contains: searchQuery, mode: "insensitive" } },
        { fullName: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
        { phone: { contains: searchQuery, mode: "insensitive" } },
        { company: { contains: searchQuery, mode: "insensitive" } },
        { projectType: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const [applications, allApplications, allPayments] = await Promise.all([
      db.projectApplication.findMany({
        where,
        include: {
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.projectApplication.findMany({
        select: {
          id: true,
          status: true,
          finalAdvance: true,
        },
      }),
      db.projectPayment.findMany({
        where: { status: "PAID" },
        select: {
          amount: true,
        },
      }),
    ]);

    // Real computed summary metrics
    const totalCount = allApplications.length;
    const paidLeadsCount = allApplications.filter((a) =>
      ["QUALIFIED", "UNDER_REVIEW", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(a.status)
    ).length;
    const pendingPaymentCount = allApplications.filter((a) => a.status === "PAYMENT_PENDING").length;
    const underReviewCount = allApplications.filter((a) => a.status === "UNDER_REVIEW").length;
    const activeProjectsCount = allApplications.filter((a) =>
      ["ACCEPTED", "IN_PROGRESS"].includes(a.status)
    ).length;
    const totalAdvanceReceived = allPayments.reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json(
      {
        success: true,
        applications,
        metrics: {
          totalCount,
          paidLeadsCount,
          pendingPaymentCount,
          underReviewCount,
          activeProjectsCount,
          totalAdvanceReceived,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("Error retrieving project applications for owner:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
