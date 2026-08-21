/**
 * /api/chat/messages
 * GET: Fetch messages for a conversation with membership security check
 * POST: Send a message in a conversation (text, image, or reply)
 * DELETE: Unsend/Delete own message
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400 });
    }

    // ── CRITICAL SECURITY CHECK: Verify user is a member of this conversation ──
    const conv = await dataStore.getConversationById(conversationId, user.id);
    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
    }

    const isMember =
      conv.type === "GROUP" ||
      conv.type === "CHANNEL" ||
      conv.participantIds?.includes(user.id) ||
      conv.members?.some((m) => m.id === user.id || m.username === user.username);

    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden: You are not a participant of this conversation." }, { status: 403 });
    }

    const messages = await dataStore.getMessages(conversationId, user.id);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error("[GET /api/chat/messages]", err);
    return NextResponse.json({ success: false, error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, message, attachments, fileUrl, fileName, replyToId } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400 });
    }

    const hasText = message && message.trim().length > 0;
    const hasAttachments = (attachments && attachments.length > 0) || fileUrl;

    if (!hasText && !hasAttachments) {
      return NextResponse.json({ success: false, error: "Cannot send an empty message." }, { status: 400 });
    }

    // ── CRITICAL SECURITY CHECK: Verify user is a member ──
    const conv = await dataStore.getConversationById(conversationId, user.id);
    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
    }

    const isMember =
      conv.type === "GROUP" ||
      conv.type === "CHANNEL" ||
      conv.participantIds?.includes(user.id) ||
      conv.members?.some((m) => m.id === user.id || m.username === user.username);

    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden: You are not a participant of this conversation." }, { status: 403 });
    }

    const newMessage = await dataStore.sendMessage({
      conversationId,
      senderId: user.id,
      message: message ? message.trim() : "",
      attachments,
      fileUrl,
      fileName,
      replyToId,
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err: any) {
    console.error("[POST /api/chat/messages]", err);
    return NextResponse.json({ success: false, error: "Failed to send message." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json({ success: false, error: "message id is required." }, { status: 400 });
    }

    const deleted = await dataStore.deleteMessage(messageId, user.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Message not found or unauthorized to unsend." }, { status: 403 });
    }

    return NextResponse.json({ success: true, messageId });
  } catch (err: any) {
    console.error("[DELETE /api/chat/messages]", err);
    return NextResponse.json({ success: false, error: "Failed to unsend message." }, { status: 500 });
  }
}
