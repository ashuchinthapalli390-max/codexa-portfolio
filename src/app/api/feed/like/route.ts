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

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required." }, { status: 400 });
    }

    const result = await dataStore.togglePostLike(postId, user.id);

    return NextResponse.json({
      success: true,
      hasLiked: result.hasLiked,
      likesCount: result.likesCount,
    });
  } catch (err: any) {
    console.error("[POST /api/feed/like] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to toggle like." }, { status: 500 });
  }
}
