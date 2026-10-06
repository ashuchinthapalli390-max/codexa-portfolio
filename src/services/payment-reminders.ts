import { resend, notificationsFromEmail } from "@/lib/email/client";
import { render } from "@react-email/render";
import { MandatoryPaymentReminderEmail } from "@/emails/mandatory-payment-reminder";
import { PaymentConfirmationEmail } from "@/emails/payment-confirmation";
import { sendPushNotification, WebPushPayload } from "@/lib/push";
import { db } from "@/lib/db";
import {
  MANDATORY_INTERNSHIP_SERVICE_FEE,
  getCurrentISTDateKey,
  isCyberExcludedDomain,
  requiresMandatoryFeeReminder,
  buildInternPaymentUrl,
  InternReminderCandidate,
} from "@/lib/payments/mandatory-fee";

/**
 * Sends official payment confirmation email upon verified ₹450 payment.
 */
export async function sendMandatoryFeePaymentConfirmationEmail(params: {
  studentName: string;
  email: string;
  domain: string;
  amount?: number;
  transactionId?: string;
  paidDate?: string;
}): Promise<{ success: boolean; providerId?: string; error?: string }> {
  const fromAddress =
    process.env.RESEND_NOTIFICATIONS_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    notificationsFromEmail;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://codxa-agency.online");

  if (!resend) {
    console.log(`[RESEND LOCAL LOG] Payment confirmation sent to ${params.email}`);
    return { success: true, providerId: `sim_confirm_${Date.now()}` };
  }

  try {
    const html = await render(
      PaymentConfirmationEmail({
        studentName: params.studentName,
        internshipDomain: params.domain,
        amount: params.amount || MANDATORY_INTERNSHIP_SERVICE_FEE,
        transactionId: params.transactionId || "CXA-VERIFIED",
        paidDate: params.paidDate || new Date().toLocaleDateString("en-IN"),
        dashboardUrl: `${baseUrl}/dashboard/payments`,
      })
    );

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: params.email,
      subject: "Payment Confirmed: CodeXa Internship Service Fee",
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, providerId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dispatch confirmation email" };
  }
}


export interface ReminderJobSummary {
  eligible: number;
  emailSent: number;
  emailFailed: number;
  pushSent: number;
  pushFailed: number;
  pushUnavailable: number;
  duplicatesSkipped: number;
  paidSkipped: number;
  cyberSkipped: number;
  errors: Array<{ internId: string; error: string }>;
}

/**
 * Sends a single mandatory fee reminder email via Resend React template.
 */
