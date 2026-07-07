/**
 * PATCH /api/profile-media/position
 *
 * Saves CSS position metadata only (cropX, cropY, cropW, cropH, cropZoom).
 * Does NOT accept a new file, blobUrl, or nonce.
 * Used by the optional "Adjust Position" inline adjuster.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admins cannot modify profile media position." }, { status: 403 });
  }

  let body: {
    targetProfileId?: string;
    cropX?: number;
    cropY?: number;
    cropW?: number;
    cropH?: number;
    cropZoom?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { targetProfileId, cropX, cropY, cropW, cropH, cropZoom } = body;

  if (!targetProfileId) {
    return NextResponse.json({ error: "targetProfileId is required." }, { status: 400 });
  }

  // Verify the profile exists and the user has permission
  const targetProfile = await db.teamProfile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, userId: true, mediaUrl: true },
  });

  if (!targetProfile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (!targetProfile.mediaUrl) {
    return NextResponse.json({ error: "No media to adjust position for." }, { status: 400 });
  }

  // TEAM_MEMBER can only adjust their own profile
  if (user.role === "TEAM_MEMBER" && targetProfile.userId !== user.id) {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }

  // Update only position metadata
  const updatedProfile = await db.teamProfile.update({
    where: { id: targetProfileId },
    data: {
      cropX: cropX ?? null,
      cropY: cropY ?? null,
      cropW: cropW ?? null,
      cropH: cropH ?? null,
      cropZoom: cropZoom ?? null,
    },
  });

  return NextResponse.json({ success: true, profile: updatedProfile });
}

export const dynamic = "force-dynamic";
