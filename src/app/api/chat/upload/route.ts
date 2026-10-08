/**
 * POST /api/chat/upload
 * Secure Chat Media Upload endpoint supporting Bearer auth and multipart files.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { chatSupabaseAdmin, isChatConfigured } from "@/lib/supabase/chat-admin";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, ok: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, ok: false, error: "No media file provided." }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ success: false, ok: false, error: "conversationId is required." }, { status: 400 });
    }

    if (isChatConfigured() && chatSupabaseAdmin) {
      const { data: membership } = await chatSupabaseAdmin
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("core_user_id", user.id)
        .is("left_at", null)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ success: false, ok: false, error: "Forbidden: You are not a member of this conversation." }, { status: 403 });
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".jpg";
    const filename = `chat_${conversationId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "chat");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    const publicUrl = `https://codxa-agency.online/uploads/chat/${filename}`;

    return NextResponse.json({
      success: true,
      ok: true,
      url: publicUrl,
      attachment: {
        id: `att-${Date.now()}`,
        url: publicUrl,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/chat/upload]", err);
    return NextResponse.json({ success: false, ok: false, error: "Failed to upload media." }, { status: 500 });
  }
}
