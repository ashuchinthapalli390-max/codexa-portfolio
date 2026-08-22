import { NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: Request) {
  try {
    const auth = await getCurrentSessionResult();
    const currentUserId = auth.status === "authenticated" ? auth.user.id : undefined;
    const posts = await dataStore.getPosts(currentUserId);

    return NextResponse.json(
      {
        success: true,
        posts,
        total: posts.length,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch feed posts." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getCurrentSessionResult();

    if (auth.status === "error") {
      return NextResponse.json(
        { success: false, error: "Authentication service is temporarily unavailable.", requestId: auth.requestId },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    if (auth.status === "unauthenticated") {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const user = auth.user;
    const { content, projectId, isAnnouncement } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Post content is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const newPost = await dataStore.createPost({
      authorId: user.id,
      content: content.trim(),
      projectId,
      isAnnouncement: user.role === "OWNER" ? !!isAnnouncement : false,
    });

    await dataStore.logAudit({
      action: "POST_PUBLISHED",
      actorId: user.id,
      details: `User @${user.username} published a new post.`,
    });

    return NextResponse.json(
      {
        success: true,
        post: newPost,
        message: "Post published to CodeXa Feed successfully.",
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to create post." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
