import { sendEmail, contactFromEmail, notificationsFromEmail, ownerRecipientEmail, SendEmailResult } from "./client";
import { renderEmailLayout } from "./templates";

export interface InquiryEmailParams {
  referenceId: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  projectType: string;
  budget: string;
  timeline?: string;
  message: string;
  submittedAt: string;
}

/**
 * 1. Owner Inquiry Alert
 */
export async function sendOwnerInquiryNotification(params: InquiryEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box">
      <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
        <tr>
          <td style="color: #888888; width: 35%; padding: 4px 0;">Reference:</td>
          <td style="font-family: monospace; font-weight: bold; color: #EF233C;">${params.referenceId}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Client:</td>
          <td style="font-weight: 600;">${params.fullName} (${params.email})</td>
        </tr>
        ${params.phone ? `<tr><td style="color: #888888; padding: 4px 0;">Phone:</td><td>${params.phone}</td></tr>` : ""}
        ${params.company ? `<tr><td style="color: #888888; padding: 4px 0;">Company:</td><td>${params.company}</td></tr>` : ""}
        <tr>
          <td style="color: #888888; padding: 4px 0;">Scope / Type:</td>
          <td style="text-transform: uppercase;">${params.projectType}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Budget & Timeline:</td>
          <td>${params.budget} &bull; ${params.timeline || "Flexible"}</td>
        </tr>
      </table>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #222222; font-size: 13px; color: #CCCCCC; line-height: 1.5;">
        <strong>Project Overview:</strong><br>
        ${params.message.replace(/\n/g, "<br>")}
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "NEW CLIENT PROPOSAL",
    title: "New Project Inquiry",
    subtitle: `Reference <strong>${params.referenceId}</strong> submitted by ${params.fullName}.`,
    contentHtml,
  });

  return sendEmail({
    from: contactFromEmail,
    to: ownerRecipientEmail,
    subject: `🚨 [${params.referenceId}] Project Inquiry: ${params.fullName}`,
    html,
  });
}

/**
 * 2. Client Confirmation Email
 */
export async function sendClientConfirmation(params: InquiryEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center;">
      <p style="font-size: 11px; color: #888888; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.15em;">
        Your Tracking Reference ID
      </p>
      <div style="font-family: monospace; font-size: 24px; font-weight: 900; color: #EF233C; letter-spacing: 0.1em; margin-bottom: 16px;">
        ${params.referenceId}
      </div>
      <p style="font-size: 13px; color: #CCCCCC; line-height: 1.6; margin: 0;">
        Our engineering leads are reviewing your specifications and will respond with preliminary architecture notes and milestones within <strong>24 business hours</strong>.
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "PROPOSAL TRANSMISSION CONFIRMED",
    title: "Project Received",
    subtitle: `Hello <strong>${params.fullName}</strong>, thank you for connecting with CodeXa Agency.`,
    contentHtml,
    warningText: `Keep your reference number (${params.referenceId}) handy for inquiries or project follow-ups.`,
  });

  return sendEmail({
    from: contactFromEmail,
    to: params.email,
    subject: `[${params.referenceId}] Project Confirmation — CodeXa Agency`,
    html,
  });
}

export interface PaidApplicationEmailParams {
  referenceId: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  projectType: string;
  advanceAmount: number;
  paymentId: string;
  budgetRange: string;
  timeline: string;
  features: string[];
  description: string;
}

/**
 * 3. Owner Alert: Verified Project Booking & Advance Received
 */
