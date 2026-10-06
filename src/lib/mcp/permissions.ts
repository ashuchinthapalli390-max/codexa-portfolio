/**
 * MCP Two-Layer Permission Engine & Security Policy Verifier
 * Layer 1: CodeXa Centralized RBAC (User / Identity level)
 * Layer 2: MCP Granted Scopes (Client / Connection level)
 * Layer 3: Platform Emergency Kill Switches & Tool Policies
 */

import prisma from "@/lib/prisma";
import { hasPermission, getEffectiveRole, OrgRole } from "@/lib/permissions";
import { McpAuthContext, McpToolDefinition, McpRiskLevel } from "./types";
import { getMcpControls } from "./controls";

export interface McpAccessCheckResult {
  allowed: boolean;
  code?:
    | "MCP_DISABLED"
    | "CATEGORY_DISABLED"
    | "CLIENT_SUSPENDED"
    | "SCOPE_DENIED"
    | "RBAC_DENIED"
    | "ROLE_NOT_ALLOWED"
    | "TOOL_DISABLED"
    | "APPROVAL_REQUIRED"
    | "RATE_LIMITED";
  message?: string;
  requiresApproval?: boolean;
  approvalReason?: string;
  riskLevel?: McpRiskLevel;
}

// In-memory rate limiter per clientId (requests in current 60s window)
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(clientId: string, limitPerMin: number = 60): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(clientId);

  if (!bucket || now - bucket.windowStart > 60_000) {
    rateLimitBuckets.set(clientId, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limitPerMin) {
    return false;
  }

  bucket.count++;
  return true;
}

