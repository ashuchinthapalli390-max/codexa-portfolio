import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const conversations = await dataStore.getConversations(user?.id);

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { recipientId } = await req.json();

    if (!recipientId) {
      return NextResponse.json({ success: false, error: "Recipient ID is required for direct chat." }, { status: 400 });
    }

    const conversation = await dataStore.getOrCreateDirectConversation(user.id, recipientId);

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to start direct conversation." },
      { status: 500 }
    );
  }
}
