import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const conversations = await dataStore.getConversations(user.id);

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error("[GET /api/chat/conversations]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json({ success: false, error: "Recipient ID or Username is required." }, { status: 400 });
    }

    // Resolve recipient profile
    let recipientProfile = await dataStore.getProfileById(recipientId);
    if (!recipientProfile) {
      recipientProfile = await dataStore.getProfileByUsername(recipientId);
    }

    if (!recipientProfile) {
      return NextResponse.json({ success: false, error: "Recipient member not found." }, { status: 404 });
    }

    // Prevent self DM
    if (recipientProfile.id === user.id || recipientProfile.username === user.username) {
      return NextResponse.json({ success: false, error: "Cannot start a direct message with yourself." }, { status: 400 });
    }

    const conversation = await dataStore.getOrCreateDirectConversation(user.id, recipientProfile.id);

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error("[POST /api/chat/conversations]", error);
    return NextResponse.json(
      { success: false, error: "Failed to start direct conversation." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("id");

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "Conversation ID is required." }, { status: 400 });
    }

    const success = await dataStore.hideConversation(conversationId, user.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("[DELETE /api/chat/conversations]", error);
    return NextResponse.json(
      { success: false, error: "Failed to hide conversation." },
      { status: 500 }
    );
  }
}
