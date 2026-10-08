import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { signChatToken, isChatConfigured } from "@/lib/supabase/chat-admin";

export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = signChatToken(user.id);
  const chatUrl = process.env.CHAT_SUPABASE_URL || process.env.NEXT_PUBLIC_CHAT_SUPABASE_URL || "";
  const publishableKey = process.env.CHAT_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CHAT_SUPABASE_PUBLISHABLE_KEY || "";

  return NextResponse.json({
    ok: true,
    token,
    coreUserId: user.id,
    expiresIn: 3600,
    chatConfig: {
      url: chatUrl,
      publishableKey,
      isConfigured: isChatConfigured(),
    },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
