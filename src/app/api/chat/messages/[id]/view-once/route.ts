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

  // Retrieve message
  const { data: msg, error: msgErr } = await chatSupabaseAdmin
    .from("messages")
    .select("*, message_attachments(*)")
    .eq("id", messageId)
    .maybeSingle();

  if (msgErr || !msg) {
    return NextResponse.json({ ok: false, error: "Message not found" }, { status: 404 });
  }

  const isVO = msg.is_view_once || msg.message_type?.startsWith("VIEW_ONCE");
  if (!isVO) {
    return NextResponse.json({ ok: false, error: "Not a view once message" }, { status: 400 });
  }

  // Sender can view own message
  if (msg.sender_core_user_id === user.id) {
    const mediaUrl = msg.message_attachments?.[0]?.file_url || msg.text;
    return NextResponse.json({ ok: true, mediaUrl, isOwner: true });
  }

  // Check if session is already consumed
  const { data: session } = await chatSupabaseAdmin
    .from("message_view_once_sessions")
    .select("*")
    .eq("message_id", messageId)
    .eq("viewer_core_user_id", user.id)
    .maybeSingle();

  if (session && session.status === "CONSUMED") {
    return NextResponse.json({
      ok: false,
      code: "VIEW_ONCE_CONSUMED",
      error: "This media has already been viewed and can no longer be opened.",
    }, { status: 410 });
  }

  const now = new Date().toISOString();

  // Atomically record session as CONSUMED
  await chatSupabaseAdmin
    .from("message_view_once_sessions")
    .upsert({
      message_id: messageId,
      viewer_core_user_id: user.id,
      status: "CONSUMED",
      opened_at: now,
      consumed_at: now,
    }, { onConflict: "message_id,viewer_core_user_id" });

  // Update message row
  await chatSupabaseAdmin
    .from("messages")
    .update({
      view_once_consumed: true,
      view_once_consumed_at: now,
    })
    .eq("id", messageId);

  const mediaUrl = msg.message_attachments?.[0]?.file_url || msg.text;

  return NextResponse.json({
    ok: true,
    mediaUrl,
    openedAt: now,
  });
}
