import { NextRequest, NextResponse } from "next/server";
import { processMandatoryPaymentReminders } from "@/services/payment-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validates request authorization against CRON_SECRET or Vercel's cron header.
 */
function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In local dev without CRON_SECRET configured, allow execution only from localhost
    const host = req.headers.get("host") || "";
    return host.includes("localhost") || host.includes("127.0.0.1");
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check URL query parameter token fallback (e.g. ?secret=...)
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") === cronSecret) {
    return true;
  }

  // Vercel Cron header
  const vercelCronHeader = req.headers.get("x-vercel-cron");
  if (vercelCronHeader && process.env.VERCEL) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const summary = await processMandatoryPaymentReminders();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("[CRON MANDATORY PAYMENT REMINDERS ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to execute daily payment reminders",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
