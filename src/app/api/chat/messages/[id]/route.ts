/**
 * PATCH /api/chat/messages/[id]
 * Edits a message text. Only the original sender can edit their own message.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: "Message content cannot be empty." }, { status: 400 });
    }

    const updated = await dataStore.editMessage(id, user.id, message.trim());
    if (!updated) {
      return NextResponse.json({ success: false, error: "Message not found or unauthorized to edit." }, { status: 403 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (err: any) {
    console.error("[PATCH /api/chat/messages/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to edit message." }, { status: 500 });
  }
}
