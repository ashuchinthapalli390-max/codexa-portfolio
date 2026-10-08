import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/permissions";
import { sendEmail, notificationsFromEmail } from "@/lib/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canReview = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canReview) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const submissions = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        s.id, s.user_id, s.storage_path, s.image_url, s.version, s.status,
        s.rejection_reason, s.reviewed_by_name, s.reviewed_at, s.submitted_at,
        u.full_name, u.username, u.email, u.role,
        ep.intern_id, ep.employee_id, ep.department
      FROM id_card_photo_submissions s
      JOIN "User" u ON u.id = s.user_id
      LEFT JOIN "EmploymentProfile" ep ON ep.user_id = u.id
      ORDER BY s.submitted_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      ok: true,
      submissions,
      count: submissions.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/benefits/id-card]", err);
    return NextResponse.json({ ok: false, error: "Failed to load ID card submissions" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const role = getEffectiveRole(user);
    const canReview = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "OWNER", "ADMIN"].includes(role);
    if (!canReview) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const { submissionId, action, rejectionReason } = body;

    if (!submissionId || !action) {
      return NextResponse.json({ ok: false, error: "submissionId and action required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    let newStatus = "APPROVED";
    if (action === "REJECT") {
      newStatus = "REJECTED";
      if (!rejectionReason) {
        return NextResponse.json({ ok: false, error: "Rejection reason is required" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
    } else if (action === "SET_PREPARING") {
      newStatus = "ID_CARD_PREPARING";
    } else if (action === "SET_READY") {
      newStatus = "ID_CARD_READY";
    } else if (action === "SET_ISSUED") {
      newStatus = "ID_CARD_ISSUED";
    }

    const reviewerName = user.displayName || user.username || "Reviewer";

    await db.$executeRawUnsafe(`
      UPDATE id_card_photo_submissions
      SET 
        status = $1,
        rejection_reason = $2,
        reviewed_by = $3,
        reviewed_by_name = $4,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $5
    `,
      newStatus,
      rejectionReason || null,
      user.id,
      reviewerName,
      submissionId
    );

    // Get submission user to notify
    const subRows = await db.$queryRawUnsafe<any[]>(`
      SELECT user_id FROM id_card_photo_submissions WHERE id = $1
    `, submissionId);

    if (subRows.length > 0) {
      const targetUserId = subRows[0].user_id;
      const statusTitle = newStatus === "APPROVED"
        ? "ID Card Photo Approved"
        : newStatus === "REJECTED"
          ? "ID Card Photo Requires Correction"
          : newStatus === "ID_CARD_PREPARING"
            ? "ID Card Is Being Prepared"
            : newStatus === "ID_CARD_READY"
              ? "ID Card Is Ready"
              : "ID Card Issued";

      const statusMsg = newStatus === "REJECTED"
        ? `Your submitted photo was rejected: ${rejectionReason}. Please upload a new photo.`
        : `Your ID Card status has been updated to ${newStatus}.`;

      try {
        await db.notification.create({
          data: {
            userId: targetUserId,
            type: "ID_CARD_UPDATE",
            title: statusTitle,
            message: statusMsg,
            link: "/payments",
          },
        });
      } catch (_) {}
    }

    return NextResponse.json({
      ok: true,
      message: `ID Card photo submission marked as ${newStatus}.`,
      status: newStatus,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/benefits/id-card]", err);
    return NextResponse.json({ ok: false, error: "Failed to update ID card submission" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
