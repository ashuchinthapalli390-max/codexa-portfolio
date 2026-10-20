import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";

export async function DELETE(
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
  const { data, error } = await chatSupabaseAdmin
    .from("messages")
    .update({
      deleted_at: new Date().toISOString(),
      text: "[Message deleted]",
    })
    .eq("id", resolvedParams.id)
    .eq("sender_core_user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Could not delete message or not permitted" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, deleted: true });
}
