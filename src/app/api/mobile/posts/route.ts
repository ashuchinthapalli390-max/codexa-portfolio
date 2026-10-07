import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { resolveAllMobileFeatures } from "@/lib/mobile-features";

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

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const posts = await db.post.findMany({
      where: { isDeleted: false },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            profileMediaUrl: true,
            profile: { select: { displayName: true, primaryRole: true, mediaUrl: true } },
          },
        },
        project: { select: { id: true, title: true, slug: true } },
        likes: { select: { userId: true } },
        comments: {
          where: { isDeleted: false },
          include: {
            user: { select: { id: true, fullName: true, username: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({
      ok: true,
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        isAnnouncement: p.isAnnouncement,
        createdAt: p.createdAt,
        author: {
          id: p.author.id,
          name: p.author.fullName || p.author.profile?.displayName || p.author.username,
          username: p.author.username,
          role: p.author.role,
          primaryRole: p.author.profile?.primaryRole || p.author.role,
          avatarUrl: p.author.profileMediaUrl || p.author.profile?.mediaUrl,
        },
        project: p.project ? { id: p.project.id, title: p.project.title, slug: p.project.slug } : null,
        likesCount: p.likes.length,
        hasLiked: p.likes.some((l) => l.userId === user.id),
        commentsCount: p.comments.length,
        comments: p.comments.map((c) => ({
          id: c.id,
          content: c.content,
          authorName: c.user.fullName || c.user.username,
          createdAt: c.createdAt,
        })),
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/mobile/posts]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load posts." } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });

    const body = await req.json();
    const { content, projectId, isAnnouncement = false } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ ok: false, error: { code: "EMPTY_POST", message: "Post content cannot be empty." } }, { status: 400 });
    }

    const effectiveRole = getEffectiveRole(user);
    const featureFlags = await resolveAllMobileFeatures(user);

    if (!featureFlags.MOBILE_POSTS) {
      return NextResponse.json({ ok: false, error: { code: "FEATURE_DISABLED", message: "Feed posts are disabled." } }, { status: 403 });
    }

    if (isAnnouncement) {
      const canAnnounce = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(effectiveRole);
      if (!canAnnounce) {
        return NextResponse.json(
          { ok: false, error: { code: "FORBIDDEN", message: "Only leadership can publish official announcements." } },
          { status: 403 }
        );
      }
    }

    const post = await db.post.create({
      data: {
        authorId: user.id,
        content: content.trim(),
        projectId: projectId || null,
        isAnnouncement: Boolean(isAnnouncement),
      },
    });

    return NextResponse.json({
      ok: true,
      post,
      message: "Post published successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/mobile/posts]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to create post." } }, { status: 500 });
  }
}