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
    return NextResponse.json({ ok: true });
  }

  await chatSupabaseAdmin
    .from("message_reads")
    .upsert({
      message_id: params.id,
      core_user_id: user.id,
      read_at: new Date().toISOString(),
    }, { onConflict: "message_id,core_user_id" });

  return NextResponse.json({ ok: true });
}
