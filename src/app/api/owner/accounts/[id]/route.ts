/**
 * /api/owner/accounts/[id]
 * PATCH: Edit user role, status, leadership position, or reset password (enforces RBAC + Founder protection)
 * DELETE: Remove user account (strictly protects Founder and Co-Founder)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, revokeAllUserSessions } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import bcrypt from "bcryptjs";
import { sendPasswordChangedEmail, sendAccountStatusChangedEmail } from "@/lib/email";
import {
  Permission,
  requirePermission,
  canModifyTargetUser,
  canChangeRole,
  isProtectedAccount,
  getEffectiveRole,
  OrgRole,
} from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const permCheck = await requirePermission(auth.user, Permission.EDIT_USERS);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  const currentUser = auth.user;
  const { id } = params;

  try {
    const body = await req.json();
    const { role, leadershipPosition, displayName, isActive, newPassword, isPublic, department } = body;

    const profileBefore = await dataStore.getProfileById(id);
    if (!profileBefore) {
      return NextResponse.json({ error: "Account not found." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Protection check for Founder and Co-Founder
    const modifyCheck = canModifyTargetUser(currentUser, profileBefore, role ? "ROLE_CHANGE" : isActive === false ? "DEACTIVATE" : "EDIT");
    if (!modifyCheck.allowed) {
      return NextResponse.json(
        { error: modifyCheck.reason || "Forbidden: You are not authorized to modify this account." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Role change validation
    if (role && role !== profileBefore.role) {
      if (!canChangeRole(currentUser, profileBefore, role)) {
        return NextResponse.json(
          { error: `Forbidden: Your role (${getEffectiveRole(currentUser)}) cannot assign role "${role}".` },
          { status: 403, headers: NO_CACHE_HEADERS }
        );
      }
    }

    const updates: any = {};
    if (role) {
      updates.role = role.toUpperCase();
      updates.orgRole = role.toUpperCase();
    }
    if (leadershipPosition !== undefined) {
      updates.leadershipPosition = leadershipPosition || null;
    }
    if (displayName) {
      updates.displayName = displayName.trim();
    }
    if (department !== undefined) {
      updates.department = department?.trim() || null;
    }
    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }
    if (isPublic !== undefined) {
      updates.isPublic = Boolean(isPublic);
    }

    // Handle password reset
    if (newPassword && newPassword.length >= 8) {
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
      updates.mustChangePassword = true;
      await revokeAllUserSessions(id);
    }

    const updated = await dataStore.updateProfile(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update profile." }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    // Audit log
    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: id,
      action: "ACCOUNT_UPDATED",
      details: `${currentUser.displayName} updated account @${profileBefore.username}: ${Object.keys(updates).join(", ")}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    if (isActive !== undefined && profileBefore.email) {
      sendAccountStatusChangedEmail({
        email: profileBefore.email,
        name: profileBefore.displayName,
        isActive: Boolean(isActive),
      }).catch((e) => console.error("[Account Status Email Error]", e));
    }

    return NextResponse.json({ success: true, account: updated }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[PATCH /api/owner/accounts/[id]]", err);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
      { status: 503, headers: NO_CACHE_HEADERS }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  const permCheck = await requirePermission(auth.user, Permission.DELETE_USERS);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  const currentUser = auth.user;
  const { id } = params;

  if (currentUser.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  try {
    const profile = await dataStore.getProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "Account not found." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const check = canModifyTargetUser(currentUser, profile, "DELETE");
    if (!check.allowed) {
      return NextResponse.json(
        { error: check.reason || "Forbidden: Protected accounts cannot be deleted." },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const deleted = await dataStore.deleteProfile(id);
    if (!deleted) {
      return NextResponse.json({ error: "Account not found." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    await dataStore.logAudit({
      action: "ACCOUNT_DELETED",
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: id,
      details: `${currentUser.displayName} permanently deleted account @${profile?.username || id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Account deleted successfully." }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[DELETE /api/owner/accounts/[id]]", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
