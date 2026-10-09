import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Chat unavailable" }, { status: 503 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const messageId = resolvedParams.id;

  const body = await req.json().catch(() => ({}));
  const reaction = body.reaction || body.emoji || "❤️";

  // Check if this reaction from this user already exists
  const { data: existing } = await chatSupabaseAdmin
    .from("message_reactions")
    .select("id, reaction")
    .eq("message_id", messageId)
    .eq("core_user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.reaction === reaction) {
      // Toggle off / delete reaction
      await chatSupabaseAdmin
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);

      return NextResponse.json({ ok: true, toggled: false, messageId });
    } else {
      // Update to new reaction
      await chatSupabaseAdmin
        .from("message_reactions")
        .update({ reaction, created_at: new Date().toISOString() })
        .eq("id", existing.id);

      return NextResponse.json({ ok: true, toggled: true, reaction, messageId });
    }
  }

  // Insert reaction
  const { data, error } = await chatSupabaseAdmin
    .from("message_reactions")
    .insert({
      message_id: messageId,
      core_user_id: user.id,
      reaction,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, toggled: true, reaction: data, messageId });
}
