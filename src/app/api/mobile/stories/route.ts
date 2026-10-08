import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import path from "path";
import crypto from "crypto";

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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rawStories = await db.post.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: twentyFourHoursAgo },
        content: { startsWith: "[CODEXA_STORY" },
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            profileMediaUrl: true,
          },
        },
        media: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group stories by author
    const authorMap = new Map<string, {
      authorId: string;
      authorName: string;
      username: string;
      avatarUrl: string | null;
      role: string;
      isOwnStory: boolean;
      hasUnseen: boolean;
      items: Array<{
        id: string;
        type: string;
        caption: string;
        mediaUrl?: string | null;
        createdAt: string;
        expiresAt: string;
      }>;
    }>();

    for (const post of rawStories) {
      const author = post.author;
      if (!author) continue;

      let storyType = "TEXT";
      let audience = "EVERYONE";
      let caption = post.content;

      const tagMatch = post.content.match(/^\[CODEXA_STORY:([^:]+):([^\]]+)\]\n?([\s\S]*)$/);
      if (tagMatch) {
        storyType = tagMatch[1];
        audience = tagMatch[2];
        caption = tagMatch[3].trim();
      }

      if (!authorMap.has(author.id)) {
        authorMap.set(author.id, {
          authorId: author.id,
          authorName: author.fullName || author.username,
          username: author.username,
          avatarUrl: author.profileMediaUrl,
          role: author.role,
          isOwnStory: author.id === user.id,
          hasUnseen: author.id !== user.id,
          items: [],
        });
      }

      authorMap.get(author.id)!.items.push({
        id: post.id,
        type: storyType,
        caption,
        mediaUrl: post.media?.[0]?.mediaUrl || null,
        createdAt: post.createdAt.toISOString(),
        expiresAt: new Date(post.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const stories = Array.from(authorMap.values()).sort((a, b) => {
      if (a.isOwnStory) return -1;
      if (b.isOwnStory) return 1;
      return 0;
    });

    return NextResponse.json({
      ok: true,
      stories,
      count: stories.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/mobile/stories]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load stories." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    let type = "TEXT";
    let content = "";
    let mediaUrl: string | null = null;
    let audience = "EVERYONE";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      type = (formData.get("type") as string) || "TEXT";
      content = (formData.get("content") as string) || "";
      audience = (formData.get("audience") as string) || "EVERYONE";

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(file.name) || (type === "VIDEO" ? ".mp4" : ".jpg");
        const filename = `story_${user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "stories");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        mediaUrl = `https://codxa-agency.online/uploads/stories/${filename}`;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      type = body.type || "TEXT";
      content = body.content || "";
      mediaUrl = body.mediaUrl || null;
      audience = body.audience || "EVERYONE";

      if (body.base64) {
        const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const isVideo = type === "VIDEO" || body.isVideo === true;
        const ext = isVideo ? ".mp4" : ".jpg";
        const filename = `story_${user.id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "stories");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        mediaUrl = `https://codxa-agency.online/uploads/stories/${filename}`;
      }
    }

    const validTypes = ["TEXT", "IMAGE", "VIDEO", "PROJECT_UPDATE", "ANNOUNCEMENT", "MILESTONE"];
    const normalizedType = validTypes.includes(type.toUpperCase()) ? type.toUpperCase() : "TEXT";

    if (!content.trim() && !mediaUrl) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Story content or media is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const storyContent = `[CODEXA_STORY:${normalizedType}:${audience}]
${content.trim()}`;

    const post = await db.post.create({
      data: {
        authorId: user.id,
        content: storyContent,
        isAnnouncement: normalizedType === "ANNOUNCEMENT",
        media: mediaUrl ? {
          create: [{
            mediaUrl,
            mediaType: normalizedType === "VIDEO" ? "video/mp4" : "image/jpeg",
          }],
        } : undefined,
      },
      include: {
        author: {
          select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true },
        },
        media: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Story created successfully.",
      story: {
        id: post.id,
        type: normalizedType,
        caption: content.trim(),
        mediaUrl: post.media?.[0]?.mediaUrl || mediaUrl || null,
        createdAt: post.createdAt.toISOString(),
        expiresAt: new Date(post.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/stories] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to publish story." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