export async function sendMandatoryFeeReminderEmail(params: {
  studentName: string;
  email: string;
  domain: string;
  paymentUrl: string;
}): Promise<{ success: boolean; providerId?: string; error?: string }> {
  const fromAddress =
    process.env.RESEND_NOTIFICATIONS_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    notificationsFromEmail;

  if (!resend) {
    console.log(`[RESEND LOCAL LOG] Mandatory Fee Reminder to ${params.email}`);
    return { success: true, providerId: `sim_resend_${Date.now()}` };
  }

  try {
    const html = await render(
      MandatoryPaymentReminderEmail({
        studentName: params.studentName,
        internshipDomain: params.domain,
        amount: MANDATORY_INTERNSHIP_SERVICE_FEE,
        paymentUrl: params.paymentUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: params.email,
      subject: "Reminder: Mandatory ₹450 Internship Service Payment Pending",
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, providerId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dispatch email via Resend" };
  }
}

/**
 * Sends a single mandatory fee Web Push notification.
 */
export async function sendMandatoryFeeWebPush(params: {
  userId: string;
  paymentUrl: string;
}) {
  const payload: WebPushPayload = {
    title: "CodeXa Payment Reminder",
    body: "Your mandatory ₹450 internship service payment is pending.",
    icon: "/email-assets/codexa-logo.png",
    badge: "/email-assets/codexa-logo.png",
    tag: "mandatory-service-payment",
    requireInteraction: false,
    data: {
      type: "MANDATORY_SERVICE_PAYMENT",
      url: params.paymentUrl,
    },
  };

  return await sendPushNotification(params.userId, payload);
}

/**
 * Checks if a reminder was already sent to this intern today in IST.
 */
export async function wasReminderSentToday(
  internId: string,
  dateKey?: string
): Promise<boolean> {
  const todayIST = dateKey || getCurrentISTDateKey();
  const existing = await db.paymentReminderLog.findUnique({
    where: {
      internId_paymentType_reminderDate: {
        internId,
        paymentType: "MANDATORY_SERVICE_FEE",
        reminderDate: todayIST,
      },
    },
  });

  return Boolean(existing);
}

/**
 * Dispatches a reminder for a single intern (used by Admin manual trigger).
 */
export async function sendSingleInternReminder(params: {
  internId: string;
  paymentRequestId?: string;
  source?: "ADMIN_MANUAL" | "DAILY_AUTOMATION";
  bypassDailyDeduplication?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  emailStatus: string;
  pushStatus: string;
  emailProviderId?: string;
  error?: string;
}> {
  const { internId, source = "ADMIN_MANUAL", bypassDailyDeduplication = false } = params;
  const todayIST = getCurrentISTDateKey();

  // 1. Fetch user and payment details
  const user = await db.user.findUnique({
    where: { id: internId },
    include: {
      employmentProfile: true,
      paymentRequests: {
        where: {
          OR: [
            { paymentPurpose: "INTERNSHIP_FEE" },
            { paymentPurpose: "INTERNSHIP_SERVICE_BILL" },
            { fixedAmount: MANDATORY_INTERNSHIP_SERVICE_FEE },
            { title: { contains: "SERVICE BILL", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return { success: false, message: "Intern not found", emailStatus: "FAILED", pushStatus: "FAILED" };
  }

  const activePayment = user.paymentRequests[0];
  const candidate: InternReminderCandidate = {
    id: user.id,
    name: user.fullName || user.username,
    email: user.email,
    isActive: user.isActive,
    role: user.role,
    domain: activePayment?.domain || user.department,
    department: user.department,
    paymentRequestId: activePayment?.id,
    referenceId: activePayment?.referenceId,
    paymentStatus: activePayment?.paymentStatus || "PENDING_PAYMENT",
    amount: activePayment?.fixedAmount || MANDATORY_INTERNSHIP_SERVICE_FEE,
  };

  // 2. Check cyber exclusion
  if (isCyberExcludedDomain(candidate.domain || candidate.department, undefined, candidate.amount)) {
    return {
      success: false,
      message: "Excluded Cyber track. Mandatory ₹450 reminder does not apply.",
      emailStatus: "SKIPPED",
      pushStatus: "SKIPPED",
    };
  }

  // 3. Check payment status
  if (!requiresMandatoryFeeReminder(candidate)) {
    return {
      success: false,
      message: `Intern fee is already ${candidate.paymentStatus}. Reminder skipped.`,
      emailStatus: "SKIPPED",
      pushStatus: "SKIPPED",
    };
  }

  // 4. Check daily deduplication (unless bypassed by explicit manual admin override)
  if (!bypassDailyDeduplication) {
    const alreadySent = await wasReminderSentToday(user.id, todayIST);
    if (alreadySent) {
      return {
        success: false,
        message: `Reminder was already sent to this intern today (${todayIST} IST).`,
        emailStatus: "SKIPPED",
        pushStatus: "SKIPPED",
      };
    }
  }

  // 5. Build payment link
  const paymentUrl = buildInternPaymentUrl(candidate);

  // 6. Dispatch Email and Push concurrently
  const [emailResult, pushResult] = await Promise.allSettled([
    sendMandatoryFeeReminderEmail({
      studentName: candidate.name,
      email: candidate.email,
      domain: candidate.domain || "Engineering Track",
      paymentUrl,
    }),
    sendMandatoryFeeWebPush({
      userId: candidate.id,
      paymentUrl,
    }),
  ]);

  const emailData = emailResult.status === "fulfilled" ? emailResult.value : { success: false, error: String(emailResult.reason) };
  const pushData = pushResult.status === "fulfilled" ? pushResult.value : { attempted: false, status: "FAILED" as const, sentCount: 0, failedCount: 1, error: String(pushResult.reason) };

  const emailStatus = emailData.success ? "SENT" : "FAILED";
  const pushStatus = pushData.status;

  // 7. Record reminder audit log
  try {
    await db.paymentReminderLog.upsert({
      where: {
        internId_paymentType_reminderDate: {
          internId: user.id,
          paymentType: "MANDATORY_SERVICE_FEE",
          reminderDate: todayIST,
        },
      },
      update: {
        source,
        emailAttempted: true,
        emailStatus,
        emailProviderId: emailData.providerId || null,
        pushAttempted: pushData.attempted,
        pushStatus,
        pushError: pushData.error || null,
        errorMessage: emailData.error || pushData.error || null,
        sentAt: new Date(),
      },
      create: {
        internId: user.id,
        paymentRequestId: activePayment?.id || null,
        paymentType: "MANDATORY_SERVICE_FEE",
        reminderDate: todayIST,
        source,
        emailAttempted: true,
        emailStatus,
        emailProviderId: emailData.providerId || null,
        pushAttempted: pushData.attempted,
        pushStatus,
        pushError: pushData.error || null,
        errorMessage: emailData.error || pushData.error || null,
        sentAt: new Date(),
      },
    });

    if (activePayment) {
      await db.paymentRequest.update({
        where: { id: activePayment.id },
        data: {
          lastReminderAt: new Date(),
          reminderCount: { increment: 1 },
        },
      });
    }
  } catch (logErr) {
    console.error("[REMINDER LOG ERROR]", logErr);
  }

  return {
    success: emailData.success || pushData.status === "SENT",
    message: "Reminder dispatched successfully",
    emailStatus,
    pushStatus,
    emailProviderId: emailData.providerId,
    error: emailData.error || pushData.error,
  };
}

/**
 * Main Daily Automation Worker
 * Called once daily by the secure cron job.
 */
export async function processMandatoryPaymentReminders(): Promise<ReminderJobSummary> {
  const todayIST = getCurrentISTDateKey();

  const summary: ReminderJobSummary = {
    eligible: 0,
    emailSent: 0,
    emailFailed: 0,
    pushSent: 0,
    pushFailed: 0,
    pushUnavailable: 0,
    duplicatesSkipped: 0,
    paidSkipped: 0,
    cyberSkipped: 0,
    errors: [],
  };

  // 1. Query all active interns with their pending/unpaid mandatory payment requests
  const activeInterns = await db.user.findMany({
    where: {
      role: "INTERN",
      isActive: true,
    },
    include: {
      employmentProfile: true,
      paymentRequests: {
        where: {
          OR: [
            { paymentPurpose: "INTERNSHIP_FEE" },
            { paymentPurpose: "INTERNSHIP_SERVICE_BILL" },
            { fixedAmount: MANDATORY_INTERNSHIP_SERVICE_FEE },
            { title: { contains: "SERVICE BILL", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  for (const intern of activeInterns) {
    try {
      const activePayment = intern.paymentRequests[0];
      const domainName = activePayment?.domain || intern.department || "Development";
      const paymentAmount = activePayment?.fixedAmount || MANDATORY_INTERNSHIP_SERVICE_FEE;

      // Check Cyber exclusion first
      if (isCyberExcludedDomain(domainName, undefined, paymentAmount)) {
        summary.cyberSkipped++;
        continue;
      }

      // Check Payment Status or Paid Flag
      if (intern.internServicePaymentPaid) {
        summary.paidSkipped++;
        continue;
      }

      const currentStatus = (activePayment?.paymentStatus || "PENDING_PAYMENT").toUpperCase();
      if (currentStatus === "APPROVED" || currentStatus === "PAID" || currentStatus === "WAIVED") {
        summary.paidSkipped++;
        continue;
      }

      const candidate: InternReminderCandidate = {
        id: intern.id,
        name: intern.fullName || intern.username,
        email: intern.email,
        isActive: intern.isActive,
        role: intern.role,
        domain: domainName,
        department: intern.department,
        paymentRequestId: activePayment?.id,
        referenceId: activePayment?.referenceId,
        paymentStatus: currentStatus,
        amount: paymentAmount,
      };

      if (!requiresMandatoryFeeReminder(candidate)) {
        summary.paidSkipped++;
        continue;
      }

      // Deduplication check: Has a reminder already been sent today in IST?
      const alreadySent = await wasReminderSentToday(intern.id, todayIST);
      if (alreadySent) {
        summary.duplicatesSkipped++;
        continue;
      }

      // Race condition protection: Re-check payment status right before dispatch
      if (activePayment?.id) {
        const freshPayment = await db.paymentRequest.findUnique({
          where: { id: activePayment.id },
          select: { paymentStatus: true },
        });

        const freshStatus = (freshPayment?.paymentStatus || "").toUpperCase();
        if (freshStatus === "APPROVED" || freshStatus === "PAID" || freshStatus === "WAIVED") {
          summary.paidSkipped++;
          continue;
        }
      }

      summary.eligible++;

      // Build safe URL
      const paymentUrl = buildInternPaymentUrl(candidate);

      // Concurrently dispatch Email and Push
      const [emailResult, pushResult] = await Promise.allSettled([
        sendMandatoryFeeReminderEmail({
          studentName: candidate.name,
          email: candidate.email,
          domain: candidate.domain || "Engineering Track",
          paymentUrl,
        }),
        sendMandatoryFeeWebPush({
          userId: candidate.id,
          paymentUrl,
        }),
      ]);

      const emailData =
        emailResult.status === "fulfilled"
          ? emailResult.value
          : { success: false, error: String(emailResult.reason) };

      const pushData =
        pushResult.status === "fulfilled"
          ? pushResult.value
          : {
              attempted: false,
              status: "FAILED" as const,
              sentCount: 0,
              failedCount: 1,
              error: String(pushResult.reason),
            };

      if (emailData.success) {
        summary.emailSent++;
      } else {
        summary.emailFailed++;
      }

      if (pushData.status === "SENT") {
        summary.pushSent++;
      } else if (pushData.status === "FAILED") {
        summary.pushFailed++;
      } else {
        summary.pushUnavailable++;
      }

      // Persist reminder audit log
      try {
        await db.paymentReminderLog.create({
          data: {
            internId: intern.id,
            paymentRequestId: activePayment?.id || null,
            paymentType: "MANDATORY_SERVICE_FEE",
            reminderDate: todayIST,
            source: "DAILY_AUTOMATION",
            emailAttempted: true,
            emailStatus: emailData.success ? "SENT" : "FAILED",
            emailProviderId: emailData.providerId || null,
            pushAttempted: pushData.attempted,
            pushStatus: pushData.status,
            pushError: pushData.error || null,
            errorMessage: emailData.error || pushData.error || null,
            sentAt: new Date(),
          },
        });

        if (activePayment) {
          await db.paymentRequest.update({
            where: { id: activePayment.id },
            data: {
              lastReminderAt: new Date(),
              reminderCount: { increment: 1 },
            },
          });
        }
      } catch (logErr: any) {
        // If unique constraint error (P2002), concurrent execution already logged it
        if (logErr.code === "P2002") {
          summary.duplicatesSkipped++;
        } else {
          console.error(`[REMINDER AUDIT LOG ERROR] Intern ${intern.id}:`, logErr);
        }
      }

      // Small throttle to stay safely within email rate limits
      await new Promise((r) => setTimeout(r, 60));
    } catch (itemErr: any) {
      summary.errors.push({
        internId: intern.id,
        error: itemErr?.message || "Unknown error processing intern reminder",
      });
    }
  }

  return summary;
}
