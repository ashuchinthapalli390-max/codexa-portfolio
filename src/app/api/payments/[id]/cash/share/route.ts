import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentSettings } from "@/lib/payments/automated-upi";
import { hasPermission, Permission } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/cash/share
 * Returns prefilled WhatsApp text, WhatsApp deep link, and card image URL.
 * Restricted to payment owner or authorized administrative roles.
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

    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        user: {
          select: {
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
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const isOwner = payment.userId === user.id;
    const canViewAll = hasPermission(user, Permission.VIEW_ALL_PAYMENTS);

    if (!isOwner && !canViewAll) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access this payment share package" },
        { status: 403 }
      );
    }

    const settings = await getPaymentSettings();
    const fixedAmount = Number(settings.fixedInternshipAmount || 450);
    const coFounderWhatsApp = (settings as any).coFounderWhatsApp || "7075920852";
    const cleanPhone = coFounderWhatsApp.replace(/\D/g, "");
    const intlPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const internName =
      payment.userName ||
      payment.user?.fullName ||
      payment.user?.username ||
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
      `Email: ${payment.userEmail || payment.user?.email || ""}`,
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

    const whatsappUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(prefilledMessage)}`;
    const requestCardImageUrl = `/api/payments/${payment.id}/cash/card`;

    return NextResponse.json({
      success: true,
      referenceId: payment.referenceId,
      coFounderName: "B. Sanjay",
      coFounderPhone: coFounderWhatsApp,
      intlPhone,
      message: prefilledMessage,
      whatsappUrl,
      requestCardImageUrl,
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/cash/share error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate cash share details" },
      { status: 500 }
    );
  }
}