export async function sendOwnerPaidApplicationNotification(params: PaidApplicationEmailParams): Promise<SendEmailResult> {
  const featuresList = params.features.length > 0
    ? params.features.map((f) => `<span style="display: inline-block; background: #1a0508; border: 1px solid #730015; color: #ff1838; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin: 2px 4px 2px 0;">${f}</span>`).join("")
    : "Standard specifications";

  const contentHtml = `
    <div class="card-box">
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; text-align: center;">
        <span style="font-size: 11px; color: #10B981; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: block;">
          ADVANCE PAYMENT VERIFIED &bull; QUALIFIED LEAD
        </span>
        <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; font-family: monospace;">
          ₹${params.advanceAmount.toLocaleString("en-IN")} INR
        </span>
      </div>

      <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
        <tr>
          <td style="color: #888888; width: 35%; padding: 4px 0;">Reference ID:</td>
          <td style="font-family: monospace; font-weight: bold; color: #EF233C;">${params.referenceId}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Client:</td>
          <td style="font-weight: 600;">${params.fullName} (${params.email})</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Phone:</td>
          <td>${params.phone}</td>
        </tr>
        ${params.company ? `<tr><td style="color: #888888; padding: 4px 0;">Company:</td><td>${params.company}</td></tr>` : ""}
        <tr>
          <td style="color: #888888; padding: 4px 0;">Project Type:</td>
          <td style="text-transform: uppercase; font-weight: 600; color: #ff1838;">${params.projectType}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Client Budget:</td>
          <td>${params.budgetRange}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Timeline:</td>
          <td>${params.timeline}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Payment Ref:</td>
          <td style="font-family: monospace; font-size: 11px; color: #10B981;">${params.paymentId}</td>
        </tr>
      </table>

      <div style="margin-top: 14px;">
        <span style="font-size: 11px; color: #888888; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 6px;">
          Configured Features:
        </span>
        ${featuresList}
      </div>

      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #222222; font-size: 13px; color: #CCCCCC; line-height: 1.5;">
        <strong>Client Requirements / Scope:</strong><br>
        ${params.description.replace(/\n/g, "<br>")}
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "PRIORITY PAID PROJECT APPLICATION",
    title: "New Paid Lead & Advance Received",
    subtitle: `Reference <strong>${params.referenceId}</strong> from ${params.fullName} with ₹${params.advanceAmount} advance booking deposit.`,
    contentHtml,
  });

  return sendEmail({
    from: contactFromEmail,
    to: ownerRecipientEmail,
    subject: `🔥 [PAID ₹${params.advanceAmount}] Project Application: ${params.fullName} (${params.referenceId})`,
    html,
  });
}

/**
 * 4. Client Confirmation: Advance Received & Priority Queue Confirmation
 */
export async function sendClientPaidApplicationConfirmation(params: PaidApplicationEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center;">
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
        <span style="font-size: 11px; color: #10B981; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; display: block;">
          ADVANCE BOOKING DEPOSIT CONFIRMED
        </span>
        <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; font-family: monospace;">
          ₹${params.advanceAmount.toLocaleString("en-IN")} INR
        </span>
      </div>

      <p style="font-size: 11px; color: #888888; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.15em;">
        Your Priority Reference ID
      </p>
      <div style="font-family: monospace; font-size: 24px; font-weight: 900; color: #EF233C; letter-spacing: 0.1em; margin-bottom: 16px;">
        ${params.referenceId}
      </div>

      <p style="font-size: 13px; color: #CCCCCC; line-height: 1.6; margin: 0 0 12px 0;">
        Your project application for <strong>${params.projectType}</strong> has been secured in CodeXa's <strong>Priority Engineering Review Queue</strong>.
      </p>

      <div style="text-align: left; background: #080808; border: 1px solid #222222; border-radius: 6px; padding: 12px; font-size: 12px; color: #A5A5A5; line-height: 1.6; margin-top: 14px;">
        <strong style="color: #FFFFFF;">Next Steps:</strong>
        <ol style="margin: 6px 0 0 0; padding-left: 20px;">
          <li>Our technical architect will conduct a detailed architectural & requirement review.</li>
          <li>We will schedule a brief technical alignment session or transmit the final milestone breakdown & scope quotation.</li>
          <li>This advance booking payment will be deducted directly from your project milestones.</li>
        </ol>
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "PRIORITY QUEUE SECURED",
    title: "Project Application Confirmed",
    subtitle: `Hello <strong>${params.fullName}</strong>, your advance payment of ₹${params.advanceAmount} has been verified.`,
    contentHtml,
    warningText: `Please keep reference ID ${params.referenceId} saved for all future communication with CodeXa.`,
  });

  return sendEmail({
    from: contactFromEmail,
    to: params.email,
    subject: `✓ [${params.referenceId}] Project Booking Confirmed (₹${params.advanceAmount} Advance Received) — CodeXa Agency`,
    html,
  });
}

// ─── 5. MANUAL UPI PAYMENT NOTIFICATIONS ─────────────────────────────────────

export interface PaymentEmailParams {
  referenceId: string;
  recipientName: string;
  recipientEmail: string;
  title: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  paymentDate?: string;
  utrNumber?: string;
  rejectionReason?: string;
}

/**
 * Sends notice when a payment request is assigned to a user
 */
export async function sendPaymentRequestedEmail(params: PaymentEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box">
      <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
        <tr>
          <td style="color: #888888; width: 40%; padding: 4px 0;">Payment Reference:</td>
          <td style="font-family: monospace; font-weight: bold; color: #EF233C;">${params.referenceId}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Item / Purpose:</td>
          <td style="font-weight: 600;">${params.title}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Total Payable:</td>
          <td style="font-size: 16px; font-weight: 700; color: #EF233C;">₹${params.amount.toLocaleString()}</td>
        </tr>
        ${params.dueDate ? `<tr><td style="color: #888888; padding: 4px 0;">Due Date:</td><td>${params.dueDate}</td></tr>` : ""}
      </table>
      <div style="margin-top: 16px; padding: 12px; background: #080808; border: 1px solid #222222; border-radius: 6px; font-size: 12px; color: #CCCCCC;">
        Please log in to your CodeXa dashboard, scan the official UPI QR code or click your preferred UPI app, and upload your payment screenshot after completing payment.
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "PAYMENT DUE",
    title: "New Payment Request",
    subtitle: `Hello <strong>${params.recipientName}</strong>, a payment request has been issued for your account.`,
    contentHtml,
  });

  return sendEmail({
    from: notificationsFromEmail,
    to: params.recipientEmail,
    subject: `💳 [${params.referenceId}] Payment Request: ${params.title} (₹${params.amount}) — CodeXa Agency`,
    html,
  });
}

/**
 * Sends notice when user submits payment proof
 */
export async function sendPaymentProofSubmittedEmail(params: PaymentEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box">
      <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
        <tr>
          <td style="color: #888888; width: 40%; padding: 4px 0;">Payment Reference:</td>
          <td style="font-family: monospace; font-weight: bold; color: #EF233C;">${params.referenceId}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Purpose:</td>
          <td>${params.title}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Amount:</td>
          <td>₹${params.amount.toLocaleString()}</td>
        </tr>
        ${params.utrNumber ? `<tr><td style="color: #888888; padding: 4px 0;">Submitted UTR:</td><td style="font-family: monospace;">${params.utrNumber}</td></tr>` : ""}
      </table>
      <div style="margin-top: 14px; font-size: 12px; color: #888888;">
        Your payment screenshot has been securely queued for verification by the CodeXa Accounts & Administration team. You will receive an update once verified.
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "UNDER VERIFICATION",
    title: "Payment Proof Received",
    subtitle: `Reference <strong>${params.referenceId}</strong> is now pending manual verification.`,
    contentHtml,
  });

  return sendEmail({
    from: notificationsFromEmail,
    to: params.recipientEmail,
    subject: `⏳ [${params.referenceId}] Payment Proof Submitted — Pending Verification`,
    html,
  });
}

/**
 * Sends notice when admin approves payment
 */
export async function sendPaymentApprovedEmail(params: PaymentEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="display: inline-block; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #22c55e; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          ✓ PAYMENT VERIFIED & APPROVED
        </span>
      </div>
      <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
        <tr>
          <td style="color: #888888; width: 40%; padding: 4px 0;">Payment Reference:</td>
          <td style="font-family: monospace; font-weight: bold; color: #22c55e;">${params.referenceId}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Purpose:</td>
          <td>${params.title}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Amount Paid:</td>
          <td style="font-size: 15px; font-weight: 700; color: #FFFFFF;">₹${params.amount.toLocaleString()}</td>
        </tr>
        ${params.utrNumber ? `<tr><td style="color: #888888; padding: 4px 0;">Verified UTR:</td><td style="font-family: monospace;">${params.utrNumber}</td></tr>` : ""}
      </table>
      <div style="margin-top: 14px; font-size: 12px; color: #888888;">
        Your payment has been officially confirmed on the CodeXa platform. All associated access, tools, and credentials have been granted.
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "VERIFIED",
    title: "Payment Approved",
    subtitle: `Hello <strong>${params.recipientName}</strong>, your payment of ₹${params.amount} has been successfully verified.`,
    contentHtml,
  });

  return sendEmail({
    from: notificationsFromEmail,
    to: params.recipientEmail,
    subject: `✓ [${params.referenceId}] Payment Approved — CodeXa Agency`,
    html,
  });
}

/**
 * Sends notice when admin rejects payment proof
 */
export async function sendPaymentRejectedEmail(params: PaymentEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box">
      <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
        <tr>
          <td style="color: #888888; width: 40%; padding: 4px 0;">Payment Reference:</td>
          <td style="font-family: monospace; font-weight: bold; color: #EF233C;">${params.referenceId}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Purpose:</td>
          <td>${params.title}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 4px 0;">Amount:</td>
          <td>₹${params.amount.toLocaleString()}</td>
        </tr>
      </table>
      <div style="margin-top: 14px; padding: 12px; background: rgba(239, 35, 60, 0.1); border: 1px solid rgba(239, 35, 60, 0.3); border-radius: 6px; font-size: 13px; color: #FFFFFF;">
        <strong style="color: #EF233C;">Reason for Rejection:</strong><br>
        ${params.rejectionReason || "Payment proof could not be verified. Please ensure the screenshot is clear and shows the correct transaction details."}
      </div>
      <div style="margin-top: 14px; font-size: 12px; color: #888888;">
        Please log in to your CodeXa dashboard, review your transaction details, and resubmit a clear payment screenshot.
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "REJECTED",
    title: "Payment Proof Not Verified",
    subtitle: `Hello <strong>${params.recipientName}</strong>, your payment proof requires resubmission.`,
    contentHtml,
    warningText: "Please review the rejection reason above and submit valid proof on your dashboard.",
  });

  return sendEmail({
    from: notificationsFromEmail,
    to: params.recipientEmail,
    subject: `⚠️ [${params.referenceId}] Payment Proof Needs Resubmission — CodeXa Agency`,
    html,
  });
}

export interface CashPaymentRequestEmailParams {
  recipientEmail: string;
  recipientName: string;
  internName: string;
  internId: string;
  internEmail: string;
  internshipDomain: string;
  duration: string;
  amount: number;
  paymentReference: string;
  serverDateTime: string;
  reviewUrl: string;
}

/**
 * Sends immediate notification email to Founder and Co-Founder when an intern requests cash payment.
 */
export async function sendCashPaymentRequestEmail(params: CashPaymentRequestEmailParams): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          ⚠️ PENDING CASH APPROVAL
        </span>
      </div>
      <p style="font-size: 14px; color: #CCCCCC; line-height: 1.6; margin: 0 0 16px 0;">
        Hello ${params.recipientName},<br><br>
        A new cash payment request has been created for the <strong>CodeXa Internship Service Bill</strong>.
      </p>

      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <div style="font-size: 11px; text-transform: uppercase; color: #888888; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 10px;">
          Intern Details
        </div>
        <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
          <tr>
            <td style="color: #888888; width: 35%; padding: 3px 0;">Name:</td>
            <td style="font-weight: 600;">${params.internName}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Intern ID:</td>
            <td style="font-family: monospace; color: #EF233C;">${params.internId}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Email:</td>
            <td>${params.internEmail}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Domain:</td>
            <td>${params.internshipDomain}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Duration:</td>
            <td>${params.duration}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <div style="font-size: 11px; text-transform: uppercase; color: #888888; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 10px;">
          Payment Details
        </div>
        <table style="width: 100%; font-size: 13px; color: #FFFFFF; line-height: 1.6;">
          <tr>
            <td style="color: #888888; width: 35%; padding: 3px 0;">Amount:</td>
            <td style="font-size: 15px; font-weight: 700; color: #FFFFFF;">₹${params.amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Method:</td>
            <td>Cash</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Payment Reference:</td>
            <td style="font-family: monospace; font-weight: bold; color: #f59e0b;">${params.paymentReference}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Requested At:</td>
            <td>${params.serverDateTime}</td>
          </tr>
          <tr>
            <td style="color: #888888; padding: 3px 0;">Status:</td>
            <td style="color: #f59e0b; font-weight: 600;">Pending Cash Approval</td>
          </tr>
        </table>
      </div>

      <div style="padding: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; font-size: 12px; color: #FFFFFF; line-height: 1.5; margin-bottom: 20px;">
        <strong>Important:</strong> The payment must only be marked successful after the physical cash is received.
      </div>

      <div style="text-align: center; margin: 24px 0 10px 0;">
        <a href="${params.reviewUrl}" style="display: inline-block; background: #EF233C; color: #FFFFFF; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 10px; text-decoration: none; letter-spacing: 0.03em;">
          Review Payment &rarr;
        </a>
      </div>
      <p style="text-align: center; font-size: 11px; color: #666666; margin: 10px 0 0 0;">
        Regards,<br>CodeXa Agency Payment System
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "CASH APPROVAL REQUIRED",
    title: "New Cash Payment Request",
    subtitle: `Intern <strong>${params.internName}</strong> (${params.internId}) has requested to pay ₹${params.amount} in cash.`,
    contentHtml,
    warningText: "Requires physical cash verification before admin confirmation.",
  });

  return sendEmail({
    from: notificationsFromEmail,
    to: params.recipientEmail,
    subject: `New CodeXa Cash Payment Request — ${params.internName}`,
    html,
  });
}

