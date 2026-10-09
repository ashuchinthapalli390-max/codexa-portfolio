import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
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
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
        let otherUserId = (conv.conversation_members || []).find(
          (m: any) => m.core_user_id !== user.id
        )?.core_user_id;

        if (!otherUserId && conv.direct_pair_key) {
          const parts = String(conv.direct_pair_key).split("::");
          otherUserId = parts.find((p: string) => p !== user.id);
        }

        if (otherUserId) {
          const userRecord = await prisma.user.findUnique({
            where: { id: otherUserId },
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
              profileMediaUrl: true,
              profile: {
                select: {
                  displayName: true,
                  mediaUrl: true,
                },
              },
            },
          });

          const displayName =
            userRecord?.fullName ||
            userRecord?.profile?.displayName ||
            userRecord?.username ||
            "CodeXa Colleague";

          const avatarUrl =
            userRecord?.profileMediaUrl ||
            userRecord?.profile?.mediaUrl ||
            null;

          const recipientUser = {
            id: otherUserId,
            fullName: displayName,
            displayName,
            name: displayName,
            username: userRecord?.username || "colleague",
            role: userRecord?.role || "MEMBER",
            profileMediaUrl: avatarUrl,
            avatarUrl,
          };

          return {
            ...conv,
            name: displayName,
            title: displayName,
            avatarUrl,
            recipientUser,
            peer: recipientUser,
            otherParticipantCoreUserId: otherUserId,
            otherParticipantDisplayName: displayName,
            otherParticipantUsername: userRecord?.username || "colleague",
            otherParticipantAvatar: avatarUrl,
            otherParticipantRole: userRecord?.role || "MEMBER",
          };
        }
      }

      // Group or fallback
      const groupTitle = conv.title || conv.name || "Team Group";
      const groupIcon =
        conv.metadata?.iconUrl ||
        conv.metadata?.avatarUrl ||
        conv.icon_url ||
        conv.avatar_url ||
        null;

      return {
        ...conv,
        name: groupTitle,
        title: groupTitle,
        avatarUrl: groupIcon,
      };
    })
  );

  return NextResponse.json({ ok: true, conversations: conversationsWithDetails });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
        select: {
          id: true,
          role: true,
          fullName: true,
          username: true,
          isActive: true,
          profileMediaUrl: true,
          profile: {
            select: { displayName: true, mediaUrl: true }
          }
        },
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

      const displayName =
        recipient.fullName ||
        recipient.profile?.displayName ||
        recipient.username ||
        "CodeXa Colleague";

      const avatarUrl =
        recipient.profileMediaUrl ||
        recipient.profile?.mediaUrl ||
        null;

      const recipientDTO = {
        id: recipient.id,
        fullName: displayName,
        displayName,
        name: displayName,
        username: recipient.username,
        role: recipient.role,
        profileMediaUrl: avatarUrl,
        avatarUrl,
      };

      return NextResponse.json({
        ok: true,
        conversation: {
          ...conversation,
          type: "DIRECT",
          name: displayName,
          title: displayName,
          avatarUrl,
          recipientUser: recipientDTO,
          peer: recipientDTO,
          otherParticipantCoreUserId: recipient.id,
          otherParticipantDisplayName: displayName,
          otherParticipantUsername: recipient.username,
          otherParticipantAvatar: avatarUrl,
          otherParticipantRole: recipient.role,
        },
      });
    } else {
      // Group conversation
      const groupTitle = title || "New Group";
      const { data: newConv, error: convErr } = await chatSupabaseAdmin
        .from("conversations")
        .insert({
          type: "GROUP",
          title: groupTitle,
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

      return NextResponse.json({
        ok: true,
        conversation: {
          ...newConv,
          name: groupTitle,
          title: groupTitle,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
