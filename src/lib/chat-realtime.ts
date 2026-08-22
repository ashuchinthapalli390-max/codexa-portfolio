/**
 * Realtime Chat Transportation & Delta Synchronization Client
 *
 * Provides:
 * 1. Supabase Realtime pub/sub client for instant message events (INSERT, UPDATE, DELETE)
 * 2. Automatic fallback to low-frequency delta polling (after=timestamp) if Realtime is unavailable
 * 3. Connection state tracking and automatic cleanup on conversation switch or unmount
 */
import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { ChatMessage } from "@/lib/data-store";

let browserSupabaseClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return browserSupabaseClient;
}

export interface RealtimeChatSubscriptionOptions {
  conversationId: string;
  onMessageInsert: (msg: any) => void;
  onMessageUpdate: (msg: any) => void;
  onMessageDelete: (oldMsg: any) => void;
  onConnectionStatusChange?: (status: "CONNECTED" | "CONNECTING" | "DISCONNECTED") => void;
}

/**
 * Subscribes to Realtime Postgres changes for the active conversation.
 * Returns an unsubscribe teardown function.
 */
export function subscribeToConversationRealtime(
  options: RealtimeChatSubscriptionOptions
): () => void {
  const client = getSupabaseBrowserClient();
  if (!client) {
    options.onConnectionStatusChange?.("DISCONNECTED");
    return () => {};
  }

  const { conversationId, onMessageInsert, onMessageUpdate, onMessageDelete, onConnectionStatusChange } = options;

  onConnectionStatusChange?.("CONNECTING");

  const channel: RealtimeChannel = client
    .channel(`chat-conversation-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Message",
        filter: `conversationId=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessageInsert(payload.new);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Message",
        filter: `conversationId=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessageUpdate(payload.new);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "Message",
        filter: `conversationId=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.old) {
          onMessageDelete(payload.old);
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onConnectionStatusChange?.("CONNECTED");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onConnectionStatusChange?.("DISCONNECTED");
      }
    });

  return () => {
    try {
      client.removeChannel(channel);
    } catch {}
  };
}
