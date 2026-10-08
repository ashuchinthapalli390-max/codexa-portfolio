import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";
import { sendEmail, notificationsFromEmail } from "@/lib/email/client";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    // Check payment eligibility
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      include: { employmentProfile: true },
    });

    const ownPayment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      orderBy: { createdAt: "desc" },
    });

    const isPaid = ownPayment?.paymentStatus === "APPROVED" ||
      ownPayment?.paymentStatus === "SUCCESS" ||
      ownPayment?.cashStatus === "CASH_RECEIVED" ||
      Boolean(fullUser?.internServicePaymentPaid);

    if (!isPaid) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "PAYMENT_REQUIRED",
          message: "Gemini Pro Account access request unlocks only after confirmed payment of the ₹450 internship fee.",
        },
      }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body.reason as string)?.trim() || "";

    // Check for existing pending request (Idempotency / Anti-spam)
    const existing = await db.$queryRawUnsafe<any[]>(`
      SELECT id, status, requested_at FROM ai_access_requests
      WHERE user_id = $1 AND status IN ('PENDING_APPROVAL', 'APPROVED_PENDING_PROVISIONING', 'ACCESS_GRANTED')
      ORDER BY created_at DESC
      LIMIT 1
    `, user.id);

    if (existing.length > 0) {
      return NextResponse.json({
        ok: true,
        message: "You already have an active request in progress.",
        request: existing[0],
      }, { headers: NO_CACHE_HEADERS });
    }

    const requestId = `ai_req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    await db.$executeRawUnsafe(`
      INSERT INTO ai_access_requests (
        id, user_id, payment_request_id, resource_type, reason, status
      ) VALUES (
        $1, $2, $3, 'GEMINI_PRO_ACCESS', $4, 'PENDING_APPROVAL'
      )
    `,
      requestId,
      user.id,
      ownPayment?.id || null,
      reason || null
    );

    const internName = fullUser?.fullName || user.username;
    const internId = fullUser?.employmentProfile?.employeeId || "CXA-INT";
    const domain = fullUser?.department || "Software Engineering";
    const paymentRef = ownPayment?.referenceId || `CXA-PAY-${(user.username || user.id.slice(-6)).toUpperCase()}-450`;
    const nowIso = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // In-app notifications to Founder and Co-Founder
    const leaders = await db.user.findMany({
      where: { role: { in: ["FOUNDER", "CO_FOUNDER", "OWNER"] }, isActive: true },
      select: { id: true, email: true, role: true },
    });

    for (const leader of leaders) {
      try {
        await db.notification.create({
          data: {
            userId: leader.id,
            type: "AI_ACCESS_REQUEST",
            title: `New Gemini Pro Access Request: ${internName}`,
            message: `${internName} (${internId}) has requested Gemini Pro Account access. Payment of ₹450 is verified.`,
            link: `/dashboard/ai-access-requests`,
          },
        });
      } catch (_) {}
    }

    // Send email to Founder and Co-Founder
    const founderEmails = ["ashuchinthapalli3900@gmail.com", "boddukurisanjay@gmail.com"];

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070707; color: #f7f7f7; padding: 24px; border-radius: 12px; border: 1px solid #222;">
        <div style="border-bottom: 2px solid #D90429; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #D90429; margin: 0; font-size: 20px; letter-spacing: 1px;">CODEXA AGENCY</h2>
          <p style="color: #a5a5a5; margin: 4px 0 0; font-size: 13px;">Gemini Pro Account Access Request</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5;">A CodeXa Intern has requested access to the <strong>Gemini Pro Account</strong> benefit under their verified internship service package.</p>

        <div style="background: #111; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #222;">
          <h3 style="color: #fff; margin-top: 0; font-size: 14px; text-transform: uppercase;">Intern Details</h3>
          <table style="width: 100%; font-size: 13px; color: #ddd;">
            <tr><td style="color: #888; width: 140px; padding: 4px 0;">Name:</td><td><strong>${internName}</strong></td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Intern ID:</td><td>${internId}</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Domain:</td><td>${domain}</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Email:</td><td>${fullUser?.email || user.email}</td></tr>
          </table>
        </div>

        <div style="background: #111; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #222;">
          <h3 style="color: #fff; margin-top: 0; font-size: 14px; text-transform: uppercase;">Payment Verification</h3>
          <table style="width: 100%; font-size: 13px; color: #ddd;">
            <tr><td style="color: #888; width: 140px; padding: 4px 0;">Payment Status:</td><td style="color: #4ade80; font-weight: bold;">SUCCESS (VERIFIED)</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Reference ID:</td><td>${paymentRef}</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Paid Amount:</td><td>₹450</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">AI Tools Pack:</td><td>₹300 component unlocked</td></tr>
          </table>
        </div>

        <div style="background: #111; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #222;">
          <h3 style="color: #fff; margin-top: 0; font-size: 14px; text-transform: uppercase;">Access Request</h3>
          <table style="width: 100%; font-size: 13px; color: #ddd;">
            <tr><td style="color: #888; width: 140px; padding: 4px 0;">Resource:</td><td>Gemini Pro Account Access</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Requested At:</td><td>${nowIso}</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Reason / Purpose:</td><td>${reason || "Not specified by student"}</td></tr>
            <tr><td style="color: #888; padding: 4px 0;">Current Status:</td><td style="color: #f59e0b; font-weight: bold;">PENDING APPROVAL</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="https://codxa-agency.online/dashboard/ai-access-requests" style="background: #D90429; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Open Website Approval Center</a>
        </div>

        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 24px;">CodeXa Enterprise Platform — Security & Benefits Outbox</p>
      </div>
    `;

    for (const recipient of founderEmails) {
      sendEmail({
        from: notificationsFromEmail,
        to: recipient,
        subject: `CodeXa — Gemini Pro Account Access Request (${internName})`,
        html: emailHtml,
      }).catch(e => console.error(`[AI Request Email Error to ${recipient}]:`, e));
    }

    return NextResponse.json({
      ok: true,
      message: "Gemini Pro access request submitted successfully. Founder and Co-Founder have been notified.",
      request: {
        id: requestId,
        status: "PENDING_APPROVAL",
        resourceType: "GEMINI_PRO_ACCESS",
        requestedAt: new Date().toISOString(),
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[POST /api/mobile/benefits/ai-access-requests]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to submit request." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
