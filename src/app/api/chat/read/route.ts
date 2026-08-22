/**
 * POST /api/chat/read
 * Marks a conversation as read for the current user.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentSessionResult();

    if (auth.status === "error") {
      return NextResponse.json(
        { success: false, error: "CHAT_TEMPORARILY_UNAVAILABLE", retryable: true, requestId: auth.requestId },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    if (auth.status === "unauthenticated") {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const user = auth.user;
    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    await dataStore.markConversationRead(conversationId, user.id);

    return NextResponse.json({
      success: true,
      conversationId,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/chat/read]", err);
    return NextResponse.json({ success: false, error: "Failed to mark as read." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
