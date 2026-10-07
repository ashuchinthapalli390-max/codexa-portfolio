import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { internServicePaymentPaid: true },
    });

    const internPayment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      select: {
        id: true,
        referenceId: true,
        paymentStatus: true,
        fixedAmount: true,
        verifiedAt: true,
        utrNumber: true,
      },
    });

    const isPaid = internPayment?.paymentStatus === "APPROVED" || Boolean(fullUser?.internServicePaymentPaid);

    return NextResponse.json({
      ok: true,
      payment: {
        title: "Internship Service Bill",
        totalAmount: 450,
        currency: "INR",
        items: [
          { name: "Mandatory Student ID Card", amount: 150 },
          { name: "AI Development Tools Pack", amount: 300 },
        ],
        status: isPaid ? "SUCCESSFUL" : (internPayment?.paymentStatus || "PENDING"),
        referenceId: internPayment?.referenceId || "CXA-PAY-450",
        utrNumber: internPayment?.utrNumber || null,
        verifiedAt: internPayment?.verifiedAt || null,
        webCheckoutUrl: `https://codexa-agency.online/payments/internship?ref=${internPayment?.referenceId || user.id}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR" } }, { status: 500 });
  }
}