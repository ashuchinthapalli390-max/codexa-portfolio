/**
 * /api/owner/accounts
 * OWNER-ONLY Account Creation & User Management.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import bcrypt from "bcryptjs";
import { sendAccountCreatedEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  try {
    const profiles = await dataStore.getProfiles();
    return NextResponse.json({ success: true, accounts: profiles });
  } catch (err: any) {
    console.error("[GET /api/owner/accounts]", err);
    return NextResponse.json({ error: "Failed to load accounts." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. Only the CodeXa Owner can create accounts." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { fullName, username, email, role, temporaryPassword, headline, bio } = body;

    // Validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Full Name is required." }, { status: 400 });
    }
    if (!username || !username.trim()) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }
    if (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Valid Email is required." }, { status: 400 });
    }
    if (!temporaryPassword || temporaryPassword.length < 8) {
      return NextResponse.json({ error: "Temporary password must be at least 8 characters." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    const cleanEmail = email.toLowerCase().trim();
    const accountRole = ["OWNER", "ADMIN", "TEAM_MEMBER"].includes(role) ? role : "TEAM_MEMBER";

    // Check duplicate
    const existing = await dataStore.getProfiles();
    if (existing.some((p) => p.username.toLowerCase() === cleanUsername || p.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ error: "An account with this username or email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create profile in database
    const newProfile = await dataStore.createProfile({
      username: cleanUsername,
      email: cleanEmail,
      displayName: fullName.trim(),
      passwordHash,
      role: accountRole,
      memberType: "CORE_TEAM",
      headline: headline || `${accountRole.replace("_", " ")} at CodeXa`,
      bio: bio || "Passionate engineer contributing to CodeXa ecosystem builds.",
      skills: ["Full Stack", "TypeScript", "React"],
      mediaUrl: "/assets/images/logo.jpeg",
      isActive: true,
      isPublic: true,
      mustChangePassword: true,
    });

    // Send Welcome email to the newly created member's email address
    sendAccountCreatedEmail({
      email: cleanEmail,
      name: fullName.trim(),
      username: cleanUsername,
    }).catch((e) => console.error("[Account Created Email Error]", e));

    // Log audit entry
    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      targetId: newProfile.id,
      action: "ACCOUNT_CREATED",
      details: `Owner provisioned new ${accountRole} account for ${newProfile.displayName} (@${newProfile.username})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      account: newProfile,
      message: `Account @${cleanUsername} created successfully.`,
    });
  } catch (err: any) {
    console.error("[POST /api/owner/accounts]", err);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
