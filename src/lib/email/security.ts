import { sendEmail, securityFromEmail, SendEmailResult } from "./client";
import { renderEmailLayout } from "./templates";

/**
 * 1. Password Reset 6-Digit Email OTP
 */
export async function sendPasswordResetOtpEmail({
  email,
  name,
  otp,
  ipAddress,
}: {
  email: string;
  name: string;
  otp: string;
  ipAddress?: string;
}): Promise<SendEmailResult> {
  const contentHtml = `
    <div style="background: #050505; border: 2px dashed #D90429; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; letter-spacing: 0.35em; font-size: 36px; font-weight: 900; font-family: monospace; color: #EF233C; text-shadow: 0 0 15px rgba(217, 4, 41, 0.6);">
      ${otp}
    </div>
    <p style="text-align: center; font-size: 12px; color: #888888; margin: 12px 0;">
      ⏱️ Single-use verification code expires in <strong>5 minutes</strong>.
    </p>
  `;

  const html = renderEmailLayout({
    badge: "PASSWORD RECOVERY",
    title: "Reset Your Password",
    subtitle: `Hello <strong>${name}</strong>, use the 6-digit recovery code below to verify your identity and configure a new password.`,
    contentHtml,
    warningText: `If you did not request a password recovery for your CodeXa account (${email}) from IP ${ipAddress || "Unknown"}, ignore this email or contact CodeXa security immediately.`,
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: `[${otp}] CodeXa Password Recovery Code`,
    html,
  });
}

/**
 * Legacy Login OTP Email compatibility alias
 */
export async function sendLoginOtpEmail(params: {
  email: string;
  name: string;
  otp: string;
  ipAddress?: string;
}): Promise<SendEmailResult> {
  return sendPasswordResetOtpEmail(params);
}

/**
 * 2. Password Changed Notification
 */
export async function sendPasswordChangedEmail({
  email,
  name,
  ipAddress,
}: {
  email: string;
  name: string;
  ipAddress?: string;
}): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center;">
      <p style="font-size: 14px; color: #FFFFFF; margin: 0 0 8px 0; font-weight: 600;">
        Security Status: Password Updated Successfully
      </p>
      <p style="font-size: 12px; color: #888888; margin: 0;">
        Timestamp: ${new Date().toUTCString()}<br>
        Source IP: ${ipAddress || "Verified Session"}
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "SECURITY ALERT",
    title: "Password Changed",
    subtitle: `Hello <strong>${name}</strong>, your CodeXa account password was successfully updated.`,
    contentHtml,
    warningText: "If you did NOT make this change, your credentials may have been compromised. Contact CodeXa security or Owner immediately.",
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: "Security Alert: Your CodeXa password was changed",
    html,
  });
}

/**
 * 3. Two-Factor Authentication Enabled
 */
export async function sendTwoFactorEnabledEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center;">
      <p style="font-size: 14px; color: #10B981; margin: 0 0 8px 0; font-weight: 700;">
        ✓ Authenticator App 2FA Active
      </p>
      <p style="font-size: 12px; color: #AAAAAA; line-height: 1.6; margin: 0;">
        Your CodeXa account is now protected with Two-Factor Authentication. Subsequent logins and recovery requests will require an authenticator code or single-use backup code.
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "TWO-FACTOR AUTHENTICATION",
    title: "2FA Protection Enabled",
    subtitle: `Hello <strong>${name}</strong>, Two-Factor Authentication has been successfully linked to your account.`,
    contentHtml,
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: "Two-Factor Authentication Enabled on your CodeXa Account",
    html,
  });
}

/**
 * 4. Two-Factor Authentication Disabled
 */
export async function sendTwoFactorDisabledEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center; border-color: rgba(217, 4, 41, 0.4);">
      <p style="font-size: 14px; color: #EF233C; margin: 0 0 8px 0; font-weight: 700;">
        ⚠️ 2FA Has Been Deactivated
      </p>
      <p style="font-size: 12px; color: #AAAAAA; line-height: 1.6; margin: 0;">
        Your account now uses standard single-factor password authentication. We recommend re-enabling 2FA in Security Settings to maintain optimal protection.
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "SECURITY ALERT",
    title: "2FA Deactivated",
    subtitle: `Hello <strong>${name}</strong>, Two-Factor Authentication was disabled on your account.`,
    contentHtml,
    warningText: "If you did not perform this action, please reset your password and re-enable 2FA immediately.",
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: "Security Alert: 2FA was disabled on your CodeXa account",
    html,
  });
}

