import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { mediaUrl, cropX = 0, cropY = 0, zoom = 1 } = body;

    if (!mediaUrl) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_MEDIA_URL", message: "Media URL is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Update user profile image
    await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: {
          profileMediaUrl: mediaUrl,
          cropX: Number(cropX),
          cropY: Number(cropY),
          zoom: Number(zoom),
        },
      }),
      db.teamProfile.upsert({
        where: { userId: user.id },
        update: {
          profileMediaUrl: mediaUrl,
          mediaUrl: mediaUrl,
          cropX: Number(cropX),
          cropY: Number(cropY),
          zoom: Number(zoom),
        },
        create: {
          userId: user.id,
          displayName: user.displayName || user.username || "Team Member",
          profileMediaUrl: mediaUrl,
          mediaUrl: mediaUrl,
          cropX: Number(cropX),
          cropY: Number(cropY),
          zoom: Number(zoom),
        },
      }),
      db.mediaAsset.create({
        data: {
          userId: user.id,
          mediaType: "AVATAR",
          publicUrl: mediaUrl,
          cropX: Number(cropX),
          cropY: Number(cropY),
          zoom: Number(zoom),
        },
      }).catch(() => {}),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Avatar updated successfully.",
      avatarUrl: mediaUrl,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/profile/avatar] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to update profile picture." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
