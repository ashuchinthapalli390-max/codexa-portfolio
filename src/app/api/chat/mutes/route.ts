import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";

export async function POST(req: NextRequest) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat unavailable" }, { status: 503 });
  }

  const { conversationId, mutedUntil } = await req.json();
  if (!conversationId) {
    return NextResponse.json({ ok: false, error: "conversationId required" }, { status: 400 });
  }

  const { data, error } = await chatSupabaseAdmin
    .from("chat_mutes")
    .upsert({
      core_user_id: user.id,
      conversation_id: conversationId,
      muted_until: mutedUntil || null,
    }, { onConflict: "core_user_id,conversation_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mute: data });
}
