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
    const { challengeToken } = body;

    if (!challengeToken) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_CHALLENGE", message: "Challenge token is required." } },
        { status: 400 }
      );
    }

    const challengeTokenHash = crypto.createHash("sha256").update(challengeToken).digest("hex");
    const challenge = await db.preAuthChallenge.findUnique({
      where: { tokenHash: challengeTokenHash },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: { code: "CHALLENGE_EXPIRED", message: "Session expired. Please start over." } },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: challenge.userId },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is inactive." } },
        { status: 403 }
      );
    }

    const targetEmail = user.email ? user.email.trim().toLowerCase() : null;
    if (!targetEmail) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_VERIFIED_EMAIL", message: "Account has no verified email." } },
        { status: 400 }
      );
    }

    // Invalidate old OTPs
    await db.authOtp.updateMany({
      where: {
        userId: user.id,
        purpose: "ADD_MOBILE_ACCOUNT",
        isUsed: false,
      },
      data: { isUsed: true },
    });

    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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

    // Update challenge expiry
    await db.preAuthChallenge.update({
      where: { tokenHash: challengeTokenHash },
      data: { expiresAt },
    });

    const targetName = user.fullName || user.profile?.displayName || user.username;
    const effectiveRole = getEffectiveRole(user);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070707; color: #f7f7f7; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #222222;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #FF1E3C; letter-spacing: 2px; margin: 0; font-size: 22px;">CODEXA SECURITY</h2>
          <p style="color: #a5a5a5; font-size: 13px; margin: 6px 0 0 0;">Resent Mobile Verification Code</p>
        </div>
        <div style="background-color: #111111; border: 1px solid rgba(217,4,41,0.35); border-radius: 10px; padding: 24px;">
          <p style="margin-top: 0; color: #e0e0e0; font-size: 14px; line-height: 1.6;">
            A new verification code was requested for <strong>@${user.username}</strong> on mobile.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #888; font-size: 11px; margin-bottom: 8px; letter-spacing: 1.5px;">NEW 6-DIGIT CODE (EXPIRES IN 10 MIN)</p>
            <div style="display: inline-block; background-color: #161616; border: 2px solid #D90429; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFFFFF; box-shadow: 0 4px 20px rgba(217,4,41,0.25);">
              ${rawOtp}
            </div>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      from: process.env.RESEND_SECURITY_FROM_EMAIL || notificationsFromEmail,
      to: targetEmail,
      subject: `CodeXa — New Verification Code for @${user.username}`,
      html: emailHtml,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `A new verification code has been dispatched to ${maskEmail(targetEmail)}.`,
      maskedTargetEmail: maskEmail(targetEmail),
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/accounts/resend-otp]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to resend code." } },
      { status: 500 }
    );
  }
}
