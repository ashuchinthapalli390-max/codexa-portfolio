/**
 * /api/owner/accounts/[id]
 * PATCH: Owner changes role, activates/deactivates, resets password.
 * DELETE: Owner deletes account.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const { role, leadershipPosition, displayName, isActive, newPassword, isPublic } = body;

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
    if (newPassword && newPassword.length >= 6) {
      try {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.user.updateMany({
          where: { OR: [{ id }, { username: id }] },
          data: { passwordHash },
        });
      } catch {}
    }

    // Attempt DB user update
    try {
      await db.user.updateMany({
        where: { OR: [{ id }, { username: id }] },
        data: {
          ...(updates.role ? { role: updates.role } : {}),
          ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
        },
      });
    } catch {}

    const updatedProfile = await dataStore.updateProfile(id, updates);
    if (!updatedProfile) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // Audit log
    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: updatedProfile.id,
      action: newPassword ? "PASSWORD_RESET" : updates.role ? "ROLE_CHANGED" : "ACCOUNT_UPDATED",
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

    try {
      await db.user.deleteMany({
        where: { OR: [{ id }, { username: id }] },
      });
    } catch {}

    const deleted = await dataStore.deleteProfile(id);
    if (!deleted) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: id,
      action: "ACCOUNT_DELETED",
      details: `Owner permanently removed account @${profile?.username || id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Account deleted successfully." });
  } catch (err: any) {
    console.error("[DELETE /api/owner/accounts/[id]]", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
