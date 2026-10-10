import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { saveMediaUpload } from "@/lib/media-storage";
import { formatProfileMediaUrl } from "@/lib/profile-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const CREW_ROLES = [
  "FOUNDER",
  "CO_FOUNDER",
  "CEO",
  "CTO",
  "COO",
  "HR",
  "CORE_TEAM",
  "TEAM_MEMBER",
  "EMPLOYEE",
  "INTERN",
  "ADMIN",
];

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

    // Server-authoritative 24-hour expiration filter
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
            profile: true,
          },
        },
        media: true,
        likes: {
          select: { userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Query user's viewed story post IDs from post_views table
    const storyIds = rawStories.map((s) => s.id);
    let viewedStorySet = new Set<string>();
    if (storyIds.length > 0) {
      try {
        const views = await db.$queryRawUnsafe<Array<{ post_id: string }>>(
          `SELECT post_id FROM post_views WHERE user_id = $1 AND post_id = ANY($2)`,
          user.id,
          storyIds
        );
        views.forEach((v) => viewedStorySet.add(v.post_id));
      } catch (_) {}
    }

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
        isViewed: boolean;
        isLiked: boolean;
        likesCount: number;
        audience: string;
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

      // Check media type from media relation
      if (post.media?.[0]?.mediaType?.includes("video") || post.media?.[0]?.mediaUrl?.match(/\.(mp4|mov|webm)$/i)) {
        storyType = "VIDEO";
      } else if (post.media?.[0]?.mediaUrl) {
        if (storyType === "TEXT") storyType = "IMAGE";
      }

      // Audience check
      const isAuthor = author.id === user.id;
      const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO"].includes(user.role);
      if (!isAuthor && !isLeadership) {
        if (audience === "LEADERSHIP") continue;
        if (audience === "EMPLOYEES_ONLY" && user.role === "INTERN") continue;
      }

      if (!authorMap.has(author.id)) {
        authorMap.set(author.id, {
          authorId: author.id,
          authorName: author.fullName || author.username,
          username: author.username,
          avatarUrl: formatProfileMediaUrl(author.profileMediaUrl || author.profile?.profileMediaUrl || author.profile?.mediaUrl),
          role: author.role,
          isOwnStory: author.id === user.id,
          hasUnseen: false,
          items: [],
        });
      }

      const isViewed = author.id === user.id || viewedStorySet.has(post.id);
      const isLiked = (post.likes || []).some((l) => l.userId === user.id);
      const likesCount = post.likes?.length || 0;

      authorMap.get(author.id)!.items.push({
        id: post.id,
        type: storyType,
        caption,
        mediaUrl: post.media?.[0]?.mediaUrl || null,
        createdAt: post.createdAt.toISOString(),
        expiresAt: new Date(post.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        isViewed,
        isLiked,
        likesCount,
        audience,
      });
    }

    // Determine hasUnseen per author accurately
    authorMap.forEach((group) => {
      if (group.isOwnStory) {
        group.hasUnseen = false;
      } else {
        group.hasUnseen = group.items.some((it) => !it.isViewed);
      }
    });

    const stories = Array.from(authorMap.values()).sort((a, b) => {
      if (a.isOwnStory) return -1;
      if (b.isOwnStory) return 1;
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;
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

    let formData: FormData | null = null;
    let body: any = null;

    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      type = (formData.get("type") as string) || "TEXT";
      content = (formData.get("content") as string) || "";
      audience = (formData.get("audience") as string) || "EVERYONE";

      const file = formData.get("file") as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const isVideo = type.toUpperCase() === "VIDEO" ||
          (file.type && file.type.startsWith("video/")) ||
          (file.name && file.name.match(/\.(mp4|mov|webm|mkv|3gp)$/i));

        const ext = isVideo ? ".mp4" : ".jpg";
        const cleanFilename = file.name && file.name.includes(".") ? file.name : `story_${Date.now()}${ext}`;
        const detectedMime = isVideo ? "video/mp4" : (file.type || "image/jpeg");

        if (isVideo) type = "VIDEO";

        const uploadRes = await saveMediaUpload(
          "stories",
          buffer,
          cleanFilename,
          detectedMime,
          user.id
        );

        if (!uploadRes.success || !uploadRes.publicUrl) {
          return NextResponse.json({
            ok: false,
            error: { code: "STORY_UPLOAD_FAILED", message: uploadRes.error || "Failed to upload story media to storage." }
          }, { status: 500, headers: NO_CACHE_HEADERS });
        }

        mediaUrl = uploadRes.publicUrl;
      }
    } else {
      body = await req.json().catch(() => ({}));
      type = body.type || "TEXT";
      content = body.content || "";
      mediaUrl = body.mediaUrl || null;
      audience = body.audience || "EVERYONE";

      if (body.base64) {
        const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const isVideo = type === "VIDEO" || body.isVideo === true;
        const uploadRes = await saveMediaUpload(
          "stories",
          buffer,
          isVideo ? "story.mp4" : "story.jpg",
          isVideo ? "video/mp4" : "image/jpeg",
          user.id
        );
        if (uploadRes.success && uploadRes.publicUrl) {
          mediaUrl = uploadRes.publicUrl;
        }
      }
    }

    
    // Parse mentions (either explicitly passed or extracted from @usernames in content)
    let mentionedUserIds: string[] = [];
    if (contentType.includes("multipart/form-data")) {
      const mentionsRaw = formData ? ((formData.get("mentions") as string) || "") : "";
      if (mentionsRaw) {
        try {
          const parsed = JSON.parse(mentionsRaw);
          if (Array.isArray(parsed)) mentionedUserIds = parsed;
        } catch (_) {
          mentionedUserIds = mentionsRaw.split(",").map(m => m.trim()).filter(Boolean);
        }
      }
    } else {
      if (body && Array.isArray(body.mentions)) {
        mentionedUserIds = body.mentions;
      }
    }

    // Extract @usernames from text content
    const usernameMatches = (content.match(/@([a-zA-Z0-9_\.]+)/g) || []).map((m) => m.slice(1).toLowerCase());

    // 15 & 16. Validate mentions - Crew Members Only
    if (mentionedUserIds.length > 0 || usernameMatches.length > 0) {
      const usersToCheck = await db.user.findMany({
        where: {
          OR: [
            ...(mentionedUserIds.length > 0 ? [{ id: { in: mentionedUserIds } }] : []),
            ...(usernameMatches.length > 0 ? [{ username: { in: usernameMatches } }] : []),
          ],
        },
        select: { id: true, username: true, role: true, isActive: true },
      });

      // Ensure every mentioned user exists and is an active Crew member
      for (const mUser of usersToCheck) {
        if (!mUser.isActive || !CREW_ROLES.includes(mUser.role)) {
          return NextResponse.json({
            ok: false,
            error: {
              code: "STORY_MENTION_NOT_ALLOWED",
              message: `User @${mUser.username} is not an authorized CodeXa Crew member.`,
            },
          }, { status: 400, headers: NO_CACHE_HEADERS });
        }
      }
    }

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

    // Notify team members asynchronously
    (async () => {
      try {
        const teamUsers = await db.user.findMany({
          where: { id: { not: user.id }, isActive: true },
          select: { id: true },
          take: 30,
        });

        for (const tUser of teamUsers) {
          db.notification.create({
            data: {
              userId: tUser.id,
              type: "SOCIAL",
              title: `${user.displayName || "A teammate"} posted a new Story`,
              message: content.trim().slice(0, 80) || "Check out the latest story on CodeXa",
              link: `/stories?storyId=${post.id}`,
            },
          }).catch(() => {});
        }
      } catch (_) {}
    })().catch(console.error);

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
        isViewed: true,
        isLiked: false,
        likesCount: 0,
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(`[POST /api/mobile/stories] [${requestId}]`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to publish story." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
