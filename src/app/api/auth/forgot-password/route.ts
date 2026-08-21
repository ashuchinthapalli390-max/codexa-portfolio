import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { sendPasswordResetOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Please provide your registered email address." },
        { status: 400 }
      );
    }

    const profile = await dataStore.getProfileByEmailOrUsername(email);

    if (!profile) {
      // Don't leak whether email exists
      return NextResponse.json({
        success: true,
        message: "If that email is registered in our system, a recovery code has been dispatched.",
      });
    }

    const otp = await dataStore.createOtp(profile.email, profile.id, "PASSWORD_RESET");

    await sendPasswordResetOtpEmail({
      email: profile.email,
      name: profile.displayName,
      otp,
      ipAddress: "127.0.0.1",
    });

    await dataStore.logAudit("PASSWORD_RESET_REQUESTED", profile.id, `Password recovery OTP dispatched to ${profile.email}`);

    return NextResponse.json({
      success: true,
      message: "A 6-digit password recovery code has been dispatched to your email address.",
      email: profile.email,
    });

  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
