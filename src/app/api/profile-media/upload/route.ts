import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { uploadAvatarFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const zoom = parseFloat(formData.get("zoom") as string) || 1;
    const positionX = parseFloat(formData.get("positionX") as string) || 50;
    const positionY = parseFloat(formData.get("positionY") as string) || 50;
    const setAsAvatar = formData.get("setAsAvatar") !== "false";

    if (!file) {
      return NextResponse.json({ success: false, error: "No image file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload through server to Supabase Storage (avatars/{userId}/filename)
    const uploadResult = await uploadAvatarFile(
      user.id,
      buffer,
      file.name,
      file.type || "image/jpeg"
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || "Failed to upload image." },
        { status: 400 }
      );
    }

    // Record in media_assets table
    const asset = await dataStore.createMediaAsset({
      ownerUserId: user.id,
      mediaType: "AVATAR",
      sourceType: "SUPABASE_STORAGE",
      storageBucket: uploadResult.storageBucket,
      storagePath: uploadResult.storagePath,
      publicUrl: uploadResult.publicUrl,
      mimeType: uploadResult.mimeType,
      originalFilename: file.name,
      fileSize: uploadResult.fileSize,
    });

    // Update Profile if requested
    let updatedProfile = null;
    if (setAsAvatar) {
      updatedProfile = await dataStore.updateProfileAvatar(user.id, {
        avatarSource: "SUPABASE_STORAGE",
        avatarPath: uploadResult.publicUrl,
        avatarUrl: uploadResult.publicUrl,
        avatarStoragePath: uploadResult.storagePath,
        avatarMimeType: uploadResult.mimeType,
        avatarZoom: zoom,
        avatarPositionX: positionX,
        avatarPositionY: positionY,
      });

      await dataStore.logAudit(
        "PROFILE_IMAGE_UPLOADED",
        user.id,
        `User @${user.username} uploaded and set new avatar (${file.name}).`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile image uploaded successfully.",
      asset,
      profile: updatedProfile,
      publicUrl: uploadResult.publicUrl,
    });
  } catch (err: any) {
    console.error("[POST /api/profile-media/upload]", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while processing the upload." },
      { status: 500 }
    );
  }
}
