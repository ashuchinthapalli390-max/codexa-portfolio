import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/payments/pending
 * Returns all payments awaiting Founder/Co-Founder manual approval.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getEffectiveRole(user);
    if (!["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pendingPayments = await db.paymentRequest.findMany({
      where: {
        OR: [
          { paymentStatus: "PENDING_APPROVAL" },
          { paymentStatus: "REVIEW_REQUIRED" },
          { attempts: { some: { status: "PENDING_APPROVAL" } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: true,
          },
        },
        attempts: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: pendingPayments.length,
      payments: pendingPayments.map((p) => {
        const latestAttempt = p.attempts[0];
        return {
          id: p.id,
          referenceId: p.referenceId,
          internName: p.userName || p.user?.fullName || p.user?.username || "Intern",
          internId: p.internId || p.employeeId || "CXA-INT-2026",
          internEmail: p.userEmail || p.user?.email,
          domain: p.domain || p.user?.department || "Development",
          amount: Number(p.fixedAmount) || 450,
          paymentMethod: latestAttempt?.selectedMethod || p.paymentMethod || "UPI",
          proofImageUrl: latestAttempt?.proofImageUrl || p.proofImageUrl,
          submittedAt: latestAttempt?.submittedAt || p.submittedAt || p.updatedAt,
          status: "PENDING_APPROVAL",
          attemptId: latestAttempt?.id || null,
        };
      }),
    });
  } catch (error: any) {
    console.error("GET /api/admin/payments/pending error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending payments" },
      { status: 500 }
    );
  }
}
