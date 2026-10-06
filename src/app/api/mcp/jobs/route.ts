/**
 * /api/mcp/jobs
 * Bulk Automation Jobs Status & Control API
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentSessionResult } from "@/lib/auth";
import { Permission, requirePermission, canAccessMcp } from "@/lib/permissions";
import { cancelMcpJob } from "@/lib/mcp/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Jobs are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: any = {};
  if (status) where.status = status.toUpperCase();

  const jobs = await prisma.mcpJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    total: jobs.length,
    jobs: jobs.map((j) => ({
      id: j.id,
      jobCode: j.jobCode,
      jobType: j.jobType,
      status: j.status,
      actorName: j.actorName || "Automation",
      clientName: j.clientId || "Direct API",
      totalCount: j.totalCount,
      processedCount: j.processedCount,
      successCount: j.successCount,
      failedCount: j.failedCount,
      skippedCount: j.skippedCount,
      progressPercent:
        j.totalCount > 0 ? Math.round((j.processedCount / j.totalCount) * 100) : 100,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getCurrentSessionResult();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessMcp(auth.user)) {
    return NextResponse.json({ error: "Forbidden: MCP Jobs are restricted to Founder and Co-Founder." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { jobId, action } = body;

    if (!jobId || action !== "CANCEL") {
      return NextResponse.json(
        { error: "Invalid request. 'jobId' and action='CANCEL' required." },
        { status: 400 }
      );
    }

    const cancelled = await cancelMcpJob(jobId, auth.user.id);

    return NextResponse.json({
      success: true,
      jobId: cancelled.id,
      status: cancelled.status,
      message: "Job cancelled successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to cancel job." }, { status: 500 });
  }
}
