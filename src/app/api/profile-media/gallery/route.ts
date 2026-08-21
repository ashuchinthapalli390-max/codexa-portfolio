import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const gallery = await dataStore.getMediaAssets(user.id, "AVATAR");

    return NextResponse.json({
      success: true,
      gallery,
      total: gallery.length,
      currentAvatarUrl: user.mediaUrl || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch gallery." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Asset ID is required." }, { status: 400 });
    }

    // Check if the asset is currently used as active avatar
    const activeMediaUrl = user.mediaUrl || null;
    const gallery = await dataStore.getMediaAssets(user.id, "AVATAR");
    const asset = gallery.find((g) => g.id === id);

    if (asset && activeMediaUrl && (activeMediaUrl === asset.publicUrl || activeMediaUrl === asset.storagePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete your active profile picture. Please select another avatar first.",
        },
        { status: 400 }
      );
    }

    const deleted = await dataStore.deleteMediaAsset(id, user.id);

    if (deleted) {
      await dataStore.logAudit(
        "PROFILE_IMAGE_REMOVED",
        user.id,
        `User @${user.username} deleted gallery asset ${id}.`
      );
    }

    return NextResponse.json({
      success: deleted,
      message: deleted ? "Asset deleted successfully." : "Asset not found or unauthorized.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to delete gallery asset." },
      { status: 500 }
    );
  }
}
