/**
 * /api/owner/accounts
 * OWNER-ONLY Account Creation & User Management.
 * Public users cannot self-register.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { supabaseAdminCreateUser, isSupabaseConfigured } from "@/lib/supabase";

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
    if (!temporaryPassword || temporaryPassword.length < 6) {
      return NextResponse.json({ error: "Temporary password must be at least 6 characters." }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    const cleanEmail = email.toLowerCase().trim();
    const accountRole = ["OWNER", "ADMIN", "TEAM_MEMBER"].includes(role) ? role : "TEAM_MEMBER";

    // Check duplicate
    const existing = await dataStore.getProfiles();
    if (existing.some((p) => p.username.toLowerCase() === cleanUsername || p.email.toLowerCase() === cleanEmail)) {
      return NextResponse.json({ error: "An account with this username or email already exists." }, { status: 409 });
    }

    // 1. Try Supabase Auth creation if configured
    if (isSupabaseConfigured()) {
      await supabaseAdminCreateUser({
        email: cleanEmail,
        password: temporaryPassword,
        user_metadata: { displayName: fullName, username: cleanUsername, role: accountRole },
      }).catch(() => {});
    }

    // 2. Try Prisma DB creation if connected
    try {
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      await db.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          fullName: fullName.trim(),
          passwordHash,
          role: accountRole,
          isActive: true,
          profile: {
            create: {
              displayName: fullName.trim(),
              memberType: "CORE_TEAM",
              publicBio: bio || "",
              isPublic: true,
            },
          },
        },
      });
    } catch {
      // DataStore fallback handles it
    }

    // 3. Create profile in unified dataStore
    const newProfile = await dataStore.createProfile({
      username: cleanUsername,
      email: cleanEmail,
      displayName: fullName.trim(),
      role: accountRole,
      memberType: "CORE_TEAM",
      headline: headline || `${accountRole.replace("_", " ")} at CodeXa`,
      bio: bio || "Passionate engineer contributing to CodeXa ecosystem builds.",
      skills: ["Full Stack", "TypeScript", "React"],
      mediaUrl: "/assets/images/logo.jpeg",
      isActive: true,
      isPublic: true,
    });

    // 4. Log audit entry
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
