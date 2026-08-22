import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { sendPasswordChangedEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
    }

    const profile = await dataStore.getProfileById(user.id);
    if (!profile || !profile.passwordHash) {
      return NextResponse.json({ error: "Profile not found." }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, profile.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await dataStore.updateProfile(user.id, {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    });

    await dataStore.logAudit({
      action: "PASSWORD_CHANGED",
      actorId: user.id,
      details: "User updated their account password.",
    });

    if (profile.email) {
      sendPasswordChangedEmail({
        email: profile.email,
        name: profile.displayName,
      }).catch((e) => console.error("[Password Changed Email Error]", e));
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });

  } catch (error: any) {
    console.error("Password Update Error:", error);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}
