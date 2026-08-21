import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { sendLoginOtpEmail, sendPasswordResetOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, purpose = "LOGIN" } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const profile = await dataStore.getProfileByEmailOrUsername(email);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Account not found." },
        { status: 404 }
      );
    }

    const newOtp = await dataStore.createOtp(profile.email, profile.id, purpose);

    if (purpose === "LOGIN") {
      await sendLoginOtpEmail({
        email: profile.email,
        name: profile.displayName,
        otp: newOtp,
        ipAddress: "127.0.0.1",
      });
    } else {
      await sendPasswordResetOtpEmail({
        email: profile.email,
        name: profile.displayName,
        otp: newOtp,
        ipAddress: "127.0.0.1",
      });
    }

    await dataStore.logAudit("OTP_RESENT", profile.id, `New OTP dispatched to ${profile.email}`);

    return NextResponse.json({
      success: true,
      message: "A fresh 6-digit verification code has been dispatched to your email.",
    });

  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resend verification code." },
      { status: 500 }
    );
  }
}