export async function verifyMcpAccess(
  context: McpAuthContext,
  tool: McpToolDefinition,
  args: any = {}
): Promise<McpAccessCheckResult> {
  const controls = await getMcpControls();

  // 1. Emergency Kill Switches
  if (!controls.isMcpEnabled) {
    return {
      allowed: false,
      code: "MCP_DISABLED",
      message: "CodeXa MCP System is temporarily disabled by Founder emergency control.",
    };
  }

  // Check category switches
  const isRead = tool.riskLevel === McpRiskLevel.LEVEL_0_READ_ONLY;
  if (isRead && !controls.isReadToolsEnabled) {
    return {
      allowed: false,
      code: "CATEGORY_DISABLED",
      message: "Read tools are currently disabled by emergency kill switch.",
    };
  }

  if (!isRead && !controls.isWriteToolsEnabled) {
    return {
      allowed: false,
      code: "CATEGORY_DISABLED",
      message: "Write tools are currently disabled by emergency kill switch.",
    };
  }

  const isBulk =
    tool.name.includes("bulk") ||
    (Array.isArray(args.users) && args.users.length > 1) ||
    (Array.isArray(args.recipients) && args.recipients.length > 1);

  if (isBulk && !controls.isBulkActionsEnabled) {
    return {
      allowed: false,
      code: "CATEGORY_DISABLED",
      message: "Bulk automated actions are currently disabled by emergency kill switch.",
    };
  }

  if (tool.category === "email" && !controls.isEmailActionsEnabled) {
    return {
      allowed: false,
      code: "CATEGORY_DISABLED",
      message: "Automated email dispatch is currently disabled by emergency kill switch.",
    };
  }

  if ((tool.category === "payments" || tool.category === "payroll") && !isRead && !controls.isPaymentActionsEnabled) {
    return {
      allowed: false,
      code: "CATEGORY_DISABLED",
      message: "Automated payment and payroll modifications are disabled by emergency kill switch.",
    };
  }

  // 2. Client Scopes & Tool Allowlist Check (Layer 2)
  const hasScope =
    context.scopes.includes("*") ||
    context.scopes.includes(tool.requiredScope) ||
    context.scopes.some((s) => s.endsWith(":*") && tool.requiredScope.startsWith(s.slice(0, -1)));

  if (!hasScope) {
    return {
      allowed: false,
      code: "SCOPE_DENIED",
      message: `MCP client lacks required scope '${tool.requiredScope}'. Granted scopes: [${context.scopes.join(", ")}]`,
    };
  }

  const isToolAllowedByClient =
    context.allowedTools.includes("*") ||
    context.allowedTools.includes(tool.name);

  if (!isToolAllowedByClient) {
    return {
      allowed: false,
      code: "TOOL_DISABLED",
      message: `Tool '${tool.name}' is not in this client's permitted tool allowlist.`,
    };
  }

  // 3. User CodeXa RBAC Check (Layer 1)
  const effectiveRole = getEffectiveRole(context.actingUser as any);

  const hasRbac = hasPermission(context.actingUser as any, tool.requiredPermission);
  if (!hasRbac) {
    return {
      allowed: false,
      code: "RBAC_DENIED",
      message: `Acting user '${context.actingUser.email}' with role '${effectiveRole}' lacks permission '${tool.requiredPermission}'.`,
    };
  }

  // 4. Rate Limiting Check
  const clientId = context.clientId || "anonymous_client";
  if (!checkRateLimit(clientId, 120)) {
    return {
      allowed: false,
      code: "RATE_LIMITED",
      message: "Rate limit exceeded (120 req/min). Please back off.",
    };
  }

  // 5. Database Tool Policy (if custom policy exists)
  let policyApprovalLevel = tool.defaultApprovalLevel;
  let policyBulkThreshold = tool.bulkThreshold;

  try {
    const policy = await prisma.mcpToolPolicy.findUnique({
      where: { toolName: tool.name },
    });

    if (policy) {
      if (!policy.isEnabled) {
        return {
          allowed: false,
          code: "TOOL_DISABLED",
          message: `Tool '${tool.name}' has been disabled by platform administrator.`,
        };
      }

      const allowedRoles = Array.isArray(policy.allowedRoles)
        ? (policy.allowedRoles as string[])
        : [];
      if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
        return {
          allowed: false,
          code: "ROLE_NOT_ALLOWED",
          message: `Role '${effectiveRole}' is not allowed to execute '${tool.name}' per platform policy. Allowed: [${allowedRoles.join(", ")}]`,
        };
      }

      policyApprovalLevel = policy.approvalLevel as McpRiskLevel;
      policyBulkThreshold = policy.bulkThreshold;
    }
  } catch (err) {
    // Graceful fallback to tool defaults if DB query fails
  }

  // 6. Mass-Action Threshold Calculation & Approval Escalation
  let affectedCount = 1;
  if (Array.isArray(args.users)) affectedCount = args.users.length;
  if (Array.isArray(args.recipients)) affectedCount = args.recipients.length;
  if (Array.isArray(args.memberIds)) affectedCount = args.memberIds.length;
  if (Array.isArray(args.records)) affectedCount = args.records.length;
  if (typeof args.limit === "number") affectedCount = args.limit;

  const exceedsBulkThreshold = affectedCount > policyBulkThreshold;

  // Level 2 (Sensitive Write) or Level 3 (High Risk) require approval
  // Or if bulk action exceeds threshold and user didn't supply approved approvalId
  const requiresApproval =
    !args.dryRun &&
    !args.approvalId &&
    (policyApprovalLevel >= McpRiskLevel.LEVEL_2_SENSITIVE_WRITE ||
      (policyApprovalLevel >= McpRiskLevel.LEVEL_1_LOW_RISK_WRITE && exceedsBulkThreshold));

  if (requiresApproval) {
    return {
      allowed: true,
      requiresApproval: true,
      approvalReason: exceedsBulkThreshold
        ? `Operation affects ${affectedCount} records, exceeding the bulk safety threshold of ${policyBulkThreshold}.`
        : `Tool '${tool.name}' is categorized as Risk Level ${policyApprovalLevel} requiring authorized operator confirmation.`,
      riskLevel: exceedsBulkThreshold ? McpRiskLevel.LEVEL_3_HIGH_RISK : policyApprovalLevel,
    };
  }

  return { allowed: true, riskLevel: tool.riskLevel };
}
