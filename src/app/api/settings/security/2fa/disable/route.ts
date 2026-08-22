import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { sendTwoFactorDisabledEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { password, totpCode, backupCode } = await req.json();

    if (!password || (!totpCode && !backupCode)) {
      return NextResponse.json({ error: "Current password and authenticator code or backup code are required." }, { status: 400 });
    }

    const profile = await dataStore.getProfileById(user.id);
    if (!profile || !profile.passwordHash) {
      return NextResponse.json({ error: "User profile error." }, { status: 400 });
    }

    // 1. Verify password
    const isPasswordValid = await bcrypt.compare(password, profile.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    // 2. Verify second factor
    let isSecondFactorValid = false;
    if (totpCode) {
      isSecondFactorValid = await dataStore.verifyTwoFactorTotp(user.id, totpCode);
    }
    if (!isSecondFactorValid && backupCode) {
      const backupResult = await dataStore.verifyAndConsumeBackupCode(user.id, backupCode);
      isSecondFactorValid = backupResult.valid;
    }

    if (!isSecondFactorValid) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    // 3. Disable 2FA
    await dataStore.disableTwoFactor(user.id);

    await dataStore.logAudit({
      action: "2FA_DISABLED",
      actorId: user.id,
      details: "Two-Factor Authentication was disabled.",
    });

    // 4. Dispatch email notification
    if (profile.email) {
      sendTwoFactorDisabledEmail({
        email: profile.email,
        name: profile.displayName,
      }).catch((e) => console.error("[2FA Disabled Email Error]", e));
    }

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication has been disabled.",
    });

  } catch (error: any) {
    console.error("2FA Disable Error:", error);
    return NextResponse.json({ error: "Failed to disable 2FA." }, { status: 500 });
  }
}
