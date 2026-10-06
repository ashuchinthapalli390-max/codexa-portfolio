import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  startPaymentAttempt,
  SupportedUpiMethod,
} from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/start
 * Initiates the 5-minute timed payment attempt for an intern.
 * Enforces server timestamping and locks active session.
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

    const paymentId = params.id;
    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const selectedMethod = (body.selectedMethod || "OTHER_UPI") as SupportedUpiMethod;

    const validMethods: SupportedUpiMethod[] = [
      "PHONEPE",
      "GPAY",
      "PAYTM",
      "OTHER_UPI",
    ];

    if (!validMethods.includes(selectedMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method selected" },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const result = await startPaymentAttempt({
      paymentId,
      userId: user.id,
      selectedMethod,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/start error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start payment session" },
      { status: 400 }
    );
  }
}
