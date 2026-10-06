/**
 * /api/email/send
 * Server API route for sending authorized operational, project, and HR emails via Resend.
 * Strictly enforced by Permission.SEND_EMAIL and logged in AuditLog.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionResult } from "@/lib/auth";
import { sendEmail, notificationsFromEmail, contactFromEmail } from "@/lib/email/client";
import { dataStore } from "@/lib/data-store";
import { Permission, requirePermission, getEffectiveRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();

  if (auth.status === "error") {
    return NextResponse.json(
      { error: "Authentication service unavailable.", requestId: auth.requestId },
      { status: 503 }
    );
  }

  if (auth.status === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized. Valid session required." },
      { status: 401 }
    );
  }

  const permCheck = await requirePermission(auth.user, Permission.SEND_EMAIL);
  if (!permCheck.authorized) {
    return permCheck.response;
  }

  const currentUser = auth.user;
  const actorRole = getEffectiveRole(currentUser);

  try {
    const body = await req.json();
    const { to, subject, html, category = "OPERATIONAL" } = body;

    if (!to || !to.trim() || !/\S+@\S+\.\S+/.test(to)) {
      return NextResponse.json({ error: "Valid recipient email address is required." }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Email subject is required." }, { status: 400 });
    }
    if (!html || !html.trim()) {
      return NextResponse.json({ error: "Email body content is required." }, { status: 400 });
    }

    const cleanTo = to.toLowerCase().trim();
    const fromAddress = category === "HR" ? contactFromEmail : notificationsFromEmail;

    // Send email via Resend
    const result = await sendEmail({
      from: fromAddress,
      to: cleanTo,
      subject: `[CodeXa ${category}] ${subject.trim()}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070707; color: #f7f7f7; padding: 32px; border-radius: 12px; border: 1px solid #8B0000;">
          <div style="border-bottom: 1px solid #222; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="color: #FF1E3C; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">CODEXA AGENCY &bull; ${category}</span>
          </div>
          <div style="color: #e5e5e5; font-size: 15px; line-height: 1.6;">
            ${html}
          </div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #222; font-size: 11px; color: #888;">
            Sent by <strong>${currentUser.displayName}</strong> (${actorRole}) &bull; CodeXa Operations Console
          </div>
        </div>
      `,
    });

    // Log to Audit Log
    await dataStore.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      action: "EMAIL_SENT",
      details: `${currentUser.displayName} (${actorRole}) sent ${category} email to ${cleanTo}: "${subject.trim()}"`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${cleanTo} successfully.`,
      result,
    });
  } catch (err: any) {
    console.error("[POST /api/email/send]", err);
    return NextResponse.json({ error: "Failed to dispatch email." }, { status: 500 });
  }
}
