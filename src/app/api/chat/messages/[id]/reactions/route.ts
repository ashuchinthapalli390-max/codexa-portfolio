import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionResult = await getCurrentSessionResult();
  if (sessionResult.status !== "authenticated") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = sessionResult.user;

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat unavailable" }, { status: 503 });
  }

  const { reaction } = await req.json();
  if (!reaction) {
    return NextResponse.json({ ok: false, error: "Reaction required" }, { status: 400 });
  }

  const { data, error } = await chatSupabaseAdmin
    .from("message_reactions")
    .upsert({
      message_id: params.id,
      core_user_id: user.id,
      reaction,
    }, { onConflict: "message_id,core_user_id,reaction" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reaction: data });
}
