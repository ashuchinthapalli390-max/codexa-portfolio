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

    const requests = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        r.id, r.user_id, r.resource_type, r.reason, r.status,
        r.reviewer_decision, r.reviewer_notes, r.reviewed_by_name, r.reviewed_at,
        r.provisioning_status, r.provisioned_at, r.activation_instructions, r.requested_at,
        u."fullName" as full_name, u.username, u.email, u.role,
        ep."employeeId" as intern_id, ep."employeeId" as employee_id, ep.department
      FROM ai_access_requests r
      JOIN "User" u ON u.id = r.user_id
      LEFT JOIN "EmploymentProfile" ep ON ep."userId" = u.id
      ORDER BY r.requested_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      ok: true,
      requests,
      count: requests.length,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/admin/benefits/ai-access-requests]", err);
    return NextResponse.json({ ok: false, error: "Failed to load AI access requests" }, { status: 500, headers: NO_CACHE_HEADERS });
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
    const { requestId, action, notes, activationInstructions } = body;

    if (!requestId || !action) {
      return NextResponse.json({ ok: false, error: "requestId and action required" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    let newStatus = "APPROVED_PENDING_PROVISIONING";
    let provisioningStatus = "PENDING";
    let provisionedAt: string | null = null;

    if (action === "REJECT") {
      newStatus = "REJECTED";
    } else if (action === "WAITLIST") {
      newStatus = "WAITLISTED";
    } else if (action === "MARK_PROVISIONED") {
      newStatus = "ACCESS_GRANTED";
      provisioningStatus = "PROVISIONED";
      provisionedAt = new Date().toISOString();
    }

    const reviewerName = user.displayName || user.username || "Reviewer";

    await db.$executeRawUnsafe(`
      UPDATE ai_access_requests
      SET 
        status = $1,
        reviewer_decision = $2,
        reviewer_notes = $3,
        reviewed_by = $4,
        reviewed_by_name = $5,
        reviewed_at = NOW(),
        provisioning_status = $6,
        provisioned_at = $7::timestamptz,
        provisioned_by = $8,
        activation_instructions = $9,
        updated_at = NOW()
      WHERE id = $10
    `,
      newStatus,
      action,
      notes || null,
      user.id,
      reviewerName,
      provisioningStatus,
      provisionedAt,
      action === "MARK_PROVISIONED" ? reviewerName : null,
      activationInstructions || null,
      requestId
    );

    // Notify user
    const reqRows = await db.$queryRawUnsafe<any[]>(`
      SELECT r.user_id, u.email, u.full_name, u.username
      FROM ai_access_requests r
      JOIN "User" u ON u.id = r.user_id
      WHERE r.id = $1
    `, requestId);

    if (reqRows.length > 0) {
      const targetUser = reqRows[0];
      const targetUserId = targetUser.user_id;

      const title = newStatus === "APPROVED_PENDING_PROVISIONING"
        ? "Gemini Pro Request Approved"
        : newStatus === "ACCESS_GRANTED"
          ? "Gemini Pro Access Granted!"
          : newStatus === "WAITLISTED"
            ? "Gemini Pro Access Waitlisted"
            : "Gemini Pro Request Update";

      const msg = newStatus === "ACCESS_GRANTED"
        ? "Your Gemini Pro Account access has been provisioned! Check your benefits dashboard for activation details."
        : newStatus === "APPROVED_PENDING_PROVISIONING"
          ? "Founder and Co-Founder have approved your request. Account provisioning is in progress."
          : newStatus === "REJECTED"
            ? `Your request was rejected: ${notes || "Check with management"}.`
            : "Your request has been added to the waitlist queue.";

      try {
        await db.notification.create({
          data: {
            userId: targetUserId,
            type: "AI_ACCESS_UPDATE",
            title,
            message: msg,
            link: "/payments",
          },
        });
      } catch (_) {}

      // Send email to intern
      if (targetUser.email) {
        sendEmail({
          from: notificationsFromEmail,
          to: targetUser.email,
          subject: `CodeXa — ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070707; color: #f7f7f7; padding: 24px; border-radius: 12px; border: 1px solid #222;">
              <h2 style="color: #D90429; margin-top: 0;">CodeXa AI Dev Tools</h2>
              <p>Hello ${targetUser.full_name || targetUser.username},</p>
              <p>${msg}</p>
              ${activationInstructions ? `<div style="background: #111; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #222;"><strong>Activation Instructions:</strong><p style="color: #ddd;">${activationInstructions}</p></div>` : ""}
              <p style="margin-top: 24px;"><a href="https://codxa-agency.online/dashboard/payments" style="background: #D90429; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">View In Dashboard</a></p>
            </div>
          `,
        }).catch(e => console.error(`[AI Status Email Error to ${targetUser.email}]:`, e));
      }
    }

    return NextResponse.json({
      ok: true,
      message: `AI access request updated to ${newStatus}.`,
      status: newStatus,
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/admin/benefits/ai-access-requests]", err);
    return NextResponse.json({ ok: false, error: "Failed to update AI access request" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
