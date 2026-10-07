import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { startPaymentAttempt, SupportedUpiMethod } from "@/lib/payments/automated-upi";

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
    const rawMethod = (body.method || "OTHER_UPI").toUpperCase();
    const validMethods: SupportedUpiMethod[] = ["PHONEPE", "GPAY", "PAYTM", "OTHER_UPI"];
    const selectedMethod = validMethods.includes(rawMethod as any) ? (rawMethod as SupportedUpiMethod) : "OTHER_UPI";

    // Find or create user's internship fee PaymentRequest
    let payment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
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
      });
    }

    if (payment.paymentStatus === "APPROVED") {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        message: "Internship service bill is already settled.",
        paymentId: payment.id,
        status: "SUCCESSFUL",
        requestId,
      }, { headers: NO_CACHE_HEADERS });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "mobile";
    const userAgent = req.headers.get("user-agent") || "CodeXa Mobile App";

    const attemptResult = await startPaymentAttempt({
      paymentId: payment.id,
      userId: user.id,
      selectedMethod,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      attemptId: attemptResult.attempt.id,
      universalUri: attemptResult.universalUri,
      appSpecificUri: attemptResult.appSpecificUri,
      upiUrl: attemptResult.appSpecificUri || attemptResult.universalUri,
      payeeVpa: attemptResult.attempt.upiIdSnapshot,
      payeeName: attemptResult.attempt.receiverSnapshot,
      amount: attemptResult.attempt.amountSnapshot ? Number(attemptResult.attempt.amountSnapshot) : 450,
      expiresAt: attemptResult.expiresAt,
      referenceId: payment.referenceId,
      selectedMethod,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/payments/start error] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "PAYMENT_START_ERROR", message: err?.message || "Failed to initiate payment attempt." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
