/**
 * /api/owner/accounts/[id]
 * PATCH: Owner changes role, activates/deactivates, resets password.
 * DELETE: Owner deletes account.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import bcrypt from "bcryptjs";
import { sendPasswordChangedEmail, sendAccountStatusChangedEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const { role, leadershipPosition, displayName, isActive, newPassword, isPublic } = body;

    const profileBefore = await dataStore.getProfileById(id);
    if (!profileBefore) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const updates: any = {};
    if (role && ["OWNER", "ADMIN", "TEAM_MEMBER"].includes(role)) {
      updates.role = role;
    }
    if (leadershipPosition !== undefined) {
      updates.leadershipPosition = leadershipPosition || null;
    }
    if (displayName) {
      updates.displayName = displayName.trim();
    }
    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }
    if (isPublic !== undefined) {
      updates.isPublic = Boolean(isPublic);
    }

    // Handle password reset if provided
    if (newPassword && newPassword.length >= 8) {
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
      updates.mustChangePassword = true;
    }

    const updatedProfile = await dataStore.updateProfile(id, updates);
    if (!updatedProfile) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // If status changed, notify the member
    if (isActive !== undefined && profileBefore.isActive !== Boolean(isActive) && updatedProfile.email) {
      sendAccountStatusChangedEmail({
        email: updatedProfile.email,
        name: updatedProfile.displayName,
        isActive: Boolean(isActive),
      }).catch((e) => console.error("[Account Status Email Error]", e));
    }

    // If password was reset by owner, notify the member
    if (newPassword && updatedProfile.email) {
      sendPasswordChangedEmail({
        email: updatedProfile.email,
        name: updatedProfile.displayName,
      }).catch((e) => console.error("[Password Changed Email Error]", e));
    }

    // Audit log
    await dataStore.logAudit({
      action: newPassword ? "PASSWORD_RESET" : updates.role ? "ROLE_CHANGED" : "ACCOUNT_UPDATED",
      actorId: currentUser.id,
      targetId: updatedProfile.id,
      details: `Owner modified account @${updatedProfile.username}. Updates: ${JSON.stringify(updates)} ${newPassword ? "(Password Reset)" : ""}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, account: updatedProfile });
  } catch (err: any) {
    console.error("[PATCH /api/owner/accounts/[id]]", err);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  const { id } = params;

  // Cannot delete own account
  if (currentUser.id === id) {
    return NextResponse.json({ error: "You cannot delete your own Owner account." }, { status: 400 });
  }

  try {
    const profile = await dataStore.getProfileById(id);

    const deleted = await dataStore.deleteProfile(id);
    if (!deleted) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    await dataStore.logAudit({
      action: "ACCOUNT_DELETED",
      actorId: currentUser.id,
      details: `Owner permanently removed account @${profile?.username || id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Account deleted successfully." });
  } catch (err: any) {
    console.error("[DELETE /api/owner/accounts/[id]]", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
