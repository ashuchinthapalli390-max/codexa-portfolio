import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dataStore } from "@/lib/data-store";
import { createSession, generateRequestId } from "@/lib/auth";

// Helper to mask email e.g. "a******@codexa.agency"
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}@${domain}`;
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
        { success: false, error: "Invalid username/email or password." },
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

    // Check environment password matching if passwordHash hasn't been set yet
    if (!isValidPassword && profile.role === "OWNER" && process.env.OWNER_PASSWORD && password === process.env.OWNER_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && profile.role === "ADMIN" && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      isValidPassword = true;
    }
    if (!isValidPassword && profile.role === "TEAM_MEMBER" && process.env.TEAM_PASSWORD && password === process.env.TEAM_PASSWORD) {
      isValidPassword = true;
    }

    if (!isValidPassword) {
      await dataStore.logAudit({
        action: "LOGIN_FAILED",
        targetId: profile.id,
        details: `Failed password attempt for @${profile.username}`,
      });
      return NextResponse.json(
        { success: false, error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    // Check if user has Two-Factor Authentication enabled
    const twoFactorStatus = await dataStore.getUserTwoFactorConfig(profile.id);

    if (twoFactorStatus.enabled) {
      // 2FA IS ENABLED -> Issue a secure short-lived pre-auth challenge
      const challengeId = await dataStore.createPreAuthChallenge(profile.id, "LOGIN_2FA");

      await dataStore.logAudit({
        action: "LOGIN_2FA_CHALLENGE",
        actorId: profile.id,
        details: `Two-factor authentication challenge issued for @${profile.username}`,
      });

      return NextResponse.json({
        success: true,
        authenticated: false,
        requiresTwoFactor: true,
        challengeId,
        maskedEmail: maskEmail(profile.email),
        message: "Credentials verified. Two-Factor Authentication required.",
      });
    }

    // 2FA IS OFF -> INSTANT ACCESS (No email OTP required!)
    await createSession(profile.id);

    await dataStore.updateProfile(profile.id, {
      lastLoginAt: new Date().toISOString(),
    });

    await dataStore.logAudit({
      action: "LOGIN_SUCCESS",
      actorId: profile.id,
      details: `User @${profile.username} logged in successfully (Single-Factor).`,
    });

    const redirectUrl = profile.role === "OWNER" ? "/owner" : profile.role === "ADMIN" ? "/admin" : "/dashboard";

    return NextResponse.json({
      success: true,
      authenticated: true,
      requiresTwoFactor: false,
      mustChangePassword: profile.mustChangePassword ?? false,
      redirectUrl,
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        createdAt: Date.now(),
      },
      message: "Identity verified. Access authorized.",
    });

  } catch (error: any) {
    const requestId = generateRequestId();
    console.error(`[POST /api/login Error] [${requestId}]`, {
      code: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Authentication service is temporarily unavailable. Please retry in a moment.",
        requestId,
      },
      { status: 503 }
    );
  }
}
