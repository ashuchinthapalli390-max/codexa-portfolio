import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export async function GET() {
  try {
    const pfpDir = path.join(process.cwd(), "public", "assets", "pfp");

    if (!fs.existsSync(pfpDir)) {
      return NextResponse.json({ success: true, assets: [] });
    }

    const files = fs.readdirSync(pfpDir);
    const assets = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_EXTENSIONS.has(ext);
      })
      .map((file) => {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, ext);
        const displayName = baseName
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          id: file,
          name: displayName.length > 20 ? `${displayName.substring(0, 18)}...` : displayName,
          path: `/assets/pfp/${file}`,
          isGif: ext === ".gif",
          ext,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      assets,
      total: assets.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to load existing assets.", assets: [] },
      { status: 500 }
    );
  }
}
