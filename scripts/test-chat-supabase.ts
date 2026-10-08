import dotenv from "dotenv";
dotenv.config();

import { isChatConfigured, chatSupabaseAdmin } from "../src/lib/supabase/chat-admin";

async function test() {
  console.log("isChatConfigured:", isChatConfigured());
  console.log("chatSupabaseAdmin:", !!chatSupabaseAdmin);
  try {
    const { data, error } = await chatSupabaseAdmin.from("conversations").select("id").limit(1);
    console.log("Query error:", error);
    console.log("Query data:", data);
  } catch (e: any) {
    console.error("Caught error:", e.message);
  }
}

test();
