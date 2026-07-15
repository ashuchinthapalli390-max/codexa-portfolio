/**
 * GET /api/pfp-library
 *
 * Returns a list of all available PFP images from public/assets/pfp/.
 * Server-side directory scan — safe since these are static public assets.
 */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export async function GET(): Promise<NextResponse> {
  try {
    const pfpDir = path.join(process.cwd(), "public", "assets", "pfp");

    if (!fs.existsSync(pfpDir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(pfpDir);
    const images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_EXTENSIONS.has(ext);
      })
      .map((file) => `/assets/pfp/${file}`)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ images });
  } catch (err) {
    console.error("[pfp-library] Failed to read pfp directory:", err);
    return NextResponse.json({ images: [] });
  }
}
