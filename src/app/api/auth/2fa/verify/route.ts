import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { createSession } from "@/lib/auth";
import { sendBackupCodeUsedEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { challengeId, totpCode, backupCode } = await req.json();

    if (!challengeId || (!totpCode && !backupCode)) {
      return NextResponse.json(
        { success: false, error: "Challenge ID and 6-digit authenticator code or backup code are required." },
        { status: 400 }
      );
    }

    // 1. Verify Pre-Auth Challenge
    const challengeResult = await dataStore.verifyPreAuthChallenge(challengeId, "LOGIN_2FA");
    if (!challengeResult.valid || !challengeResult.userId) {
      return NextResponse.json(
        { success: false, error: challengeResult.error || "Invalid or expired session challenge. Please log in again." },
        { status: 401 }
      );
    }

    const userId = challengeResult.userId;
    const profile = await dataStore.getProfileById(userId);
    if (!profile || !profile.isActive) {
      return NextResponse.json(
        { success: false, error: "Account not found or deactivated." },
        { status: 403 }
      );
    }

    let isVerified = false;
    let isBackupCodeRedeemed = false;
    let remainingBackupCodes = 0;

    // 2. Verify with TOTP Code
    if (totpCode) {
      isVerified = await dataStore.verifyTwoFactorTotp(userId, totpCode);
      if (!isVerified) {
        await dataStore.logAudit({
          action: "2FA_LOGIN_FAILED",
          actorId: userId,
          details: `Invalid 6-digit authenticator code attempt for @${profile.username}`,
        });
        return NextResponse.json(
          { success: false, error: "Invalid authenticator code. Check your app and try again." },
          { status: 401 }
        );
      }
    }

    // 3. Verify with Backup Code
    if (!isVerified && backupCode) {
      const backupResult = await dataStore.verifyAndConsumeBackupCode(userId, backupCode);
      if (!backupResult.valid) {
        await dataStore.logAudit({
          action: "2FA_BACKUP_CODE_FAILED",
          actorId: userId,
          details: `Invalid backup code attempt for @${profile.username}`,
        });
        return NextResponse.json(
          { success: false, error: "Invalid or already used backup code." },
          { status: 401 }
        );
      }

      isVerified = true;
      isBackupCodeRedeemed = true;
      remainingBackupCodes = backupResult.remainingCount;

      // Dispatch security email alerting user of backup code redemption
      sendBackupCodeUsedEmail({
        email: profile.email,
        name: profile.displayName,
        remainingCodes: remainingBackupCodes,
        ipAddress: "127.0.0.1",
      }).catch((e) => console.error("[2FA Backup Code Email Error]", e));
    }

    if (!isVerified) {
      return NextResponse.json(
        { success: false, error: "Authentication failed. Please check your verification code." },
        { status: 401 }
      );
    }

    // Consume challenge
    await dataStore.consumePreAuthChallenge(challengeId);

    // Create session
    await createSession(profile.id, true);

    await dataStore.updateProfile(profile.id, {
      lastLoginAt: new Date().toISOString(),
    });

    await dataStore.logAudit({
      action: isBackupCodeRedeemed ? "LOGIN_SUCCESS_2FA_BACKUP_CODE" : "LOGIN_SUCCESS_2FA_TOTP",
      actorId: profile.id,
      details: isBackupCodeRedeemed
        ? `User @${profile.username} authenticated with backup code (${remainingBackupCodes} remaining).`
        : `User @${profile.username} authenticated successfully with Authenticator TOTP.`,
    });

    const redirectUrl = profile.role === "OWNER" ? "/owner" : profile.role === "ADMIN" ? "/admin" : "/dashboard";

    return NextResponse.json({
      success: true,
      authenticated: true,
      redirectUrl,
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        createdAt: Date.now(),
      },
      message: isBackupCodeRedeemed ? "Recovery code accepted. Secure access restored." : "Identity verified. Access authorized.",
    });

  } catch (error: any) {
    console.error("2FA Verification Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during two-factor verification." },
      { status: 500 }
    );
  }
}
