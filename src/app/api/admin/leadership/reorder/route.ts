import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, logProfileAction } from "@/lib/auth";
import { isOwner } from "@/lib/permissions";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor || !isOwner(actor)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Array of items with id and displayOrder is required." }, { status: 400 });
    }

    await db.$transaction(
      items.map((item: { id: string; displayOrder: number }) =>
        db.teamProfile.update({
          where: { id: item.id },
          data: {
            displayOrder: Number(item.displayOrder),
            updatedBy: actor.username || actor.displayName,
            updatedAt: new Date(),
          },
        })
      )
    );

    try {
      revalidatePath("/");
      revalidatePath("/team");
    } catch {}

    await logProfileAction(
      actor.id,
      null,
      "leadership_reordered",
      "Owner updated leadership display order"
    ).catch(() => {});

    return NextResponse.json({ success: true, message: "Order updated successfully." });
  } catch (err: any) {
    console.error("[POST /api/admin/leadership/reorder] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
