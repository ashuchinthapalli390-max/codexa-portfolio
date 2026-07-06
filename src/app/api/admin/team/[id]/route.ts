/**
 * PATCH & DELETE /api/admin/team/[id]
 * PATCH: Edit profile details, display order, visibility, and user login status (isActive)
 * Supports multipart/form-data file uploads for profileMedia (profile photo/GIF)
 * DELETE: Safely delete user account and team profile (and clean up media file)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlink, writeFile, mkdir } from "fs/promises";
import path from "path";
import { siteConfig } from "@/config/site";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. OWNER role required." }, { status: 403 });
  }

  const { id } = params;

  let displayName: string | undefined = undefined;
  let publicBio: string | undefined = undefined;
  let mediaUrl: string | null | undefined = undefined;
  let mediaMimeType: string | null | undefined = undefined;
  let cropX: number | null | undefined = undefined;
  let cropY: number | null | undefined = undefined;
  let cropW: number | null | undefined = undefined;
  let cropH: number | null | undefined = undefined;
  let cropZoom: number | null | undefined = undefined;
  let cropRotation: number | null | undefined = undefined;
  let isPublic: boolean | undefined = undefined;
  let displayOrder: number | undefined = undefined;
  let isActive: boolean | undefined = undefined;
  let file: File | null = null;
  let removeMedia = false;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      displayName = formData.get("displayName") as string | undefined;
      publicBio = formData.get("publicBio") as string | undefined;
      
      const isPublicStr = formData.get("isPublic") as string | undefined;
      if (isPublicStr !== undefined && isPublicStr !== "") {
        isPublic = isPublicStr === "true";
      }

      const displayOrderStr = formData.get("displayOrder") as string | undefined;
      if (displayOrderStr !== undefined && displayOrderStr !== "") {
        displayOrder = Number(displayOrderStr);
      }

      const isActiveStr = formData.get("isActive") as string | undefined;
      if (isActiveStr !== undefined && isActiveStr !== "") {
        isActive = isActiveStr === "true";
      }

      const cropXStr = formData.get("cropX") as string | undefined;
      if (cropXStr !== undefined && cropXStr !== "") cropX = Number(cropXStr);
      const cropYStr = formData.get("cropY") as string | undefined;
      if (cropYStr !== undefined && cropYStr !== "") cropY = Number(cropYStr);
      const cropWStr = formData.get("cropW") as string | undefined;
      if (cropWStr !== undefined && cropWStr !== "") cropW = Number(cropWStr);
      const cropHStr = formData.get("cropH") as string | undefined;
      if (cropHStr !== undefined && cropHStr !== "") cropH = Number(cropHStr);
      const cropZoomStr = formData.get("cropZoom") as string | undefined;
      if (cropZoomStr !== undefined && cropZoomStr !== "") cropZoom = Number(cropZoomStr);
      const cropRotationStr = formData.get("cropRotation") as string | undefined;
      if (cropRotationStr !== undefined && cropRotationStr !== "") cropRotation = Number(cropRotationStr);

      removeMedia = formData.get("removeMedia") === "true";
      file = formData.get("profileMedia") as File | null;
    } catch (e) {
      return NextResponse.json({ error: "Failed to parse multipart form data." }, { status: 400 });
    }
  } else {
    // Parse JSON
    try {
      const body = await req.json();
      displayName = body.displayName;
      publicBio = body.publicBio;
      mediaUrl = body.mediaUrl;
      mediaMimeType = body.mediaMimeType;
      cropX = body.cropX;
      cropY = body.cropY;
      cropW = body.cropW;
      cropH = body.cropH;
      cropZoom = body.cropZoom;
      cropRotation = body.cropRotation;
      isPublic = body.isPublic;
      displayOrder = body.displayOrder;
      isActive = body.isActive;
      if (mediaUrl === null) {
        removeMedia = true;
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }

  try {
    const profile = await db.teamProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Team profile not found." }, { status: 404 });
    }

    const isLeadership = profile.memberType === "LEADERSHIP";

    const cleanupFile = async (url: string | null) => {
      if (url && url.startsWith("/uploads/profiles/")) {
        const fullPath = path.join(process.cwd(), "public", url);
        try {
          await unlink(fullPath);
        } catch (e) {
          // ignore
        }
      }
    };

    // Handle profile media upload
    if (removeMedia) {
      await cleanupFile(profile.mediaUrl);
      mediaUrl = null;
      mediaMimeType = null;
    } else if (file && file.size > 0) {
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

      // Create directory
      const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
      await mkdir(uploadDir, { recursive: true });

      // Generate filename using profile ID
      const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
      const filename = `cxa_profile_admin_${profile.id}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, filename);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Clean up old file
      await cleanupFile(profile.mediaUrl);

      mediaUrl = `/uploads/profiles/${filename}`;
      mediaMimeType = file.type;
    }

    // Run updates in transaction
    const updated = await db.$transaction(async (tx) => {
      // 1. Update user login status if linked & requested (only if not leadership)
      if (isActive !== undefined && profile.userId && !isLeadership) {
        const targetUser = await tx.user.findUnique({ where: { id: profile.userId } });
        if (targetUser && targetUser.role !== "OWNER") {
          await tx.user.update({
            where: { id: profile.userId },
            data: { isActive },
          });

          // If disabling target user, destroy all active sessions
          if (!isActive) {
            await tx.session.deleteMany({
              where: { userId: profile.userId },
            });
          }
        }
      }

      // 2. Build profile update payload based on memberType
      const updateData: any = {};
      
      // Update media fields (allowed for both Leadership & Core Team)
      if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
      if (mediaMimeType !== undefined) updateData.mediaMimeType = mediaMimeType;
      if (cropX !== undefined) updateData.cropX = cropX;
      if (cropY !== undefined) updateData.cropY = cropY;
      if (cropW !== undefined) updateData.cropW = cropW;
      if (cropH !== undefined) updateData.cropH = cropH;
      if (cropZoom !== undefined) updateData.cropZoom = cropZoom;
      if (cropRotation !== undefined) updateData.cropRotation = cropRotation;

      if (!isLeadership) {
        // Written details updates only allowed for Core Team
        if (displayName !== undefined) updateData.displayName = displayName.trim();
        if (publicBio !== undefined) updateData.publicBio = publicBio ? publicBio.trim() : null;
        if (isPublic !== undefined) updateData.isPublic = isPublic;
        if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
      }

      const prof = await tx.teamProfile.update({
        where: { id },
        data: updateData,
      });

      return prof;
    });

    // Log the audit
    await logProfileAction(
      actor.id,
      profile.userId,
      "team_member_updated_by_owner",
      `Owner updated profile settings for ${profile.displayName}`
    );

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/team/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden. OWNER role required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const profile = await db.teamProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Team profile not found." }, { status: 404 });
    }

    // Prevent deletion of leadership records
    if (profile.memberType === "LEADERSHIP") {
      return NextResponse.json({ error: "Cannot delete leadership profiles." }, { status: 400 });
    }

    // Prevent owner from deleting their own account
    if (profile.userId === actor.id) {
      return NextResponse.json({ error: "Cannot delete the Owner account." }, { status: 400 });
    }

    // Delete User (which cascades and deletes profile and sessions)
    if (profile.userId) {
      await db.user.delete({
        where: { id: profile.userId },
      });
    } else {
      // Just delete profile if no user login exists
      await db.teamProfile.delete({
        where: { id },
      });
    }

    // Delete profile image file if local upload
    if (profile.mediaUrl && profile.mediaUrl.startsWith("/uploads/profiles/")) {
      const fullPath = path.join(process.cwd(), "public", profile.mediaUrl);
      try {
        await unlink(fullPath);
      } catch (e) {
        // ignore
      }
    }

    // Log audit
    await logProfileAction(
      actor.id,
      profile.userId,
      "team_member_deleted",
      `Owner deleted account/profile for ${profile.displayName}`
    );

    return NextResponse.json({ success: true, message: "Team profile deleted successfully." });
  } catch (err) {
    console.error("[DELETE /api/admin/team/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
