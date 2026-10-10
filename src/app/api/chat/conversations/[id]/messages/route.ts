import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  chatSupabaseAdmin,
  sendChatMessage,
  isChatConfigured
} from "@/lib/supabase/chat-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: true, messages: [] });
  }

  const conversationId = params.id;
  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");
  const limit = Math.min(Number(searchParams.get("limit")) || 40, 60);

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

  // Collect all user IDs (senders + readers)
  const allUserIdsSet = new Set<string>();
  (messages || []).forEach((m: any) => {
    if (m.sender_core_user_id) allUserIdsSet.add(String(m.sender_core_user_id));
    (m.message_reads || []).forEach((r: any) => {
      if (r.core_user_id) allUserIdsSet.add(String(r.core_user_id));
    });
  });

  const allUserRecords = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIdsSet) } },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      profileMediaUrl: true,
      profile: { select: { displayName: true, mediaUrl: true } }
    },
  });

  const userProfileMap = new Map<string, {
    id: string;
    fullName: string;
    displayName: string;
    username: string;
    role: string;
    avatarUrl: string | null;
  }>();

  allUserRecords.forEach((u) => {
    const dispName = u.fullName || u.profile?.displayName || u.username || "Colleague";
    const avUrl = u.profileMediaUrl || u.profile?.mediaUrl || null;
    userProfileMap.set(u.id, {
      id: u.id,
      fullName: dispName,
      displayName: dispName,
      username: u.username || "colleague",
      role: u.role || "MEMBER",
      avatarUrl: avUrl,
    });
  });

  return NextResponse.json({
    ok: true,
    messages: (messages || []).map((m: any) => {
      const senderProfile = userProfileMap.get(m.sender_core_user_id);
      const senderDisplayName = senderProfile?.displayName || "Colleague";
      const senderAvatarUrl = senderProfile?.avatarUrl || null;

      const enhancedReads = (m.message_reads || []).map((r: any) => {
        const readerProfile = userProfileMap.get(r.core_user_id);
        return {
          id: r.id,
          message_id: r.message_id,
          core_user_id: r.core_user_id,
          userId: r.core_user_id,
          read_at: r.read_at,
          readAt: r.read_at,
          fullName: readerProfile?.fullName || readerProfile?.displayName || "Colleague",
          displayName: readerProfile?.displayName || readerProfile?.fullName || "Colleague",
          username: readerProfile?.username || "colleague",
          avatarUrl: readerProfile?.avatarUrl || null,
          role: readerProfile?.role || "MEMBER",
        };
      });

      return {
        ...m,
        senderId: m.sender_core_user_id,
        senderName: senderDisplayName,
        senderAvatar: senderAvatarUrl,
        reads: enhancedReads,
        message_reads: enhancedReads,
      };
    }),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { text, clientMessageId, messageType = "TEXT", replyToMessageId } = body;

    if (!clientMessageId) {
      return NextResponse.json({ ok: false, error: "clientMessageId is required" }, { status: 400 });
    }

    if (!text && messageType === "TEXT") {
      return NextResponse.json({ ok: false, error: "Message text cannot be empty" }, { status: 400 });
    }

    const conversationId = params.id;

    // Fast persistence
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

    const senderDisplayName = user.displayName || user.username || "Colleague";
    const senderAvatarUrl = (user as any).profileMediaUrl || (user as any).profile?.mediaUrl || null;

    // Asynchronous background notification
    if (!result.isDuplicate && result.data) {
      (async () => {
        try {
          const { data: convData } = await chatSupabaseAdmin
            .from("conversations")
            .select("id, type, title")
            .eq("id", conversationId)
            .single();

          const isGroup = convData?.type === "GROUP";
          const groupName = convData?.title || "Team Group";

          const { data: members } = await chatSupabaseAdmin
            .from("conversation_members")
            .select("core_user_id, muted")
            .eq("conversation_id", conversationId)
            .neq("core_user_id", user.id)
            .is("left_at", null);

          if (!members || members.length === 0) return;

          let pushTitle = senderDisplayName;
          let pushBody = (text || "Sent an attachment").slice(0, 100);

          if (isGroup) {
            pushTitle = groupName;
            pushBody = `${senderDisplayName}: ${pushBody}`;
          }

          const { sendFcmPushToUser } = await import("@/lib/firebase-admin");

          for (const m of members) {
            if (m.muted) continue;

            prisma.notification.create({
              data: {
                userId: m.core_user_id,
                type: "CHAT",
                title: pushTitle,
                message: pushBody.slice(0, 120),
                link: `/messages/${conversationId}`,
              },
            }).catch(() => {});

            sendFcmPushToUser(
              m.core_user_id,
              {
                title: pushTitle,
                body: pushBody,
                data: {
                  conversationId,
                  messageId: String(result.data.id),
                  senderId: user.id,
                  senderName: senderDisplayName,
                  senderAvatar: senderAvatarUrl || "",
                  type: "CHAT",
                  messageType,
                  isGroup: isGroup ? "true" : "false",
                  groupName: isGroup ? groupName : "",
                },
              },
              { targetConversationId: conversationId }
            ).catch(() => {});
          }
        } catch (_) {}
      })().catch(console.error);
    }

    return NextResponse.json({
      ok: true,
      message: {
        ...result.data,
        senderId: result.data.sender_core_user_id,
        senderName: senderDisplayName,
        senderAvatar: senderAvatarUrl,
        reads: [],
        message_reads: [],
      },
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
