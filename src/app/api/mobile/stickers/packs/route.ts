import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import {
  getManagedStickerPacks,
  createManagedStickerPack,
} from "@/lib/sticker-packs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Valid CodeXa session required." },
        { status: 401 }
      );
    }

    const { packs, permissions } = getManagedStickerPacks(user);

    return NextResponse.json({
      ok: true,
      packs,
      permissions,
      totalCount: packs.length,
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/stickers/packs Error]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch sticker packs." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = createManagedStickerPack(user, body);

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
    console.error("[POST /api/mobile/stickers/packs Error]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create sticker pack." },
      { status: 500 }
    );
  }
}
