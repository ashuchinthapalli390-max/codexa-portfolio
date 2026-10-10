import { saveMediaUpload } from '@/lib/media-storage';
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  chatSupabaseAdmin,
  sendChatMessage,
  isChatConfigured
} from "@/lib/supabase/chat-admin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: true, messages: [] });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
  }

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

  // Collect ALL user IDs: senders AND readers across messages for full identity hydration
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

  // Query view once sessions if any messages are view once
  const viewOnceMsgIds = (messages || [])
    .filter((m: any) => m.is_view_once || m.message_type?.startsWith("VIEW_ONCE"))
    .map((m: any) => m.id);

  let userVoConsumedMap = new Map<string, boolean>();
  if (viewOnceMsgIds.length > 0) {
    const { data: voSessions } = await chatSupabaseAdmin
      .from("message_view_once_sessions")
      .select("message_id, status")
      .in("message_id", viewOnceMsgIds)
      .eq("viewer_core_user_id", user.id);

    (voSessions || []).forEach((s: any) => {
      userVoConsumedMap.set(s.message_id, s.status === "CONSUMED");
    });
  }

  return NextResponse.json({
    ok: true,
    success: true,
    messages: (messages || []).map((m: any) => {
      const isVO = m.is_view_once === true || m.message_type === "VIEW_ONCE_IMAGE" || m.message_type === "VIEW_ONCE_VIDEO";
      const isMe = m.sender_core_user_id === user.id;
      const isConsumed = isVO && !isMe && (m.view_once_consumed || userVoConsumedMap.get(m.id) === true);

      let mediaUrl =
        m.message_attachments?.[0]?.file_url ||
        m.message_attachments?.[0]?.url ||
        ((m.message_type === "IMAGE" || m.message_type === "VIEW_ONCE_IMAGE") && m.text?.startsWith("http") ? m.text : null) ||
        (m.text?.startsWith("data:image") ? m.text : null);

      if (isConsumed) {
        mediaUrl = null;
      }

      const senderProfile = userProfileMap.get(m.sender_core_user_id);
      const senderDisplayName = senderProfile?.displayName || "Colleague";
      const senderAvatarUrl = senderProfile?.avatarUrl || null;

      const reactionsList = (m.message_reactions || []).map((r: any) => r.reaction || r.emoji || "❤️");

      // Hydrate all member reads with actual Core user identity (avatars and names)
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
        message: isConsumed ? "[Photo Opened]" : m.text,
        text: isConsumed ? "[Photo Opened]" : m.text,
        senderId: m.sender_core_user_id,
        senderName: senderDisplayName,
        senderAvatar: senderAvatarUrl,
        mediaUrl: mediaUrl || undefined,
        reactions: reactionsList,
        reactionDetails: m.message_reactions || [],
        isViewOnce: isVO,
        viewOnceConsumed: isConsumed,
        reads: enhancedReads,
        message_reads: enhancedReads,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat service unavailable" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const conversationId = body.conversationId;
    let text = body.text || body.message || "";
    const clientMessageId = body.clientMessageId || body.clientId;
    let messageType = body.messageType || "TEXT";
    const stickerId = body.stickerId;
    const isViewOnce = body.isViewOnce === true;

    if (stickerId || messageType === "STICKER") {
      messageType = "STICKER";
      if (stickerId) text = stickerId;
    }

    const replyToMessageId = body.replyToMessageId;
    const mediaUrlInput = body.mediaUrl;

    if (!conversationId) {
      return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
    }

    if (!clientMessageId) {
      return NextResponse.json({ ok: false, error: "clientMessageId required" }, { status: 400 });
    }

    // Handle base64 image/video or mediaUrl upload
    let savedMediaUrl = "";
    if (mediaUrlInput && typeof mediaUrlInput === "string") {
      const isVideo = mediaUrlInput.startsWith("data:video") || messageType === "VIDEO" || messageType === "VIEW_ONCE_VIDEO";
      
      if (isViewOnce) {
        messageType = isVideo ? "VIEW_ONCE_VIDEO" : "VIEW_ONCE_IMAGE";
      } else {
        messageType = isVideo ? "VIDEO" : "IMAGE";
      }

      if (mediaUrlInput.startsWith("data:")) {
        try {
          const dataUriMatch = mediaUrlInput.match(/^data:([^;]+);base64,(.+)$/);
          if (dataUriMatch) {
            const mime = dataUriMatch[1];
            const cleanBase64 = dataUriMatch[2];
            const buffer = Buffer.from(cleanBase64, "base64");
            const ext = mime.includes("video") ? ".mp4" : (mime.includes("png") ? ".png" : ".jpg");
            const filename = `chat_${conversationId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
            
            const uploadRes = await saveMediaUpload("chat-media", buffer, filename, mime, conversationId);
            savedMediaUrl = uploadRes.publicUrl;
            text = text && text !== "[Image Attached]" && text !== "[Video Attached]" ? text : savedMediaUrl;
          }
        } catch (mediaErr) {
          console.warn("[Chat media save warning]", mediaErr);
        }
      } else if (mediaUrlInput.startsWith("http")) {
        savedMediaUrl = mediaUrlInput;
        text = text && text !== "[Image Attached]" && text !== "[Video Attached]" ? text : savedMediaUrl;
      }
    }

    if (isViewOnce && !messageType.startsWith("VIEW_ONCE")) {
      messageType = messageType === "VIDEO" ? "VIEW_ONCE_VIDEO" : "VIEW_ONCE_IMAGE";
    }

    if (!text && messageType === "TEXT") {
      return NextResponse.json({ ok: false, error: "Message text cannot be empty" }, { status: 400 });
    }

    // 1. Fast persistence to Chat Supabase
    const result = await sendChatMessage({
      conversationId,
      senderCoreUserId: user.id,
      clientMessageId,
      text: text || savedMediaUrl || "[Attachment]",
      messageType,
      replyToMessageId,
    });

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    // Set view once flags on message row
    if (isViewOnce && result.data?.id) {
      chatSupabaseAdmin
        .from("messages")
        .update({ is_view_once: true })
        .eq("id", result.data.id)
        .then(() => {})
        .catch(() => {});
    }

    // If media was saved, record in message_attachments
    if (savedMediaUrl && result.data?.id) {
      chatSupabaseAdmin
        .from("message_attachments")
        .insert({
          message_id: result.data.id,
          file_url: savedMediaUrl,
          file_type: messageType.includes("VIDEO") ? "video" : "image",
        })
        .then(() => {})
        .catch(() => {});
    }

    // Prepare immediate response
    const senderDisplayName = user.displayName || user.username || "Colleague";
    const senderAvatarUrl = (user as any).profileMediaUrl || (user as any).profile?.mediaUrl || null;

    const responsePayload = {
      ok: true,
      success: true,
      message: {
        ...result.data,
        message: result.data.text,
        senderId: result.data.sender_core_user_id,
        senderName: senderDisplayName,
        senderAvatar: senderAvatarUrl,
        mediaUrl: savedMediaUrl || (result.data.message_type === "IMAGE" ? result.data.text : null),
        isViewOnce,
        reactions: [],
        reads: [],
        message_reads: [],
      },
      isDuplicate: result.isDuplicate,
    };

    // 2. DISPATCH NOTIFICATIONS ASYNCHRONOUSLY IN BACKGROUND
    // Do NOT block message sending on push delivery or avatar queries!
    if (!result.isDuplicate && result.data) {
      const messageId = String(result.data.id);
      const insertedText = text;
      const sentMessageType = messageType;

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
          let pushBody = insertedText.slice(0, 100);

          if (isViewOnce) {
            pushBody = "🔒 Sent a View Once photo";
          } else if (sentMessageType === "STICKER") {
            pushBody = "🎨 Sent a sticker";
          } else if (sentMessageType === "IMAGE") {
            pushBody = "📷 Sent a photo";
          } else if (sentMessageType === "VIDEO") {
            pushBody = "🎥 Sent a video";
          }

          if (isGroup) {
            pushTitle = groupName;
            pushBody = `${senderDisplayName}: ${pushBody}`;
          }

          const { sendFcmPushToUser } = await import("@/lib/firebase-admin");

          for (const m of members) {
            if (m.muted) continue;

            // Persist notification event in Core DB
            prisma.notification.create({
              data: {
                userId: m.core_user_id,
                type: "CHAT",
                title: pushTitle,
                message: pushBody.slice(0, 120),
                link: `/messages/${conversationId}`,
              },
            }).catch(() => {});

            // Send FCM push with smart suppression for the active conversation
            sendFcmPushToUser(
              m.core_user_id,
              {
                title: pushTitle,
                body: pushBody,
                data: {
                  conversationId,
                  messageId,
                  senderId: user.id,
                  senderName: senderDisplayName,
                  senderAvatar: senderAvatarUrl || "",
                  type: "CHAT",
                  messageType: sentMessageType,
                  mediaUrl: isViewOnce ? "" : (savedMediaUrl || ""),
                  stickerId: sentMessageType === "STICKER" ? (stickerId || insertedText) : "",
                  isGroup: isGroup ? "true" : "false",
                  groupName: isGroup ? groupName : "",
                },
              },
              { targetConversationId: conversationId }
            ).catch((fcmErr) => {
              console.warn("[FCM PUSH ERROR]", fcmErr);
            });
          }
        } catch (bgErr) {
          console.warn("[Background push processing error]", bgErr);
        }
      })().catch(console.error);
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
