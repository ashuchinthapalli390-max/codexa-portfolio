/**
 * POST /api/chat/upload
 * Secure Chat Image Upload endpoint with conversation membership validation.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";
import { supabaseUploadFile, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No image file provided." }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId is required." }, { status: 400 });
    }

    // ── Verify conversation membership ──
    const conv = await dataStore.getConversationById(conversationId, user.id);
    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
    }

    const isMember =
      conv.type === "GROUP" ||
      conv.type === "CHANNEL" ||
      conv.participantIds?.includes(user.id) ||
      conv.members?.some((m) => m.id === user.id || m.username === user.username);

    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden: You are not a participant of this conversation." }, { status: 403 });
    }

    // Validate mime type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ success: false, error: "Invalid file type. Only JPG, PNG, WEBP, and GIF are permitted." }, { status: 400 });
    }

    // Max 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "File size exceeds maximum limit of 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const filename = `chat_${conversationId}_${user.id}_${Date.now()}.${ext}`;

    let publicUrl = "";

    if (isSupabaseConfigured()) {
      const bucket = process.env.SUPABASE_CHAT_IMAGES_BUCKET || "chat-images";
      const uploaded = await supabaseUploadFile(bucket, `${conversationId}/${filename}`, buffer, file.type);
      if (uploaded && uploaded.data?.publicUrl) {
        publicUrl = uploaded.data.publicUrl;
      }
    }

    // Fallback data URI if Supabase storage is not connected
    if (!publicUrl) {
      const base64 = buffer.toString("base64");
      publicUrl = `data:${file.type};base64,${base64}`;
    }

    const attachment = {
      id: `att-${Date.now()}`,
      url: publicUrl,
      name: file.name,
      mimeType: file.type,
      size: file.size,
    };

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (err: any) {
    console.error("[POST /api/chat/upload]", err);
    return NextResponse.json({ success: false, error: "Failed to upload image." }, { status: 500 });
  }
}
