import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { postId } = await req.json();

    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required." }, { status: 400 });
    }

    const result = await dataStore.togglePostLike(postId, user.id);

    return NextResponse.json({
      success: true,
      liked: result.liked,
      totalLikes: result.totalLikes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to toggle like." },
      { status: 500 }
    );
  }
}
