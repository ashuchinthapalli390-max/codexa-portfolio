import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { verifyTotpToken, generateBackupCodes } from "@/lib/totp";
import { sendTwoFactorEnabledEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { secret, totpCode } = await req.json();

    if (!secret || !totpCode) {
      return NextResponse.json({ error: "Secret and 6-digit authenticator code are required." }, { status: 400 });
    }

    // 1. Verify that user can generate valid TOTP with their app
    const isValid = verifyTotpToken(totpCode, secret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid authenticator code. Check your app clock and try again." }, { status: 400 });
    }

    // 2. Generate 10 single-use backup codes
    const { plaintextCodes, hashedCodes } = generateBackupCodes(10);

    // 3. Save to database
    await dataStore.enableTwoFactor(user.id, secret, hashedCodes);

    await dataStore.logAudit({
      action: "2FA_ENABLED",
      actorId: user.id,
      details: `Two-Factor Authentication enabled with 10 backup codes.`,
    });

    // 4. Dispatch email notification to user's registered email
    if (user.email) {
      sendTwoFactorEnabledEmail({
        email: user.email,
        name: user.displayName,
      }).catch((e) => console.error("[2FA Enabled Email Error]", e));
    }

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication successfully enabled.",
      backupCodes: plaintextCodes,
    });

  } catch (error: any) {
    console.error("2FA Enable Error:", error);
    return NextResponse.json({ error: "Failed to enable 2FA." }, { status: 500 });
  }
}
