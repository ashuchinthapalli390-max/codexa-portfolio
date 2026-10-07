import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";

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
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { paymentId, utrNumber, screenshotUrl, paidAt, notes } = body;

    const normalizedUtr = String(utrNumber || "").trim().toUpperCase();
    if (!normalizedUtr || normalizedUtr.length < 8) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_UTR", message: "A valid 12-digit UPI Transaction ID (UTR) is required." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Find payment request
    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [
          { id: paymentId || "" },
          { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
        ],
      },
    });

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: { code: "PAYMENT_NOT_FOUND", message: "Payment record not found." }, requestId },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if (payment.userId !== user.id) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "You can only submit proof for your own bills." }, requestId },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Check UTR duplicate in database
    const existingUtr = await db.paymentRequest.findFirst({
      where: {
        utrNumber: normalizedUtr,
        id: { not: payment.id },
      },
    });

    if (existingUtr) {
      return NextResponse.json(
        { ok: false, error: { code: "DUPLICATE_UTR", message: "This UTR / Transaction ID has already been submitted for another payment." }, requestId },
        { status: 409, headers: NO_CACHE_HEADERS }
      );
    }

    // Update payment request with proof details
    const updated = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        utrNumber: normalizedUtr,
        paymentStatus: "PENDING_VERIFICATION",
        proofImageUrl: screenshotUrl || null,
        paymentDate: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    // Notify user of proof submission
    await db.notification.create({
      data: {
        userId: user.id,
        type: "SECURITY",
        title: "Payment Proof Received",
        message: `Your payment proof with UTR ${normalizedUtr} has been received and is under automated verification.`,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      status: "VERIFICATION_PENDING",
      paymentId: updated.id,
      utrNumber: updated.utrNumber,
      message: "Payment proof submitted successfully. Verification in progress.",
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/payments/proof error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "SUBMISSION_ERROR", message: "Could not submit proof." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
