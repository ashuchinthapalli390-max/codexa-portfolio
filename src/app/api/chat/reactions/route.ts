/**
 * POST /api/chat/reactions
 * Toggles or updates a reaction on a chat message.
 */
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

    const body = await req.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ success: false, error: "messageId and emoji are required." }, { status: 400 });
    }

    const result = await dataStore.toggleReaction(messageId, user.id, emoji);

    return NextResponse.json({
      success: true,
      reactions: result.reactions,
      messageId,
    });
  } catch (err: any) {
    console.error("[POST /api/chat/reactions]", err);
    return NextResponse.json({ success: false, error: "Failed to update reaction." }, { status: 500 });
  }
}
