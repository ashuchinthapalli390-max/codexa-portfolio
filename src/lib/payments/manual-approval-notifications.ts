import { db } from "@/lib/db";
import { sendEmail, notificationsFromEmail } from "@/lib/email/client";
import { sendPushNotification } from "@/lib/push";
import { getPaymentProofBuffer } from "@/lib/payment-storage";

interface ProofSubmissionContext {
  payment: {
    id: string;
    referenceId: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    domain?: string | null;
    internId?: string | null;
    fixedAmount: number;
    paymentMethod?: string | null;
    submittedAt?: Date | null;
    proofImageUrl?: string | null;
  };
  attempt?: {
    id: string;
    selectedMethod: string;
    submittedAt?: Date | null;
    proofImageUrl?: string | null;
  } | null;
}

/**
 * Resolves active Founder and Co-Founder accounts.
 * Defaults to authoritative accounts in DB or known operational contacts.
 */
export async function getAuthorizedPaymentManagers() {
  const managers = await db.user.findMany({
    where: {
      OR: [
        { role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER"] } },
        { orgRole: { in: ["FOUNDER", "CO_FOUNDER"] } },
        {
          email: {
            in: [
              "ashuchinthapalli3900@gmail.com",
              "boddukurisanjay@gmail.com",
            ],
          },
        },
      ],
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

  // Ensure both key managers are represented even if roles are customized
  const seenEmails = new Set<string>();
  const uniqueManagers = managers.filter((m) => {
    const emailLower = m.email.toLowerCase();
    if (seenEmails.has(emailLower)) return false;
    seenEmails.add(emailLower);
    return true;
  });

  return uniqueManagers;
}

/**
 * Triggers all admin notifications when an intern submits a payment screenshot:
 * 1. Founder in-app notification
 * 2. Co-Founder in-app notification
 * 3. Founder Web Push
 * 4. Co-Founder Web Push
 * 5. Founder email (with attached payment screenshot)
 * 6. Co-Founder email (with attached payment screenshot)
 */
export async function dispatchProofSubmittedNotifications(
  ctx: ProofSubmissionContext
) {
  const { payment, attempt } = ctx;
  const internName = payment.userName || "Intern";
  const internId = payment.internId || "CXA-INT-2026";
  const internEmail = payment.userEmail || "intern@codxa-agency.online";
  const domain = payment.domain || "Engineering & Development";
  const method = attempt?.selectedMethod || payment.paymentMethod || "UPI Transfer";
  const submittedAt = attempt?.submittedAt || payment.submittedAt || new Date();
  const submittedAtFormatted = new Date(submittedAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const reviewUrl = `https://codxa-agency.online/dashboard/payments?review=${payment.id}`;
  const proofPath = attempt?.proofImageUrl || payment.proofImageUrl;

  // Retrieve screenshot buffer for email attachment
  let proofBufferObj: { buffer: Buffer; mimeType: string } | null = null;
  if (proofPath) {
    try {
      proofBufferObj = await getPaymentProofBuffer(proofPath);
    } catch (err) {
      console.warn("[Proof Buffer Read Error]", err);
    }
  }

  const managers = await getAuthorizedPaymentManagers();

  const results = await Promise.allSettled(
    managers.map(async (manager) => {
      const isFounder =
        (manager.orgRole || manager.role || "").toUpperCase().includes("FOUNDER") &&
        !manager.email.includes("sanjay");
      const titleLabel = isFounder ? "Founder" : "Co-Founder";

      // 1. In-App Notification
      try {
        await db.notification.create({
          data: {
            userId: manager.id,
            type: "PAYMENT_APPROVAL_REQUIRED",
            title: `Payment Approval Required: ${internName}`,
            message: `${internName} (${internId}) submitted ₹450 payment proof via ${method}. Payment Reference: ${payment.referenceId}.`,
            link: `/dashboard/payments?review=${payment.id}`,
          },
        });
      } catch (err) {
        console.error(`[In-App Notif Error for ${manager.email}]`, err);
      }

      // 2. Web Push Notification
      try {
        await sendPushNotification(manager.id, {
          title: "CodeXa — Payment Approval Required",
          body: `${internName} submitted ₹450 payment proof via ${method}.`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `payment-approval-${payment.id}`,
          data: {
            type: "PAYMENT_APPROVAL_REQUIRED",
            url: `/dashboard/payments?review=${payment.id}`,
            paymentId: payment.id,
            referenceId: payment.referenceId,
          },
        });
      } catch (err) {
        console.error(`[Web Push Error for ${manager.email}]`, err);
      }

      // 3. Email via Resend with Screenshot Attachment
      try {
        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CodeXa — New ₹450 Payment Pending Approval</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0D0D0D; border: 1px solid rgba(217, 4, 41, 0.4); border-radius: 16px; padding: 36px; box-shadow: 0 0 35px rgba(217, 4, 41, 0.15); }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; text-align: center; margin-bottom: 24px; }
    .logo span { color: #D90429; font-size: 13px; }
    .badge { display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #FBBF24; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
    .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 24px; text-align: center; }
    .card-box { background: #141414; border: 1px solid #242424; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1F1F1F; font-size: 13px; }
    .label { color: #888888; font-weight: 500; }
    .value { color: #FFFFFF; font-weight: 600; text-align: right; }
    .highlight { color: #EF233C; font-weight: 700; }
    .btn { display: inline-block; background: #D90429; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; box-shadow: 0 0 20px rgba(217, 4, 41, 0.4); text-align: center; }
    .instruction { font-size: 12px; line-height: 1.6; color: #CCCCCC; margin: 16px 0; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #F59E0B; padding: 12px 16px; border-radius: 0 8px 8px 0; }
    .instruction strong { color: #FBBF24; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CODEXA <span>AGENCY</span></div>
    <div style="text-align: center;"><div class="badge">Payment Approval Required</div></div>
    <h1 class="title">New ₹450 Payment Pending Review</h1>
    <p class="subtitle">Hello ${manager.fullName || titleLabel}, an intern has submitted payment proof for verification.</p>

    <div class="card-box">
      <div style="margin-bottom: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #D90429; font-weight: 700;">Intern Details</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #888;">Name:</td><td style="font-weight: 600; color: #fff; text-align: right;">${internName}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Intern ID:</td><td style="font-family: monospace; font-weight: 700; color: #EF233C; text-align: right;">${internId}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Email:</td><td style="font-family: monospace; font-weight: 600; color: #fff; text-align: right;">${internEmail}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Domain:</td><td style="font-weight: 600; color: #fff; text-align: right;">${domain}</td></tr>
      </table>
    </div>

    <div class="card-box">
      <div style="margin-bottom: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #EF233C; font-weight: 700;">Payment Details</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #888;">Amount:</td><td style="font-family: monospace; font-weight: 800; color: #10B981; font-size: 16px; text-align: right;">₹450.00 INR</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Payment Method:</td><td style="font-weight: 600; color: #fff; text-align: right;">${method}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Payment Reference:</td><td style="font-family: monospace; font-weight: 700; color: #EF233C; text-align: right;">${payment.referenceId}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Submitted At:</td><td style="font-family: monospace; font-weight: 600; color: #fff; text-align: right;">${submittedAtFormatted}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Current Status:</td><td style="font-family: monospace; font-weight: 700; color: #FBBF24; text-align: right;">PENDING APPROVAL</td></tr>
      </table>
    </div>

    <div class="instruction">
      <strong>⚠️ Independent Settlement Check Required:</strong><br>
      Please confirm the ₹450 credit in the authorized receiving bank or UPI account before approving this payment. The uploaded screenshot alone is not confirmation of settlement.
    </div>

    ${
      proofBufferObj && proofBufferObj.buffer.length <= 2 * 1024 * 1024
        ? `
    <div style="margin: 24px 0; text-align: center; background: #000000; padding: 14px; border-radius: 14px; border: 1px solid #282828;">
      <div style="font-size: 11px; color: #AAAAAA; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 700;">Uploaded Payment Screenshot</div>
      <img src="data:${proofBufferObj.mimeType};base64,${proofBufferObj.buffer.toString('base64')}" alt="Payment Proof" style="max-width: 100%; max-height: 440px; border-radius: 8px; border: 1px solid #333333; display: block; margin: 0 auto;" />
    </div>
        `
        : ""
    }

    <div style="text-align: center; margin: 28px 0;">
      <a href="${reviewUrl}" class="btn">REVIEW PAYMENT &amp; DECIDE</a>
    </div>

    ${
      proofBufferObj
        ? `<p style="font-size: 11px; color: #888; text-align: center;">📎 Payment screenshot is attached to this transmission and available in the CodeXa Payment Control Center.</p>`
        : `<p style="font-size: 11px; color: #888; text-align: center;">Payment screenshot is available in the CodeXa Payment Control Center via the button above.</p>`
    }
  </div>
  <div class="footer">&copy; 2026 CodeXa Agency. All rights reserved. &bull; Enterprise Payment System</div>
</body>
</html>
        `;

        const ext = proofBufferObj?.mimeType?.includes("png")
          ? "png"
          : proofBufferObj?.mimeType?.includes("webp")
          ? "webp"
          : "jpg";

        const attachments =
          proofBufferObj && proofBufferObj.buffer.length <= 8 * 1024 * 1024
            ? [
                {
                  filename: `CodeXa_Payment_${payment.referenceId}.${ext}`,
                  content: proofBufferObj.buffer,
                },
              ]
            : undefined;

        await sendEmail({
          from: notificationsFromEmail,
          to: manager.email,
          subject: `CodeXa — New ₹450 Payment Pending Approval (${internName})`,
          html: emailHtml,
          attachments,
        });
      } catch (err) {
        console.error(`[Email Error for ${manager.email}]`, err);
      }
    })
  );

  return results;
}

/**
 * Triggers intern notification and email when Founder or Co-Founder approves the ₹450 payment.
 */
export async function dispatchPaymentApprovedToIntern({
  payment,
  approverName,
  approverRole,
}: {
  payment: {
    id: string;
    referenceId: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    internId?: string | null;
    fixedAmount: number;
    paymentMethod?: string | null;
  };
  approverName: string;
  approverRole: string;
}) {
  const recipientEmail = payment.userEmail;
  const internName = payment.userName || "Intern";
  const internId = payment.internId || "CXA-INT-2026";
  const amount = payment.fixedAmount || 450;
  const approvedAtFormatted = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  // 1. Intern In-App Notification
  try {
    await db.notification.create({
      data: {
        userId: payment.userId,
        type: "PAYMENT_APPROVED",
        title: "🎉 Payment Successfully Approved",
        message: `Your ₹450 Internship Service Payment (${payment.referenceId}) was approved by ${approverName} (${approverRole}). Student ID Card and AI Tools Pack are now unlocked!`,
        link: "/dashboard/payments",
      },
    });
  } catch (err) {
    console.error("[Intern In-App Notif Error]", err);
  }

  // 2. Intern Web Push
  try {
    await sendPushNotification(payment.userId, {
      title: "🎉 CodeXa Payment Approved",
      body: "Your ₹450 internship fee has been approved! Student ID Card and AI Dev Tools Pack are now unlocked.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "payment-approved",
      data: {
        type: "PAYMENT_APPROVED",
        url: "/dashboard/payments",
        paymentId: payment.id,
      },
    });
  } catch (err) {
    console.error("[Intern Web Push Error]", err);
  }

  // 3. Intern Email via Resend
  if (recipientEmail) {
    try {
      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CodeXa — ₹450 Payment Successfully Approved</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #0C0C0C; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 36px; box-shadow: 0 0 35px rgba(16, 185, 129, 0.15); }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; text-align: center; margin-bottom: 24px; }
    .logo span { color: #10B981; font-size: 13px; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #10B981; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
    .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 24px; text-align: center; }
    .card-box { background: #121212; border: 1px solid #242424; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: #10B981; color: #000000; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CODEXA <span>AGENCY</span></div>
    <div style="text-align: center;"><div class="badge">Official Receipt &bull; Cleared</div></div>
    <h1 class="title">Payment Approved Successfully</h1>
    <p class="subtitle">Hello ${internName}, your CodeXa Internship Service payment has been verified and recorded.</p>

    <div class="card-box">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #888;">Intern ID:</td><td style="font-family: monospace; font-weight: 700; color: #EF233C; text-align: right;">${internId}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Reference:</td><td style="font-family: monospace; font-weight: 600; color: #fff; text-align: right;">${payment.referenceId}</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Amount Paid:</td><td style="font-family: monospace; font-weight: 800; color: #10B981; font-size: 16px; text-align: right;">₹${amount}.00 INR</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Status:</td><td style="font-weight: 700; color: #10B981; text-align: right;">SUCCESS (APPROVED)</td></tr>
        <tr><td style="padding: 6px 0; color: #888;">Approved At:</td><td style="font-family: monospace; font-weight: 600; color: #fff; text-align: right;">${approvedAtFormatted}</td></tr>
      </table>
    </div>

    <div class="card-box">
      <div style="margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #10B981; font-weight: 700;">Bill Breakdown</div>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #AAA;">1. Mandatory Student ID Card</td><td style="font-mono; font-weight: 600; text-align: right;">₹150</td></tr>
        <tr><td style="padding: 4px 0; color: #AAA;">2. AI Development Tools Pack</td><td style="font-mono; font-weight: 600; text-align: right;">₹300</td></tr>
        <tr style="border-top: 1px solid #333;"><td style="padding: 8px 0; font-weight: 800; color: #fff;">TOTAL CLEARED:</td><td style="font-mono; font-weight: 800; color: #10B981; text-align: right;">₹450</td></tr>
      </table>
    </div>

    <div style="padding: 16px; border-radius: 12px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); font-size: 12px; line-height: 1.6;">
      ✨ <strong>Benefits Unlocked:</strong><br>
      Your Student ID Card credential issuance is now activated. You can upload your ID Card photo and request AI Dev Tools access directly from your dashboard.
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://codxa-agency.online/dashboard/payments" class="btn">View Cleared Receipt</a>
    </div>
  </div>
  <div class="footer">&copy; 2026 CodeXa Agency. All rights reserved. &bull; Enterprise Developer Platform</div>
</body>
</html>
        `;

      await sendEmail({
        from: notificationsFromEmail,
        to: recipientEmail,
        subject: `CodeXa — ₹450 Payment Successfully Approved (${payment.referenceId})`,
        html: emailHtml,
      });
    } catch (err) {
      console.error("[Intern Success Email Error]", err);
    }
  }
}

/**
 * Triggers intern notification and email when Founder or Co-Founder rejects the payment proof.
 */
export async function dispatchPaymentRejectedToIntern({
  payment,
  reason,
  reviewerName,
  reviewerRole,
}: {
  payment: {
    id: string;
    referenceId: string;
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    internId?: string | null;
  };
  reason: string;
  reviewerName: string;
  reviewerRole: string;
}) {
  const recipientEmail = payment.userEmail;
  const internName = payment.userName || "Intern";
  const rejectionReason = reason.trim();

  // 1. In-App Notification
  try {
    await db.notification.create({
      data: {
        userId: payment.userId,
        type: "PAYMENT_REJECTED",
        title: "Payment Proof Rejected",
        message: `Your payment proof was rejected: "${rejectionReason}". Please upload a clear transaction screenshot from your dashboard.`,
        link: "/dashboard/payments",
      },
    });
  } catch (err) {
    console.error("[Intern Rejection In-App Notif Error]", err);
  }

  // 2. Web Push
  try {
    await sendPushNotification(payment.userId, {
      title: "❌ Payment Proof Rejected",
      body: `Reason: "${rejectionReason}". Please upload a valid payment screenshot.`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "payment-rejected",
      data: {
        type: "PAYMENT_REJECTED",
        url: "/dashboard/payments",
        paymentId: payment.id,
      },
    });
  } catch (err) {
    console.error("[Intern Rejection Web Push Error]", err);
  }

  // 3. Email via Resend
  if (recipientEmail) {
    try {
      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CodeXa — Payment Proof Rejected</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #0C0C0C; border: 1px solid rgba(239, 35, 60, 0.4); border-radius: 16px; padding: 36px; box-shadow: 0 0 35px rgba(239, 35, 60, 0.15); }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; text-align: center; margin-bottom: 24px; }
    .logo span { color: #D90429; font-size: 13px; }
    .badge { display: inline-block; background: rgba(239, 35, 60, 0.15); border: 1px solid rgba(239, 35, 60, 0.4); color: #EF233C; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
    .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 24px; text-align: center; }
    .card-box { background: #121212; border: 1px solid #242424; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: #D90429; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CODEXA <span>AGENCY</span></div>
    <div style="text-align: center;"><div class="badge">Verification Decision</div></div>
    <h1 class="title">Payment Proof Not Accepted</h1>
    <p class="subtitle">Hello ${internName}, your payment screenshot for reference <strong>${payment.referenceId}</strong> was reviewed and not accepted.</p>

    <div class="card-box">
      <div style="font-size: 12px; text-transform: uppercase; color: #EF233C; font-weight: 700; margin-bottom: 8px;">Reason Provided by Administration</div>
      <p style="font-size: 14px; color: #fff; margin: 0; font-weight: 600;">"${rejectionReason}"</p>
    </div>

    <p style="font-size: 12px; color: #CCC; line-height: 1.6;">
      <strong>Next Steps:</strong> If you have completed the ₹450 transfer, please log in to the CodeXa platform and re-upload a clear screenshot showing the full transaction details (including transaction ID/UTR and completed status).
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="https://codxa-agency.online/dashboard/payments" class="btn">Upload New Screenshot</a>
    </div>
  </div>
  <div class="footer">&copy; 2026 CodeXa Agency. All rights reserved. &bull; Enterprise Developer Platform</div>
</body>
</html>
        `;

      await sendEmail({
        from: notificationsFromEmail,
        to: recipientEmail,
        subject: `CodeXa — Action Required: Payment Proof Rejected (${payment.referenceId})`,
        html: emailHtml,
      });
    } catch (err) {
      console.error("[Intern Rejection Email Error]", err);
    }
  }
}
