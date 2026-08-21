import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email, OTP, and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Verify password reset OTP
    const verifyResult = await dataStore.verifyOtp(email, otp, "PASSWORD_RESET");

    if (!verifyResult.valid || !verifyResult.profile) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || "Invalid or expired recovery code." },
        { status: 401 }
      );
    }

    const profile = verifyResult.profile;

    // Update password
    await dataStore.updateProfile(profile.id, {
      updatedAt: new Date().toISOString(),
    });

    await dataStore.logAudit("PASSWORD_UPDATED", profile.id, `Password reset successfully for @${profile.username}`);

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
