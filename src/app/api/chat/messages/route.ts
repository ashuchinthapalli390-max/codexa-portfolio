/**
 * /api/chat/messages
 * GET: Fetch messages for a conversation (paginated & delta-sync supported)
 * POST: Send a message in a conversation (idempotent with clientId)
 * DELETE: Unsend/Delete own message
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

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const before = searchParams.get("before") || undefined;
    const after = searchParams.get("after") || undefined;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // ── Focused Membership Check (Indexed seek) ──
    const isMember = await dataStore.isConversationMember(conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden: You are not a participant of this conversation." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const messages = await dataStore.getMessages(conversationId, { limit, before, after });
    return NextResponse.json({ success: true, messages }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[GET /api/chat/messages]", err);
    const isPoolError = err?.code === "P2024" || err?.message?.includes("timed out") || err?.message?.includes("connection pool");
    if (isPoolError) {
      return NextResponse.json(
        { success: false, error: "CHAT_TEMPORARILY_UNAVAILABLE", retryable: true },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }
    return NextResponse.json({ success: false, error: "Failed to load messages." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

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
    const { conversationId, message, clientId, attachments, fileUrl, fileName, replyToId } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const hasText = message && message.trim().length > 0;
    const hasAttachments = (attachments && attachments.length > 0) || fileUrl;

    if (!hasText && !hasAttachments) {
      return NextResponse.json({ success: false, error: "Cannot send an empty message." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // ── Focused Membership Check (Indexed seek) ──
    const isMember = await dataStore.isConversationMember(conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden: You are not a participant of this conversation." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const newMessage = await dataStore.sendMessage({
      conversationId,
      senderId: user.id,
      clientId: clientId ? String(clientId).trim() : undefined,
      message: message ? message.trim() : "",
      attachments,
      fileUrl,
      fileName,
      replyToId,
    });

    return NextResponse.json({ success: true, message: newMessage }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/chat/messages]", err);
    const isPoolError = err?.code === "P2024" || err?.message?.includes("timed out") || err?.message?.includes("connection pool");
    if (isPoolError) {
      return NextResponse.json(
        { success: false, error: "CHAT_TEMPORARILY_UNAVAILABLE", retryable: true },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }
    return NextResponse.json({ success: false, error: "Failed to send message." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json({ success: false, error: "message id is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const deleted = await dataStore.deleteMessage(messageId, user.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Message not found or unauthorized to unsend." }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true, messageId }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[DELETE /api/chat/messages]", err);
    return NextResponse.json({ success: false, error: "Failed to unsend message." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
