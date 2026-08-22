import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, otp, purpose = "PASSWORD_RESET" } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    // Verify OTP against secure DB store
    const result = await dataStore.verifyOtp(email, otp, purpose);

    if (!result.valid || !result.profile) {
      await dataStore.logAudit({
        action: "OTP_VERIFY_FAILED",
        details: `Failed OTP attempt for ${email}`,
      });
      return NextResponse.json(
        { success: false, error: result.error || "Invalid or expired verification code." },
        { status: 401 }
      );
    }

    const profile = result.profile;

    if (purpose === "LOGIN") {
      // Create authenticated DB session + cookie
      await createSession(profile.id);

      const sessionData = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        createdAt: Date.now(),
      };

      await dataStore.updateProfile(profile.id, { lastLoginAt: new Date().toISOString() });
      await dataStore.logAudit({
        action: "LOGIN_SUCCESS",
        actorId: profile.id,
        details: `User @${profile.username} authenticated successfully with OTP.`,
      });

      const redirectUrl = profile.role === "OWNER" ? "/owner" : profile.role === "ADMIN" ? "/admin" : "/dashboard";

      return NextResponse.json({
        success: true,
        message: "Identity verified. Access authorized.",
        user: sessionData,
        redirectUrl,
      });
    }

    // Password reset purpose -> Check if user has 2FA enabled
    const twoFactorConfig = await dataStore.getUserTwoFactorConfig(profile.id);

    if (twoFactorConfig.enabled) {
      // 2FA is active -> Issue a challenge for 2nd factor verification
      const challengeId = await dataStore.createPreAuthChallenge(profile.id, "PASSWORD_RESET_2FA");

      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        challengeId,
        message: "Email ownership verified. Authenticator App or Backup Code verification required.",
      });
    }

    // 2FA is OFF -> Issue authorization reset token directly
    const resetToken = await dataStore.createPreAuthChallenge(profile.id, "PASSWORD_RESET_AUTHORIZED");

    return NextResponse.json({
      success: true,
      requiresTwoFactor: false,
      resetToken,
      message: "Verification code verified successfully. You may now set a new password.",
    });

  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during OTP verification." },
      { status: 500 }
    );
  }
}
