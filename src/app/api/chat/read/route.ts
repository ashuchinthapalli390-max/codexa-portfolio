/**
 * POST /api/chat/read
 * Marks a conversation as read for the current user.
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
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400 });
    }

    await dataStore.markConversationRead(conversationId, user.id);

    return NextResponse.json({
      success: true,
      conversationId,
    });
  } catch (err: any) {
    console.error("[POST /api/chat/read]", err);
    return NextResponse.json({ success: false, error: "Failed to mark as read." }, { status: 500 });
  }
}
