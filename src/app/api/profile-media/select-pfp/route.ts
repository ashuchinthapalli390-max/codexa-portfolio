/**
 * POST /api/profile-media/select-pfp
 *
 * Saves a PFP library image path (from public/assets/pfp/) to Aiven MySQL.
 * Safe, validated, and role-based permissions.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeReferenceId(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

function isValidPfpPath(path: string): boolean {
  return (
    path.startsWith("/assets/pfp/") &&
    !path.includes("..") &&
    !path.includes(":") && // reject Windows absolute paths or protocol streams
    /\.(png|jpg|jpeg|webp|gif)$/i.test(path)
  );
}

interface SelectPfpBody {
  targetType: "USER" | "TEAM_PROFILE" | "LEADERSHIP";
  targetId: string;
  profileMediaUrl: string;
  profileMediaMimeType: string;
  cropX?: number | null;
  cropY?: number | null;
  zoom?: number | null;
  objectPosition?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ref = makeReferenceId();
  console.log(`[PROFILE_UPDATE_START] ref=${ref}`);

  // 1. Verify Session
  const user = await getCurrentUser();
  if (!user) {
    console.warn(`[PROFILE_UPDATE_AUTH_MISSING] ref=${ref}`);
    return NextResponse.json(
      { error: "Unauthorized. Please log in.", ref },
      { status: 401 }
    );
  }

  // 2. Verify Role (ADMIN is read-only)
  if (user.role === "ADMIN") {
    console.warn(`[PROFILE_UPDATE_PERMISSION_DENIED] ref=${ref} reason=ADMIN_BLOCKED`);
    return NextResponse.json(
      { error: "Admins cannot change profile images.", ref },
      { status: 403 }
    );
  }

  let body: SelectPfpBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body.", ref },
      { status: 400 }
    );
  }

  const {
    targetType,
    targetId,
    profileMediaUrl,
    profileMediaMimeType,
    cropX = 0,
    cropY = 0,
    zoom = 1,
    objectPosition = "center",
  } = body;

  // 3. Validate Inputs
  if (!targetType || !targetId || !profileMediaUrl || !profileMediaMimeType) {
    return NextResponse.json(
      { error: "Missing required fields.", ref },
      { status: 400 }
    );
  }

  // 4. Validate PFP Path (strict whitelist check + no traversal)
  if (!isValidPfpPath(profileMediaUrl)) {
    console.warn(`[PROFILE_UPDATE_INVALID_PFP_PATH] ref=${ref} path=${profileMediaUrl}`);
    return NextResponse.json(
      { error: "Invalid profile image path. Must be a valid local PFP image under /assets/pfp/.", ref },
      { status: 400 }
    );
  }

  try {
    // 5. Validate target ownership/permission based on targetType
    if (targetType === "USER") {
      // Must be own profile (userId must match user.id)
      if (targetId !== user.id) {
        console.warn(`[PROFILE_UPDATE_PERMISSION_DENIED] ref=${ref} reason=USER_TARGET_MISMATCH`);
        return NextResponse.json(
          { error: "You can only update your own profile.", ref },
          { status: 403 }
        );
      }

      // Update User model
      await db.user.update({
        where: { id: user.id },
        data: {
          profileMediaUrl,
          profileMediaMimeType,
          cropX: cropX ?? 0,
          cropY: cropY ?? 0,
          zoom: zoom ?? 1,
          objectPosition: objectPosition ?? "center",
        },
      });

      // Update associated TeamProfile model if it exists
      const associatedProfile = await db.teamProfile.findUnique({
        where: { userId: user.id },
      });

      if (associatedProfile) {
        const updatedProfile = await db.teamProfile.update({
          where: { userId: user.id },
          data: {
            profileMediaUrl,
            profileMediaMimeType,
            cropX: cropX ?? 0,
            cropY: cropY ?? 0,
            cropZoom: zoom ?? 1,
            zoom: zoom ?? 1,
            objectPosition: objectPosition ?? "center",
            mediaUrl: profileMediaUrl,
            mediaMimeType: profileMediaMimeType,
            cropW: 100,
            cropH: 100,
          },
        });

        console.log(`[PROFILE_UPDATE_SUCCESS] ref=${ref} targetType=USER targetId=${user.id}`);
        return NextResponse.json({ success: true, profile: updatedProfile });
      }

      console.log(`[PROFILE_UPDATE_SUCCESS] ref=${ref} targetType=USER targetId=${user.id} (no associated TeamProfile)`);
      return NextResponse.json({ success: true });
    }

    if (targetType === "TEAM_PROFILE") {
      const targetProfile = await db.teamProfile.findUnique({
        where: { id: targetId },
      });

      if (!targetProfile) {
        console.warn(`[PROFILE_UPDATE_TARGET_NOT_FOUND] ref=${ref} targetId=${targetId}`);
        return NextResponse.json(
          { error: "Target profile not found.", ref },
          { status: 404 }
        );
      }

      // Permissions: OWNER can update any core team profile, TEAM_MEMBER can only update own
      if (user.role === "TEAM_MEMBER" && targetProfile.userId !== user.id) {
        console.warn(`[PROFILE_UPDATE_PERMISSION_DENIED] ref=${ref} reason=TEAM_MEMBER_CORE_TEAM_MISMATCH`);
        return NextResponse.json(
          { error: "You can only update your own profile.", ref },
          { status: 403 }
        );
      }

      const updatedProfile = await db.teamProfile.update({
        where: { id: targetId },
        data: {
          profileMediaUrl,
          profileMediaMimeType,
          cropX: cropX ?? 0,
          cropY: cropY ?? 0,
          cropZoom: zoom ?? 1,
          zoom: zoom ?? 1,
          objectPosition: objectPosition ?? "center",
          mediaUrl: profileMediaUrl,
          mediaMimeType: profileMediaMimeType,
          cropW: 100,
          cropH: 100,
        },
      });

      // Also sync user profile fields if associated
      if (targetProfile.userId) {
        await db.user.update({
          where: { id: targetProfile.userId },
          data: {
            profileMediaUrl,
            profileMediaMimeType,
            cropX: cropX ?? 0,
            cropY: cropY ?? 0,
            zoom: zoom ?? 1,
            objectPosition: objectPosition ?? "center",
          },
        }).catch(() => {});
      }

      console.log(`[PROFILE_UPDATE_SUCCESS] ref=${ref} targetType=TEAM_PROFILE targetId=${targetId}`);
      return NextResponse.json({ success: true, profile: updatedProfile });
    }

    if (targetType === "LEADERSHIP") {
      // Only OWNER can update leadership profiles
      if (user.role !== "OWNER") {
        console.warn(`[PROFILE_UPDATE_PERMISSION_DENIED] ref=${ref} reason=NON_OWNER_LEADERSHIP_UPDATE`);
        return NextResponse.json(
          { error: "Only the Owner can update leadership profile media.", ref },
          { status: 403 }
        );
      }

      const targetProfile = await db.teamProfile.findUnique({
        where: { id: targetId },
      });

      if (!targetProfile) {
        console.warn(`[PROFILE_UPDATE_TARGET_NOT_FOUND] ref=${ref} targetId=${targetId}`);
        return NextResponse.json(
          { error: "Target leadership profile not found.", ref },
          { status: 404 }
        );
      }

      const updatedProfile = await db.teamProfile.update({
        where: { id: targetId },
        data: {
          profileMediaUrl,
          profileMediaMimeType,
          cropX: cropX ?? 0,
          cropY: cropY ?? 0,
          cropZoom: zoom ?? 1,
          zoom: zoom ?? 1,
          objectPosition: objectPosition ?? "center",
          mediaUrl: profileMediaUrl,
          mediaMimeType: profileMediaMimeType,
          cropW: 100,
          cropH: 100,
        },
      });

      console.log(`[PROFILE_UPDATE_SUCCESS] ref=${ref} targetType=LEADERSHIP targetId=${targetId}`);
      return NextResponse.json({ success: true, profile: updatedProfile });
    }

    // Invalid targetType
    return NextResponse.json(
      { error: "Invalid target type.", ref },
      { status: 400 }
    );
  } catch (err) {
    console.error(`[PROFILE_UPDATE_DB_FAILED] ref=${ref} error=${(err as Error).message}`);
    return NextResponse.json(
      { error: "Database operation failed. Please try again.", ref },
      { status: 500 }
    );
  }
}
