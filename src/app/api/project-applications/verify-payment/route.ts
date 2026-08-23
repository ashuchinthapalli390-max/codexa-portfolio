import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import {
  sendOwnerPaidApplicationNotification,
  sendClientPaidApplicationConfirmation,
} from "@/lib/email/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId, signature, referenceId, applicationId } = body;

    if (!orderId || !paymentId) {
      return NextResponse.json(
        { success: false, error: "Missing required payment identification." },
        { status: 400 }
      );
    }

    // 1. Verify payment signature
    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: signature || "",
    });

    if (!isValid) {
      // Mark payment as failed
      await db.projectPayment.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: "Invalid HMAC SHA256 Signature",
        },
      });

      return NextResponse.json(
        { success: false, error: "Payment verification failed: Invalid transaction signature." },
        { status: 400 }
      );
    }

    // 2. Fetch Project Application
    const application = await db.projectApplication.findFirst({
      where: {
        OR: [
          { referenceId: referenceId || "" },
          { id: applicationId || "" },
          { payments: { some: { razorpayOrderId: orderId } } },
        ],
      },
      include: { payments: true },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Project application record not found." },
        { status: 404 }
      );
    }

    // 3. Atomically update payment & application status to QUALIFIED / PAID
    await db.$transaction([
      db.projectPayment.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          razorpayPaymentId: paymentId,
          razorpaySignature: signature || null,
          status: "PAID",
          signatureVerified: true,
          capturedAt: new Date(),
        },
      }),
      db.projectApplication.update({
        where: { id: application.id },
        data: {
          status: "QUALIFIED", // Confirmed deposit, ready for priority review
        },
      }),
    ]);

    // 4. Send email notifications asynchronously without blocking response
    const emailParams = {
      referenceId: application.referenceId,
      fullName: application.fullName,
      email: application.email,
      phone: application.phone,
      company: application.company || undefined,
      projectType: application.projectType,
      advanceAmount: application.finalAdvance,
      paymentId: paymentId,
      budgetRange: application.budgetRange,
      timeline: application.timeline,
      features: application.features,
      description: application.description,
    };

    Promise.allSettled([
      sendOwnerPaidApplicationNotification(emailParams),
      sendClientPaidApplicationConfirmation(emailParams),
    ]).catch((err) => {
      console.error("Email notification dispatch error (non-fatal):", err);
    });

    return NextResponse.json({
      success: true,
      referenceId: application.referenceId,
      applicationId: application.id,
      status: "QUALIFIED",
      advancePaid: application.finalAdvance,
      currency: application.currency,
      clientName: application.fullName,
      clientEmail: application.email,
      projectType: application.projectType,
      capturedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
