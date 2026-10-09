import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";

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
        author: { select: { id: true } },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                role: true,
                profileMediaUrl: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ ok: false, error: "Story not found" }, { status: 404 });
    }

    // Story owner check
    const isOwner = post.authorId === user.id;

    // Fetch unique viewers
    const views = await db.$queryRawUnsafe<Array<{ user_id: string; created_at: Date }>>(
      `SELECT user_id, created_at FROM post_views WHERE post_id = $1 ORDER BY created_at DESC`,
      storyId
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
      },
    }) : [];

    const userMap = new Map(viewerUsers.map(u => [u.id, u]));

    const viewerList = isOwner ? views.map(v => {
      const u = userMap.get(v.user_id);
      return {
        id: v.user_id,
        name: u?.fullName || u?.username || "Colleague",
        username: u?.username,
        role: u?.role,
        avatarUrl: u?.profileMediaUrl || null,
        viewedAt: v.created_at,
      };
    }) : [];

    const likerList = (post.likes || []).map(l => ({
      id: l.user.id,
      name: l.user.fullName || l.user.username,
      username: l.user.username,
      role: l.user.role,
      avatarUrl: l.user.profileMediaUrl || null,
      likedAt: l.createdAt,
    }));

    return NextResponse.json({
      ok: true,
      storyId,
      totalViewers: views.length,
      totalLikes: post.likes.length,
      viewers: viewerList,
      likers: likerList,
      isOwner,
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/stories/[id]/activity]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
