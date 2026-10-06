/**
 * CodeXa Model Context Protocol (MCP) — Type Definitions & Specifications
 * Standards-compliant remote MCP specification (2024-11-05) + CodeXa RBAC
 */

import { Permission } from "@/lib/permissions";

// ─── 1. MCP SCOPES ────────────────────────────────────────────────────────────
export const MCP_SCOPES = [
  // User & Profile
  "profile:read",
  "profile:write",
  "users:read",
  "users:create",
  "users:update",
  "users:disable",

  // Employees & Interns
  "employees:read",
  "employees:create",
  "employees:update",
  "interns:read",
  "interns:create",
  "interns:update",

  // Projects
  "projects:read",
  "projects:create",
  "projects:update",
  "projects:approve",
  "projects:publish",
  "projects:archive",

  // Attendance
  "attendance:read",
  "attendance:manage",
  "attendance:open_window",

  // Payments & Payroll
  "payments:read",
  "payments:update",
  "payments:verify",
  "payments:approve",
  "payroll:read",
  "payroll:manage",

  // Documents
  "documents:read",
  "documents:create",
  "documents:offer_letter",
  "documents:payslip",

  // Email
  "email:send",
  "email:bulk_send",

  // Analytics & Reports
  "analytics:read",
  "reports:generate",

  // App & Device Controls
  "apps:read",
  "apps:manage",
  "licenses:read",
  "licenses:create",
  "licenses:revoke",

  // Feature Flags
  "feature_flags:read",
  "feature_flags:manage",

  // Approvals & Jobs
  "approvals:read",
  "approvals:create",
  "approvals:approve",
  "jobs:read",
  "jobs:manage",
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

// ─── 2. RISK LEVELS ───────────────────────────────────────────────────────────
export enum McpRiskLevel {
  LEVEL_0_READ_ONLY = 0,
  LEVEL_1_LOW_RISK_WRITE = 1,
  LEVEL_2_SENSITIVE_WRITE = 2,
  LEVEL_3_HIGH_RISK = 3,
  LEVEL_4_CRITICAL = 4, // Never exposed via MCP
}

// ─── 3. MCP JSON-RPC 2.0 PROTOCOL TYPES ───────────────────────────────────────
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Standard MCP tool schema
export interface McpToolSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  category:
    | "users"
    | "employees"
    | "interns"
    | "profiles"
    | "projects"
    | "attendance"
    | "payments"
    | "payroll"
    | "documents"
    | "email"
    | "analytics"
    | "apps"
    | "licenses"
    | "feature_flags"
    | "approvals"
    | "jobs"
    | "search"
    | "reports";
  inputSchema: McpToolSchema;
  requiredScope: McpScope;
  requiredPermission: Permission;
  riskLevel: McpRiskLevel;
  defaultApprovalLevel: McpRiskLevel;
  bulkThreshold: number; // e.g. 10
  isIdempotent?: boolean;
}

// ─── 4. AUTHENTICATED MCP CONTEXT ─────────────────────────────────────────────
export interface McpAuthContext {
  clientId?: string;
  clientName?: string;
  clientType?: string;
  scopes: string[];
  allowedTools: string[];
  actingUser: {
    id: string;
    email: string;
    username: string;
    fullName?: string | null;
    role: string;
    orgRole?: string | null;
    department?: string | null;
  };
  isServiceAccount?: boolean;
  serviceId?: string;
}

export interface McpExecutionResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  structuredData?: any;
  approvalRequired?: boolean;
  approvalId?: string;
  jobId?: string;
}
