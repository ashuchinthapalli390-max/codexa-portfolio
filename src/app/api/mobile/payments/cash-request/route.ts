import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getPaymentSettings, logPaymentAudit } from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    let payment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: true,
            employmentProfile: { select: { employeeId: true, department: true } },
          },
        },
      },
    });

    if (!payment) {
      const uname = (user.username || user.id.slice(-6)).toUpperCase();
      payment = await db.paymentRequest.create({
        data: {
          userId: user.id,
          referenceId: `CXA-PAY-${uname}-450`,
          title: "Internship Service Bill",
          description: "Mandatory ID Card (₹150) + AI Dev Tools Pack (₹300)",
          fixedAmount: 450,
          paymentPurpose: "INTERNSHIP_FEE",
          paymentStatus: "PENDING_PAYMENT",
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              department: true,
              employmentProfile: { select: { employeeId: true, department: true } },
            },
          },
        },
      });
    }

    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS") {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        message: "Payment has already been confirmed and completed.",
        paymentId: payment.id,
        status: "SUCCESSFUL",
      }, { headers: NO_CACHE_HEADERS });
    }

    const settings = await getPaymentSettings();
    const fixedAmount = Number(settings.fixedInternshipAmount || 450);
    const coFounderWhatsApp = (settings as any).coFounderWhatsApp || "7075920852";
    const cleanPhone = coFounderWhatsApp.replace(/\D/g, "");
    const intlPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    const now = new Date();
    const updatedPayment = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentMethod: "CASH",
        cashStatus: "PENDING_CASH_APPROVAL",
        cashRequestedAt: now,
        cashRejectionReason: null,
      },
    });

    const internName = payment.user?.fullName || payment.user?.username || user.displayName || user.username || "Intern";
    const internId = payment.user?.employmentProfile?.employeeId || "CXA-INT-2026";
    const domain = payment.user?.employmentProfile?.department || payment.user?.department || "Engineering Track";

    const prefilledMessage = [
      "Hello B. Sanjay,",
      "",
      "I have selected Cash Payment for my CodeXa Internship Service Bill.",
      "",
      `Intern Name: ${internName}`,
      `Intern ID: ${internId}`,
      `Email: ${user.email || ""}`,
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

    await logPaymentAudit({
      action: "CASH_PAYMENT_REQUESTED_MOBILE",
      actorId: user.id,
      actorName: internName,
      targetId: updatedPayment.id,
      details: { referenceId: updatedPayment.referenceId, amount: fixedAmount, domain },
    });

    return NextResponse.json({
      ok: true,
      status: "PENDING_CASH_APPROVAL",
      paymentId: updatedPayment.id,
      coFounder: {
        name: "B. Sanjay",
        phone: coFounderWhatsApp,
        intlPhone,
        whatsappUrl,
        prefilledMessage,
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/payments/cash-request] [${requestId}]`, err);
    return NextResponse.json({
      ok: false,
      error: { code: "SERVER_ERROR", message: "Failed to submit cash payment request." },
    }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
