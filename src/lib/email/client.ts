import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromName = process.env.RESEND_FROM_NAME || "CodeXa Agency";

export const securityFromEmail = process.env.RESEND_SECURITY_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || `${resendFromName} <security@codxa-agency.online>`;
export const contactFromEmail = process.env.RESEND_CONTACT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || `${resendFromName} <contact@codxa-agency.online>`;
export const notificationsFromEmail = process.env.RESEND_NOTIFICATIONS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || `${resendFromName} <notifications@codxa-agency.online>`;
export const ownerRecipientEmail = process.env.OWNER_NOTIFICATION_EMAIL || process.env.OWNER_EMAIL || "ashu@codexa.agency";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailResult {
  success: boolean;
  data?: any;
  simulated?: boolean;
  error?: string;
}

export async function sendEmail({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.log(`[RESEND LOCAL LOG] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error(`[RESEND ERROR] Failed to send email to ${to}:`, error);
    return { success: false, error: error.message || "Failed to dispatch email" };
  }
}
