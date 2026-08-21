import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dataStore } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const { email, otp, purpose = "LOGIN" } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    // Verify OTP against secure store
    const result = await dataStore.verifyOtp(email, otp, purpose);

    if (!result.valid || !result.profile) {
      await dataStore.logAudit("LOGIN_OTP_FAILED", undefined, `Failed OTP attempt for ${email}`);
      return NextResponse.json(
        { success: false, error: result.error || "Invalid or expired verification code." },
        { status: 401 }
      );
    }

    const profile = result.profile;

    if (purpose === "LOGIN") {
      // Create authenticated session
      const sessionData = {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        createdAt: Date.now(),
      };

      const cookieStore = cookies();
      cookieStore.set("cxa_session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Update last login timestamp
      await dataStore.updateProfile(profile.id, { lastLoginAt: new Date().toISOString() });
      await dataStore.logAudit("LOGIN_SUCCESS", profile.id, `User @${profile.username} authenticated successfully.`);

      const redirectUrl = profile.role === "OWNER" ? "/owner" : profile.role === "ADMIN" ? "/admin" : "/dashboard";

      return NextResponse.json({
        success: true,
        message: "Identity verified. Access authorized.",
        user: sessionData,
        redirectUrl,
      });
    }

    // Password reset purpose
    return NextResponse.json({
      success: true,
      message: "Verification code verified successfully. You may now set a new password.",
      profileId: profile.id,
    });

  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during OTP verification." },
      { status: 500 }
    );
  }
}
