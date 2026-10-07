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

    const [allPayments, totalInternsCount] = await Promise.all([
      db.paymentRequest.findMany({
        select: {
          id: true,
          fixedAmount: true,
          paymentStatus: true,
          paymentPurpose: true,
          paymentMethod: true,
          cashStatus: true,
          domain: true,
          userRole: true,
          createdAt: true,
          verifiedAt: true,
          paidAt: true,
        },
      }),
      db.user.count({ where: { role: "INTERN", isActive: true } }),
    ]);

    let totalApprovedAmount = 0;
    let totalPendingVerificationAmount = 0;
    let totalPendingPaymentAmount = 0;
    let totalRejectedAmount = 0;

    let pendingPaymentCount = 0;
    let pendingVerificationCount = 0;
    let cashPendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let cancelledCount = 0;

    const purposeBreakdown: Record<string, { count: number; totalAmount: number; approvedAmount: number }> = {};
    const domainBreakdown: Record<string, { count: number; totalAmount: number; approvedAmount: number }> = {};

    // Payment method analytics
    const methodAnalytics: Record<string, { total: number; success: number; pending: number; failed: number }> = {
      PHONEPE: { total: 0, success: 0, pending: 0, failed: 0 },
      GOOGLE_PAY: { total: 0, success: 0, pending: 0, failed: 0 },
      PAYTM: { total: 0, success: 0, pending: 0, failed: 0 },
      OTHER_UPI: { total: 0, success: 0, pending: 0, failed: 0 },
      CASH: { total: 0, success: 0, pending: 0, failed: 0 },
      NOT_SELECTED: { total: 0, success: 0, pending: 0, failed: 0 },
    };

    for (const p of allPayments) {
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

      const isPaid =
        p.paymentStatus === "APPROVED" ||
        p.paymentStatus === "SUCCESS" ||
        p.cashStatus === "CASH_RECEIVED";

      if (isPaid) {
        approvedCount += 1;
        totalApprovedAmount += p.fixedAmount;
        domainBreakdown[pDomain].approvedAmount += p.fixedAmount;
        purposeBreakdown[pPurpose].approvedAmount += p.fixedAmount;
      } else if (p.cashStatus === "PENDING_CASH_APPROVAL") {
        cashPendingCount += 1;
      } else if (p.paymentStatus === "PENDING_VERIFICATION" || p.paymentStatus === "VERIFYING") {
        pendingVerificationCount += 1;
        totalPendingVerificationAmount += p.fixedAmount;
      } else if (p.paymentStatus === "PENDING_PAYMENT" || p.paymentStatus === "PAYMENT_STARTED") {
        pendingPaymentCount += 1;
        totalPendingPaymentAmount += p.fixedAmount;
      } else if (p.paymentStatus === "REJECTED" || p.paymentStatus === "FAILED") {
        rejectedCount += 1;
        totalRejectedAmount += p.fixedAmount;
      } else if (p.paymentStatus === "CANCELLED") {
        cancelledCount += 1;
      }

      // Map method bucket
      let methodKey = "NOT_SELECTED";
      if (p.paymentMethod === "PHONEPE") methodKey = "PHONEPE";
      else if (p.paymentMethod === "GOOGLE_PAY" || p.paymentMethod === "GPAY") methodKey = "GOOGLE_PAY";
      else if (p.paymentMethod === "PAYTM") methodKey = "PAYTM";
      else if (p.paymentMethod === "OTHER_UPI") methodKey = "OTHER_UPI";
      else if (p.paymentMethod === "CASH") methodKey = "CASH";

      methodAnalytics[methodKey].total += 1;
      if (isPaid) {
        methodAnalytics[methodKey].success += 1;
      } else if (p.paymentStatus === "REJECTED" || p.paymentStatus === "FAILED") {
        methodAnalytics[methodKey].failed += 1;
      } else {
        methodAnalytics[methodKey].pending += 1;
      }
    }

    const totalInterns = totalInternsCount > 0 ? totalInternsCount : allPayments.length;
    const notPaidCount = Math.max(0, totalInterns - approvedCount);
    const fixedRate = 450;
    const totalExpectedAmount = totalInterns * fixedRate;
    const totalCollectedAmount = approvedCount * fixedRate;
    const pendingAmount = totalExpectedAmount - totalCollectedAmount;

    return NextResponse.json({
      summary: {
        totalInterns,
        totalRequests: allPayments.length,
        approvedCount,
        paidCount: approvedCount,
        notPaidCount,
        pendingVerificationCount,
        upiVerifyingCount: pendingVerificationCount,
        cashPendingCount,
        pendingPaymentCount,
        rejectedCount,
        cancelledCount,
        totalExpectedAmount,
        totalApprovedAmount: totalCollectedAmount,
        totalCollectedAmount,
        pendingAmount,
        totalPendingAmount: pendingAmount,
        totalPendingVerificationAmount,
        totalPendingPaymentAmount,
        totalRejectedAmount,
        collectionRatePercent: totalExpectedAmount > 0 ? Math.round((totalCollectedAmount / totalExpectedAmount) * 100) : 0,
      },
      methodAnalytics,
      purposeBreakdown,
      domainBreakdown,
    });
  } catch (error: any) {
    console.error("GET /api/payments/analytics error:", error);
    return NextResponse.json({ error: error.message || "Failed to load payment analytics" }, { status: 500 });
  }
}
