import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const posts = await dataStore.getPosts(user?.id);

    return NextResponse.json({
      success: true,
      posts,
      total: posts.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch feed posts." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { content, projectId, isAnnouncement } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Post content is required." }, { status: 400 });
    }

    const newPost = await dataStore.createPost({
      authorId: user.id,
      content: content.trim(),
      projectId,
      isAnnouncement: user.role === "OWNER" ? !!isAnnouncement : false,
    });

    await dataStore.logAudit("POST_PUBLISHED", user.id, `User @${user.username} published a new post.`);

    return NextResponse.json({
      success: true,
      post: newPost,
      message: "Post published to CodeXa Feed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to create post." },
      { status: 500 }
    );
  }
}
