/**
 * /api/chat/messages
 * GET: Fetch messages for a conversation
 * POST: Send a message in a conversation
 * DELETE: Delete own message
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
  }

  try {
    const messages = await dataStore.getMessages(conversationId);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error("[GET /api/chat/messages]", err);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { conversationId, message, fileUrl, fileName, replyToId } = body;

    if (!conversationId || !message || !message.trim()) {
      return NextResponse.json({ error: "conversationId and message are required." }, { status: 400 });
    }

    const newMessage = await dataStore.sendMessage({
      conversationId,
      senderId: user.id,
      message: message.trim(),
      fileUrl,
      fileName,
      replyToId,
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err: any) {
    console.error("[POST /api/chat/messages]", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("id");

  if (!messageId) {
    return NextResponse.json({ error: "message id is required." }, { status: 400 });
  }

  try {
    const deleted = await dataStore.deleteMessage(messageId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Message not found or unauthorized to delete." }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/chat/messages]", err);
    return NextResponse.json({ error: "Failed to delete message." }, { status: 500 });
  }
}
