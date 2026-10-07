import { createClient } from "@supabase/supabase-js";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL || process.env.CHAT_SUPABASE_URL || "";
const CHAT_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CHAT_SUPABASE_PUBLISHABLE_KEY || process.env.CHAT_SUPABASE_PUBLISHABLE_KEY || "";

export const isChatSupabaseConfigured = (): boolean => {
  if (!CHAT_URL || !CHAT_PUBLISHABLE_KEY) return false;
  if (CHAT_URL.includes("[") || CHAT_URL.includes("YOUR_CHAT_PROJECT_REF") || CHAT_PUBLISHABLE_KEY.includes("your_chat_supabase")) return false;
  try {
    const parsed = new URL(CHAT_URL);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

function createBrowserClient() {
  if (!isChatSupabaseConfigured()) return null;
  try {
    return createClient(CHAT_URL, CHAT_PUBLISHABLE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn("[chatSupabaseClient init warning]:", err);
    return null;
  }
}

export const chatSupabaseClient = createBrowserClient();
