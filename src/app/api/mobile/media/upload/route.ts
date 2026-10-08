import { NextRequest, NextResponse } from "next/server";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { uploadMediaFile, MediaCategory } from "@/lib/media-storage";

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
        { ok: false, error: { code: "UNAUTHORIZED", message: "Valid authentication session required." }, requestId },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let originalFilename = "upload.jpg";
    let mimeType = "image/jpeg";
    let category: MediaCategory = "AVATAR";
    let contextId: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const catParam = (formData.get("category") as string)?.toUpperCase();
      if (catParam) category = catParam as MediaCategory;
      contextId = (formData.get("contextId") as string) || undefined;

      if (!file || file.size === 0) {
        return NextResponse.json(
          { ok: false, error: { code: "EMPTY_FILE", message: "No file was provided in the upload payload." }, requestId },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }

      const arrayBuf = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
      originalFilename = file.name || "upload.jpg";
      mimeType = file.type || "image/jpeg";
    } else {
      const body = await req.json().catch(() => ({}));
      const catParam = body.category?.toUpperCase();
      if (catParam) category = catParam as MediaCategory;
      contextId = body.contextId;

      if (body.base64 && typeof body.base64 === "string") {
        const matches = body.base64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], "base64");
        } else {
          fileBuffer = Buffer.from(body.base64, "base64");
        }
        originalFilename = body.filename || `upload_${Date.now()}.jpg`;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_PAYLOAD", message: "Valid file or base64 data required." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const uploadRes = await uploadMediaFile({
      userId: user.id,
      category,
      fileBuffer,
      originalFilename,
      mimeType,
      contextId,
    });

    if (!uploadRes.success) {
      return NextResponse.json(
        { ok: false, error: { code: "UPLOAD_FAILED", message: uploadRes.error || "Failed to save media." }, requestId },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      ok: true,
      success: true,
      url: uploadRes.publicUrl,
      publicUrl: uploadRes.publicUrl,
      storagePath: uploadRes.storagePath,
      bucket: uploadRes.bucket,
      mimeType: uploadRes.mimeType,
      fileSize: uploadRes.fileSize,
      category,
      requestId,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/media/upload] [${requestId}]`, err);
    return NextResponse.json(
      { ok: false, error: { code: "MEDIA_STORAGE_UNAVAILABLE", message: "Server storage error while handling upload." }, requestId },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
