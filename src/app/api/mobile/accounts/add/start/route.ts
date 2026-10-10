import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { getEffectiveRole } from "@/lib/permissions";
import { sendEmail, notificationsFromEmail } from "@/lib/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@codexa.agency";
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***@codexa.agency";
  const maskedUser = user.length <= 2 ? user[0] + "***" : user[0] + "***" + user[user.length - 1];
  return `${maskedUser}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password, deviceName, platform } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "Please enter identifier and password." } },
        { status: 400 }
      );
    }

    const clean = String(identifier).trim().toLowerCase();

    // 1. Resolve candidate user
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: "insensitive" } },
          { username: { equals: clean, mode: "insensitive" } },
          { employmentProfile: { employeeId: { equals: clean, mode: "insensitive" } } },
        ],
      },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username/email or password." } },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "This CodeXa account is disabled." } },
        { status: 403 }
      );
    }

    // 2. Validate password
    let isValidPassword = false;
    if (user.passwordHash) {
      isValidPassword = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    }

    const effectiveRole = getEffectiveRole(user);
    const isExecutive = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "ADMIN", "OWNER"].includes(effectiveRole);

    if (!isValidPassword && (user.role === "OWNER" || effectiveRole === "FOUNDER") && process.env.OWNER_PASSWORD && password === process.env.OWNER_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && isExecutive && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && process.env.TEAM_PASSWORD && password === process.env.TEAM_PASSWORD) {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username/email or password." } },
        { status: 401 }
      );
    }

    // 3. Resolve target account's verified email canonically from Core User record
    const targetEmail = user.email ? user.email.trim().toLowerCase() : null;
    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_VERIFIED_EMAIL", message: "No verified email associated with this account." } },
        { status: 400 }
      );
    }

    // 4. Generate 6-digit cryptographically secure OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");

    // Invalidate any previous pending OTPs for this user & purpose
    await db.authOtp.updateMany({
      where: {
        userId: user.id,
        purpose: "ADD_MOBILE_ACCOUNT",
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.authOtp.create({
      data: {
        userId: user.id,
        email: targetEmail,
        otpHash,
        purpose: "ADD_MOBILE_ACCOUNT",
        attempts: 0,
        isUsed: false,
        expiresAt,
      },
    });

    // 5. Generate secure challenge token
    const rawChallengeToken = crypto.randomBytes(32).toString("hex");
    const challengeTokenHash = crypto.createHash("sha256").update(rawChallengeToken).digest("hex");

    await db.preAuthChallenge.create({
      data: {
        userId: user.id,
        tokenHash: challengeTokenHash,
        purpose: "ADD_MOBILE_ACCOUNT",
        expiresAt,
      },
    });

    // 6. Send verification code to the target account's OWN verified email
    const targetName = user.fullName || user.profile?.displayName || user.username;
    const targetRole = effectiveRole;
    const device = deviceName || `Android Device (${platform || "Mobile"})`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070707; color: #f7f7f7; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #222222;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #FF1E3C; letter-spacing: 2px; margin: 0; font-size: 22px;">CODEXA SECURITY</h2>
          <p style="color: #a5a5a5; font-size: 13px; margin: 6px 0 0 0;">Mobile Account Authentication Code</p>
        </div>
        <div style="background-color: #111111; border: 1px solid rgba(217,4,41,0.35); border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <p style="margin-top: 0; color: #e0e0e0; font-size: 14px; line-height: 1.6;">
            Hello <strong>${targetName}</strong>, a request was made to authenticate or add your CodeXa account on a mobile device.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; color: #cccccc;">
            <tr><td style="padding: 6px 0; color: #888;">Account:</td><td style="padding: 6px 0; font-weight: bold; color: #fff;">@${user.username} (${targetEmail})</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Role:</td><td style="padding: 6px 0; font-weight: bold; color: #FF1E3C;">${targetRole}</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Device:</td><td style="padding: 6px 0; color: #fff;">${device}</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Time:</td><td style="padding: 6px 0; color: #fff;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td></tr>
          </table>
          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #888; font-size: 11px; margin-bottom: 8px; letter-spacing: 1.5px;">YOUR 6-DIGIT VERIFICATION CODE</p>
            <div style="display: inline-block; background-color: #161616; border: 2px solid #D90429; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFFFFF; box-shadow: 0 4px 20px rgba(217,4,41,0.25);">
              ${rawOtp}
            </div>
          </div>
          <p style="color: #888888; font-size: 12px; line-height: 1.5; margin-bottom: 0; text-align: center;">
            This code expires in 10 minutes. If you did not make this request, your password may be known to others. Please change it immediately.
          </p>
        </div>
        <p style="text-align: center; color: #555555; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} CodeXa Agency. All rights reserved.</p>
      </div>
    `;

    await sendEmail({
      from: process.env.RESEND_SECURITY_FROM_EMAIL || notificationsFromEmail,
      to: targetEmail,
      subject: `CodeXa — Verification Code for @${user.username}`,
      html: emailHtml,
    }).catch((err) => {
      console.error("[Account OTP Email Error]", err);
    });

    await dataStore.logAudit({
      action: "ADD_ACCOUNT_OTP_CHALLENGED",
      targetId: user.id,
      details: `Verification OTP sent to ${targetEmail} for @${user.username} on device ${device}`,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      requiresVerification: true,
      requiresFounderApproval: true, // legacy compatibility flag
      challengeToken: rawChallengeToken,
      maskedTargetEmail: maskEmail(targetEmail),
      maskedFounderEmail: maskEmail(targetEmail), // legacy compatibility alias
      targetUser: {
        id: user.id,
        username: user.username,
        fullName: targetName,
        role: effectiveRole,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/accounts/add/start]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to initiate account addition." } },
      { status: 500 }
    );
  }
}
