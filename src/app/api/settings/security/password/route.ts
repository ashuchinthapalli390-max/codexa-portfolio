import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getCurrentUser, revokeAllUserSessions, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { sendPasswordChangedEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized. Session expired or missing." }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    const cleanCurrent = typeof currentPassword === "string" ? currentPassword.trim() : "";
    const cleanNew = typeof newPassword === "string" ? newPassword.trim() : "";

    if (!cleanNew || cleanNew.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
    }

    // Query fresh user record directly from database
    const dbUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      include: { profile: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User account not found in database." }, { status: 404 });
    }

    // If user has an existing password hash, verify the current password
    if (dbUser.passwordHash) {
      // If the account does NOT require mandatory first-time change, current password is strictly required
      if (!dbUser.mustChangePassword && !cleanCurrent) {
        return NextResponse.json({ error: "Current password is required." }, { status: 400 });
      }

      if (cleanCurrent) {
        let isMatch = false;

        // 1. Primary check: bcrypt comparison on trimmed password
        try {
          isMatch = await bcrypt.compare(cleanCurrent, dbUser.passwordHash);
        } catch {
          isMatch = false;
        }

        // 2. Secondary check: bcrypt comparison on raw untrimmed password (in case user intended spaces)
        if (!isMatch && currentPassword && currentPassword !== cleanCurrent) {
          try {
            isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
          } catch {}
        }

        // 3. Fallback check: SHA-256 hash comparison for legacy accounts
        if (!isMatch) {
          const shaHash = crypto.createHash("sha256").update(cleanCurrent).digest("hex");
          if (shaHash === dbUser.passwordHash) {
            isMatch = true;
          }
        }

        // 4. Temporary password validation during forced first-time change
        if (!isMatch && dbUser.mustChangePassword) {
          const validTempPasswords = [
            "CodeXa@Intern2026#Access",
            "Codexa123",
            "CodeXa123",
            "Codexa@2026",
            "Intern@2026",
            "Codexa2026",
          ];
          if (validTempPasswords.includes(cleanCurrent)) {
            isMatch = true;
          }
        }

        // 5. Executive role environment fallback passwords (if hash was initial placeholder)
        if (!isMatch) {
          const roleUpper = (dbUser.orgRole || dbUser.role || "").toUpperCase();
          if ((roleUpper === "FOUNDER" || roleUpper === "OWNER") && process.env.OWNER_PASSWORD && cleanCurrent === process.env.OWNER_PASSWORD) {
            isMatch = true;
          } else if (["CEO", "CTO", "HR", "COO", "ADMIN"].includes(roleUpper) && process.env.ADMIN_PASSWORD && cleanCurrent === process.env.ADMIN_PASSWORD) {
            isMatch = true;
          } else if (process.env.TEAM_PASSWORD && cleanCurrent === process.env.TEAM_PASSWORD) {
            isMatch = true;
          }
        }

        if (!isMatch) {
          return NextResponse.json(
            { error: "Current password is incorrect. Please check your credentials and try again." },
            { status: 400 }
          );
        }
      }
    }

    // Hash the new password securely using bcrypt (12 rounds)
    const newPasswordHash = await bcrypt.hash(cleanNew, 12);

    // Update database record directly: new hash and disable mustChangePassword
    await db.user.update({
      where: { id: dbUser.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    // Revoke all previous active sessions
    await revokeAllUserSessions(dbUser.id).catch(() => {});

    // Create a fresh new session for this current authenticated browser
    await createSession(dbUser.id);

    // Audit log
    await dataStore.logAudit({
      action: "PASSWORD_CHANGED",
      actorId: dbUser.id,
      actorName: dbUser.fullName || dbUser.username,
      details: "User updated their account password. Previous sessions revoked; current session refreshed.",
    }).catch(() => {});

    // Dispatch notification email
    if (dbUser.email) {
      sendPasswordChangedEmail({
        email: dbUser.email,
        name: dbUser.fullName || dbUser.profile?.displayName || dbUser.username,
      }).catch((e) => console.error("[Password Changed Email Error]", e));
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Other sessions have been signed out.",
    });

  } catch (error: any) {
    console.error("Password Update Error:", error);
    return NextResponse.json({ error: "Failed to update password. Server error." }, { status: 500 });
  }
}
