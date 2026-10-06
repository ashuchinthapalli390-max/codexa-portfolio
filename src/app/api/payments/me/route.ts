import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrCreateInternPayment,
  MANDATORY_BILL_BREAKDOWN,
} from "@/lib/payments/automated-upi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/me
 * Retrieves or auto-provisions the mandatory ₹450 internship payment record
 * for the authenticated intern, including active 5-minute timed sessions.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internPaymentData = await getOrCreateInternPayment(user.id);
    const { payment, activeAttempt, settings, serverNow } = internPaymentData;

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found or could not be generated." },
        { status: 404 }
      );
    }

    const remainingSeconds = activeAttempt
      ? Math.max(
          0,
          Math.floor(
            (new Date(activeAttempt.expiresAt).getTime() -
              new Date().getTime()) /
              1000
          )
        )
      : 0;

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        referenceId: payment.referenceId,
        paymentStatus: payment.paymentStatus,
        fixedAmount: Number(payment.fixedAmount),
        currency: payment.currency,
        title: payment.title,
        description: payment.description,
        domain: payment.domain,
        userRole: payment.userRole,
        userName: payment.userName,
        userEmail: payment.userEmail,
        internId: payment.internId,
        employeeId: payment.employeeId,
        successfulAttemptId: payment.successfulAttemptId,
        lineItems: payment.lineItems || MANDATORY_BILL_BREAKDOWN.items,
        createdAt: payment.createdAt,
      },
      activeAttempt: activeAttempt
        ? {
            id: activeAttempt.id,
            status: activeAttempt.status,
            selectedMethod: activeAttempt.selectedMethod,
            amountSnapshot: Number(activeAttempt.amountSnapshot),
            upiIdSnapshot: activeAttempt.upiIdSnapshot,
            receiverSnapshot: activeAttempt.receiverSnapshot,
            startedAt: activeAttempt.startedAt,
            expiresAt: activeAttempt.expiresAt,
            remainingSeconds,
            utrNumber: activeAttempt.utrNumber,
            verificationReason: activeAttempt.verificationReason,
            verifiedAt: activeAttempt.verifiedAt,
          }
        : null,
      settings: {
        receiverName: settings.receiverName || settings.upiDisplayName,
        upiId: settings.upiId || settings.defaultUpiId,
        qrCodeUrl: settings.qrCodeUrl,
        fixedInternshipAmount: Number(settings.fixedInternshipAmount || 450),
        phonePeEnabled: settings.phonePeEnabled,
        googlePayEnabled: settings.googlePayEnabled,
        paytmEnabled: settings.paytmEnabled,
        otherUpiEnabled: settings.otherUpiEnabled,
        proofWindowMinutes: settings.proofWindowMinutes,
        clockToleranceSeconds: settings.clockToleranceSeconds,
        paymentInstructions: settings.paymentInstructions,
      },
      breakdown: MANDATORY_BILL_BREAKDOWN,
      internServicePaymentPaid: Boolean(internPaymentData.user.internServicePaymentPaid),
      serverNow,
    });
  } catch (error: any) {
    console.error("GET /api/payments/me error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load intern payment details" },
      { status: 500 }
    );
  }
}
