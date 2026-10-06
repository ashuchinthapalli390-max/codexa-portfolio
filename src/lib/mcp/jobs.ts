/**
 * MCP Bulk Automation Jobs Engine
 * Manages queued mass operations (Bulk Accounts, Bulk Emails, Bulk Offer Letters)
 * Provides progress tracking, safe batching, cancellation, and retry.
 */

import prisma from "@/lib/prisma";
import crypto from "crypto";

export interface CreateJobParams {
  jobType: "BULK_ACCOUNTS" | "BULK_EMAIL" | "BULK_OFFER_LETTERS" | "BULK_PROJECT_ASSIGN";
  actorId: string;
  actorName?: string;
  clientId?: string;
  approvalId?: string;
  totalCount: number;
  parameters?: any;
  items?: Array<{ targetIdentifier: string; data?: any }>;
}

export function generateJobCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `JOB-MCP-${num}`;
}

export async function createMcpJob(params: CreateJobParams) {
  let jobCode = generateJobCode();
  // Ensure unique
  const existing = await prisma.mcpJob.findUnique({ where: { jobCode } });
  if (existing) {
    jobCode = `JOB-MCP-${Date.now().toString().slice(-5)}`;
  }

  const job = await prisma.mcpJob.create({
    data: {
      jobCode,
      jobType: params.jobType,
      status: "QUEUED",
      actorId: params.actorId,
      actorName: params.actorName,
      clientId: params.clientId,
      approvalId: params.approvalId,
      totalCount: params.totalCount,
      parameters: params.parameters || {},
      items: params.items
        ? {
            create: params.items.map((item, idx) => ({
              itemIndex: idx + 1,
              targetIdentifier: item.targetIdentifier,
              status: "PENDING",
              resultData: item.data || {},
            })),
          }
        : undefined,
    },
    include: {
      items: true,
    },
  });

  return job;
}

export async function updateMcpJobProgress(
  jobId: string,
  updates: {
    processedCount?: number;
    successCount?: number;
    failedCount?: number;
    skippedCount?: number;
    status?: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
    resultSummary?: any;
    completed?: boolean;
  }
) {
  const data: any = {};
  if (updates.processedCount !== undefined) data.processedCount = updates.processedCount;
  if (updates.successCount !== undefined) data.successCount = updates.successCount;
  if (updates.failedCount !== undefined) data.failedCount = updates.failedCount;
  if (updates.skippedCount !== undefined) data.skippedCount = updates.skippedCount;
  if (updates.status) data.status = updates.status;
  if (updates.resultSummary) data.resultSummary = updates.resultSummary;
  if (updates.completed) data.completedAt = new Date();

  return prisma.mcpJob.update({
    where: { id: jobId },
    data,
  });
}

export async function cancelMcpJob(jobId: string, actorId: string) {
  const job = await prisma.mcpJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found.");
  if (job.status === "COMPLETED" || job.status === "CANCELLED") {
    throw new Error(`Job is already in '${job.status}' state.`);
  }

  return prisma.mcpJob.update({
    where: { id: jobId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
      resultSummary: { cancelledBy: actorId, cancelledAt: new Date().toISOString() },
    },
  });
}

export async function getMcpJobDetails(jobIdOrCode: string) {
  return prisma.mcpJob.findFirst({
    where: {
      OR: [{ id: jobIdOrCode }, { jobCode: jobIdOrCode }],
    },
    include: {
      items: {
        orderBy: { itemIndex: "asc" },
        take: 100, // Return first 100 items for view
      },
    },
  });
}
