import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { getCurrentUser } from "@/lib/auth";
import { canEditProfile, isOwner, isCeoOrAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required." }, { status: 400 });
    }

    const data = await dataStore.getPublicProfileWithData(username);
    if (!data || !data.profile) {
      return NextResponse.json({ success: false, error: "Member profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: data.profile,
      stats: data.stats,
      createdProjects: data.createdProjects,
      collabProjects: data.collabProjects,
      posts: data.posts,
    });
  } catch (err: any) {
    console.error("[GET /api/profile/[username]] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch profile data." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { username } = params;
    const targetProfile = await dataStore.getProfileByUsername(username);
    if (!targetProfile) {
      return NextResponse.json({ success: false, error: "Target profile not found." }, { status: 404 });
    }

    // Permission check via centralized permissions resolver
    if (!canEditProfile(user, targetProfile)) {
      return NextResponse.json({ success: false, error: "Permission denied: You do not have authorization to edit this profile." }, { status: 403 });
    }

    const isTargetOwner = targetProfile.role === "OWNER";

    const body = await req.json();
    const {
      displayName,
      primaryRole,
      headline,
      publicBio,
      bio,
      skills,
      featuredProjects,
      expertiseGroups,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
      socialLinks,
      role,
      leadershipPosition,
      isActive,
    } = body;

    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (primaryRole !== undefined) updates.primaryRole = primaryRole;
    if (headline !== undefined) updates.headline = headline;
    if (publicBio !== undefined) updates.publicBio = publicBio;
    if (bio !== undefined) updates.bio = bio;
    if (skills !== undefined) updates.skills = Array.isArray(skills) ? skills : typeof skills === "string" ? skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    if (featuredProjects !== undefined) updates.featuredProjects = featuredProjects;
    if (expertiseGroups !== undefined) updates.expertiseGroups = expertiseGroups;
    if (githubUrl !== undefined) updates.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
    if (portfolioUrl !== undefined) updates.portfolioUrl = portfolioUrl;
    if (socialLinks !== undefined) updates.socialLinks = socialLinks;

    // Role & Active status can only be modified by Owner or CEO (for non-owner)
    const userIsOwner = isOwner(user);
    const userIsCeoOrAdmin = isCeoOrAdmin(user);
    if (role !== undefined && (userIsOwner || (userIsCeoOrAdmin && !isTargetOwner && role !== "OWNER"))) {
      updates.role = role;
    }
    if (leadershipPosition !== undefined && (userIsOwner || userIsCeoOrAdmin)) {
      updates.leadershipPosition = leadershipPosition;
    }
    if (isActive !== undefined && (userIsOwner || (userIsCeoOrAdmin && !isTargetOwner))) {
      updates.isActive = isActive;
    }

    const updated = await dataStore.updateProfile(targetProfile.id, updates);

    // Record activity event
    await dataStore.createActivityEvent({
      actorId: user.id,
      actorName: user.displayName,
      actorUsername: user.username || "member",
      actorMediaUrl: user.mediaUrl,
      actionType: "PROFILE_UPDATED",
      targetType: "PROFILE",
      targetId: targetProfile.id,
      title: `${targetProfile.displayName} updated profile details`,
      details: `Updated competencies, bio, and project highlights.`,
      link: `/team/${targetProfile.username}`,
    });

    await dataStore.logAudit({
      action: "PROFILE_UPDATED",
      actorId: user.id,
      targetId: targetProfile.id,
      details: `User @${user.username} updated profile for @${targetProfile.username}`,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: updated,
    });
  } catch (err: any) {
    console.error("[PATCH /api/profile/[username]] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}
