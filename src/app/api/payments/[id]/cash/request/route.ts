import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentSettings, logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/cash/request
 * Initiates a server-managed Cash Payment Request for an intern.
 * Fixed ₹450 only - client cannot specify amount.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Load payment
    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: true,
            employmentProfile: {
              select: {
                employeeId: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    // Ownership check: intern must own this payment
    if (payment.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only request cash payment for your own internship bill." },
        { status: 403 }
      );
    }

    // Check if already completed
    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json(
        { error: "Payment has already been confirmed and completed." },
        { status: 400 }
      );
    }

    // Load settings
    const settings = await getPaymentSettings();
    const isCashEnabled = (settings as any).cashEnabled ?? true;
    if (!isCashEnabled) {
      return NextResponse.json(
        { error: "Cash payment option is currently disabled by administrator." },
        { status: 400 }
      );
    }

    const fixedAmount = Number(settings.fixedInternshipAmount || 450);
    const coFounderWhatsApp = (settings as any).coFounderWhatsApp || "7075920852";
    const cleanPhone = coFounderWhatsApp.replace(/\D/g, "");
    const intlPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    // Duplicate prevention: if already pending cash approval, return current state
    if (payment.cashStatus === "PENDING_CASH_APPROVAL") {
      const internName =
        payment.userName ||
        payment.user?.fullName ||
        payment.user?.username ||
        user.displayName ||
        user.username ||
        "Intern";
      const internId =
        payment.internId ||
        payment.user?.employmentProfile?.employeeId ||
        "CXA-INT-2026";
      const domain =
        payment.domain ||
        payment.user?.employmentProfile?.department ||
        payment.user?.department ||
        "Development";

      const prefilledMessage = [
        "Hello B. Sanjay,",
        "",
        "I have selected Cash Payment for my CodeXa Internship Service Bill.",
        "",
        `Intern Name: ${internName}`,
        `Intern ID: ${internId}`,
        `Email: ${payment.userEmail || user.email || ""}`,
        `Domain: ${domain}`,
        "",
        `Payment Amount: ₹${fixedAmount}`,
        "Payment Method: Cash",
        `Payment Reference: ${payment.referenceId}`,
        "",
        "Status: Pending Cash Approval",
        "",
        `I will hand over the ₹${fixedAmount} cash payment for verification.`,
        "",
        "Please confirm the payment in the CodeXa Payment Control Center after receiving the cash.",
        "",
        "— CodeXa Agency Payment System",
      ].join("\n");

      return NextResponse.json({
        success: true,
        alreadyPending: true,
        payment,
        coFounder: {
          name: "B. Sanjay",
          phone: coFounderWhatsApp,
          intlPhone,
          whatsappUrl: `https://wa.me/${intlPhone}?text=${encodeURIComponent(prefilledMessage)}`,
          prefilledMessage,
        },
      });
    }

    // Mutual exclusion: cancel any active UPI session
    await db.paymentAttempt.updateMany({
      where: {
        paymentId: payment.id,
        status: { in: ["PAYMENT_STARTED", "AWAITING_PROOF", "VERIFYING"] },
      },
      data: {
        status: "CANCELLED",
        verificationReason: "CANCELLED_FOR_CASH_PAYMENT",
      },
    });

    const now = new Date();

    // Atomically update payment request to PENDING_CASH_APPROVAL
    const updatedPayment = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentMethod: "CASH",
        cashStatus: "PENDING_CASH_APPROVAL",
        cashRequestedAt: now,
        cashRejectionReason: null,
        paymentStatus: "PENDING_PAYMENT",
        fixedAmount,
      },
    });

    const internName =
      updatedPayment.userName ||
      payment.user?.fullName ||
      payment.user?.username ||
      user.displayName ||
      user.username ||
      "Intern";
    const internId =
      updatedPayment.internId ||
      payment.user?.employmentProfile?.employeeId ||
      "CXA-INT-2026";
    const domain =
      updatedPayment.domain ||
      payment.user?.employmentProfile?.department ||
      payment.user?.department ||
      "Development";

    const prefilledMessage = [
      "Hello B. Sanjay,",
      "",
      "I have selected Cash Payment for my CodeXa Internship Service Bill.",
      "",
      `Intern Name: ${internName}`,
      `Intern ID: ${internId}`,
      `Email: ${updatedPayment.userEmail || user.email || ""}`,
      `Domain: ${domain}`,
      "",
      `Payment Amount: ₹${fixedAmount}`,
      "Payment Method: Cash",
      `Payment Reference: ${updatedPayment.referenceId}`,
      "",
      "Status: Pending Cash Approval",
      "",
      `I will hand over the ₹${fixedAmount} cash payment for verification.`,
      "",
      "Please confirm the payment in the CodeXa Payment Control Center after receiving the cash.",
      "",
      "— CodeXa Agency Payment System",
    ].join("\n");

    const whatsappUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(prefilledMessage)}`;

    // Audit log
    await logPaymentAudit({
      action: "CASH_PAYMENT_REQUESTED",
      actorId: user.id,
      actorName: internName,
      targetId: updatedPayment.id,
      details: {
        referenceId: updatedPayment.referenceId,
        amount: fixedAmount,
        method: "CASH",
        domain,
        requestedAt: now.toISOString(),
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      coFounder: {
        name: "B. Sanjay",
        phone: coFounderWhatsApp,
        intlPhone,
        whatsappUrl,
        prefilledMessage,
      },
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/cash/request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process cash payment request" },
      { status: 500 }
    );
  }
}
