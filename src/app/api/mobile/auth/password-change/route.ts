import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generateSessionToken, hashToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, newPassword, confirmPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_FIELDS", message: "User ID and new password are required." } },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: { code: "PASSWORD_MISMATCH", message: "Passwords do not match." } },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: { code: "PASSWORD_TOO_SHORT", message: "Password must be at least 6 characters long." } },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profile: true, employmentProfile: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { ok: false, error: { code: "USER_NOT_FOUND", message: "Account not found or inactive." } },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    // Create fresh session
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await db.session.create({
      data: {
        userId: user.id,
        sessionTokenHash: tokenHash,
        expiresAt,
        userAgent: req.headers.get("user-agent") || "CodeXa Mobile",
        lastSeenAt: new Date(),
      },
    });

    const effectiveRole = getEffectiveRole(user);

    return NextResponse.json({
      ok: true,
      message: "Password updated successfully.",
      accessToken: rawToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || user.profile?.displayName || user.username,
        role: effectiveRole,
        orgRole: user.orgRole,
        department: user.department || user.employmentProfile?.department,
        profileMediaUrl: user.profileMediaUrl || user.profile?.profileMediaUrl || user.profile?.mediaUrl,
        mustChangePassword: false,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/auth/password-change]", err);
    return NextResponse.json(
      { ok: false, error: { code: "SERVER_ERROR", message: "Failed to update password." } },
      { status: 500 }
    );
  }
}
