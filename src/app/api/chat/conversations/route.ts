import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserConversations,
  getOrCreateDirectConversation,
  chatSupabaseAdmin,
  isChatConfigured
} from "@/lib/supabase/chat-admin";

function canInitiateDirectMessage(senderRole: string, recipientRole: string): boolean {
  if (senderRole === "FOUNDER" || senderRole === "CEO" || senderRole === "CTO") return true;
  if (senderRole === "INTERN" && (recipientRole === "FOUNDER" || recipientRole === "CEO")) {
    return false; // Direct message to Founder/CEO restricted for interns
  }
  return true;
}

export async function GET(req: NextRequest) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: true, conversations: [] });
  }

  const { data, error } = await getUserConversations(user.id);
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  // Populate recipient metadata from Core DB for direct chats
  const conversationsWithDetails = await Promise.all(
    (data || []).map(async (conv: any) => {
      if (conv.type === "DIRECT") {
        const otherMember = (conv.conversation_members || []).find(
          (m: any) => m.core_user_id !== user.id
        );
        if (otherMember) {
          const userRecord = await prisma.user.findUnique({
            where: { id: otherMember.core_user_id },
            select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true },
          });
          return {
            ...conv,
            recipientUser: userRecord || { id: otherMember.core_user_id, fullName: "CodeXa Colleague", username: "colleague" },
          };
        }
      }
      return conv;
    })
  );

  return NextResponse.json({ ok: true, conversations: conversationsWithDetails });
}

export async function POST(req: NextRequest) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  try {
    const body = await req.json();
    const { type = "DIRECT", targetUserId, title, memberIds } = body;

    if (!isChatConfigured() || !chatSupabaseAdmin) {
      return NextResponse.json({ ok: false, error: "Chat infrastructure is not configured" }, { status: 503 });
    }

    if (type === "DIRECT") {
      if (!targetUserId) {
        return NextResponse.json({ ok: false, error: "targetUserId is required for direct conversation" }, { status: 400 });
      }

      // Check communication permission
      const recipient = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true, fullName: true, username: true, isActive: true },
      });

      if (!recipient) {
        return NextResponse.json({ ok: false, error: "Target user not found" }, { status: 404 });
      }

      if (!recipient.isActive) {
        return NextResponse.json({ ok: false, error: "Target user is disabled" }, { status: 400 });
      }

      if (!canInitiateDirectMessage(user.role, recipient.role)) {
        return NextResponse.json({
          ok: false,
          error: "Direct communication with this role is restricted by CodeXa workspace policy.",
        }, { status: 403 });
      }

      // Check block status
      const { data: block } = await chatSupabaseAdmin
        .from("chat_blocks")
        .select("id")
        .or(`and(blocker_core_user_id.eq.${targetUserId},blocked_core_user_id.eq.${user.id}),and(blocker_core_user_id.eq.${user.id},blocked_core_user_id.eq.${targetUserId})`)
        .maybeSingle();

      if (block) {
        return NextResponse.json({ ok: false, error: "Cannot start conversation with this user." }, { status: 403 });
      }

      const { data: conversation, error } = await getOrCreateDirectConversation(
        user.id,
        targetUserId
      );

      if (error) {
        return NextResponse.json({ ok: false, error }, { status: 500 });
      }

      return NextResponse.json({ ok: true, conversation });
    } else {
      // Group conversation
      const { data: newConv, error: convErr } = await chatSupabaseAdmin
        .from("conversations")
        .insert({
          type: "GROUP",
          title: title || "New Group",
          created_by_core_user_id: user.id,
        })
        .select()
        .single();

      if (convErr || !newConv) {
        return NextResponse.json({ ok: false, error: convErr?.message || "Failed to create group" }, { status: 500 });
      }

      const allMembers = Array.from(new Set([user.id, ...(memberIds || [])]));
      const memberRows = allMembers.map((mId: string) => ({
        conversation_id: newConv.id,
        core_user_id: mId,
        member_role: mId === user.id ? "OWNER" : "MEMBER",
      }));

      await chatSupabaseAdmin.from("conversation_members").insert(memberRows);

      return NextResponse.json({ ok: true, conversation: newConv });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
