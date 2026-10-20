import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: any }
) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isChatConfigured() || !chatSupabaseAdmin) {
    return NextResponse.json({ ok: true });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  await chatSupabaseAdmin
    .from("message_reads")
    .upsert({
      message_id: resolvedParams.id,
      core_user_id: user.id,
      read_at: new Date().toISOString(),
    }, { onConflict: "message_id,core_user_id" });

  return NextResponse.json({ ok: true });
}
