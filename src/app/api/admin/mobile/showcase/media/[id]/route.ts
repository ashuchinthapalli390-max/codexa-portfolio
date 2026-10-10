import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult, validateSessionResult } from "@/lib/auth";
import { canManageMobile } from "@/lib/permissions";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/data-store";
import { getStorageClient, APK_BUCKET_NAME } from "@/lib/apk-storage";

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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canManageMobile(user)) {
      return NextResponse.json({ error: "Forbidden. Founder & Co-Founder only." }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const existing = await db.mobileShowcaseMedia.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Media item not found." }, { status: 404 });
    }

    const updated = await db.mobileShowcaseMedia.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : existing.title,
        caption: body.caption !== undefined ? body.caption : existing.caption,
        altText: body.altText !== undefined ? body.altText : existing.altText,
        featureCategory: body.featureCategory !== undefined ? body.featureCategory : existing.featureCategory,
        displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : existing.displayOrder,
        isCover: typeof body.isCover === "boolean" ? body.isCover : existing.isCover,
        isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : existing.isFeatured,
        isPublished: typeof body.isPublished === "boolean" ? body.isPublished : existing.isPublished,
      },
    });

    // Invalidate/bump catalog revision
    await db.mobileShowcaseContent.update({
      where: { id: "cxa_mobile_showcase_content" },
      data: { contentRevision: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      media: { ...updated, fileSize: Number(updated.fileSize) },
    });
  } catch (err: any) {
    console.error("[PUT /api/admin/mobile/showcase/media/[id]]", err);
    return NextResponse.json({ error: err?.message || "Failed to update media." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canManageMobile(user)) {
      return NextResponse.json({ error: "Forbidden. Founder & Co-Founder only." }, { status: 403 });
    }

    const { id } = params;
    const existing = await db.mobileShowcaseMedia.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Media item not found." }, { status: 404 });
    }

    // Try deleting from Supabase Storage
    if (existing.storageBucket && existing.storageKey) {
      try {
        const supabase = getStorageClient();
        await supabase.storage.from(existing.storageBucket).remove([existing.storageKey]);
      } catch (delErr: any) {
        console.warn("[Media deletion storage warning]", delErr?.message);
      }
    }

    await db.mobileShowcaseMedia.delete({ where: { id } });

    // Bump catalog revision
    await db.mobileShowcaseContent.update({
      where: { id: "cxa_mobile_showcase_content" },
      data: { contentRevision: { increment: 1 } },
    }).catch(() => {});

    const actorName = user.displayName || user.username || "Founder";
    await dataStore.logAudit({
      actorId: user.id,
      actorName,
      targetId: id,
      action: "MOBILE_SHOWCASE_MEDIA_DELETED",
      details: `Deleted showcase media '${existing.title || id}'.`,
    });

    return NextResponse.json({ success: true, message: "Media deleted successfully." });
  } catch (err: any) {
    console.error("[DELETE /api/admin/mobile/showcase/media/[id]]", err);
    return NextResponse.json({ error: err?.message || "Failed to delete media." }, { status: 500 });
  }
}
