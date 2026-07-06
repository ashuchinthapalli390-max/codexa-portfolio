/**
 * PATCH /api/profile
 * Allows logged-in users to update their own profile details and media uploads (PNG, JPG, WEBP, GIF up to 5MB)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Session required." }, { status: 401 });
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

    // Get current profile info to clean up old image if replaced/removed
    const currentProfile = await db.teamProfile.findUnique({
      where: { userId: user.id },
    });

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found for this user." }, { status: 404 });
    }

    let finalMediaUrl = currentProfile.mediaUrl;
    let finalMediaMimeType = currentProfile.mediaMimeType;
    let finalCropX = currentProfile.cropX;
    let finalCropY = currentProfile.cropY;
    let finalCropW = currentProfile.cropW;
    let finalCropH = currentProfile.cropH;
    let finalCropZoom = currentProfile.cropZoom;
    let finalCropRotation = currentProfile.cropRotation;

    const cleanupFile = async (url: string | null) => {
      if (url && url.startsWith("/uploads/profiles/")) {
        const fullPath = path.join(process.cwd(), "public", url);
        try {
          await unlink(fullPath);
        } catch (e) {
          // ignore if missing or locked
        }
      }
    };

    if (removeMedia) {
      await cleanupFile(currentProfile.mediaUrl);
      finalMediaUrl = null;
      finalMediaMimeType = null;
      finalCropX = null;
      finalCropY = null;
      finalCropW = null;
      finalCropH = null;
      finalCropZoom = null;
      finalCropRotation = null;
    } else {
      if (cropX !== null) finalCropX = cropX;
      if (cropY !== null) finalCropY = cropY;
      if (cropW !== null) finalCropW = cropW;
      if (cropH !== null) finalCropH = cropH;
      if (cropZoom !== null) finalCropZoom = cropZoom;
      if (cropRotation !== null) finalCropRotation = cropRotation;

      if (file && file.size > 0) {
        // Validate file size (10MB for images, 15MB for GIFs)
        const isGif = file.type === "image/gif";
        const maxLimit = isGif ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxLimit) {
          return NextResponse.json({ error: `File too large. Maximum size is ${isGif ? "15MB for GIFs" : "10MB"}.` }, { status: 400 });
        }

        // Validate MIME type
        const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
        if (!allowedMimeTypes.includes(file.type)) {
          return NextResponse.json(
            { error: "Invalid file type. Only PNG, JPG, JPEG, WEBP, and GIF are allowed (SVGs are forbidden)." },
            { status: 400 }
          );
        }

        // Create uploads directory
        const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
        await mkdir(uploadDir, { recursive: true });

        // Generate safe unique filename
        const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
        const filename = `cxa_profile_${user.id}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Write arrayBuffer to file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Cleanup old media file
        await cleanupFile(currentProfile.mediaUrl);

        finalMediaUrl = `/uploads/profiles/${filename}`;
        finalMediaMimeType = file.type;
      }
    }

    // Save changes to database
    const updatedProfile = await db.teamProfile.update({
      where: { userId: user.id },
      data: {
        displayName: displayName.trim(),
        publicBio: publicBio ? publicBio.trim() : null,
        mediaUrl: finalMediaUrl,
        mediaMimeType: finalMediaMimeType,
        cropX: finalCropX,
        cropY: finalCropY,
        cropW: finalCropW,
        cropH: finalCropH,
        cropZoom: finalCropZoom,
        cropRotation: finalCropRotation,
      },
    });

    // Log the profile update
    await logProfileAction(
      user.id,
      user.id,
      "profile_update",
      `User ${user.username} updated profile fields. Media status: ${finalMediaUrl ? "Set" : "Removed"}`
    );

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("[PATCH /api/profile] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
