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
    return false;
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

  // Batch-collect all member IDs across all conversations to eliminate N+1 queries
  const allCoreUserIdsSet = new Set<string>();
  (data || []).forEach((conv: any) => {
    (conv.conversation_members || []).forEach((m: any) => {
      if (m.core_user_id) allCoreUserIdsSet.add(String(m.core_user_id));
    });
    if (conv.direct_pair_key) {
      String(conv.direct_pair_key).split("::").forEach((p: string) => {
        if (p) allCoreUserIdsSet.add(p);
      });
    }
  });

  const coreUserRecords = await prisma.user.findMany({
    where: { id: { in: Array.from(allCoreUserIdsSet) } },
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

  const userMap = new Map<string, {
    id: string;
    fullName: string;
    displayName: string;
    username: string;
    role: string;
    avatarUrl: string | null;
  }>();

  coreUserRecords.forEach((u) => {
    const dispName = u.fullName || u.profile?.displayName || u.username || "CodeXa Colleague";
    const avUrl = u.profileMediaUrl || u.profile?.mediaUrl || null;
    userMap.set(u.id, {
      id: u.id,
      fullName: dispName,
      displayName: dispName,
      username: u.username || "colleague",
      role: u.role || "MEMBER",
      avatarUrl: avUrl,
    });
  });

  // Populate conversation details with batch-resolved user profiles
  const conversationsWithDetails = (data || []).map((conv: any) => {
    const memberDTOs = (conv.conversation_members || []).map((m: any) => {
      const u = userMap.get(m.core_user_id);
      return {
        id: m.core_user_id,
        memberRole: m.member_role || "MEMBER",
        fullName: u?.fullName || "Colleague",
        displayName: u?.displayName || "Colleague",
        username: u?.username || "colleague",
        role: u?.role || "MEMBER",
        avatarUrl: u?.avatarUrl || null,
        joinedAt: m.joined_at,
        muted: m.muted || false,
      };
    });

    if (conv.type === "DIRECT") {
      let otherUserId = (conv.conversation_members || []).find(
        (m: any) => m.core_user_id !== user.id
      )?.core_user_id;

      if (!otherUserId && conv.direct_pair_key) {
        const parts = String(conv.direct_pair_key).split("::");
        otherUserId = parts.find((p: string) => p !== user.id);
      }

      if (otherUserId) {
        const otherUser = userMap.get(otherUserId);
        const displayName = otherUser?.displayName || "CodeXa Colleague";
        const avatarUrl = otherUser?.avatarUrl || null;

        const recipientUser = {
          id: otherUserId,
          fullName: displayName,
          displayName,
          name: displayName,
          username: otherUser?.username || "colleague",
          role: otherUser?.role || "MEMBER",
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
          otherParticipantUsername: otherUser?.username || "colleague",
          otherParticipantAvatar: avatarUrl,
          otherParticipantRole: otherUser?.role || "MEMBER",
          members: memberDTOs,
        };
      }
    }

    // Group conversation
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
      members: memberDTOs,
    };
  });

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
