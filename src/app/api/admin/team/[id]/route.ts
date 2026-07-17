/**
 * PATCH & DELETE /api/admin/team/[id]
 *
 * PATCH: Edit profile details, display order, visibility, and user login status (isActive).
 * Does NOT handle file uploads directly (handled via direct-to-blob + commit flow).
 * Supports removeMedia logic.
 *
 * DELETE: Safely delete user account and team profile, and clean up their Vercel Blob file.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteProfileMedia } from "@/lib/upload";

export const runtime = "nodejs";

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
  let isPublic: boolean | undefined = undefined;
  let displayOrder: number | undefined = undefined;
  let isActive: boolean | undefined = undefined;
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

      removeMedia = formData.get("removeMedia") === "true";
    } catch {
      return NextResponse.json({ error: "Failed to parse multipart form data." }, { status: 400 });
    }
  } else {
    try {
      const body = await req.json();
      displayName = body.displayName;
      publicBio = body.publicBio;
      isPublic = body.isPublic;
      displayOrder = body.displayOrder;
      isActive = body.isActive;
      removeMedia = body.removeMedia === true;
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

    let mediaUrlPayload: Record<string, unknown> = {};

    if (removeMedia) {
      // Delete old blob safely
      await deleteProfileMedia(profile.mediaUrl);
      mediaUrlPayload = {
        mediaUrl: null,
        mediaMimeType: null,
        profileMediaUrl: null,
        profileMediaMimeType: null,
        zoom: null,
        objectPosition: null,
        cropX: null,
        cropY: null,
        cropW: null,
        cropH: null,
        cropZoom: null,
        cropRotation: null,
      };
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

      if (removeMedia && profile.userId) {
        await tx.user.update({
          where: { id: profile.userId },
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

      // 2. Build profile update payload
      const updateData: any = { ...mediaUrlPayload };

      if (!isLeadership) {
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
      await db.teamProfile.delete({
        where: { id },
      });
    }

    // Delete profile image file if it exists on Vercel Blob
    await deleteProfileMedia(profile.mediaUrl);

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
