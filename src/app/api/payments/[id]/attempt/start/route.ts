import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  startPaymentAttempt,
  SupportedUpiMethod,
} from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/attempt/start
 * Starts or resumes a 5-minute timed payment attempt session.
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
    const body = await req.json().catch(() => ({}));
    const selectedMethod = (body.selectedMethod || "OTHER_UPI") as SupportedUpiMethod;

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
    console.error("POST /api/payments/[id]/attempt/start error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start payment attempt" },
      { status: 400 }
    );
  }
}
