import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission, getEffectiveRole } from "@/lib/permissions";
import { sendSingleInternReminder } from "@/services/payment-reminders";
import { isCyberExcludedDomain } from "@/lib/payments/mandatory-fee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/interns/[id]/payment-reminder
 * Dispatches an on-demand manual reminder for an intern.
 * Logged with source: "ADMIN_MANUAL".
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

    // Resolve user by ID, username, or email
    const intern = await db.user.findFirst({
      where: {
        OR: [{ id }, { username: id }, { email: id }],
      },
      include: {
        employmentProfile: true,
        paymentRequests: {
          where: {
            OR: [
              { paymentPurpose: "INTERNSHIP_FEE" },
              { fixedAmount: 450 },
              { title: { contains: "SERVICE BILL", mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    const activePayment = intern.paymentRequests[0];
    const domainName = activePayment?.domain || intern.department || "Development";
    const paymentAmount = activePayment?.fixedAmount || 450;

    // 1. Cyber Exclusion Check -> HTTP 400
    if (isCyberExcludedDomain(domainName, undefined, paymentAmount)) {
      return NextResponse.json(
        {
          error: "Excluded Cyber track. Mandatory ₹450 reminder does not apply to this domain.",
          domain: domainName,
        },
        { status: 400 }
      );
    }

    // 2. Paid Status Check -> HTTP 409
    const status = (activePayment?.paymentStatus || "UNPAID").toUpperCase();
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
      internId: intern.id,
      paymentRequestId: activePayment?.id,
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
      message: "Mandatory fee reminder dispatched successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[ADMIN MANUAL REMINDER ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch manual reminder" },
      { status: 500 }
    );
  }
}
