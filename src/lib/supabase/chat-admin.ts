if (typeof window !== "undefined") {
  throw new Error("chat-admin.ts cannot be imported in client-side code");
}

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const CHAT_URL = process.env.CHAT_SUPABASE_URL || process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL || "";
const CHAT_SECRET_KEY = process.env.CHAT_SUPABASE_SECRET_KEY || "";
const CHAT_JWT_SECRET = process.env.CHAT_JWT_SECRET || CHAT_SECRET_KEY || "codexa_chat_jwt_fallback_secret_key";
const CHAT_BUCKET = process.env.CHAT_SUPABASE_STORAGE_BUCKET || "chat-private";

export const isChatConfigured = (): boolean => {
  if (!CHAT_URL || !CHAT_SECRET_KEY) return false;
  if (CHAT_URL.includes("[") || CHAT_URL.includes("YOUR_CHAT_PROJECT_REF") || CHAT_SECRET_KEY.includes("your_chat_supabase")) return false;
  try {
    const parsed = new URL(CHAT_URL);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

function createAdminClient() {
  if (!isChatConfigured()) return null;
  try {
    return createClient(CHAT_URL, CHAT_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.warn("[chatSupabaseAdmin init warning]:", err);
    return null;
  }
}

export const chatSupabaseAdmin = createAdminClient();

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
    .createHmac("sha256", CHAT_JWT_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest("base64url");

  return `${b64Header}.${b64Payload}.${signature}`;
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
  if (!chatSupabaseAdmin) {
    return { data: null, error: "Chat Supabase is not configured" };
  }

  const pairKey = getDirectPairKey(coreUserId, targetUserId);

  // Check if conversation already exists
  const { data: existingConv } = await chatSupabaseAdmin
    .from("conversations")
    .select("*, conversation_members(*)")
    .eq("direct_pair_key", pairKey)
    .single();

  if (existingConv) {
    return { data: existingConv, error: null };
  }

  // Create new conversation
  const { data: newConv, error: convError } = await chatSupabaseAdmin
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

  await chatSupabaseAdmin.from("conversation_members").insert(members);

  return { data: newConv, error: null };
}

/**
 * Fetches user's active conversations with latest messages and unread counts
 */
export async function getUserConversations(coreUserId: string) {
  if (!chatSupabaseAdmin) {
    return { data: [], error: "Chat Supabase is not configured" };
  }

  const { data: memberRows, error: memberErr } = await chatSupabaseAdmin
    .from("conversation_members")
    .select("conversation_id, muted, joined_at")
    .eq("core_user_id", coreUserId)
    .is("left_at", null);

  if (memberErr || !memberRows || memberRows.length === 0) {
    return { data: [], error: null };
  }

  const conversationIds = memberRows.map((m: any) => m.conversation_id);

  const { data: conversations, error: convErr } = await chatSupabaseAdmin
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
      const { data: latestMsg } = await chatSupabaseAdmin!
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
  if (!chatSupabaseAdmin) {
    return { data: null, error: "Chat Supabase is not configured" };
  }

  // 1. Verify membership
  const { data: membership } = await chatSupabaseAdmin
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
  const { data: existing } = await chatSupabaseAdmin
    .from("messages")
    .select("*")
    .eq("sender_core_user_id", params.senderCoreUserId)
    .eq("client_message_id", params.clientMessageId)
    .maybeSingle();

  if (existing) {
    return { data: existing, error: null, isDuplicate: true };
  }

  // 3. Insert new message
  const { data: message, error: insertError } = await chatSupabaseAdmin
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
  await chatSupabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  return { data: message, error: null, isDuplicate: false };
}
