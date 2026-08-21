/**
 * /api/inquiries/[id]
 * PATCH: Update status, priority, assign member, reply notes.
 */
import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const { status, priority, assignedTo, replyNotes } = body;

    const updated = await dataStore.updateInquiry(id, {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignedTo !== undefined ? { assignedTo } : {}),
      ...(replyNotes !== undefined ? { replyNotes } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }

    // Log audit
    await dataStore.logAudit({
      actorId: user.id,
      actorName: user.displayName,
      action: "INQUIRY_STATUS_CHANGED",
      details: `Inquiry [${updated.referenceId}] updated. Status: ${updated.status}, Priority: ${updated.priority}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (err: any) {
    console.error("[PATCH /api/inquiries/[id]]", err);
    return NextResponse.json({ error: "Failed to update inquiry." }, { status: 500 });
  }
}
