import { saveMediaUpload } from '@/lib/media-storage';
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  chatSupabaseAdmin,
  sendChatMessage,
  isChatConfigured
} from "@/lib/supabase/chat-admin";
import path from "path";
import fs from "fs";
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

  // Enhance messages with sender profiles for group clarity
  const senderIds: string[] = Array.from(new Set((messages || []).map((m: any) => String(m.sender_core_user_id))));
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true },
  });
  const senderMap = new Map(senders.map((s) => [s.id, s]));

  return NextResponse.json({
    ok: true,
    success: true,
    messages: (messages || []).map((m: any) => {
      const mediaUrl =
        m.message_attachments?.[0]?.file_url ||
        m.message_attachments?.[0]?.url ||
        (m.message_type === "IMAGE" && m.text?.startsWith("http") ? m.text : null) ||
        (m.text?.startsWith("data:image") ? m.text : null);

      const senderProfile = senderMap.get(m.sender_core_user_id);

      return {
        ...m,
        message: m.text,
        senderId: m.sender_core_user_id,
        senderName: senderProfile?.fullName || senderProfile?.username || "Colleague",
        senderAvatar: senderProfile?.profileMediaUrl || null,
        mediaUrl: mediaUrl || undefined,
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

    // Handle base64 image/video or mediaUrl upload (Cloud-first Supabase storage)
    let savedMediaUrl = "";
    if (mediaUrlInput && typeof mediaUrlInput === "string") {
      const isVideo = mediaUrlInput.startsWith("data:video") || messageType === "VIDEO";
      messageType = isVideo ? "VIDEO" : "IMAGE";

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

    // If media was saved, record in message_attachments
    if (savedMediaUrl && result.data?.id) {
      try {
        await chatSupabaseAdmin.from("message_attachments").insert({
          message_id: result.data.id,
          file_url: savedMediaUrl,
          file_type: "image",
        });
      } catch (_) {}
    }

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

            // Send real FCM push alert
            try {
              const { sendFcmPushToUser } = await import("@/lib/firebase-admin");
              const senderDisplayName = user.displayName || user.username || "Colleague";
              const pushBody = messageType === "STICKER" ? "🎨 Sent a sticker" : messageType === "IMAGE" ? "📷 Sent a photo" : (text || "New message").slice(0, 100);
              const pushRes = await sendFcmPushToUser(m.core_user_id, {
                title: senderDisplayName,
                body: pushBody,
                data: {
                  conversationId,
                  senderId: user.id,
                  senderName: senderDisplayName,
                  type: "CHAT",
                },
              });
              console.log("[FCM PUSH RESULT]", { recipient: m.core_user_id, pushRes });
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
      },
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
