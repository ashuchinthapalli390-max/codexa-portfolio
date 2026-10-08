import fs from "fs";
import path from "path";

const content = `import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import path from "path";
import crypto from "crypto";
import fs from "fs";

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
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
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
        const ext = path.extname(file.name) || ".jpg";
        const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : ".jpg";
        const filename = \`avatar_\${user.id}_\${Date.now()}_\${crypto.randomBytes(4).toString("hex")}\${safeExt}\`;
        
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        mediaUrl = \`https://codxa-agency.online/uploads/avatars/\${filename}\`;
      } else {
        mediaUrl = (formData.get("mediaUrl") as string) || "";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      cropX = Number(body.cropX || 0);
      cropY = Number(body.cropY || 0);
      zoom = Number(body.zoom || 1);

      if (body.base64) {
        const cleanBase64 = body.base64.replace(/^data:image\\/\\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const filename = \`avatar_\${user.id}_\${Date.now()}_\${crypto.randomBytes(4).toString("hex")}.jpg\`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        mediaUrl = \`https://codxa-agency.online/uploads/avatars/\${filename}\`;
      } else {
        mediaUrl = body.mediaUrl || "";
      }
    }

    if (!mediaUrl) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_IMAGE", message: "Image file or valid data is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Update user profile image in database
    await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: {
          profileMediaUrl: mediaUrl,
          cropX,
          cropY,
          zoom,
        },
      }),
      db.teamProfile.upsert({
        where: { userId: user.id },
        update: {
          profileMediaUrl: mediaUrl,
          mediaUrl: mediaUrl,
          cropX,
          cropY,
          zoom,
        },
        create: {
          userId: user.id,
          displayName: user.displayName || user.username || "Team Member",
          profileMediaUrl: mediaUrl,
          mediaUrl: mediaUrl,
          cropX,
          cropY,
          zoom,
        },
      }),
      db.mediaAsset.create({
        data: {
          userId: user.id,
          mediaType: "AVATAR",
          publicUrl: mediaUrl,
          cropX,
          cropY,
          zoom,
        },
      }).catch(() => {}),
    ]);

    return NextResponse.json({
      ok: true,
      message: "Avatar updated successfully.",
      avatarUrl: mediaUrl,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(\`[POST /api/mobile/profile/avatar] [\${requestId}]\`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to update profile picture." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
`;

fs.writeFileSync(path.join(process.cwd(), "src/app/api/mobile/profile/avatar/route.ts"), content, "utf8");
console.log("Updated src/app/api/mobile/profile/avatar/route.ts");
