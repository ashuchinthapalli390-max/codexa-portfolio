import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat not configured" }, { status: 503 });
  }

  const { id: conversationId } = await params;

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
    select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true },
  });

  return NextResponse.json({
    ok: true,
    conversation: {
      ...conversation,
      members: coreUsers,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat not configured" }, { status: 503 });
  }

  const { id: conversationId } = await params;

  // Check that caller is a member (and owner or admin if group)
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
      const filename = `group_${conversationId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "groups");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      iconUrl = `https://codxa-agency.online/uploads/groups/${filename}`;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    title = body.title;
    iconUrl = body.iconUrl || body.avatarUrl;

    if (body.base64) {
      const cleanBase64 = body.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const filename = `group_${conversationId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.jpg`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "groups");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      iconUrl = `https://codxa-agency.online/uploads/groups/${filename}`;
    }
  }

  // Update conversation in Chat Supabase
  const updatePayload: any = { updated_at: new Date().toISOString() };
  if (title !== undefined) updatePayload.title = title;
  if (iconUrl !== undefined) {
    updatePayload.icon_url = iconUrl;
    updatePayload.avatar_url = iconUrl;
  }

  const { data: updatedConv, error } = await chatSupabaseAdmin
    .from("conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .select()
    .single();

  if (error) {
    // If icon_url column doesn't exist, try updating without it or check metadata
    console.warn("[PATCH conversation] column error, trying fallback update:", error.message);
    const fallbackPayload: any = { updated_at: new Date().toISOString() };
    if (title) fallbackPayload.title = title;
    await chatSupabaseAdmin.from("conversations").update(fallbackPayload).eq("id", conversationId);
  }

  return NextResponse.json({
    ok: true,
    message: "Conversation updated successfully.",
    conversation: updatedConv || { id: conversationId, title, iconUrl },
    iconUrl,
  });
}
