import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { canModerateFeed } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const posts = await dataStore.getPosts();
    const post = posts.find((p) => p.id === id);

    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
    }

    const comments = await dataStore.getPostComments(id);

    return NextResponse.json({
      success: true,
      post,
      comments,
    });
  } catch (err: any) {
    console.error("[GET /api/feed/posts/[id]] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch post." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { id } = params;
    const posts = await dataStore.getPosts();
    const post = posts.find((p) => p.id === id);

    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found." }, { status: 404 });
    }

    const isAuthor = post.authorId === user.id;
    const isModerator = canModerateFeed(user);

    if (!isAuthor && !isModerator) {
      return NextResponse.json({ success: false, error: "Permission denied." }, { status: 403 });
    }

    const deleted = await dataStore.deletePost(id, user.id);

    if (deleted) {
      await dataStore.logAudit("POST_DELETED", user.id, `Deleted post ${id} (${isAuthor ? "Author" : "Moderator"}).`);
    }

    return NextResponse.json({
      success: deleted,
      message: deleted ? "Post removed successfully." : "Failed to delete post.",
    });
  } catch (err: any) {
    console.error("[DELETE /api/feed/posts/[id]] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete post." }, { status: 500 });
  }
}
