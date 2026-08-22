import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 * Returns the current authenticated user's profile with stats and links.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const profile = await dataStore.getProfileById(user.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    console.error("[GET /api/profile] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch profile." }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Updates the current logged-in user's own profile (OWNER, ADMIN, TEAM_MEMBER).
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let updates: any = {};

    if (contentType.includes("application/json")) {
      updates = await req.json();
    } else {
      const formData = await req.formData();
      const displayName = formData.get("displayName") as string | null;
      const primaryRole = formData.get("primaryRole") as string | null;
      const headline = formData.get("headline") as string | null;
      const publicBio = formData.get("publicBio") as string | null;
      const bio = formData.get("bio") as string | null;
      const skillsStr = formData.get("skills") as string | null;
      const githubUrl = formData.get("githubUrl") as string | null;
      const linkedinUrl = formData.get("linkedinUrl") as string | null;
      const portfolioUrl = formData.get("portfolioUrl") as string | null;
      const mediaUrl = formData.get("mediaUrl") as string | null;

      if (displayName) updates.displayName = displayName.trim();
      if (primaryRole !== null) updates.primaryRole = primaryRole.trim();
      if (headline !== null) updates.headline = headline.trim();
      if (publicBio !== null) updates.publicBio = publicBio.trim();
      if (bio !== null) updates.bio = bio.trim();
      if (skillsStr !== null) {
        updates.skills = skillsStr.split(",").map((s) => s.trim()).filter(Boolean);
      }
      if (githubUrl !== null) updates.githubUrl = githubUrl.trim();
      if (linkedinUrl !== null) updates.linkedinUrl = linkedinUrl.trim();
      if (portfolioUrl !== null) updates.portfolioUrl = portfolioUrl.trim();
      if (mediaUrl !== null) updates.mediaUrl = mediaUrl.trim();

      const cropX = formData.get("cropX");
      const cropY = formData.get("cropY");
      const cropW = formData.get("cropW");
      const cropH = formData.get("cropH");
      const cropZoom = formData.get("cropZoom");
      const cropRotation = formData.get("cropRotation");

      if (cropX !== null && cropX !== "") updates.cropX = Number(cropX);
      if (cropY !== null && cropY !== "") updates.cropY = Number(cropY);
      if (cropW !== null && cropW !== "") updates.cropW = Number(cropW);
      if (cropH !== null && cropH !== "") updates.cropH = Number(cropH);
      if (cropZoom !== null && cropZoom !== "") updates.cropZoom = Number(cropZoom);
      if (cropRotation !== null && cropRotation !== "") updates.cropRotation = Number(cropRotation);
    }

    if (updates.displayName && updates.displayName.trim() === "") {
      return NextResponse.json({ success: false, error: "Display name cannot be empty." }, { status: 400 });
    }

    const updatedProfile = await dataStore.updateProfile(user.id, updates);

    // Record activity & audit log
    await dataStore.createActivityEvent({
      actorId: user.id,
      actorName: user.displayName || "Member",
      actorUsername: user.username || "member",
      actorMediaUrl: user.mediaUrl,
      actionType: "PROFILE_UPDATED",
      targetType: "PROFILE",
      targetId: user.id,
      title: `${user.displayName} updated their profile details`,
      details: "Updated skills, bio, or links.",
      link: `/team/${user.username}`,
    });

    await dataStore.logAudit({
      action: "PROFILE_UPDATED",
      actorId: user.id,
      targetId: user.id,
      details: `User @${user.username} (${user.role}) updated their profile details.`,
    });

    return NextResponse.json({
      success: true,
      message: "Profile saved successfully.",
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("[PATCH /api/profile] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}
