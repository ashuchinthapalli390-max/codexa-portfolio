import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";
import { saveMediaUpload } from "@/lib/media-storage";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat not configured" }, { status: 503 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const conversationId = resolvedParams.id;

  // Verify membership
  const { data: membership } = await chatSupabaseAdmin
    .from("conversation_members")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("core_user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ ok: false, error: "Not a member of this conversation" }, { status: 403 });
  }

  const { data: conversation, error } = await chatSupabaseAdmin
    .from("conversations")
    .select("*, conversation_members(*)")
    .eq("id", conversationId)
    .single();

  if (error || !conversation) {
    return NextResponse.json({ ok: false, error: error?.message || "Not found" }, { status: 404 });
  }

  // Enhance member profiles from Core DB
  const memberCoreIds = (conversation.conversation_members || []).map((m: any) => m.core_user_id);
  const coreUsers = await prisma.user.findMany({
    where: { id: { in: memberCoreIds } },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      profileMediaUrl: true,
      department: true,
      profile: {
        select: { displayName: true, mediaUrl: true }
      }
    },
  });

  const hydratedMembers = (conversation.conversation_members || []).map((m: any) => {
    const u = coreUsers.find((cu) => cu.id === m.core_user_id);
    return {
      id: m.core_user_id,
      memberId: m.id,
      fullName: u?.fullName || u?.profile?.displayName || u?.username || "CodeXa Member",
      username: u?.username || "member",
      role: u?.role || "MEMBER",
      orgRole: u?.role || "MEMBER",
      groupRole: m.role || "MEMBER",
      profileMediaUrl: u?.profileMediaUrl || u?.profile?.mediaUrl || null,
      department: u?.department || "Crew",
      joinedAt: m.joined_at,
    };
  });

  let displayName = conversation.title || conversation.name || (conversation.type === "GROUP" ? "Team Group" : "Chat");
  let avatarUrl = conversation.metadata?.iconUrl || conversation.metadata?.avatarUrl || null;
  let recipientUser = null;
  let otherParticipantRole = "MEMBER";

  if (conversation.type === "DIRECT") {
    let otherUserId = (conversation.conversation_members || []).find(
      (m: any) => m.core_user_id !== user.id
    )?.core_user_id;

    if (!otherUserId && conversation.direct_pair_key) {
      const parts = String(conversation.direct_pair_key).split("::");
      otherUserId = parts.find((p: string) => p !== user.id);
    }

    const otherUser = coreUsers.find(u => u.id === otherUserId);
    if (otherUser) {
      displayName = otherUser.fullName || otherUser.profile?.displayName || otherUser.username || "CodeXa Colleague";
      avatarUrl = otherUser.profileMediaUrl || otherUser.profile?.mediaUrl || null;
      otherParticipantRole = otherUser.role;
      recipientUser = {
        id: otherUser.id,
        fullName: displayName,
        displayName,
        name: displayName,
        username: otherUser.username,
        role: otherUser.role,
        profileMediaUrl: avatarUrl,
        avatarUrl,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    conversation: {
      ...conversation,
      name: displayName,
      title: displayName,
      avatarUrl,
      recipientUser,
      peer: recipientUser,
      otherParticipantDisplayName: displayName,
      otherParticipantAvatar: avatarUrl,
      otherParticipantRole,
      members: hydratedMembers,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat not configured" }, { status: 503 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const conversationId = resolvedParams.id;

  // Retrieve conversation
  const { data: conv } = await chatSupabaseAdmin
    .from("conversations")
    .select("*, conversation_members(*)")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
  }

  // Check that caller is a member
  const member = (conv.conversation_members || []).find((m: any) => m.core_user_id === user.id && !m.left_at);
  if (!member) {
    return NextResponse.json({ ok: false, error: "Not a member of this conversation" }, { status: 403 });
  }

  // Group avatar validation: only group conversations have group icons
  if (conv.type !== "GROUP") {
    return NextResponse.json({
      ok: false,
      error: { code: "NOT_A_GROUP", message: "Only group conversations can have group settings or icons." },
    }, { status: 400 });
  }

  // Permission check for group modifications
  const isOwnerOrAdmin =
    member.role === "OWNER" ||
    member.role === "ADMIN" ||
    ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(user.role);

  if (!isOwnerOrAdmin) {
    return NextResponse.json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Only group administrators or leadership can update group details." },
    }, { status: 403 });
  }

  let title: string | undefined;
  let iconUrl: string | undefined;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    title = (formData.get("title") as string) || undefined;
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(file.name) || ".jpg";
      const filename = `group_${conversationId}_${Date.now()}${ext}`;
      const uploadRes = await saveMediaUpload("group-icons", buffer, filename, file.type || "image/jpeg", conversationId);
      if (!uploadRes.publicUrl) {
        return NextResponse.json({
          ok: false,
          error: { code: "GROUP_ICON_UPDATE_FAILED", message: "Failed to upload group icon to cloud storage." },
        }, { status: 500 });
      }
      iconUrl = uploadRes.publicUrl;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    title = body.title;
    iconUrl = body.iconUrl || body.avatarUrl;

    if (body.base64) {
      const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const filename = `group_${conversationId}_${Date.now()}.jpg`;
      const uploadRes = await saveMediaUpload("group-icons", buffer, filename, "image/jpeg", conversationId);
      if (!uploadRes.publicUrl) {
        return NextResponse.json({
          ok: false,
          error: { code: "GROUP_ICON_UPDATE_FAILED", message: "Failed to upload group icon to cloud storage." },
        }, { status: 500 });
      }
      iconUrl = uploadRes.publicUrl;
    }
  }

  const existingMeta = conv.metadata || {};
  const updatedMeta = {
    ...existingMeta,
    ...(iconUrl ? { iconUrl, avatarUrl: iconUrl } : {}),
  };

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
    metadata: updatedMeta,
  };
  if (title !== undefined) updatePayload.title = title;

  const { data: updatedConv } = await chatSupabaseAdmin
    .from("conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .select()
    .single();

  return NextResponse.json({
    ok: true,
    message: "Conversation updated successfully.",
    conversation: {
      ...(updatedConv || conv),
      icon_url: iconUrl || existingMeta.iconUrl,
      avatar_url: iconUrl || existingMeta.avatarUrl,
    },
    iconUrl,
  });
}
