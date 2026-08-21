import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dataStore } from "@/lib/data-store";
import { sendLoginOtpEmail } from "@/lib/email";

// Helper to mask email e.g. "a******@codexa.agency"
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your username/email and password." },
        { status: 400 }
      );
    }

    const profile = await dataStore.getProfileByEmailOrUsername(identifier);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials. Access denied." },
        { status: 401 }
      );
    }

    if (!profile.isActive) {
      return NextResponse.json(
        { success: false, error: "This account has been deactivated by the Owner." },
        { status: 403 }
      );
    }

    // Password verification using real bcrypt hash comparison
    let isValidPassword = false;
    if (profile.passwordHash) {
      isValidPassword = await bcrypt.compare(password, profile.passwordHash).catch(() => false);
    }
    // Check environment initial/seed passwords
    if (!isValidPassword && profile.role === "OWNER" && process.env.OWNER_PASSWORD && password === process.env.OWNER_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && profile.role === "ADMIN" && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && profile.role === "TEAM_MEMBER" && process.env.TEAM_PASSWORD && password === process.env.TEAM_PASSWORD) {
      isValidPassword = true;
    }
    // Local development fallback
    if (!isValidPassword && process.env.NODE_ENV !== "production" && password === "CxA!R5oTugApqKkvvNa5QDBk2UrA") {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      await dataStore.logAudit("LOGIN_FAILED", profile.id, `Failed password attempt for @${profile.username}`);
      return NextResponse.json(
        { success: false, error: "Invalid credentials. Access denied." },
        { status: 401 }
      );
    }

    // STAGE 1 PASSED -> GENERATE STAGE 2 OTP
    const otp = await dataStore.createOtp(profile.email, profile.id, "LOGIN");

    // Send OTP via Resend
    await sendLoginOtpEmail({
      email: profile.email,
      name: profile.displayName,
      otp,
      ipAddress: "127.0.0.1",
    });

    await dataStore.logAudit("LOGIN_OTP_DISPATCHED", profile.id, `Login OTP sent to ${profile.email}`);

    // Return Stage 2 OTP requirement (NO session cookie issued yet!)
    return NextResponse.json({
      success: true,
      requireOtp: true,
      email: profile.email,
      maskedEmail: maskEmail(profile.email),
      message: "Credentials verified. Please enter the 6-digit verification code sent to your email.",
    });

  } catch (error: any) {
    console.error("Login Stage 1 error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}
