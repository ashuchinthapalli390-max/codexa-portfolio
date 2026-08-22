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
