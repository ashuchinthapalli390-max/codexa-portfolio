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

