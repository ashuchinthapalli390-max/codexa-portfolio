import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFounderOrCoFounder(user: any): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return role === "FOUNDER" || role === "CO_FOUNDER";
}

/**
 * GET /api/admin/payments
 * Founder & Co-Founder access only.
 * Provides payment overview metrics, collection analytics, search across intern details,
 * and paginated transaction audits.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFounderOrCoFounder(user)) {
      return NextResponse.json(
        { error: "Forbidden: Only Founder and Co-Founder can access payment administration." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const statusFilter = searchParams.get("status");
    const methodFilter = searchParams.get("method");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "30", 10)));
    const skip = (page - 1) * limit;

    // Build filter where clause
    const where: any = {
      paymentPurpose: { in: ["INTERNSHIP_FEE", "INTERNSHIP_SERVICE_BILL"] },
    };

    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "SUCCESS") {
        where.paymentStatus = { in: ["APPROVED", "SUCCESS"] };
      } else if (statusFilter === "VERIFYING") {
        where.paymentStatus = { in: ["PENDING_VERIFICATION", "VERIFYING"] };
      } else if (statusFilter === "PENDING") {
        where.paymentStatus = "PENDING_PAYMENT";
      } else {
        where.paymentStatus = statusFilter;
      }
    }

    if (methodFilter && methodFilter !== "ALL") {
      where.attempts = {
        some: {
          selectedMethod: methodFilter,
        },
      };
    }

    if (query) {
      where.OR = [
        { referenceId: { contains: query, mode: "insensitive" } },
        { userName: { contains: query, mode: "insensitive" } },
        { userEmail: { contains: query, mode: "insensitive" } },
        { internId: { contains: query, mode: "insensitive" } },
        { utrNumber: { contains: query, mode: "insensitive" } },
      ];
    }

    // Compute aggregate metrics
    const [
      allInternPayments,
      totalCount,
      payments,
    ] = await Promise.all([
      db.paymentRequest.findMany({
        where: {
          paymentPurpose: { in: ["INTERNSHIP_FEE", "INTERNSHIP_SERVICE_BILL"] },
        },
        select: {
          paymentStatus: true,
          fixedAmount: true,
        },
      }),
      db.paymentRequest.count({ where }),
      db.paymentRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              role: true,
              department: true,
              internServicePaymentPaid: true,
              profile: {
                select: { displayName: true },
              },
              employmentProfile: {
                select: { employeeId: true },
              },
            },
          },
          attempts: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      }),
    ]);

    let pendingCount = 0;
    let verifyingCount = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let expiredCount = 0;
    let expectedCollection = 0;
    let verifiedCollection = 0;

    for (const p of allInternPayments) {
      const amt = Number(p.fixedAmount || 450);
      expectedCollection += amt;

      const st = p.paymentStatus.toUpperCase();
      if (st === "APPROVED" || st === "SUCCESS") {
        successfulCount++;
        verifiedCollection += amt;
      } else if (st === "PENDING_VERIFICATION" || st === "VERIFYING") {
        verifyingCount++;
      } else if (st === "PENDING_PAYMENT" || st === "PAYMENT_STARTED") {
        pendingCount++;
      } else if (st === "FAILED" || st === "REJECTED") {
        failedCount++;
      } else if (st === "EXPIRED") {
        expiredCount++;
      } else {
        pendingCount++;
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalInternPayments: allInternPayments.length,
        pending: pendingCount,
        verifying: verifyingCount,
        successful: successfulCount,
        failed: failedCount,
        expired: expiredCount,
        expectedCollection,
        verifiedCollection,
      },
      payments,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error: any) {
    console.error("GET /api/admin/payments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load payment admin data" },
      { status: 500 }
    );
  }
}
