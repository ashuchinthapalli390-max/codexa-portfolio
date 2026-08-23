import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import {
  sendOwnerPaidApplicationNotification,
  sendClientPaidApplicationConfirmation,
} from "@/lib/email/notifications";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // Verify webhook authenticity
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return NextResponse.json({ status: "ignored_no_order_id" });
    }

    if (event === "payment.captured" || event === "order.paid") {
      // Find matching payment record
      const existingPayment = await db.projectPayment.findFirst({
        where: { razorpayOrderId: orderId },
        include: { application: true },
      });

      if (existingPayment) {
        // Idempotent update
        await db.$transaction([
          db.projectPayment.update({
            where: { id: existingPayment.id },
            data: {
              razorpayPaymentId: paymentId || existingPayment.razorpayPaymentId,
              status: "PAID",
              signatureVerified: true,
              capturedAt: new Date(),
              webhookEvents: payload,
            },
          }),
          db.projectApplication.update({
            where: { id: existingPayment.projectApplicationId },
            data: {
              status: existingPayment.application.status === "DRAFT" || existingPayment.application.status === "PAYMENT_PENDING"
                ? "QUALIFIED"
                : existingPayment.application.status,
            },
          }),
        ]);

        // Send notifications if not already sent
        if (existingPayment.status !== "PAID" && existingPayment.application) {
          const app = existingPayment.application;
          const emailParams = {
            referenceId: app.referenceId,
            fullName: app.fullName,
            email: app.email,
            phone: app.phone,
            company: app.company || undefined,
            projectType: app.projectType,
            advanceAmount: app.finalAdvance,
            paymentId: paymentId || "WEBHOOK_CAPTURED",
            budgetRange: app.budgetRange,
            timeline: app.timeline,
            features: app.features,
            description: app.description,
          };

          Promise.allSettled([
            sendOwnerPaidApplicationNotification(emailParams),
            sendClientPaidApplicationConfirmation(emailParams),
          ]).catch(() => {});
        }
      }
    } else if (event === "payment.failed") {
      await db.projectPayment.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: paymentEntity?.error_description || "Payment failed via webhook",
          webhookEvents: payload,
        },
      });
    }

    return NextResponse.json({ status: "processed", event });
  } catch (error: any) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: error?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
