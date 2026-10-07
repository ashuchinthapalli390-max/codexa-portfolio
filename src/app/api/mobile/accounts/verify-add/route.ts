import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { generateSessionToken, hashToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { challengeToken, otp, deviceId, deviceName, platform } = body;

    if (!challengeToken || !otp) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "Challenge token and verification code are required." } },
        { status: 400 }
      );
    }

    const cleanOtp = String(otp).trim();
    if (cleanOtp.length !== 6) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_OTP_FORMAT", message: "Verification code must be 6 digits." } },
        { status: 400 }
      );
    }

    // 1. Verify Challenge Token
    const challengeTokenHash = crypto.createHash("sha256").update(challengeToken).digest("hex");
    const challenge = await db.preAuthChallenge.findUnique({
      where: { tokenHash: challengeTokenHash },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: { code: "CHALLENGE_EXPIRED", message: "Verification session has expired. Please request a new code." } },
        { status: 400 }
      );
    }

    // 2. Find AuthOtp
    const activeOtp = await db.authOtp.findFirst({
      where: {
        userId: challenge.userId,
        purpose: "ADD_MOBILE_ACCOUNT",
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeOtp || activeOtp.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: { code: "OTP_EXPIRED", message: "Verification code has expired." } },
        { status: 400 }
      );
    }

    if (activeOtp.attempts >= 5) {
      return NextResponse.json(
        { ok: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Too many incorrect attempts. Please request a new code." } },
        { status: 429 }
      );
    }

    // Check OTP hash
    const inputOtpHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    if (inputOtpHash !== activeOtp.otpHash) {
      await db.authOtp.update({
        where: { id: activeOtp.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = 4 - activeOtp.attempts;
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INCORRECT_OTP",
            message: remaining > 0 ? `Incorrect verification code. ${remaining} attempts remaining.` : "Incorrect verification code. Attempts exceeded.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Mark OTP used & consume challenge
    await db.authOtp.update({
      where: { id: activeOtp.id },
      data: { isUsed: true },
    });

    await db.preAuthChallenge.deleteMany({
      where: { tokenHash: challengeTokenHash },
    });

    // 4. Retrieve User
    const user = await db.user.findUnique({
      where: { id: challenge.userId },
      include: {
        profile: true,
        employmentProfile: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "ACCOUNT_INACTIVE", message: "User account is unavailable or inactive." } },
        { status: 403 }
      );
    }

    // 5. Issue persistent 30-day mobile session
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await db.session.create({
      data: {
        userId: user.id,
        sessionTokenHash: tokenHash,
        expiresAt,
        userAgent: req.headers.get("user-agent") || `CodeXa Mobile Added Account (${platform || "Android"})`,
        lastSeenAt: new Date(),
      },
    });

    if (deviceId) {
      try {
        await db.mobileSession.upsert({
          where: { id: `${user.id}_${deviceId}` },
          update: {
            lastActive: new Date(),
            appVersion: req.headers.get("x-app-version") || "1.0.0",
          },
          create: {
            id: `${user.id}_${deviceId}`,
            userId: user.id,
            deviceId,
            deviceName: deviceName || "Mobile Device",
            platform: platform || "ANDROID",
            appVersion: req.headers.get("x-app-version") || "1.0.0",
          },
        });
      } catch {}
    }

    await dataStore.logAudit({
      action: "ADD_ACCOUNT_VERIFIED",
      targetId: user.id,
      details: `Founder OTP successfully verified for @${user.username} on device ${deviceName || "Android"}`,
    }).catch(() => {});

    const effectiveRole = getEffectiveRole(user);

    return NextResponse.json({
      ok: true,
      accessToken: rawToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.profile?.displayName || user.username,
        role: effectiveRole,
        orgRole: user.orgRole,
        department: user.department || user.employmentProfile?.department,
        profileMediaUrl: user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/accounts/verify-add]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to verify account addition." } },
      { status: 500 }
    );
  }
}
