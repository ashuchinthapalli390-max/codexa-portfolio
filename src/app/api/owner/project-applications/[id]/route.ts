import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, isOwner } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getCurrentSessionResult();

    if (auth.status !== "authenticated") {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const permCheck = await requirePermission(auth.user, Permission.VERIFY_PAYMENTS);
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const id = params.id;
    const body = await req.json();
    const { status, adminNotes, finalQuoteAmount, leadQuality } = body;

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (adminNotes !== undefined) dataToUpdate.adminNotes = adminNotes;
    if (finalQuoteAmount !== undefined) {
      dataToUpdate.finalQuoteAmount = finalQuoteAmount === "" || finalQuoteAmount === null
        ? null
        : parseInt(String(finalQuoteAmount), 10);
    }
    if (leadQuality !== undefined) dataToUpdate.leadQuality = leadQuality;

    const updated = await db.projectApplication.update({
      where: { id },
      data: dataToUpdate,
      include: {
        payments: true,
      },
    });

    return NextResponse.json({
      success: true,
      application: updated,
    });
  } catch (error: any) {
    console.error("Error updating project application:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update project application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getCurrentSessionResult();

    if (auth.status !== "authenticated" || !isOwner(auth.user)) {
      return NextResponse.json({ success: false, error: "Forbidden: Founder and Co-Founder only." }, { status: 403 });
    }

    const id = params.id;
    await db.projectApplication.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error deleting project application:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete application" },
      { status: 500 }
    );
  }
}
