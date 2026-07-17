/**
 * PATCH /api/profile
 *
 * Handles non-upload profile updates only:
 *   - displayName
 *   - publicBio
 *   - crop metadata (cropX, cropY, cropW, cropH, cropZoom, cropRotation)
 *   - removeMedia (delete current media URL from DB + clean up blob)
 *
 * File uploads are handled by the two-step flow:
 *   POST /api/profile-media/upload  (browser → Blob CDN token)
 *   POST /api/profile-media/commit  (Blob URL → Aiven MySQL)
 *
 * Permissions:
 *   OWNER       — own profile (text/crop/remove)
 *   TEAM_MEMBER — own profile (text/crop/remove)
 *   ADMIN       — blocked
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteProfileMedia } from "@/lib/upload";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Session required." }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Admins cannot modify profiles." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const displayName  = formData.get("displayName") as string | null;
    const publicBio    = formData.get("publicBio")   as string | null;
    const removeMedia  = formData.get("removeMedia") === "true";

    const cropXStr        = formData.get("cropX")        as string | null;
    const cropYStr        = formData.get("cropY")        as string | null;
    const cropWStr        = formData.get("cropW")        as string | null;
    const cropHStr        = formData.get("cropH")        as string | null;
    const cropZoomStr     = formData.get("cropZoom")     as string | null;
    const cropRotationStr = formData.get("cropRotation") as string | null;

    if (!displayName || displayName.trim() === "") {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    const currentProfile = await db.teamProfile.findUnique({
      where: { userId: user.id },
    });

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found for this user." }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {
      displayName: displayName.trim(),
      publicBio: publicBio ? publicBio.trim() : null,
    };

    if (removeMedia) {
      // Delete old blob safely before clearing DB field
      await deleteProfileMedia(currentProfile.mediaUrl);
      updatePayload.mediaUrl      = null;
      updatePayload.mediaMimeType = null;
      updatePayload.profileMediaUrl = null;
      updatePayload.profileMediaMimeType = null;
      updatePayload.zoom          = null;
      updatePayload.objectPosition = null;
      updatePayload.cropX         = null;
      updatePayload.cropY         = null;
      updatePayload.cropW         = null;
      updatePayload.cropH         = null;
      updatePayload.cropZoom      = null;
      updatePayload.cropRotation  = null;
    } else {
      // Update crop metadata only if provided
      if (cropXStr        !== null && cropXStr !== "")        updatePayload.cropX        = Number(cropXStr);
      if (cropYStr        !== null && cropYStr !== "")        updatePayload.cropY        = Number(cropYStr);
      if (cropWStr        !== null && cropWStr !== "")        updatePayload.cropW        = Number(cropWStr);
      if (cropHStr        !== null && cropHStr !== "")        updatePayload.cropH        = Number(cropHStr);
      if (cropZoomStr     !== null && cropZoomStr !== "")     updatePayload.cropZoom     = Number(cropZoomStr);
      if (cropRotationStr !== null && cropRotationStr !== "") updatePayload.cropRotation = Number(cropRotationStr);
    }

    const updatedProfile = await db.$transaction(async (tx) => {
      if (removeMedia) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            profileMediaUrl: null,
            profileMediaMimeType: null,
            cropX: null,
            cropY: null,
            zoom: null,
            objectPosition: null,
          },
        }).catch(() => {});
      }

      return tx.teamProfile.update({
        where: { userId: user.id },
        data: updatePayload,
      });
    });

    await logProfileAction(
      user.id,
      user.id,
      "profile_text_update",
      `User updated profile fields. Media: ${updatedProfile.mediaUrl ? "Set" : "Removed"}`
    );

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err) {
    console.error("[PATCH /api/profile] error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to save profile changes." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
