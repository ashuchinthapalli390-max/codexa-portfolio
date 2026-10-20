import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import {
  updateManagedStickerPack,
  deleteManagedStickerPack,
} from "@/lib/sticker-packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const packId = resolvedParams.id;
    const body = await req.json();

    const result = updateManagedStickerPack(user, packId, body);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error?.startsWith("Forbidden") ? 403 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      pack: result.pack,
    });
  } catch (err: any) {
    console.error("[PATCH /api/mobile/stickers/packs/[id] Error]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update sticker pack." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: any }
) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const packId = resolvedParams.id;

    const result = deleteManagedStickerPack(user, packId);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.error?.startsWith("Forbidden") ? 403 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Sticker pack deleted successfully.",
    });
  } catch (err: any) {
    console.error("[DELETE /api/mobile/stickers/packs/[id] Error]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete sticker pack." },
      { status: 500 }
    );
  }
}
