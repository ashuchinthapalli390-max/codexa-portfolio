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

  // Enhance messages with sender profiles for identity resolution
  const senderIds: string[] = Array.from(new Set((messages || []).map((m: any) => String(m.sender_core_user_id))));
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      profileMediaUrl: true,
      profile: { select: { displayName: true, mediaUrl: true } }
    },
  });
  const senderMap = new Map(senders.map((s) => [s.id, s]));

  // Also query view once sessions if any messages are view once
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
        mediaUrl = null; // Don't expose consumed view-once bytes
      }

      const senderProfile = senderMap.get(m.sender_core_user_id);
      const senderDisplayName =
        senderProfile?.fullName ||
        senderProfile?.profile?.displayName ||
        senderProfile?.username ||
        "Colleague";

      const reactionsList = (m.message_reactions || []).map((r: any) => r.reaction || r.emoji || "❤️");

      return {
        ...m,
        message: isConsumed ? "[Photo Opened]" : m.text,
        text: isConsumed ? "[Photo Opened]" : m.text,
        senderId: m.sender_core_user_id,
        senderName: senderDisplayName,
        senderAvatar: senderProfile?.profileMediaUrl || senderProfile?.profile?.mediaUrl || null,
        mediaUrl: mediaUrl || undefined,
        reactions: reactionsList,
        reactionDetails: m.message_reactions || [],
        isViewOnce: isVO,
        viewOnceConsumed: isConsumed,
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
    const catalogVersion = body.catalogVersion;
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
      try {
        await chatSupabaseAdmin
          .from("messages")
          .update({ is_view_once: true })
          .eq("id", result.data.id);
      } catch (_) {}
    }

    // If media was saved, record in message_attachments
    if (savedMediaUrl && result.data?.id) {
      try {
        await chatSupabaseAdmin.from("message_attachments").insert({
          message_id: result.data.id,
          file_url: savedMediaUrl,
          file_type: messageType.includes("VIDEO") ? "video" : "image",
        });
      } catch (_) {}
    }

    // Fetch conversation details for group title & members
    const { data: convData } = await chatSupabaseAdmin
      .from("conversations")
      .select("id, type, title")
      .eq("id", conversationId)
      .single();

    const isGroup = convData?.type === "GROUP";
    const groupName = convData?.title || "Team Group";

    // Trigger Core notification and FCM Push if newly inserted
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
            const senderDisplayName = user.displayName || user.username || "Colleague";
            let pushTitle = senderDisplayName;
            let pushBody = text.slice(0, 100);

            if (isViewOnce) {
              pushBody = "🔒 Sent a View Once photo";
            } else if (messageType === "STICKER") {
              pushBody = "🎨 Sent a sticker";
            } else if (messageType === "IMAGE") {
              pushBody = "📷 Sent a photo";
            } else if (messageType === "VIDEO") {
              pushBody = "🎥 Sent a video";
            }

            if (isGroup) {
              pushTitle = groupName;
              pushBody = `${senderDisplayName}: ${pushBody}`;
            }

            try {
              await prisma.notification.create({
                data: {
                  userId: m.core_user_id,
                  type: "CHAT",
                  title: pushTitle,
                  message: pushBody.slice(0, 120),
                  link: `/messages/${conversationId}`,
                },
              });
            } catch (_) {}

            // Send FCM push alert with complete metadata
            try {
              const { sendFcmPushToUser } = await import("@/lib/firebase-admin");
              await sendFcmPushToUser(m.core_user_id, {
                title: pushTitle,
                body: pushBody,
                data: {
                  conversationId,
                  messageId: String(result.data.id),
                  senderId: user.id,
                  senderName: senderDisplayName,
                  type: "CHAT",
                  messageType,
                  mediaUrl: isViewOnce ? "" : (savedMediaUrl || ""),
                  stickerId: messageType === "STICKER" ? (stickerId || text) : "",
                  isGroup: isGroup ? "true" : "false",
                  groupName: isGroup ? groupName : "",
                },
              });
            } catch (fcmErr) {
              console.warn("[FCM PUSH ERROR]", fcmErr);
            }
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
        mediaUrl: savedMediaUrl || (result.data.message_type === "IMAGE" ? result.data.text : null),
        isViewOnce,
        reactions: [],
      },
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
