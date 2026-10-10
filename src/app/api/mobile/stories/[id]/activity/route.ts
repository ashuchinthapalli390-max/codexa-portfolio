import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
import { formatProfileMediaUrl } from "@/lib/profile-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const storyId = resolvedParams.id;

  try {
    const post = await db.post.findUnique({
      where: { id: storyId },
      include: {
        author: { select: { id: true, fullName: true, username: true } },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                role: true,
                profileMediaUrl: true,
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ ok: false, error: "Story not found" }, { status: 404 });
    }

    const isOwner = post.authorId === user.id;
    const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO"].includes(user.role);

    // 11. STORY VIEWER PRIVACY - Only story owner & authorized leadership may access viewer identities
    if (!isOwner && !isLeadership) {
      return NextResponse.json({
        ok: false,
        error: { code: "FORBIDDEN", message: "Only the story owner can view story activity." }
      }, { status: 403 });
    }

    // Fetch unique viewers excluding owner
    const views = await db.$queryRawUnsafe<Array<{ user_id: string; created_at: Date }>>(
      `SELECT user_id, created_at FROM post_views WHERE post_id = $1 AND user_id != $2 ORDER BY created_at DESC`,
      storyId,
      post.authorId
    ).catch(() => []);

    const viewerIds = views.map(v => v.user_id);
    const viewerUsers = viewerIds.length > 0 ? await db.user.findMany({
      where: { id: { in: viewerIds } },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        profileMediaUrl: true,
        profile: true,
      },
    }) : [];

    const userMap = new Map(viewerUsers.map(u => [u.id, u]));
    const likedUserIds = new Set(post.likes.map(l => l.userId));

    const viewerList = views.map(v => {
      const u = userMap.get(v.user_id);
      return {
        id: v.user_id,
        name: u?.fullName || u?.username || "Colleague",
        username: u?.username || "user",
        role: u?.role || "MEMBER",
        avatarUrl: formatProfileMediaUrl(u?.profileMediaUrl || u?.profile?.profileMediaUrl || u?.profile?.mediaUrl),
        viewedAt: v.created_at.toISOString(),
        hasLiked: likedUserIds.has(v.user_id),
      };
    });

    const likerList = (post.likes || []).map(l => ({
      id: l.user.id,
      name: l.user.fullName || l.user.username,
      username: l.user.username,
      role: l.user.role,
      avatarUrl: formatProfileMediaUrl(l.user.profileMediaUrl || l.user.profile?.profileMediaUrl || l.user.profile?.mediaUrl),
      likedAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      storyId,
      totalViewers: views.length,
      totalLikes: post.likes.length,
      publishedAt: post.createdAt.toISOString(),
      expiresAt: new Date(post.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      viewers: viewerList,
      likers: likerList,
      isOwner,
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/stories/[id]/activity]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
