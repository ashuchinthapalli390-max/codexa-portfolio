import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";

export async function DELETE(
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

  const { data, error } = await chatSupabaseAdmin
    .from("messages")
    .update({
      deleted_at: new Date().toISOString(),
      text: "[Message deleted]",
    })
    .eq("id", params.id)
    .eq("sender_core_user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Could not delete message or not permitted" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
