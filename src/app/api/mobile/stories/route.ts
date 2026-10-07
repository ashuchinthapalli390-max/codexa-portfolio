import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";

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
      const headerMatch = post.content.match(/^\[CODEXA_STORY:([A-Z_]+)(?::([^\]]+))?\]\n?([\s\S]*)$/);
      const storyType = headerMatch ? headerMatch[1] : "TEXT";
      const caption = headerMatch ? headerMatch[3].trim() : post.content;
      const mediaItem = post.media?.[0]?.mediaUrl || null;
      const expiresAt = new Date(post.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();

      if (!authorMap.has(post.authorId)) {
        authorMap.set(post.authorId, {
          authorId: post.authorId,
          authorName: post.author.fullName || post.author.username,
          username: post.author.username,
          avatarUrl: post.author.profileMediaUrl,
          role: post.author.role,
          isOwnStory: post.authorId === user.id,
          hasUnseen: true,
          items: [],
        });
      }

      authorMap.get(post.authorId)!.items.push({
        id: post.id,
        type: storyType,
        caption,
        mediaUrl: mediaItem,
        createdAt: post.createdAt.toISOString(),
        expiresAt,
      });
    }

    // Place current user's story first if present
    const storyGroups = Array.from(authorMap.values()).sort((a, b) => {
      if (a.isOwnStory) return -1;
      if (b.isOwnStory) return 1;
      return 0;
    });

    return NextResponse.json({
      ok: true,
      stories: storyGroups,
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

    const body = await req.json().catch(() => ({}));
    const { type = "TEXT", content = "", mediaUrl = null, audience = "EVERYONE" } = body;

    const validTypes = ["TEXT", "IMAGE", "VIDEO", "PROJECT_UPDATE", "ANNOUNCEMENT", "MILESTONE"];
    const normalizedType = validTypes.includes(type.toUpperCase()) ? type.toUpperCase() : "TEXT";

    if (!content.trim() && !mediaUrl) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Story content or media is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const storyContent = `[CODEXA_STORY:${normalizedType}:${audience}]\n${content.trim()}`;

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
        mediaUrl: post.media?.[0]?.mediaUrl || null,
        createdAt: post.createdAt.toISOString(),
        expiresAt: new Date(post.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/stories] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to publish story." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
