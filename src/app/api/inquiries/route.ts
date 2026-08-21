/**
 * /api/inquiries
 * POST: Public Project Application submission with validation, DB insert, and Resend email alerts.
 * GET: Owner/Admin filtered query of all inquiries.
 */
import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { getCurrentUser } from "@/lib/auth";
import { sendOwnerInquiryNotification, sendClientConfirmation } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, company, projectType, budget, timeline, message, attachmentUrl } = body;

    // Server-side validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Full Name is required." }, { status: 400 });
    }
    if (!email || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "A valid Email Address is required." }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Project description message is required." }, { status: 400 });
    }

    // Insert into DataStore / Supabase
    const inquiry = await dataStore.createInquiry({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      company: company?.trim(),
      projectType: projectType || "web-dev",
      budget: budget || "$1,000 - $5,000",
      timeline: timeline?.trim(),
      message: message.trim(),
      attachmentUrl: attachmentUrl?.trim(),
    });

    // Send emails in background via Resend
    const emailPayload = {
      referenceId: inquiry.referenceId,
      fullName: inquiry.fullName,
      email: inquiry.email,
      phone: inquiry.phone,
      company: inquiry.company,
      projectType: inquiry.projectType,
      budget: inquiry.budget,
      timeline: inquiry.timeline,
      message: inquiry.message,
    };

    // Fire Resend emails asynchronously
    Promise.all([
      sendOwnerInquiryNotification(emailPayload),
      sendClientConfirmation(emailPayload),
    ]).catch((e) => console.error("[Inquiry Email Error]", e));

    return NextResponse.json({
      success: true,
      referenceId: inquiry.referenceId,
      inquiry,
    });
  } catch (err: any) {
    console.error("[POST /api/inquiries]", err);
    return NextResponse.json({ error: "Failed to submit project inquiry." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ALL";
  const priority = searchParams.get("priority") || "ALL";
  const search = searchParams.get("search") || "";

  try {
    const inquiries = await dataStore.getInquiries({ status, priority, search });
    return NextResponse.json({ success: true, inquiries });
  } catch (err: any) {
    console.error("[GET /api/inquiries]", err);
    return NextResponse.json({ error: "Failed to retrieve inquiries." }, { status: 500 });
  }
}
