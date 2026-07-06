/**
 * POST /api/admin/team/[id]/reset-password
 * Reset a team member's password to a secure temporary password.
 * Invalidates all existing sessions for that user instantly.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$*%";
  let pass = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. OWNER role required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const profile = await db.teamProfile.findUnique({
      where: { id },
    });

    if (!profile || !profile.userId) {
      return NextResponse.json({ error: "Team profile with user login not found." }, { status: 404 });
    }

    // Prevent owner from resetting their own password here
    if (profile.userId === actor.id) {
      return NextResponse.json({ error: "Cannot reset owner password here." }, { status: 400 });
    }

    // Generate secure temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    // Invalidate sessions and update password in transaction
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profile.userId! },
        data: { passwordHash },
      });

      // Destroy all user sessions
      await tx.session.deleteMany({
        where: { userId: profile.userId! },
      });
    });

    // Log the audit
    await logProfileAction(
      actor.id,
      profile.userId,
      "password_reset_by_owner",
      `Owner reset password for team member ${profile.displayName}`
    );

    return NextResponse.json({
      success: true,
      tempPassword,
    });
  } catch (err) {
    console.error("[POST /api/admin/team/[id]/reset-password] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
