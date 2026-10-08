import fs from "fs";

// 1. Update src/lib/supabase/chat-admin.ts
const chatAdminContent = `if (typeof window !== "undefined") {
  throw new Error("chat-admin.ts cannot be imported in client-side code");
}

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function getChatUrl(): string {
  return process.env.CHAT_SUPABASE_URL || process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL || "";
}

function getChatSecretKey(): string {
  return process.env.CHAT_SUPABASE_SECRET_KEY || "";
}

function getChatJwtSecret(): string {
  return process.env.CHAT_JWT_SECRET || getChatSecretKey() || "codexa_chat_jwt_fallback_secret_key";
}

export const isChatConfigured = (): boolean => {
  const url = getChatUrl();
  const key = getChatSecretKey();
  if (!url || !key) return false;
  if (url.includes("[") || url.includes("YOUR_CHAT_PROJECT_REF") || key.includes("your_chat_supabase")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

let _adminClient: any = null;
export function getChatAdminClient() {
  if (_adminClient) return _adminClient;
  if (!isChatConfigured()) return null;
  try {
    _adminClient = createClient(getChatUrl(), getChatSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return _adminClient;
  } catch (err) {
    console.warn("[chatSupabaseAdmin init warning]:", err);
    return null;
  }
}

export const chatSupabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = getChatAdminClient();
    if (!client) return undefined;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/**
 * Signs a short-lived HS256 JWT specifically for Supabase Chat & Realtime channel authentication
 */
export function signChatToken(coreUserId: string, expiresInSeconds = 3600): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: coreUserId,
    core_user_id: coreUserId,
    role: "authenticated",
    iss: process.env.CHAT_JWT_ISSUER || "codexa-chat",
    aud: process.env.CHAT_JWT_AUDIENCE || "codexa-mobile",
    iat: now,
    exp: now + expiresInSeconds,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getChatJwtSecret())
    .update(\`\${b64Header}.\${b64Payload}\`)
    .digest("base64url");

  return \`\${b64Header}.\${b64Payload}.\${signature}\`;
}

/**
 * Deterministic direct-conversation pair key: sorted(userId1, userId2)
 */
export function getDirectPairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join("::");
}

/**
 * Creates or retrieves a deduplicated direct conversation between two users
 */
export async function getOrCreateDirectConversation(coreUserId: string, targetUserId: string) {
  const client = getChatAdminClient();
  if (!client) {
    return { data: null, error: "Chat Supabase is not configured" };
  }

  const pairKey = getDirectPairKey(coreUserId, targetUserId);

  // Check if conversation already exists
  const { data: existingConv } = await client
    .from("conversations")
    .select("*, conversation_members(*)")
    .eq("direct_pair_key", pairKey)
    .single();

  if (existingConv) {
    return { data: existingConv, error: null };
  }

  // Create new conversation
  const { data: newConv, error: convError } = await client
    .from("conversations")
    .insert({
      type: "DIRECT",
      created_by_core_user_id: coreUserId,
      direct_pair_key: pairKey,
    })
    .select()
    .single();

  if (convError || !newConv) {
    return { data: null, error: convError?.message || "Failed to create conversation" };
  }

  // Add both members
  const members = [
    { conversation_id: newConv.id, core_user_id: coreUserId, member_role: "OWNER" },
    { conversation_id: newConv.id, core_user_id: targetUserId, member_role: "MEMBER" },
  ];

  await client.from("conversation_members").insert(members);

  return { data: newConv, error: null };
}

/**
 * Fetches user's active conversations with latest messages and unread counts
 */
export async function getUserConversations(coreUserId: string) {
  const client = getChatAdminClient();
  if (!client) {
    return { data: [], error: "Chat Supabase is not configured" };
  }

  const { data: memberRows, error: memberErr } = await client
    .from("conversation_members")
    .select("conversation_id, muted, joined_at")
    .eq("core_user_id", coreUserId)
    .is("left_at", null);

  if (memberErr || !memberRows || memberRows.length === 0) {
    return { data: [], error: null };
  }

  const conversationIds = memberRows.map((m: any) => m.conversation_id);

  const { data: conversations, error: convErr } = await client
    .from("conversations")
    .select("*, conversation_members(*)")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (convErr || !conversations) {
    return { data: [], error: convErr?.message };
  }

  // Enhance each conversation with latest message
  const enhanced = await Promise.all(
    conversations.map(async (conv: any) => {
      const { data: latestMsg } = await client
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const membership = memberRows.find((m: any) => m.conversation_id === conv.id);

      return {
        ...conv,
        latestMessage: latestMsg || null,
        isMuted: membership?.muted || false,
      };
    })
  );

  return { data: enhanced, error: null };
}

/**
 * Sends a message with clientMessageId idempotency protection
 */
export async function sendChatMessage(params: {
  conversationId: string;
  senderCoreUserId: string;
  clientMessageId: string;
  text?: string;
  messageType?: string;
  replyToMessageId?: string;
}) {
  const client = getChatAdminClient();
  if (!client) {
    return { data: null, error: "Chat Supabase is not configured" };
  }

  // 1. Verify membership
  const { data: membership } = await client
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", params.conversationId)
    .eq("core_user_id", params.senderCoreUserId)
    .is("left_at", null)
    .maybeSingle();

  if (!membership) {
    return { data: null, error: "You are not an active member of this conversation" };
  }

  // 2. Check for duplicate/retry message via (sender_core_user_id, client_message_id)
  const { data: existing } = await client
    .from("messages")
    .select("*")
    .eq("sender_core_user_id", params.senderCoreUserId)
    .eq("client_message_id", params.clientMessageId)
    .maybeSingle();

  if (existing) {
    return { data: existing, error: null, isDuplicate: true };
  }

  // 3. Insert new message
  const { data: message, error: insertError } = await client
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_core_user_id: params.senderCoreUserId,
      client_message_id: params.clientMessageId,
      text: params.text || "",
      message_type: params.messageType || "TEXT",
      reply_to_message_id: params.replyToMessageId || null,
    })
    .select()
    .single();

  if (insertError || !message) {
    return { data: null, error: insertError?.message || "Failed to send message" };
  }

  // 4. Update conversation updated_at
  await client
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  return { data: message, error: null, isDuplicate: false };
}

/**
 * Marks unread messages in a conversation as read by a member
 */
export async function markConversationMessagesRead(
  conversationId: string,
  readerCoreUserId: string,
  lastReadMessageId?: string
) {
  const client = getChatAdminClient();
  if (!client) return { ok: false, error: "Chat not configured" };

  // Fetch unread messages from other senders
  const { data: msgs } = await client
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .neq("sender_core_user_id", readerCoreUserId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (msgs && msgs.length > 0) {
    const now = new Date().toISOString();
    const rows = msgs.map((m: any) => ({
      message_id: m.id,
      core_user_id: readerCoreUserId,
      read_at: now,
    }));

    await client.from("message_reads").upsert(rows, { onConflict: "message_id,core_user_id" });
  }

  return { ok: true };
}
`;

