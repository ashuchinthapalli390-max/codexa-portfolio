import { NextRequest, NextResponse } from "next/server";
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
    const { email, googleId, deviceName, platform } = body;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_EMAIL", message: "Google account email is required." } },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Resolve user in Core DB
    const user = await db.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "USER_NOT_REGISTERED",
            message: "No CodeXa account is registered with this Google email.",
          },
        },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_DISABLED", message: "This CodeXa account is disabled." } },
        { status: 403 }
      );
    }

    const effectiveRole = getEffectiveRole(user);

    // 2. Generate 6-digit OTP sent to user's verified email
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");

    await db.authOtp.updateMany({
      where: {
        userId: user.id,
        purpose: "ADD_MOBILE_ACCOUNT",
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.authOtp.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        otpHash,
        purpose: "ADD_MOBILE_ACCOUNT",
        attempts: 0,
        isUsed: false,
        expiresAt,
      },
    });

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

    const targetName = user.fullName || user.profile?.displayName || user.username;
    const device = deviceName || `Android Device (${platform || "Mobile"})`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070707; color: #f7f7f7; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #222222;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #FF1E3C; letter-spacing: 2px; margin: 0; font-size: 22px;">CODEXA SECURITY</h2>
          <p style="color: #a5a5a5; font-size: 13px; margin: 6px 0 0 0;">Google Account Authentication Code</p>
        </div>
        <div style="background-color: #111111; border: 1px solid rgba(217,4,41,0.35); border-radius: 10px; padding: 24px; margin-bottom: 24px;">
          <p style="margin-top: 0; color: #e0e0e0; font-size: 14px; line-height: 1.6;">
            Hello <strong>${targetName}</strong>, a request was made to authenticate your CodeXa account via Google on a mobile device.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; color: #cccccc;">
            <tr><td style="padding: 6px 0; color: #888;">Account:</td><td style="padding: 6px 0; font-weight: bold; color: #fff;">${targetName} (${normalizedEmail})</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Role:</td><td style="padding: 6px 0; font-weight: bold; color: #FF1E3C;">${effectiveRole}</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Device:</td><td style="padding: 6px 0; color: #fff;">${device}</td></tr>
          </table>
          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #888; font-size: 11px; margin-bottom: 8px; letter-spacing: 1.5px;">YOUR 6-DIGIT VERIFICATION CODE</p>
            <div style="display: inline-block; background-color: #161616; border: 2px solid #D90429; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFFFFF; box-shadow: 0 4px 20px rgba(217,4,41,0.25);">
              ${rawOtp}
            </div>
          </div>
          <p style="color: #888888; font-size: 12px; line-height: 1.5; margin-bottom: 0; text-align: center;">
            This code expires in 10 minutes.
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      from: process.env.RESEND_SECURITY_FROM_EMAIL || notificationsFromEmail,
      to: normalizedEmail,
      subject: `CodeXa — Verification Code for Google Login: ${normalizedEmail}`,
      html: emailHtml,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      requiresVerification: true,
      requiresFounderApproval: true,
      challengeToken: rawChallengeToken,
      maskedTargetEmail: maskEmail(normalizedEmail),
      maskedFounderEmail: maskEmail(normalizedEmail),
      targetUser: {
        id: user.id,
        username: user.username,
        fullName: targetName,
        role: effectiveRole,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/accounts/add/google/start]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to initiate Google account addition." } },
      { status: 500 }
    );
  }
}
