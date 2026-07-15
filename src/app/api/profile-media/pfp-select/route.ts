/**
 * POST /api/profile-media/pfp-select
 *
 * Saves a PFP library image path (from public/assets/pfp/) to Aiven MySQL.
 * No Vercel Blob upload — images already exist in the project as static assets.
 *
 * Body: { targetProfileId, pfpPath, cropX?, cropY?, cropW?, cropH?, cropZoom?, objectPosition? }
 *
 * Permissions:
 *   - OWNER  → can update any profile
 *   - TEAM_MEMBER → can only update their own profile
 *   - ADMIN  → blocked (403)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only paths under /assets/pfp/ are accepted — whitelist prefix security
const VALID_PFP_PREFIX = "/assets/pfp/";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function getMimeFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

interface PfpSelectBody {
  targetProfileId: string;
  pfpPath: string;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  objectPosition?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admins cannot change profile images." },
      { status: 403 }
    );
  }

  let body: PfpSelectBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    targetProfileId,
    pfpPath,
    cropX = null,
    cropY = null,
    cropW = null,
    cropH = null,
    cropZoom = null,
  } = body;

  // 1. Validate required fields
  if (!targetProfileId || !pfpPath) {
    return NextResponse.json(
      { error: "targetProfileId and pfpPath are required." },
      { status: 400 }
    );
  }

  // 2. Whitelist check — path must start with /assets/pfp/
  if (!pfpPath.startsWith(VALID_PFP_PREFIX)) {
    return NextResponse.json(
      { error: "Invalid profile image path." },
      { status: 400 }
    );
  }

  // 3. No path traversal
  const filename = pfpPath.slice(VALID_PFP_PREFIX.length);
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json(
      { error: "Invalid profile image path." },
      { status: 400 }
    );
  }

  // 4. Load target profile
  const targetProfile = await db.teamProfile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, userId: true, memberType: true, displayName: true },
  });

  if (!targetProfile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  // 5. Permission check
  if (user.role === "TEAM_MEMBER" && targetProfile.userId !== user.id) {
    return NextResponse.json(
      { error: "You can only update your own profile." },
      { status: 403 }
    );
  }

  // 6. Derive MIME type from file extension
  const mediaMimeType = getMimeFromPath(pfpPath);

  // 7. Save to Aiven MySQL
  let updatedProfile;
  try {
    updatedProfile = await db.teamProfile.update({
      where: { id: targetProfileId },
      data: {
        mediaUrl: pfpPath,
        mediaMimeType,
        cropX: cropX ?? null,
        cropY: cropY ?? null,
        cropW: cropW ?? null,
        cropH: cropH ?? null,
        cropZoom: cropZoom ?? null,
        cropRotation: null, // CSS-only mode — no rotation
      },
    });
  } catch (dbErr) {
    console.error("[pfp-select] DB save failed:", (dbErr as Error).message);
    return NextResponse.json(
      { error: "Profile image could not be saved. Please try again." },
      { status: 500 }
    );
  }

  // 8. Audit log
  try {
    await logProfileAction(
      user.id,
      targetProfile.userId,
      "pfp_library_select",
      `PFP library image selected for profile ${targetProfile.displayName}: ${pfpPath}`
    );
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ success: true, profile: updatedProfile });
}