fs.writeFileSync("src/lib/supabase/chat-admin.ts", chatAdminContent, "utf8");
console.log("Updated src/lib/supabase/chat-admin.ts");

// 2. Update src/app/api/mobile/chat/direct/route.ts
const mobileDirectContent = `import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSessionResult, getCurrentSessionResult, generateRequestId } from "@/lib/auth";
import { getOrCreateDirectConversation } from "@/lib/supabase/chat-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      const res = await validateSessionResult(rawToken);
      if (res.status === "authenticated") return res.user;
    }
  }
  const cookieRes = await getCurrentSessionResult();
  if (cookieRes.status === "authenticated") return cookieRes.user;
  return null;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: { code: "MISSING_TARGET_USER", message: "Target user ID is required." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_TARGET", message: "Cannot create direct message with yourself." } }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Verify target user exists and is active
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, fullName: true, username: true, role: true, profileMediaUrl: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ ok: false, error: { code: "USER_NOT_FOUND", message: "Target user is unavailable or inactive." } }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Use authoritative Chat Supabase conversation
    const { data: conv, error: convErr } = await getOrCreateDirectConversation(user.id, targetUserId);

    if (convErr || !conv) {
      return NextResponse.json({ ok: false, error: { code: "CHAT_ERROR", message: convErr || "Could not open chat." } }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({
      ok: true,
      conversationId: conv.id,
      conversation: {
        id: conv.id,
        type: "DIRECT",
        name: targetUser.fullName || targetUser.username,
        title: targetUser.fullName || targetUser.username,
        avatarUrl: targetUser.profileMediaUrl,
        peer: {
          id: targetUser.id,
          name: targetUser.fullName || targetUser.username,
          username: targetUser.username,
          role: targetUser.role,
          avatarUrl: targetUser.profileMediaUrl,
        },
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error(\`[POST /api/mobile/chat/direct] [\${requestId}]\`, err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to open direct conversation." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
`;

fs.writeFileSync("src/app/api/mobile/chat/direct/route.ts", mobileDirectContent, "utf8");
console.log("Updated src/app/api/mobile/chat/direct/route.ts");

// 3. Update src/app/api/chat/read/route.ts
const chatReadContent = `import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { markConversationMessagesRead, isChatConfigured } from "@/lib/supabase/chat-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentSessionResult();

    if (auth.status !== "authenticated") {
      return NextResponse.json({ ok: false, success: false, error: "Unauthorized." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const user = auth.user;
    const body = await req.json().catch(() => ({}));
    const { conversationId, lastReadMessageId } = body;

    if (!conversationId) {
      return NextResponse.json({ ok: false, success: false, error: "conversationId is required." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (isChatConfigured()) {
      await markConversationMessagesRead(conversationId, user.id, lastReadMessageId);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      conversationId,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[POST /api/chat/read]", err);
    return NextResponse.json({ ok: false, success: false, error: "Failed to mark as read." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
`;

fs.writeFileSync("src/app/api/chat/read/route.ts", chatReadContent, "utf8");
console.log("Updated src/app/api/chat/read/route.ts");
