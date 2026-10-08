import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentSettings, logPaymentAudit } from "@/lib/payments/automated-upi";
import { sendCashPaymentRequestEmail } from "@/lib/email/notifications";
import { sendPushNotification } from "@/lib/push";
import { normalizeDomain, getDomainDurationLabel } from "@/lib/internships/domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/[id]/cash/request
 * Initiates a server-managed Cash Payment Request for an intern.
 * Fixed ₹450 only - client cannot specify amount.
 * Immediately dispatches:
 * 1. In-app notification to all active Founders & Co-Founders
 * 2. Push notifications to Founders & Co-Founders
 * 3. Individual email via Resend to all active Founders & Co-Founders
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

    const { id } = params;

    // Load payment
    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: true,
            employmentProfile: {
              select: {
                employeeId: true,
                department: true,
                internshipDomain: true,
                internshipDuration: true,
                internshipDurationMonths: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    // Ownership check: intern must own this payment
    if (payment.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only request cash payment for your own internship bill." },
        { status: 403 }
      );
    }

    // Check if already completed
    if (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS" || payment.cashStatus === "CASH_RECEIVED") {
      return NextResponse.json(
        { error: "Payment has already been confirmed and completed." },
        { status: 400 }
      );
    }

    // Load settings
    const settings = await getPaymentSettings();
    const isCashEnabled = (settings as any).cashEnabled ?? true;
    if (!isCashEnabled) {
      return NextResponse.json(
        { error: "Cash payment option is currently disabled by administrator." },
        { status: 400 }
      );
    }

    const fixedAmount = Number(settings.fixedInternshipAmount || 450);
    const coFounderWhatsApp = (settings as any).coFounderWhatsApp || "7075920852";
    const cleanPhone = coFounderWhatsApp.replace(/\D/g, "");
    const intlPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    // Duplicate prevention: if already pending cash approval, return current state idempotently
    if (payment.cashStatus === "PENDING_CASH_APPROVAL") {
      const internName =
        payment.userName ||
        payment.user?.fullName ||
        payment.user?.username ||
        user.displayName ||
        user.username ||
        "Intern";
      const internId =
        payment.internId ||
        payment.user?.employmentProfile?.employeeId ||
        "CXA-INT-2026";
      const domain = normalizeDomain(
        payment.domain ||
        payment.user?.employmentProfile?.internshipDomain ||
        payment.user?.employmentProfile?.department ||
        payment.user?.department ||
        "Full-Stack Development with AI"
      );

      const prefilledMessage = [
        "Hello B. Sanjay,",
        "",
        "I have selected Cash Payment for my CodeXa Internship Service Bill.",
        "",
        `Intern Name: ${internName}`,
        `Intern ID: ${internId}`,
        `Email: ${payment.userEmail || user.email || ""}`,
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

      return NextResponse.json({
        success: true,
        alreadyPending: true,
        payment,
        coFounder: {
          name: "B. Sanjay",
          phone: coFounderWhatsApp,
          intlPhone,
          whatsappUrl: `https://wa.me/${intlPhone}?text=${encodeURIComponent(prefilledMessage)}`,
          prefilledMessage,
        },
      });
    }

    // Mutual exclusion: cancel any active UPI session
    await db.paymentAttempt.updateMany({
      where: {
        paymentId: payment.id,
        status: { in: ["PAYMENT_STARTED", "AWAITING_PROOF", "VERIFYING"] },
      },
      data: {
        status: "CANCELLED",
        verificationReason: "CANCELLED_FOR_CASH_PAYMENT",
      },
    });

    const now = new Date();

    const internName =
      payment.userName ||
      payment.user?.fullName ||
      payment.user?.username ||
      user.displayName ||
      user.username ||
      "Intern";
    const internId =
      payment.internId ||
      payment.user?.employmentProfile?.employeeId ||
      "CXA-INT-2026";
    const domain = normalizeDomain(
      payment.domain ||
      payment.user?.employmentProfile?.internshipDomain ||
      payment.user?.employmentProfile?.department ||
      payment.user?.department ||
      "Full-Stack Development with AI"
    );
    const durationStr =
      payment.user?.employmentProfile?.internshipDuration ||
      (payment.user?.employmentProfile?.internshipDurationMonths
        ? `${payment.user.employmentProfile.internshipDurationMonths} Months`
        : getDomainDurationLabel(domain));

    // Atomically update payment request to PENDING_CASH_APPROVAL
    const updatedPayment = await db.paymentRequest.update({
      where: { id: payment.id },
      data: {
        paymentMethod: "CASH",
        cashStatus: "PENDING_CASH_APPROVAL",
        cashRequestedAt: now,
        cashRejectionReason: null,
        paymentStatus: "PENDING_PAYMENT",
        fixedAmount,
        domain,
      },
    });

    // Resolve Base URL for Review Link
    const host = req.headers.get("host") || "codxa-agency.online";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;
    const secureAdminPaymentUrl = `${origin}/dashboard/payments/${payment.id}`;
    const serverDateTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Dynamic Role-Based Recipient Resolution: All active Founders & Co-Founders
    const adminRecipients = await db.user.findMany({
      where: {
        OR: [
          { role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER"] } },
          { orgRole: { in: ["FOUNDER", "CO_FOUNDER"] } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        role: true,
        orgRole: true,
      },
    });

    let emailSentCount = 0;
    let emailFailedCount = 0;

    // Immediately dispatch in-app notifications and individual emails to each Founder/Co-Founder
    for (const admin of adminRecipients) {
      // 1. In-App Notification
      try {
        await db.notification.create({
          data: {
            userId: admin.id,
            type: "SECURITY",
            title: "New Cash Payment Request",
            message: `${internName} (${internId}) requested to pay ₹${fixedAmount} in cash.`,
            link: `/dashboard/payments/${payment.id}`,
            isRead: false,
          },
        });
      } catch (notifErr) {
        console.warn(`[CASH NOTIF] Error creating in-app notification for ${admin.email}:`, notifErr);
      }

      // 2. Web Push (Non-blocking)
      sendPushNotification(admin.id, {
        title: "New Cash Payment Request",
        body: `${internName} (${internId}) requested to pay ₹${fixedAmount} in cash.`,
        data: { url: `/dashboard/payments/${payment.id}` },
        tag: "cash-request",
      }).catch(() => {});

      // 3. Email Notification via Resend
      try {
        const adminDisplayName = admin.fullName || admin.username || "Founder/Co-Founder";
        const emailRes = await sendCashPaymentRequestEmail({
          recipientEmail: admin.email,
          recipientName: adminDisplayName,
          internName,
          internId,
          internEmail: updatedPayment.userEmail || user.email || "",
          internshipDomain: domain,
          duration: durationStr,
          amount: fixedAmount,
          paymentReference: updatedPayment.referenceId,
          serverDateTime,
          reviewUrl: secureAdminPaymentUrl,
        });

        if (emailRes.success) {
          emailSentCount++;
          await logPaymentAudit({
            action: "CASH_REQUEST_EMAIL_SENT",
            actorId: user.id,
            actorName: internName,
            targetId: updatedPayment.id,
            details: {
              recipientEmail: admin.email,
              recipientRole: admin.role || admin.orgRole,
              referenceId: updatedPayment.referenceId,
              sentAt: now.toISOString(),
              providerId: emailRes.data?.id || (emailRes.simulated ? "simulated" : null),
            },
          });
        } else {
          emailFailedCount++;
          await logPaymentAudit({
            action: "CASH_REQUEST_EMAIL_FAILED",
            actorId: user.id,
            actorName: internName,
            targetId: updatedPayment.id,
            details: {
              recipientEmail: admin.email,
              referenceId: updatedPayment.referenceId,
              error: emailRes.error || "Failed to dispatch email",
            },
          });
        }
      } catch (err: any) {
        emailFailedCount++;
        console.error(`[CASH EMAIL ERROR] Failed sending to ${admin.email}:`, err);
        await logPaymentAudit({
          action: "CASH_REQUEST_EMAIL_FAILED",
          actorId: user.id,
          actorName: internName,
          targetId: updatedPayment.id,
          details: {
            recipientEmail: admin.email,
            referenceId: updatedPayment.referenceId,
            error: err.message || "Unknown error",
          },
        });
      }
    }

    const prefilledMessage = [
      "Hello B. Sanjay,",
      "",
      "I have selected Cash Payment for my CodeXa Internship Service Bill.",
      "",
      `Intern Name: ${internName}`,
      `Intern ID: ${internId}`,
      `Email: ${updatedPayment.userEmail || user.email || ""}`,
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

    // Core Audit log
    await logPaymentAudit({
      action: "CASH_PAYMENT_REQUESTED",
      actorId: user.id,
      actorName: internName,
      targetId: updatedPayment.id,
      details: {
        referenceId: updatedPayment.referenceId,
        amount: fixedAmount,
        method: "CASH",
        domain,
        requestedAt: now.toISOString(),
        emailRecipientsCount: adminRecipients.length,
        emailSentCount,
        emailFailedCount,
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      notifications: {
        recipientsCount: adminRecipients.length,
        emailsSent: emailSentCount,
        emailsFailed: emailFailedCount,
      },
      coFounder: {
        name: "B. Sanjay",
        phone: coFounderWhatsApp,
        intlPhone,
        whatsappUrl,
        prefilledMessage,
      },
    });
  } catch (error: any) {
    console.error("POST /api/payments/[id]/cash/request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process cash payment request" },
      { status: 500 }
    );
  }
}
