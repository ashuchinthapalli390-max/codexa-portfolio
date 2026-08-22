import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dataStore } from "@/lib/data-store";
import { sendPasswordChangedEmail } from "@/lib/email";
import { revokeAllUserSessions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const {
      resetToken,
      challengeId,
      totpCode,
      backupCode,
      newPassword,
    } = await req.json();

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    let userId: string | undefined;

    // 1. Direct authorization token (2FA was OFF)
    if (resetToken) {
      const challengeResult = await dataStore.verifyPreAuthChallenge(resetToken, "PASSWORD_RESET_AUTHORIZED");
      if (!challengeResult.valid || !challengeResult.userId) {
        return NextResponse.json(
          { success: false, error: challengeResult.error || "Invalid or expired recovery authorization." },
          { status: 401 }
        );
      }
      userId = challengeResult.userId;
      await dataStore.consumePreAuthChallenge(resetToken);
    } 
    // 2. 2FA verification stage (2FA was ON)
    else if (challengeId) {
      const challengeResult = await dataStore.verifyPreAuthChallenge(challengeId, "PASSWORD_RESET_2FA");
      if (!challengeResult.valid || !challengeResult.userId) {
        return NextResponse.json(
          { success: false, error: challengeResult.error || "Invalid or expired recovery challenge." },
          { status: 401 }
        );
      }

      const targetUserId = challengeResult.userId;
      let isSecondFactorValid = false;

      if (totpCode) {
        isSecondFactorValid = await dataStore.verifyTwoFactorTotp(targetUserId, totpCode);
      }
      if (!isSecondFactorValid && backupCode) {
        const backupResult = await dataStore.verifyAndConsumeBackupCode(targetUserId, backupCode);
        isSecondFactorValid = backupResult.valid;
      }

      if (!isSecondFactorValid) {
        return NextResponse.json(
          { success: false, error: "Invalid authenticator code or backup code." },
          { status: 401 }
        );
      }

      userId = targetUserId;
      await dataStore.consumePreAuthChallenge(challengeId);
    } else {
      return NextResponse.json(
        { success: false, error: "Authorization credentials missing." },
        { status: 400 }
      );
    }

    const profile = await dataStore.getProfileById(userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Account not found." },
        { status: 404 }
      );
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password hash and mark mustChangePassword = false
    await dataStore.updateProfile(profile.id, {
      passwordHash,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    });

    // Invalidate all existing sessions on all devices for this user
    await revokeAllUserSessions(profile.id);

    await dataStore.logAudit({
      action: "PASSWORD_RESET_COMPLETED",
      actorId: profile.id,
      details: `Password reset successfully for @${profile.username}. All existing sessions revoked.`,
    });

    // Dispatch security alert email to user
    if (profile.email) {
      sendPasswordChangedEmail({
        email: profile.email,
        name: profile.displayName,
      }).catch((e) => console.error("[Password Reset Completed Email Error]", e));
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You may now log in with your new credentials.",
    });

  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
