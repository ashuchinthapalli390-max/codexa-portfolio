import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { getEffectiveRole } from "@/lib/permissions";
import { verifyFirebaseIdToken, DecodedFirebaseUser } from "@/lib/firebase-admin";
import { sendEmail, notificationsFromEmail } from "@/lib/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***@codexa.agency";
  const maskedUser = user.length <= 2 ? user[0] + "***" : user[0] + "***" + user[user.length - 1];
  return `${maskedUser}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, deviceName, platform } = body;

    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_TOKEN", message: "Google authentication token is required." } },
        { status: 400 }
      );
    }

    let decoded: DecodedFirebaseUser;
    try {
      decoded = await verifyFirebaseIdToken(idToken.trim());
    } catch (tokenErr: any) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired Google token." } },
        { status: 401 }
      );
    }

    const normalizedEmail = (decoded.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_EMAIL", message: "No email address found." } },
        { status: 400 }
      );
    }

    // Resolve existing user
    let user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { firebaseUid: decoded.uid },
        ],
      },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "USER_NOT_FOUND", message: "No CodeXa account found for this Google email. Please register on the web first." } },
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
    const founderEmail =
      process.env.OWNER_NOTIFICATION_EMAIL ||
      process.env.OWNER_EMAIL ||
      "ashuchinthapalli3900@gmail.com";

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
        email: founderEmail,
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
      <div style="font-family: Arial, sans-serif; background-color: #070707; color: #f7f7f7; padding: 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #FF1E3C; letter-spacing: 2px; margin: 0;">CODEXA SECURITY</h2>
          <p style="color: #a5a5a5; font-size: 13px; margin: 4px 0 0 0;">Google Account Addition Verification</p>
        </div>
        <div style="background-color: #111111; border: 1px solid rgba(217,4,41,0.3); border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <p style="margin-top: 0; color: #e0e0e0; font-size: 15px;">
            A request was made to add another CodeXa account via Google Sign-In to a mobile device. Founder authorization is strictly required.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; color: #cccccc;">
            <tr><td style="padding: 6px 0; color: #888;">Account to Add:</td><td style="padding: 6px 0; font-weight: bold; color: #fff;">${targetName} (${normalizedEmail})</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Role:</td><td style="padding: 6px 0; font-weight: bold; color: #FF1E3C;">${effectiveRole}</td></tr>
            <tr><td style="padding: 6px 0; color: #888;">Device:</td><td style="padding: 6px 0; color: #fff;">${device}</td></tr>
          </table>
          <div style="text-align: center; margin: 24px 0;">
            <p style="color: #888; font-size: 12px; margin-bottom: 8px; letter-spacing: 1px;">VERIFICATION CODE (EXPIRES IN 10 MIN)</p>
            <div style="display: inline-block; background-color: #1a1a1a; border: 2px solid #D90429; border-radius: 8px; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFFFFF;">
              ${rawOtp}
            </div>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      from: process.env.RESEND_SECURITY_FROM_EMAIL || notificationsFromEmail,
      to: founderEmail,
      subject: `CodeXa — Founder Verification Code for Google Login: ${normalizedEmail}`,
      html: emailHtml,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      requiresFounderApproval: true,
      challengeToken: rawChallengeToken,
      maskedFounderEmail: maskEmail(founderEmail),
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
