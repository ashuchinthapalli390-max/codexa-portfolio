import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

async function testDirect() {
  const url = process.env.CHAT_SUPABASE_URL!;
  const key = process.env.CHAT_SUPABASE_SECRET_KEY!;
  console.log("Direct URL:", url);
  console.log("Direct Key starts with:", key.substring(0, 15));
  
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.from("conversations").select("id").limit(1);
  console.log("Direct query error:", error);
  console.log("Direct query data:", data);
}

testDirect();
