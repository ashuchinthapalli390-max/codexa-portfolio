import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

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
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    // Check payment status from Core DB
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { internServicePaymentPaid: true, profileMediaUrl: true, fullName: true, username: true },
    });

    const ownPayment = await db.paymentRequest.findFirst({
      where: { userId: user.id, paymentPurpose: "INTERNSHIP_FEE" },
      orderBy: { createdAt: "desc" },
    });

    const isPaid = ownPayment?.paymentStatus === "APPROVED" ||
      ownPayment?.paymentStatus === "SUCCESS" ||
      ownPayment?.cashStatus === "CASH_RECEIVED" ||
      Boolean(fullUser?.internServicePaymentPaid);

    // Latest ID Card Photo Submission
    const idCardSubmissions = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        id, storage_path, image_url, mime_type, version, status,
        rejection_reason, reviewed_by_name, reviewed_at, submitted_at
      FROM id_card_photo_submissions
      WHERE user_id = $1
      ORDER BY version DESC, created_at DESC
      LIMIT 1
    `, user.id);

    const latestIdCard = idCardSubmissions.length > 0 ? idCardSubmissions[0] : null;

    // Latest AI Access Request
    const aiRequests = await db.$queryRawUnsafe<any[]>(`
      SELECT 
        id, resource_type, reason, status, reviewer_decision,
        reviewer_notes, reviewed_by_name, reviewed_at, provisioning_status,
        provisioned_at, activation_instructions, requested_at
      FROM ai_access_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, user.id);

    const latestAiRequest = aiRequests.length > 0 ? aiRequests[0] : null;

    return NextResponse.json({
      ok: true,
      isPaid,
      paymentReference: ownPayment?.referenceId || `CXA-PAY-${(user.username || user.id.slice(-6)).toUpperCase()}-450`,
      paidAmount: 450,
      profilePhotoUrl: fullUser?.profileMediaUrl || null,
      idCard: {
        amount: 150,
        status: isPaid ? (latestIdCard ? latestIdCard.status : "PHOTO_REQUIRED") : "LOCKED_PAYMENT_REQUIRED",
        latestSubmission: latestIdCard ? {
          id: latestIdCard.id,
          imageUrl: latestIdCard.image_url,
          version: latestIdCard.version,
          status: latestIdCard.status,
          rejectionReason: latestIdCard.rejection_reason,
          reviewedByName: latestIdCard.reviewed_by_name,
          reviewedAt: latestIdCard.reviewed_at,
          submittedAt: latestIdCard.submitted_at,
        } : null,
      },
      aiDevTools: {
        amount: 300,
        status: isPaid ? "ACTIVE" : "LOCKED_PAYMENT_REQUIRED",
        upcomingFeatures: [
          { title: "AI Coding Assistant", description: "Real-time code completion and syntax refinement for CodeXa projects", status: "COMING UP" },
          { title: "Dev Workflow Automation", description: "Automated test script generation and git branch PR reviews", status: "COMING UP" },
          { title: "Project Architectural Assistant", description: "Interactive schema design and database optimization advice", status: "COMING UP" },
          { title: "Code Explanation Engine", description: "Instant breakdown of complex legacy repositories and microservices", status: "COMING UP" },
          { title: "Learning & Mentorship Hub", description: "AI-driven curriculum summaries and custom practice exercises", status: "COMING UP" },
        ],
        geminiProRequest: {
          status: isPaid ? (latestAiRequest ? latestAiRequest.status : "NOT_REQUESTED") : "LOCKED_PAYMENT_REQUIRED",
          request: latestAiRequest ? {
            id: latestAiRequest.id,
            resourceType: latestAiRequest.resource_type,
            reason: latestAiRequest.reason,
            status: latestAiRequest.status,
            reviewerDecision: latestAiRequest.reviewer_decision,
            reviewerNotes: latestAiRequest.reviewer_notes,
            reviewedByName: latestAiRequest.reviewed_by_name,
            reviewedAt: latestAiRequest.reviewed_at,
            provisioningStatus: latestAiRequest.provisioning_status,
            provisionedAt: latestAiRequest.provisioned_at,
            activationInstructions: latestAiRequest.activation_instructions,
            requestedAt: latestAiRequest.requested_at,
          } : null,
        },
      },
    }, { headers: NO_CACHE_HEADERS });

  } catch (err: any) {
    console.error("[GET /api/mobile/benefits]", err);
    return NextResponse.json({ ok: false, error: { code: "SERVER_ERROR", message: "Failed to load benefits." } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
