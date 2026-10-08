import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { uploadMediaFile } from "@/lib/media-storage";

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
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized. Please log in." } },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    let mediaUrl = "";
    let cropX = 0;
    let cropY = 0;
    let zoom = 1;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      cropX = Number(formData.get("cropX") || 0);
      cropY = Number(formData.get("cropY") || 0);
      zoom = Number(formData.get("zoom") || 1);

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadRes = await uploadMediaFile({
          userId: user.id,
          category: "AVATAR",
          fileBuffer: buffer,
          originalFilename: file.name,
          mimeType: file.type,
        });

        if (!uploadRes.success) {
          return NextResponse.json(
            { ok: false, error: { code: "PHOTO_UPLOAD_FAILED", message: uploadRes.error || "Failed to upload avatar." }, requestId },
            { status: 400, headers: NO_CACHE_HEADERS }
          );
        }
        mediaUrl = uploadRes.publicUrl;
      } else {
        mediaUrl = (formData.get("mediaUrl") as string) || "";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      cropX = Number(body.cropX || 0);
      cropY = Number(body.cropY || 0);
      zoom = Number(body.zoom || 1);

      if (body.base64) {
        const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const uploadRes = await uploadMediaFile({
          userId: user.id,
          category: "AVATAR",
          fileBuffer: buffer,
          originalFilename: body.filename || `avatar_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        });

        if (!uploadRes.success) {
          return NextResponse.json(
            { ok: false, error: { code: "PHOTO_UPLOAD_FAILED", message: uploadRes.error || "Failed to upload avatar." }, requestId },
            { status: 400, headers: NO_CACHE_HEADERS }
          );
        }
        mediaUrl = uploadRes.publicUrl;
      } else {
        mediaUrl = body.mediaUrl || "";
      }
    }

    const isRemoving = mediaUrl === "" || mediaUrl === "REMOVE";

    if (!mediaUrl && !isRemoving) {
      return NextResponse.json(
        { ok: false, error: { code: "MISSING_IMAGE", message: "Image file or valid image data is required." } },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const targetUrl = isRemoving ? null : mediaUrl;

    // Update both User and TeamProfile records in database
    await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: {
          profileMediaUrl: targetUrl,
          cropX,
          cropY,
          zoom,
        },
      }),
      db.teamProfile.upsert({
        where: { userId: user.id },
        update: {
          profileMediaUrl: targetUrl,
          mediaUrl: targetUrl,
          cropX,
          cropY,
          zoom,
        },
        create: {
          userId: user.id,
          displayName: user.displayName || user.username || "Team Member",
          profileMediaUrl: targetUrl,
          mediaUrl: targetUrl,
          cropX,
          cropY,
          zoom,
        },
      }),
      !isRemoving && targetUrl
        ? db.mediaAsset.create({
            data: {
              userId: user.id,
              mediaType: "AVATAR",
              publicUrl: targetUrl,
              cropX,
              cropY,
              zoom,
            },
          }).catch(() => {})
        : Promise.resolve(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        success: true,
        message: isRemoving ? "Profile photo removed." : "Profile photo updated successfully across website and mobile.",
        avatarUrl: targetUrl,
        publicUrl: targetUrl,
        requestId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error(`[POST /api/mobile/profile/avatar] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "PHOTO_UPLOAD_FAILED", message: err?.message || "Failed to update profile photo." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
