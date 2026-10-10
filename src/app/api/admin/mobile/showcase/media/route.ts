import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile, canViewMobile } from "@/lib/permissions";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { getStorageClient, APK_BUCKET_NAME } from "@/lib/apk-storage";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUser(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canViewMobile(user)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const media = await db.mobileShowcaseMedia.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      media: media.map((m) => ({ ...m, fileSize: Number(m.fileSize || 0) })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to list media." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canManageMobile(user)) {
      return NextResponse.json({ error: "Forbidden. Founder & Co-Founder only." }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No media file uploaded." }, { status: 400 });
      }

      const mediaCategory = (formData.get("mediaCategory") as string) || "SCREENSHOT";
      const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".webm");
      const mediaType = isVideo ? "VIDEO" : "IMAGE";
      const title = (formData.get("title") as string) || file.name.replace(/\.[^/.]+$/, "");
      const caption = (formData.get("caption") as string) || "";
      const featureCategory = (formData.get("featureCategory") as string) || "General";
      const displayOrder = parseInt((formData.get("displayOrder") as string) || "0", 10);
      const isCover = formData.get("isCover") === "true";
      const isFeatured = formData.get("isFeatured") === "true";

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const subFolder = isVideo ? "videos" : "screenshots";
      const storageKey = `showcase/${subFolder}/${safeFilename}`;

      // Save local public copy as fallback
      const publicSubDir = path.resolve(`public/appstore/${subFolder}`);
      if (!fs.existsSync(publicSubDir)) {
        fs.mkdirSync(publicSubDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicSubDir, safeFilename), buffer);
      let publicUrl = `/appstore/${subFolder}/${safeFilename}`;

      // Upload to Supabase Storage
      try {
        const supabase = getStorageClient();
        const { error } = await supabase.storage.from(APK_BUCKET_NAME).upload(storageKey, buffer, {
          contentType: file.type || (isVideo ? "video/mp4" : "image/png"),
          upsert: true,
        });
        if (!error) {
          const { data: urlData } = supabase.storage.from(APK_BUCKET_NAME).getPublicUrl(storageKey);
          if (urlData?.publicUrl) {
            publicUrl = urlData.publicUrl;
          }
        }
      } catch (upErr: any) {
        console.warn("[Media upload Supabase warning]", upErr?.message);
      }

      const actorName = user.displayName || user.username || "Founder";

      const media = await db.mobileShowcaseMedia.create({
        data: {
          mediaCategory: mediaCategory.toUpperCase(),
          mediaType,
          storageProvider: "SUPABASE",
          storageBucket: APK_BUCKET_NAME,
          storageKey,
          publicUrl,
          mimeType: file.type || (isVideo ? "video/mp4" : "image/png"),
          fileSize: BigInt(buffer.length),
          displayOrder,
          title,
          caption,
          altText: `CodeXa Mobile — ${title}`,
          thumbnailUrl: isVideo ? "/appstore/screenshot-1.png" : publicUrl,
          featureCategory,
          isCover,
          isFeatured,
          isPublished: true,
          createdById: user.id,
          createdByName: actorName,
        },
      });

      await dataStore.logAudit({
        actorId: user.id,
        actorName,
        targetId: media.id,
        action: "MOBILE_SHOWCASE_MEDIA_UPLOADED",
        details: `Uploaded showcase ${mediaType.toLowerCase()} '${title}' (${(buffer.length / 1024).toFixed(1)} KB).`,
      });

      return NextResponse.json({
        success: true,
        media: { ...media, fileSize: Number(media.fileSize) },
      });
    } else {
      // JSON metadata registration / reorder batch
      const body = await req.json().catch(() => ({}));

      // Reorder items
      if (body.reorder && Array.isArray(body.items)) {
        for (const item of body.items) {
          if (item.id && typeof item.displayOrder === "number") {
            await db.mobileShowcaseMedia.update({
              where: { id: item.id },
              data: { displayOrder: item.displayOrder },
            }).catch(() => {});
          }
        }

        // Increment content revision
        await db.mobileShowcaseContent.update({
          where: { id: "cxa_mobile_showcase_content" },
          data: { contentRevision: { increment: 1 } },
        }).catch(() => {});

        return NextResponse.json({ success: true, message: "Order updated." });
      }

      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[POST /api/admin/mobile/showcase/media]", err);
    return NextResponse.json({ error: err?.message || "Failed to process media upload." }, { status: 500 });
  }
}
