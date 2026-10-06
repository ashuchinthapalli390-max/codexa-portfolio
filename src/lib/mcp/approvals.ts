/**
 * MCP Approvals Engine
 * Enforces human-in-the-loop review for Level 2 (Sensitive Write) and Level 3 (High-Risk) actions.
 * Approvals automatically expire after 10 minutes.
 */

import prisma from "@/lib/prisma";
import { dataStore } from "@/lib/data-store";
import { McpRiskLevel } from "./types";

export interface CreateApprovalParams {
  toolName: string;
  clientId?: string;
  requestedById: string;
  riskLevel: McpRiskLevel;
  summary: string;
  parameters: any;
  affectedCount?: number;
}

export async function createMcpApproval(params: CreateApprovalParams) {
  // 10-minute expiry
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Redact any password fields from parameters before saving
  const safeParams = JSON.parse(JSON.stringify(params.parameters || {}));
  if (safeParams.password) safeParams.password = "[REDACTED]";
  if (safeParams.temporaryPassword) safeParams.temporaryPassword = "[REDACTED]";
  if (Array.isArray(safeParams.users)) {
    safeParams.users = safeParams.users.map((u: any) => ({
      ...u,
      password: u.password ? "[REDACTED]" : undefined,
      temporaryPassword: u.temporaryPassword ? "[REDACTED]" : undefined,
    }));
  }

  const approval = await prisma.mcpApproval.create({
    data: {
      toolName: params.toolName,
      clientId: params.clientId,
      requestedById: params.requestedById,
      riskLevel: params.riskLevel,
      summary: params.summary,
      parameters: safeParams,
      affectedCount: params.affectedCount || 1,
      status: "PENDING",
      expiresAt,
      executionStatus: "QUEUED",
    },
  });

  // Log audit
  await dataStore.logAudit(
    params.requestedById,
    "MCP_APPROVAL_REQUESTED",
    `Approval requested for '${params.toolName}' (Risk Level ${params.riskLevel}, ${params.affectedCount || 1} records). Expiry in 10m.`
  ).catch(() => {});

  return approval;
}

export async function getPendingMcpApprovals() {
  const now = new Date();
  // Mark expired ones
  await prisma.mcpApproval.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return prisma.mcpApproval.findMany({
    where: {
      status: "PENDING",
      expiresAt: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function decideMcpApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  reviewer: { id: string; fullName?: string | null; username: string; email: string },
  reviewNotes?: string
) {
  const approval = await prisma.mcpApproval.findUnique({
    where: { id: approvalId },
  });

  if (!approval) {
    throw new Error("Approval record not found.");
  }

  if (approval.status !== "PENDING") {
    throw new Error(`Approval has already been marked as ${approval.status}.`);
  }

  if (approval.expiresAt < new Date()) {
    await prisma.mcpApproval.update({
      where: { id: approvalId },
      data: { status: "EXPIRED" },
    });
    throw new Error("This approval request has expired (10-minute window passed).");
  }

  const reviewerName = reviewer.fullName || reviewer.username || reviewer.email;

  const updated = await prisma.mcpApproval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      approvedById: decision === "APPROVED" ? reviewer.id : undefined,
      approvedByName: decision === "APPROVED" ? reviewerName : undefined,
      approvedAt: decision === "APPROVED" ? new Date() : undefined,
      rejectedById: decision === "REJECTED" ? reviewer.id : undefined,
      rejectedByName: decision === "REJECTED" ? reviewerName : undefined,
      rejectedAt: decision === "REJECTED" ? new Date() : undefined,
      reviewNotes: reviewNotes || undefined,
    },
  });

  await dataStore.logAudit(
    reviewer.id,
    `MCP_APPROVAL_${decision}`,
    `Approval ${approvalId} for tool '${approval.toolName}' was ${decision.toLowerCase()} by ${reviewerName}. Notes: ${reviewNotes || "None"}`
  ).catch(() => {});

  return updated;
}
