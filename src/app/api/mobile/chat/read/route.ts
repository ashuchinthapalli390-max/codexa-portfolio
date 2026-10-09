import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { markConversationMessagesRead, isChatConfigured } from "@/lib/supabase/chat-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, success: false, error: "Unauthorized." },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { conversationId, lastReadMessageId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, success: false, error: "conversationId is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (isChatConfigured()) {
      await markConversationMessagesRead(conversationId, user.id, lastReadMessageId);
    }

    return NextResponse.json(
      {
        ok: true,
        success: true,
        conversationId,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[POST /api/mobile/chat/read]", err);
    return NextResponse.json(
      { ok: false, success: false, error: "Failed to mark as read." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
