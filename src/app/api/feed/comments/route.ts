import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { postId, content, parentCommentId } = await req.json();

    if (!postId || !content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Post ID and content are required." }, { status: 400 });
    }

    const comment = await dataStore.createPostComment({
      postId,
      profileId: user.id,
      parentCommentId: parentCommentId || null,
      content: content.trim(),
    });

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (err: any) {
    console.error("[POST /api/feed/comments] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to post comment." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Comment ID is required." }, { status: 400 });
    }

    const deleted = await dataStore.deletePostComment(id, user.id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? "Comment deleted successfully." : "Comment not found or unauthorized.",
    });
  } catch (err: any) {
    console.error("[DELETE /api/feed/comments] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete comment." }, { status: 500 });
  }
}
