import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/analytics
 * Provides aggregated financial statistics and request volume.
 * Requires VIEW_PAYMENT_ANALYTICS or VIEW_ALL_PAYMENTS permission.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.VIEW_PAYMENT_ANALYTICS) && !hasPermission(user, Permission.VIEW_ALL_PAYMENTS)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view payment analytics." }, { status: 403 });
    }

    const allPayments = await db.paymentRequest.findMany({
      select: {
        id: true,
        fixedAmount: true,
        paymentStatus: true,
        paymentPurpose: true,
        domain: true,
        userRole: true,
        createdAt: true,
        verifiedAt: true,
      },
    });

    let totalExpectedAmount = 0;
    let totalApprovedAmount = 0;
    let totalPendingVerificationAmount = 0;
    let totalPendingPaymentAmount = 0;
    let totalRejectedAmount = 0;

    let pendingPaymentCount = 0;
    let pendingVerificationCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;

    const purposeBreakdown: Record<string, { count: number; totalAmount: number; approvedAmount: number }> = {};
    const domainBreakdown: Record<string, { count: number; totalAmount: number; approvedAmount: number }> = {};

    for (const p of allPayments) {
      totalExpectedAmount += p.fixedAmount;

      const pDomain = p.domain || "General";
      if (!domainBreakdown[pDomain]) {
        domainBreakdown[pDomain] = { count: 0, totalAmount: 0, approvedAmount: 0 };
      }
      domainBreakdown[pDomain].count += 1;
      domainBreakdown[pDomain].totalAmount += p.fixedAmount;

      const pPurpose = p.paymentPurpose || "OTHER";
      if (!purposeBreakdown[pPurpose]) {
        purposeBreakdown[pPurpose] = { count: 0, totalAmount: 0, approvedAmount: 0 };
      }
      purposeBreakdown[pPurpose].count += 1;
      purposeBreakdown[pPurpose].totalAmount += p.fixedAmount;

      switch (p.paymentStatus) {
        case "APPROVED":
          approvedCount += 1;
          totalApprovedAmount += p.fixedAmount;
          domainBreakdown[pDomain].approvedAmount += p.fixedAmount;
          purposeBreakdown[pPurpose].approvedAmount += p.fixedAmount;
          break;
        case "PENDING_VERIFICATION":
          pendingVerificationCount += 1;
          totalPendingVerificationAmount += p.fixedAmount;
          break;
        case "PENDING_PAYMENT":
          pendingPaymentCount += 1;
          totalPendingPaymentAmount += p.fixedAmount;
          break;
        case "REJECTED":
          rejectedCount += 1;
          totalRejectedAmount += p.fixedAmount;
          break;
        case "CANCELLED":
          cancelledCount += 1;
          break;
      }
    }

    return NextResponse.json({
      summary: {
        totalRequests: allPayments.length,
        approvedCount,
        pendingVerificationCount,
        pendingPaymentCount,
        rejectedCount,
        cancelledCount,
        totalExpectedAmount,
        totalApprovedAmount,
        totalPendingAmount: totalPendingVerificationAmount + totalPendingPaymentAmount,
        totalPendingVerificationAmount,
        totalPendingPaymentAmount,
        totalRejectedAmount,
        collectionRatePercent: totalExpectedAmount > 0 ? Math.round((totalApprovedAmount / totalExpectedAmount) * 100) : 0,
      },
      purposeBreakdown,
      domainBreakdown,
    });
  } catch (error: any) {
    console.error("GET /api/payments/analytics error:", error);
    return NextResponse.json({ error: error.message || "Failed to load payment analytics" }, { status: 500 });
  }
}
