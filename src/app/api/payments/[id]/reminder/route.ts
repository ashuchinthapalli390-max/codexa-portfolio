import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { sendSingleInternReminder } from "@/services/payment-reminders";
import { isCyberExcludedDomain } from "@/lib/payments/mandatory-fee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/reminder
 * Dispatches an on-demand manual reminder for a payment request.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = getEffectiveRole(adminUser);
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "HR", "CEO", "CTO", "COO", "ADMIN"].includes(role);
    const canVerify = hasPermission(adminUser, Permission.VERIFY_PAYMENT) || hasPermission(adminUser, Permission.MANAGE_INTERNS);

    if (!isLeadership && !canVerify) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions to dispatch payment reminders." },
        { status: 403 }
      );
    }

    const { id } = params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        user: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (!payment.userId) {
      return NextResponse.json(
        { error: "Payment request has no associated user account" },
        { status: 400 }
      );
    }

    const domainName = payment.domain || payment.user?.department || "Development";

    // 1. Cyber Exclusion Check -> HTTP 400
    if (isCyberExcludedDomain(domainName, undefined, payment.fixedAmount)) {
      return NextResponse.json(
        {
          error: "Excluded Cyber track. Mandatory ₹450 reminder does not apply to this domain.",
          domain: domainName,
        },
        { status: 400 }
      );
    }

    // 2. Paid Status Check -> HTTP 409
    const status = (payment.paymentStatus || "UNPAID").toUpperCase();
    if (status === "PAID" || status === "APPROVED" || status === "WAIVED") {
      return NextResponse.json(
        {
          error: `Payment is already marked as ${status}. Reminders are permanently stopped.`,
          status,
        },
        { status: 409 }
      );
    }

    // 3. Dispatch reminder
    const result = await sendSingleInternReminder({
      internId: payment.userId,
      paymentRequestId: payment.id,
      source: "ADMIN_MANUAL",
      bypassDailyDeduplication: body.force === true,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          emailStatus: result.emailStatus,
          pushStatus: result.pushStatus,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment reminder dispatched successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[PAYMENT REMINDER ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch reminder" },
      { status: 500 }
    );
  }
}
