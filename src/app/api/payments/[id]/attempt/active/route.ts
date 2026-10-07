import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/attempt/active
 * Returns active non-expired attempt for the payment.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const now = new Date();

    const activeAttempt = await db.paymentAttempt.findFirst({
      where: {
        paymentId: id,
        userId: user.id,
        status: { in: ["PAYMENT_STARTED", "AWAITING_PROOF", "AWAITING_SCREENSHOT", "ANALYZING_PROOF", "VERIFYING"] },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      activeAttempt: activeAttempt || null,
      serverNow: now.toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/attempt/active error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve active attempt" },
      { status: 500 }
    );
  }
}
