import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromName = process.env.RESEND_FROM_NAME || "CodeXa Agency";
const securityFromEmail = process.env.RESEND_SECURITY_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || `${resendFromName} <security@codxa-agency.online>`;
const contactFromEmail = process.env.RESEND_CONTACT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || `${resendFromName} <contact@codxa-agency.online>`;
const ownerRecipientEmail = process.env.OWNER_NOTIFICATION_EMAIL || process.env.OWNER_EMAIL || "ashu@codexa.agency";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface LoginOtpEmailParams {
  email: string;
  name: string;
  otp: string;
  ipAddress?: string;
}

interface PasswordResetOtpEmailParams {
  email: string;
  name: string;
  otp: string;
  ipAddress?: string;
}

interface InquiryEmailParams {
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
 * 1. Dispatch Cryptographically Secure Login OTP to User
 */
export async function sendLoginOtpEmail({ email, name, otp, ipAddress }: LoginOtpEmailParams) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #0E0E0E; border: 1px solid rgba(217, 4, 41, 0.3); border-radius: 16px; padding: 32px; box-shadow: 0 0 30px rgba(217, 4, 41, 0.15); }
          .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
          .logo span { color: #D90429; font-size: 14px; }
          .badge { display: inline-block; background: rgba(217, 4, 41, 0.15); border: 1px solid rgba(217, 4, 41, 0.4); color: #EF233C; font-size: 10px; font-weight: bold; letter-spacing: 0.2em; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
          .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
          .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 28px; text-align: center; }
          .otp-box { background: #050505; border: 2px dashed #D90429; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; letter-spacing: 0.35em; font-size: 36px; font-weight: 900; font-family: monospace; color: #EF233C; text-shadow: 0 0 15px rgba(217, 4, 41, 0.6); }
          .warning { font-size: 11px; color: #777777; line-height: 1.5; text-align: center; margin-top: 24px; border-top: 1px solid #1A1A1A; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">CODEXA <span>AUTHENTICATION</span></div>
          <div style="text-align: center;"><div class="badge">SECURE TWO-STAGE LOGIN</div></div>
          <h1 class="title">Verify Your Identity</h1>
          <p class="subtitle">Hello <strong>${name}</strong>, enter the 6-digit verification code below to authorize your CodeXa access.</p>
          
          <div class="otp-box">${otp}</div>
          
          <p style="text-align: center; font-size: 12px; color: #888888;">
            ⏱️ Code expires in <strong>5 minutes</strong>. Single-use only.
          </p>

          <div class="warning">
            If you did not request this login attempt from IP ${ipAddress || "Unknown"}, please secure your account immediately or notify the Owner.
          </div>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    console.log(`[RESEND MOCK/LOG] Login OTP for ${email}: ${otp}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: securityFromEmail,
      to: email,
      subject: `[${otp}] CodeXa Login Verification Code`,
      html,
    });
    console.log(`[RESEND SENT] Login OTP for ${email}: ${otp}`);
    return { success: true, data };
  } catch (error: any) {
    console.log(`[RESEND FALLBACK LOG] Login OTP for ${email}: ${otp} (Resend error: ${error.message})`);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Dispatch Password Reset OTP to User
 */
export async function sendPasswordResetOtpEmail({ email, name, otp, ipAddress }: PasswordResetOtpEmailParams) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #0E0E0E; border: 1px solid rgba(217, 4, 41, 0.3); border-radius: 16px; padding: 32px; }
          .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
          .logo span { color: #D90429; font-size: 14px; }
          .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
          .otp-box { background: #050505; border: 2px dashed #EF233C; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; letter-spacing: 0.35em; font-size: 36px; font-weight: 900; font-family: monospace; color: #EF233C; }
          .warning { font-size: 11px; color: #777777; line-height: 1.5; text-align: center; margin-top: 24px; border-top: 1px solid #1A1A1A; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">CODEXA <span>RECOVERY</span></div>
          <h1 class="title">Password Reset Code</h1>
          <p style="text-align: center; font-size: 13px; color: #A5A5A5;">Hello <strong>${name}</strong>, use the one-time code below to reset your password.</p>
          
          <div class="otp-box">${otp}</div>
          
          <p style="text-align: center; font-size: 12px; color: #888888;">
            ⏱️ Code expires in <strong>5 minutes</strong>.
          </p>

          <div class="warning">
            If you did not request this password recovery, please ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    console.log(`[RESEND MOCK/LOG] Password Reset OTP for ${email}: ${otp}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: securityFromEmail,
      to: email,
      subject: `[${otp}] CodeXa Password Recovery Code`,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send reset OTP via Resend:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Send Inquiry Notification to Owner
 */
export async function sendInquiryEmailToOwner(params: InquiryEmailParams) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #0E0E0E; border: 1px solid rgba(217, 4, 41, 0.3); border-radius: 16px; padding: 32px; }
          .header { border-bottom: 1px solid #1A1A1A; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 18px; font-weight: 900; letter-spacing: 0.2em; color: #FFFFFF; text-transform: uppercase; }
          .logo span { color: #D90429; font-size: 12px; }
          .ref { font-family: monospace; font-size: 14px; font-weight: bold; color: #EF233C; background: rgba(217, 4, 41, 0.1); padding: 4px 10px; border-radius: 6px; display: inline-block; margin-top: 8px; }
          .grid { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .grid td { padding: 10px 0; border-bottom: 1px solid #141414; font-size: 13px; }
          .label { color: #888888; width: 35%; font-weight: 500; }
          .value { color: #FFFFFF; font-weight: 600; }
          .msg-box { background: #050505; border: 1px solid #222222; border-radius: 8px; padding: 16px; font-size: 13px; color: #D0D0D0; line-height: 1.6; white-space: pre-line; margin-bottom: 24px; }
          .button { display: block; text-align: center; background: #D90429; color: #FFFFFF; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.1em; padding: 14px 24px; border-radius: 8px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CODEXA <span>INQUIRY PIPELINE</span></div>
            <div class="ref">REF: ${params.referenceId}</div>
          </div>

          <table class="grid">
            <tr><td class="label">Client Name</td><td class="value">${params.fullName}</td></tr>
            <tr><td class="label">Email Address</td><td class="value"><a href="mailto:${params.email}" style="color: #EF233C;">${params.email}</a></td></tr>
            <tr><td class="label">Phone Number</td><td class="value">${params.phone || "Not specified"}</td></tr>
            <tr><td class="label">Company</td><td class="value">${params.company || "Independent Client"}</td></tr>
            <tr><td class="label">Project Type</td><td class="value">${params.projectType.toUpperCase()}</td></tr>
            <tr><td class="label">Budget Estimate</td><td class="value" style="color: #10B981;">${params.budget}</td></tr>
            <tr><td class="label">Timeline</td><td class="value">${params.timeline || "Flexible"}</td></tr>
            <tr><td class="label">Submitted Time</td><td class="value">${params.submittedAt}</td></tr>
          </table>

          <div style="font-size: 11px; font-weight: bold; letter-spacing: 0.1em; color: #888888; text-transform: uppercase; margin-bottom: 8px;">Project Specifications</div>
          <div class="msg-box">${params.message}</div>

          <a href="http://localhost:3000/owner" class="button">VIEW IN OWNER DASHBOARD</a>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    console.log(`[RESEND MOCK/LOG] New Inquiry ${params.referenceId} received from ${params.email}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: contactFromEmail,
      to: ownerRecipientEmail,
      subject: `[${params.referenceId}] New Project Application: ${params.fullName}`,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send inquiry to Owner via Resend:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. Send Confirmation Receipt to Client
 */
export async function sendInquiryReceiptToClient(params: InquiryEmailParams) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 540px; margin: 0 auto; background: #0E0E0E; border: 1px solid rgba(217, 4, 41, 0.3); border-radius: 16px; padding: 32px; }
          .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
          .logo span { color: #D90429; font-size: 14px; }
          .title { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; }
          .ref-box { background: #050505; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; }
          .ref-title { font-size: 10px; font-weight: bold; letter-spacing: 0.15em; color: #888888; text-transform: uppercase; }
          .ref-id { font-size: 18px; font-weight: 900; font-family: monospace; color: #10B981; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">CODEXA <span>AGENCY</span></div>
          <h1 class="title">Application Received</h1>
          <p style="font-size: 13px; color: #A5A5A5; text-align: center; line-height: 1.6;">
            Thank you, <strong>${params.fullName}</strong>. Your project inquiry has been logged into our engineering review queue.
          </p>

          <div class="ref-box">
            <div class="ref-title">Application Reference Number</div>
            <div class="ref-id">${params.referenceId}</div>
          </div>

          <p style="font-size: 12px; color: #888888; line-height: 1.6; text-align: center;">
            Our leadership team reviews incoming specifications within 24 hours. If urgent, connect directly via our executive channels.
          </p>
        </div>
      </body>
    </html>
  `;

  if (!resend) return { success: true, simulated: true };

  try {
    const data = await resend.emails.send({
      from: contactFromEmail,
      to: params.email,
      subject: `CodeXa Application Confirmation [${params.referenceId}]`,
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export const sendOwnerInquiryNotification = sendInquiryEmailToOwner;
export const sendClientConfirmation = sendInquiryReceiptToClient;