/**
 * 5. Single-Use Backup Code Redeemed
 */
export async function sendBackupCodeUsedEmail({
  email,
  name,
  remainingCodes,
  ipAddress,
}: {
  email: string;
  name: string;
  remainingCodes: number;
  ipAddress?: string;
}): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center;">
      <p style="font-size: 14px; color: #F59E0B; margin: 0 0 8px 0; font-weight: 700;">
        Backup Code Redeemed
      </p>
      <p style="font-size: 13px; color: #FFFFFF; margin: 0 0 8px 0;">
        <strong>${remainingCodes}</strong> of 10 backup codes remaining.
      </p>
      <p style="font-size: 12px; color: #888888; margin: 0;">
        Access source: IP ${ipAddress || "Unknown"}<br>
        Timestamp: ${new Date().toUTCString()}
      </p>
    </div>
    ${
      remainingCodes <= 2
        ? `<p style="text-align: center; font-size: 12px; color: #EF233C; font-weight: bold;">
            ⚠️ Low backup codes! Visit Security Settings to regenerate a fresh set of 10 codes.
          </p>`
        : ""
    }
  `;

  const html = renderEmailLayout({
    badge: "BACKUP CODE USED",
    title: "Recovery Code Used",
    subtitle: `Hello <strong>${name}</strong>, a single-use backup code was used to access your CodeXa account.`,
    contentHtml,
    warningText: "If you did not use a backup code to log in, your account may be under unauthorized access. Change your password immediately.",
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: `Security Alert: Backup Code Used (${remainingCodes} Remaining)`,
    html,
  });
}

/**
 * 6. New Member Account Created / Setup Link
 */
export async function sendAccountCreatedEmail({
  email,
  name,
  username,
  loginUrl,
}: {
  email: string;
  name: string;
  username: string;
  loginUrl?: string;
}): Promise<SendEmailResult> {
  const targetLoginUrl = loginUrl || "https://codxa-agency.online/login";
  const contentHtml = `
    <div class="card-box">
      <table style="width: 100%; font-size: 13px; color: #FFFFFF;">
        <tr>
          <td style="color: #888888; padding: 6px 0;">Username:</td>
          <td style="font-family: monospace; font-weight: bold; color: #EF233C;">@${username}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 6px 0;">Email:</td>
          <td>${email}</td>
        </tr>
        <tr>
          <td style="color: #888888; padding: 6px 0;">Access Portal:</td>
          <td>Team Core Gateway</td>
        </tr>
      </table>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${targetLoginUrl}" class="btn" style="display: inline-block;">Access Your Account</a>
      </div>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "WELCOME TO CODEXA",
    title: "Team Core Access Created",
    subtitle: `Hello <strong>${name}</strong>, your developer profile and Team Core account have been provisioned by CodeXa Leadership.`,
    contentHtml,
    warningText: "For security, change your initial password upon first login and consider enabling Two-Factor Authentication in Security Settings.",
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: "Welcome to CodeXa — Your Team Core Account is Ready",
    html,
  });
}

/**
 * 7. Account Status Changed (Deactivation / Reactivation)
 */
export async function sendAccountStatusChangedEmail({
  email,
  name,
  isActive,
}: {
  email: string;
  name: string;
  isActive: boolean;
}): Promise<SendEmailResult> {
  const contentHtml = `
    <div class="card-box" style="text-align: center;">
      <p style="font-size: 14px; font-weight: 700; color: ${isActive ? "#10B981" : "#EF233C"}; margin: 0 0 8px 0;">
        Account Status: ${isActive ? "ACTIVE" : "DEACTIVATED"}
      </p>
      <p style="font-size: 12px; color: #AAAAAA; line-height: 1.5; margin: 0;">
        ${
          isActive
            ? "Your CodeXa Team Core access has been reactivated. You may now log in to access your projects and dashboard."
            : "Your CodeXa account has been deactivated by leadership. Access to the dashboard and internal platforms is currently suspended."
        }
      </p>
    </div>
  `;

  const html = renderEmailLayout({
    badge: "ACCOUNT STATUS",
    title: isActive ? "Account Reactivated" : "Account Deactivated",
    subtitle: `Hello <strong>${name}</strong>, your account status on CodeXa was updated.`,
    contentHtml,
    warningText: "If you have questions regarding your account status, contact CodeXa leadership.",
  });

  return sendEmail({
    from: securityFromEmail,
    to: email,
    subject: `CodeXa Account Status: ${isActive ? "Reactivated" : "Deactivated"}`,
    html,
  });
}
