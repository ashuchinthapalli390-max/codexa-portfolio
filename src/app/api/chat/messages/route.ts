import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  chatSupabaseAdmin,
  sendChatMessage,
  isChatConfigured
} from "@/lib/supabase/chat-admin";

export async function GET(req: NextRequest) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: true, messages: [] });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
  }

  const before = searchParams.get("before");
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

  // Check membership
  const { data: membership } = await chatSupabaseAdmin
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("core_user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let query = chatSupabaseAdmin
    .from("messages")
    .select("*, message_reads(*), message_reactions(*), message_attachments(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    success: true,
    messages: (messages || []).map((m: any) => ({
      ...m,
      message: m.text,
      senderId: m.sender_core_user_id,
    })),
  });
}

export async function POST(req: NextRequest) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat service unavailable" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const conversationId = body.conversationId;
    const text = body.text || body.message;
    const clientMessageId = body.clientMessageId || body.clientId;
    const messageType = body.messageType || "TEXT";
    const replyToMessageId = body.replyToMessageId;

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
    }

    if (!clientMessageId) {
      return NextResponse.json({ ok: false, error: "clientMessageId required" }, { status: 400 });
    }

    if (!text && messageType === "TEXT") {
      return NextResponse.json({ ok: false, error: "Message text cannot be empty" }, { status: 400 });
    }

    const result = await sendChatMessage({
      conversationId,
      senderCoreUserId: user.id,
      clientMessageId,
      text,
      messageType,
      replyToMessageId,
    });

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    // Trigger Core notification if this is a newly inserted message
    if (!result.isDuplicate && result.data) {
      const { data: members } = await chatSupabaseAdmin
        .from("conversation_members")
        .select("core_user_id, muted")
        .eq("conversation_id", conversationId)
        .neq("core_user_id", user.id)
        .is("left_at", null);

      if (members && members.length > 0) {
        for (const m of members) {
          if (!m.muted) {
            try {
              await prisma.notification.create({
                data: {
                  userId: m.core_user_id,
                  type: "CHAT",
                  title: `Message from ${user.username || "Colleague"}`,
                  message: (text || "Sent an attachment").slice(0, 120),
                  link: `/messages/${conversationId}`,
                },
              });
            } catch (_) {}
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: {
        ...result.data,
        message: result.data.text,
        senderId: result.data.sender_core_user_id,
      },
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
