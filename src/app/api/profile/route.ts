/**
 * PATCH /api/profile
 * Allows logged-in users to update their own profile details and media.
 *
 * Storage: Vercel Blob (server-only BLOB_READ_WRITE_TOKEN).
 * Never writes to local filesystem.
 *
 * Permissions:
 *   OWNER       — can update their own profile
 *   TEAM_MEMBER — can update their own profile
 *   ADMIN       — read-only; upload blocked server-side
 *
 * Diagnostic codes logged (never exposed to browser):
 *   UPLOAD_UNAUTHORIZED, BLOB_TOKEN_MISSING, INVALID_MEDIA_TYPE,
 *   FILE_TOO_LARGE, BLOB_UPLOAD_FAILED, DATABASE_UPDATE_FAILED, MEDIA_DELETE_FAILED
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadProfileMedia, deleteProfileMedia, UploadError } from "@/lib/upload";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    console.warn("[PATCH /api/profile] DIAGNOSTIC: UPLOAD_UNAUTHORIZED — no session");
    return NextResponse.json({ error: "Unauthorized. Session required." }, { status: 401 });
  }

  // ADMIN role is strictly read-only
  if (user.role === "ADMIN") {
    console.warn(`[PATCH /api/profile] DIAGNOSTIC: UPLOAD_UNAUTHORIZED — ADMIN role blocked`);
    return NextResponse.json({ error: "Forbidden. Admins cannot modify profile media." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const displayName = formData.get("displayName") as string | null;
    const publicBio = formData.get("publicBio") as string | null;
    const removeMedia = formData.get("removeMedia") === "true";
    const file = formData.get("profileMedia") as File | null;

    const cropXStr = formData.get("cropX") as string | null;
    const cropYStr = formData.get("cropY") as string | null;
    const cropWStr = formData.get("cropW") as string | null;
    const cropHStr = formData.get("cropH") as string | null;
    const cropZoomStr = formData.get("cropZoom") as string | null;
    const cropRotationStr = formData.get("cropRotation") as string | null;

    let cropX: number | null = null;
    let cropY: number | null = null;
    let cropW: number | null = null;
    let cropH: number | null = null;
    let cropZoom: number | null = null;
    let cropRotation: number | null = null;

    if (cropXStr !== null && cropXStr !== "") cropX = Number(cropXStr);
    if (cropYStr !== null && cropYStr !== "") cropY = Number(cropYStr);
    if (cropWStr !== null && cropWStr !== "") cropW = Number(cropWStr);
    if (cropHStr !== null && cropHStr !== "") cropH = Number(cropHStr);
    if (cropZoomStr !== null && cropZoomStr !== "") cropZoom = Number(cropZoomStr);
    if (cropRotationStr !== null && cropRotationStr !== "") cropRotation = Number(cropRotationStr);

    if (!displayName || displayName.trim() === "") {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    // Fetch current profile — must exist
    const currentProfile = await db.teamProfile.findUnique({
      where: { userId: user.id },
    });

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found for this user." }, { status: 404 });
    }

    let finalMediaUrl: string | null | undefined = undefined;
    let finalMediaMimeType: string | null | undefined = undefined;
    let finalCropX = currentProfile.cropX;
    let finalCropY = currentProfile.cropY;
    let finalCropW = currentProfile.cropW;
    let finalCropH = currentProfile.cropH;
    let finalCropZoom = currentProfile.cropZoom;
    let finalCropRotation = currentProfile.cropRotation;

    if (removeMedia) {
      // Delete old blob safely (skips local/legacy /uploads/ paths silently)
      await deleteProfileMedia(currentProfile.mediaUrl);
      finalMediaUrl = null;
      finalMediaMimeType = null;
      finalCropX = null;
      finalCropY = null;
      finalCropW = null;
      finalCropH = null;
      finalCropZoom = null;
      finalCropRotation = null;
    } else {
      // Update crop metadata if provided
      if (cropX !== null) finalCropX = cropX;
      if (cropY !== null) finalCropY = cropY;
      if (cropW !== null) finalCropW = cropW;
      if (cropH !== null) finalCropH = cropH;
      if (cropZoom !== null) finalCropZoom = cropZoom;
      if (cropRotation !== null) finalCropRotation = cropRotation;

      if (file && file.size > 0) {
        // Upload to Vercel Blob — validation handled inside uploadProfileMedia
        let uploadedUrl: string;
        let uploadedMime: string;

        try {
          const result = await uploadProfileMedia(file, user.id);
          uploadedUrl = result.url;
          uploadedMime = result.mimeType;
        } catch (err) {
          if (err instanceof UploadError) {
            return NextResponse.json(
              { error: "Profile media could not be saved. Please try again." },
              { status: err.code === "FILE_TOO_LARGE" ? 413 : err.code === "INVALID_MEDIA_TYPE" ? 415 : 502 }
            );
          }
          throw err;
        }

        // Update DB
        let updatedProfile;
        try {
          updatedProfile = await db.teamProfile.update({
            where: { userId: user.id },
            data: {
              displayName: displayName.trim(),
              publicBio: publicBio ? publicBio.trim() : null,
              mediaUrl: uploadedUrl,
              mediaMimeType: uploadedMime,
              cropX: finalCropX,
              cropY: finalCropY,
              cropW: finalCropW,
              cropH: finalCropH,
              cropZoom: finalCropZoom,
              cropRotation: finalCropRotation,
            },
          });
        } catch (dbErr) {
          // DB failed — delete the newly uploaded blob to avoid orphans
          console.error("[PATCH /api/profile] DIAGNOSTIC: DATABASE_UPDATE_FAILED —", (dbErr as Error).message);
          await deleteProfileMedia(uploadedUrl);
          return NextResponse.json(
            { error: "Profile media could not be saved. Please try again." },
            { status: 500 }
          );
        }

        // Delete old blob only after DB is committed
        await deleteProfileMedia(currentProfile.mediaUrl);

        await logProfileAction(
          user.id,
          user.id,
          "profile_update",
          `User updated profile with new media. Media status: Set`
        );

        return NextResponse.json({ success: true, profile: updatedProfile });
      }
    }

    // No file upload — just update text + crop + possible media removal
    const updatePayload: Record<string, unknown> = {
      displayName: displayName.trim(),
      publicBio: publicBio ? publicBio.trim() : null,
      cropX: finalCropX,
      cropY: finalCropY,
      cropW: finalCropW,
      cropH: finalCropH,
      cropZoom: finalCropZoom,
      cropRotation: finalCropRotation,
    };

    if (finalMediaUrl !== undefined) {
      updatePayload.mediaUrl = finalMediaUrl;
      updatePayload.mediaMimeType = finalMediaMimeType;
    }

    const updatedProfile = await db.teamProfile.update({
      where: { userId: user.id },
      data: updatePayload,
    });

    await logProfileAction(
      user.id,
      user.id,
      "profile_update",
      `User updated profile fields. Media status: ${updatedProfile.mediaUrl ? "Set" : "Removed"}`
    );

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (err) {
    console.error("[PATCH /api/profile] DIAGNOSTIC: UNKNOWN_UPLOAD_ERROR —", (err as Error).message);
    return NextResponse.json(
      { error: "Profile media could not be saved. Please try again." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
