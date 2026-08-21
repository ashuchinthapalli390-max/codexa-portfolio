import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const {
      sourceType = "STATIC",
      avatarPath,
      avatarUrl,
      avatarStoragePath,
      mimeType = "image/jpeg",
      zoom = 1,
      positionX = 50,
      positionY = 50,
    } = body;

    if (!avatarPath) {
      return NextResponse.json({ success: false, error: "Avatar path is required." }, { status: 400 });
    }

    // Update profile
    const updatedProfile = await dataStore.updateProfileAvatar(user.id, {
      avatarSource: sourceType as "STATIC" | "SUPABASE_STORAGE" | "LEGACY",
      avatarPath,
      avatarUrl: avatarUrl || avatarPath,
      avatarStoragePath: avatarStoragePath || null,
      avatarMimeType: mimeType,
      avatarZoom: zoom,
      avatarPositionX: positionX,
      avatarPositionY: positionY,
    });

    await dataStore.logAudit(
      "PROFILE_IMAGE_SELECTED",
      user.id,
      `User @${user.username} selected profile picture [${sourceType}]: ${avatarPath}`
    );

    return NextResponse.json({
      success: true,
      message: "Profile picture updated successfully.",
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("[POST /api/profile-media/select]", err);
    return NextResponse.json(
      { success: false, error: "Failed to update profile picture." },
      { status: 500 }
    );
  }
}
