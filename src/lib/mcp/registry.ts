/**
 * CodeXa Model Context Protocol (MCP) — Central Tool Registry & Dispatcher
 * Declares all 35+ tools with schemas, permissions, risk levels, and execution handlers.
 */

import prisma from "@/lib/prisma";
import { Permission } from "@/lib/permissions";
import {
  McpToolDefinition,
  McpRiskLevel,
  McpAuthContext,
  McpExecutionResult,
} from "./types";
import { verifyMcpAccess } from "./permissions";
import { createMcpApproval } from "./approvals";
import {
  usersService,
  employeesService,
  projectsService,
  attendanceService,
  paymentsService,
  documentsService,
  emailService,
  analyticsService,
  featureFlagsService,
  searchService,
} from "./services";
import { getMcpJobDetails, cancelMcpJob } from "./jobs";

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────
export const MCP_TOOLS: McpToolDefinition[] = [
  // ── 1. USERS & ACCOUNTS ──
  {
    name: "search_users",
    description: "Search active CodeXa users by name, username, email, role, or department.",
    category: "users",
    requiredScope: "users:read",
    requiredPermission: Permission.VIEW_USERS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term for name, username, or email" },
        role: { type: "string", description: "Optional filter by role e.g. INTERN, EMPLOYEE, CTO" },
        department: { type: "string", description: "Optional filter by department e.g. Engineering" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_user",
    description: "Get comprehensive user profile and employment details by ID, email, or employee/intern ID.",
    category: "users",
    requiredScope: "users:read",
    requiredPermission: Permission.VIEW_USERS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "User ID, email, username, or CXA-EMP/INT ID" },
      },
      required: ["identifier"],
    },
  },
  {
    name: "list_users",
    description: "List paginated users with optional role and department filters.",
    category: "users",
    requiredScope: "users:read",
    requiredPermission: Permission.VIEW_USERS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Items per page (default 20)" },
        role: { type: "string", description: "Role filter" },
        department: { type: "string", description: "Department filter" },
      },
    },
  },
  {
    name: "create_account",
    description: "Create an official CodeXa employee or intern account with generated CXA ID and temporary password.",
    category: "users",
    requiredScope: "users:create",
    requiredPermission: Permission.CREATE_USERS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string", description: "Full legal name" },
        email: { type: "string", description: "Unique work or personal email" },
        username: { type: "string", description: "Desired handle (auto-generated if omitted)" },
        role: { type: "string", description: "EMPLOYEE or INTERN (or executive if authorized)" },
        department: { type: "string", description: "e.g. Engineering, AI Research, Operations" },
        phone: { type: "string", description: "Contact number" },
        joiningDate: { type: "string", description: "YYYY-MM-DD" },
        employmentType: { type: "string", description: "FULL_TIME, PART_TIME, or INTERN" },
        salaryOrStipend: { type: "number", description: "Monthly compensation or stipend in INR" },
        reportingManager: { type: "string", description: "Designated manager or mentor" },
        dryRun: { type: "boolean", description: "If true, simulates validation without creating account" },
      },
      required: ["fullName", "email", "role"],
    },
  },
  {
    name: "preview_bulk_accounts",
    description: "Validate a list of accounts to detect duplicates, bad emails, and view planned operations.",
    category: "users",
    requiredScope: "users:read",
    requiredPermission: Permission.VIEW_USERS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 200,
    inputSchema: {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              department: { type: "string" },
              salaryOrStipend: { type: "number" },
            },
            required: ["fullName", "email"],
          },
          description: "List of user records to validate",
        },
      },
      required: ["users"],
    },
  },
  {
    name: "create_bulk_accounts",
    description: "Batch create multiple intern or employee accounts. Requires elevated Level 2 approval before execution.",
    category: "users",
    requiredScope: "users:create",
    requiredPermission: Permission.CREATE_USERS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 5,
    inputSchema: {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              email: { type: "string" },
              role: { type: "string" },
              department: { type: "string" },
              stipend: { type: "number" },
            },
            required: ["fullName", "email"],
          },
          description: "List of accounts to create",
        },
        dryRun: { type: "boolean", description: "Simulate batch without writing changes" },
      },
      required: ["users"],
    },
  },
  {
    name: "deactivate_user",
    description: "Safely offboard a user: disable login, revoke desktop licenses & sessions, preserve audit & payroll history.",
    category: "users",
    requiredScope: "users:disable",
    requiredPermission: Permission.DISABLE_USERS,
    riskLevel: McpRiskLevel.LEVEL_3_HIGH_RISK,
    defaultApprovalLevel: McpRiskLevel.LEVEL_3_HIGH_RISK,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "CodeXa User ID to deactivate" },
      },
      required: ["userId"],
    },
  },

  // ── 2. EMPLOYEES & INTERNS ──
  {
    name: "list_employees",
    description: "List employee staff directory with designations, departments, and employment statuses.",
    category: "employees",
    requiredScope: "employees:read",
    requiredPermission: Permission.VIEW_EMPLOYEES,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED" },
        department: { type: "string", description: "Department filter" },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "list_interns",
    description: "List active or completed interns with domain tracks, mentors, and dates.",
    category: "interns",
    requiredScope: "interns:read",
    requiredPermission: Permission.VIEW_INTERNS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "e.g. Full Stack, AI / ML, Cybersecurity" },
        status: { type: "string", description: "ACTIVE, COMPLETED, PENDING" },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },

  // ── 3. PROJECTS ──
  {
    name: "list_projects",
    description: "List agency projects, drafts, approval states, and member counts.",
    category: "projects",
    requiredScope: "projects:read",
    requiredPermission: Permission.VIEW_PROJECTS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "DRAFT, APPROVED, REJECTED, ARCHIVED" },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_project",
    description: "Get detailed project information including collaborators and URLs.",
    category: "projects",
    requiredScope: "projects:read",
    requiredPermission: Permission.VIEW_PROJECTS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID or slug" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "create_project",
    description: "Draft a new CodeXa project with metadata, category, and repositories.",
    category: "projects",
    requiredScope: "projects:create",
    requiredPermission: Permission.CREATE_PROJECTS,
    riskLevel: McpRiskLevel.LEVEL_1_LOW_RISK_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_1_LOW_RISK_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Project Title" },
        description: { type: "string", description: "Project Overview" },
        category: { type: "string", description: "e.g. AI Platform, SaaS, Mobile" },
        tags: { type: "array", items: { type: "string" } },
        liveUrl: { type: "string" },
        githubUrl: { type: "string" },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "assign_project_members_bulk",
    description: "Assign multiple users/interns to a project with duplicate detection and preview.",
    category: "projects",
    requiredScope: "projects:update",
    requiredPermission: Permission.ASSIGN_PROJECT_MEMBERS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 10,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Target Project ID" },
        userIds: { type: "array", items: { type: "string" }, description: "User IDs to assign" },
        role: { type: "string", description: "Role in project e.g. COLLABORATOR, LEAD" },
      },
      required: ["projectId", "userIds"],
    },
  },
  {
    name: "approve_project",
    description: "Approve a project and mark it ready for public showcase.",
    category: "projects",
    requiredScope: "projects:approve",
    requiredPermission: Permission.APPROVE_PROJECTS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID to approve" },
        notes: { type: "string", description: "Approval notes or feedback" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "reject_project",
    description: "Reject a project draft with mandatory feedback.",
    category: "projects",
    requiredScope: "projects:approve",
    requiredPermission: Permission.REJECT_PROJECTS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID to reject" },
        reason: { type: "string", description: "Detailed reason for rejection" },
      },
      required: ["projectId", "reason"],
    },
  },

  // ── 4. ATTENDANCE ──
  {
    name: "get_attendance_summary",
    description: "Calculate monthly attendance metrics: Present, Absent, Late, Leave, Rate %, 75% threshold eligibility.",
    category: "attendance",
    requiredScope: "attendance:read",
    requiredPermission: Permission.VIEW_ATTENDANCE,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Optional User ID (omit for agency total)" },
        month: { type: "number", description: "1-12" },
        year: { type: "number", description: "e.g. 2026" },
      },
    },
  },
  {
    name: "create_attendance_window",
    description: "Open remote attendance window (e.g. 30 mins) during which Mobile App users can record check-in.",
    category: "attendance",
    requiredScope: "attendance:open_window",
    requiredPermission: Permission.OPEN_ATTENDANCE_WINDOW,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
        durationMinutes: { type: "number", description: "Duration in minutes (e.g. 15, 30, 60)" },
        eligibleRoles: { type: "array", items: { type: "string" }, description: "e.g. ['EMPLOYEE', 'INTERN']" },
      },
    },
  },
  {
    name: "close_attendance_window",
    description: "Immediately terminate active attendance window.",
    category: "attendance",
    requiredScope: "attendance:manage",
    requiredPermission: Permission.MANAGE_ATTENDANCE,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        windowId: { type: "string", description: "Active window ID to close" },
      },
      required: ["windowId"],
    },
  },

  // ── 5. PAYMENTS & PAYROLL ──
  {
    name: "get_payment_summary",
    description: "Aggregated payroll totals: gross, net, verified count, paid count, pending amount for month/year.",
    category: "payments",
    requiredScope: "payments:read",
    requiredPermission: Permission.VIEW_PAYMENTS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        month: { type: "number" },
        year: { type: "number" },
      },
    },
  },
  {
    name: "list_payments",
    description: "List payment ledger records filtered by period and status.",
    category: "payments",
    requiredScope: "payments:read",
    requiredPermission: Permission.VIEW_PAYMENTS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {
        month: { type: "number" },
        year: { type: "number" },
        status: { type: "string", description: "PENDING, VERIFIED, APPROVED, PAID" },
        page: { type: "number" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "verify_payment",
    description: "Mark a payment record as HR-VERIFIED.",
    category: "payments",
    requiredScope: "payments:verify",
    requiredPermission: Permission.VERIFY_PAYMENTS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        paymentId: { type: "string", description: "Payroll record ID" },
        notes: { type: "string" },
      },
      required: ["paymentId"],
    },
  },
  {
    name: "approve_payment",
    description: "Founder final approval for payment disbursement. High Risk Level 3.",
    category: "payments",
    requiredScope: "payments:approve",
    requiredPermission: Permission.APPROVE_PAYMENTS,
    riskLevel: McpRiskLevel.LEVEL_3_HIGH_RISK,
    defaultApprovalLevel: McpRiskLevel.LEVEL_3_HIGH_RISK,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        paymentId: { type: "string", description: "Payroll record ID" },
        notes: { type: "string" },
      },
      required: ["paymentId"],
    },
  },
  {
    name: "mark_payment_paid",
    description: "Disburse payment, record transaction reference, and automatically generate Payslip. High Risk Level 3.",
    category: "payments",
    requiredScope: "payments:update",
    requiredPermission: Permission.APPROVE_PAYMENTS,
    riskLevel: McpRiskLevel.LEVEL_3_HIGH_RISK,
    defaultApprovalLevel: McpRiskLevel.LEVEL_3_HIGH_RISK,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        paymentId: { type: "string", description: "Payroll record ID" },
        transactionReference: { type: "string", description: "Bank or UTR reference number" },
      },
      required: ["paymentId", "transactionReference"],
    },
  },

  // ── 6. DOCUMENTS & OFFER LETTERS ──
  {
    name: "generate_offer_letter",
    description: "Issue official CodeXa offer letter with unique CXA/OFFER ID and QR verification code.",
    category: "documents",
    requiredScope: "documents:offer_letter",
    requiredPermission: Permission.GENERATE_OFFER_LETTERS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Target User ID" },
      },
      required: ["userId"],
    },
  },
  {
    name: "preview_bulk_offer_letters",
    description: "Preview recipient list and counts before bulk offer letter generation.",
    category: "documents",
    requiredScope: "documents:read",
    requiredPermission: Permission.VIEW_DOCUMENTS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 100,
    inputSchema: {
      type: "object",
      properties: {
        userIds: { type: "array", items: { type: "string" } },
      },
      required: ["userIds"],
    },
  },
  {
    name: "generate_bulk_offer_letters",
    description: "Batch generate offer letters for multiple members. Requires Level 2 confirmation.",
    category: "documents",
    requiredScope: "documents:offer_letter",
    requiredPermission: Permission.GENERATE_OFFER_LETTERS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 5,
    inputSchema: {
      type: "object",
      properties: {
        userIds: { type: "array", items: { type: "string" } },
      },
      required: ["userIds"],
    },
  },

  // ── 7. EMAIL DISPATCH ──
  {
    name: "preview_bulk_email",
    description: "Preview recipient audience resolution (INTERNS, EMPLOYEES, CREW) and templates before sending.",
    category: "email",
    requiredScope: "email:send",
    requiredPermission: Permission.SEND_EMAIL,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 100,
    inputSchema: {
      type: "object",
      properties: {
        targetGroup: { type: "string", description: "INTERNS, EMPLOYEES, CREW, or CUSTOM" },
        specificUserIds: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        template: { type: "string" },
      },
      required: ["subject"],
    },
  },
  {
    name: "send_email",
    description: "Send single operational email via CodeXa Resend integration.",
    category: "email",
    requiredScope: "email:send",
    requiredPermission: Permission.SEND_EMAIL,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        recipientEmail: { type: "string" },
        subject: { type: "string" },
        message: { type: "string" },
      },
      required: ["recipientEmail", "subject", "message"],
    },
  },

  // ── 8. ANALYTICS & OVERVIEW ──
  {
    name: "get_company_overview",
    description: "High-level agency KPI overview: active users, employees, interns, projects, and pending approvals.",
    category: "analytics",
    requiredScope: "analytics:read",
    requiredPermission: Permission.VIEW_ANALYTICS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ── 9. FEATURE FLAGS ──
  {
    name: "list_feature_flags",
    description: "List all centralized platform feature flags and their current toggle states.",
    category: "feature_flags",
    requiredScope: "feature_flags:read",
    requiredPermission: Permission.MANAGE_PLATFORM_SETTINGS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 50,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_feature_flag",
    description: "Remotely toggle a feature flag (e.g. MOBILE_ATTENDANCE, DESKTOP_AI).",
    category: "feature_flags",
    requiredScope: "feature_flags:manage",
    requiredPermission: Permission.MANAGE_PLATFORM_SETTINGS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        flagKey: { type: "string", description: "e.g. MOBILE_ATTENDANCE" },
        isEnabled: { type: "boolean" },
      },
      required: ["flagKey", "isEnabled"],
    },
  },

  // ── 10. SEARCH & JOBS ──
  {
    name: "search_codexa",
    description: "Global permission-aware search across users, employees, interns, and projects.",
    category: "search",
    requiredScope: "users:read",
    requiredPermission: Permission.VIEW_USERS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 20,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_job_status",
    description: "Get real-time execution progress of a bulk automation job.",
    category: "jobs",
    requiredScope: "jobs:read",
    requiredPermission: Permission.VIEW_USERS,
    riskLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    defaultApprovalLevel: McpRiskLevel.LEVEL_0_READ_ONLY,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        jobIdOrCode: { type: "string", description: "Job ID or Code e.g. JOB-MCP-1028" },
      },
      required: ["jobIdOrCode"],
    },
  },
  {
    name: "cancel_job",
    description: "Cancel a running or queued bulk automation job.",
    category: "jobs",
    requiredScope: "jobs:manage",
    requiredPermission: Permission.EXECUTE_MCP_JOBS,
    riskLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    defaultApprovalLevel: McpRiskLevel.LEVEL_2_SENSITIVE_WRITE,
    bulkThreshold: 1,
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string" },
      },
      required: ["jobId"],
    },
  },
];

// Map for instant lookup
const TOOLS_MAP = new Map<string, McpToolDefinition>(
  MCP_TOOLS.map((t) => [t.name, t])
);

// ─── TOOL DISPATCHER ──────────────────────────────────────────────────────────
export async function executeMcpTool(
  name: string,
  args: any = {},
  context: McpAuthContext
): Promise<McpExecutionResult> {
  const startTime = Date.now();
  const requestId = `req_mcp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const tool = TOOLS_MAP.get(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Error: Unknown tool '${name}'. Use 'tools/list' to discover available tools.` }],
      isError: true,
    };
  }

  // 1. Two-Layer Permission Check & Tool Policy
  const accessCheck = await verifyMcpAccess(context, tool, args);

  if (!accessCheck.allowed) {
    // Record rejected tool call
    await recordToolAudit({
      requestId,
      context,
      tool,
      status: accessCheck.code || "DENIED",
      durationMs: Date.now() - startTime,
      errorMessage: accessCheck.message,
      args,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            code: accessCheck.code,
            message: accessCheck.message,
            requestId,
          }),
        },
      ],
      isError: true,
    };
  }

  // 2. Human-In-The-Loop Approval Interception
  if (accessCheck.requiresApproval) {
    const approval = await createMcpApproval({
      toolName: tool.name,
      clientId: context.clientId,
      requestedById: context.actingUser.id,
      riskLevel: accessCheck.riskLevel || tool.riskLevel,
      summary: `${tool.name}: ${summarizeArgs(args)}`,
      parameters: args,
      affectedCount: calculateAffectedCount(args),
    });

    await recordToolAudit({
      requestId,
      context,
      tool,
      status: "APPROVAL_REQUIRED",
      durationMs: Date.now() - startTime,
      approvalId: approval.id,
      args,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "APPROVAL_REQUIRED",
              approvalId: approval.id,
              riskLevel: accessCheck.riskLevel,
              summary: approval.summary,
              expiresInMinutes: 10,
              reviewPortalUrl: "https://codxa-agency.online/dashboard/integrations/mcp?tab=approvals",
              message:
                accessCheck.approvalReason ||
                "This sensitive operation requires authorized operator confirmation before execution.",
            },
            null,
            2
          ),
        },
      ],
      isError: false,
      approvalRequired: true,
      approvalId: approval.id,
    };
  }

  // 3. Execution
  try {
    let result: any;

    switch (tool.name) {
      // Users
      case "search_users":
        result = await usersService.searchUsers(args.query, args.role, args.department, args.limit);
        break;
      case "get_user":
        result = await usersService.getUser(args.identifier);
        if (!result) throw new Error(`User '${args.identifier}' not found.`);
        break;
      case "list_users":
        result = await usersService.listUsers(args.page, args.limit, args.role, args.department);
        break;
      case "create_account":
        result = await usersService.createAccount({ ...args, actorUser: context.actingUser });
        break;
      case "preview_bulk_accounts":
        result = await usersService.previewBulkAccounts(args.users);
        break;
      case "create_bulk_accounts":
        result = await usersService.createBulkAccounts(args.users, context.actingUser, args.dryRun);
        break;
      case "deactivate_user":
        result = await usersService.deactivateUser(args.userId, context.actingUser);
        break;

      // Employees & Interns
      case "list_employees":
        result = await employeesService.listEmployees(args.status, args.department, args.page, args.limit);
        break;
      case "list_interns":
        result = await employeesService.listInterns(args.domain, args.status, args.page, args.limit);
        break;

      // Projects
      case "list_projects":
        result = await projectsService.listProjects(args.status, args.page, args.limit);
        break;
      case "get_project":
        result = await projectsService.getProject(args.projectId);
        if (!result) throw new Error(`Project '${args.projectId}' not found.`);
        break;
      case "create_project":
        result = await projectsService.createProject({ ...args, actorUser: context.actingUser });
        break;
      case "assign_project_members_bulk":
        result = await projectsService.assignProjectMembersBulk(
          args.projectId,
          args.userIds,
          args.role,
          context.actingUser
        );
        break;
      case "approve_project":
        result = await projectsService.approveProject(args.projectId, context.actingUser, args.notes);
        break;
      case "reject_project":
        result = await projectsService.rejectProject(args.projectId, context.actingUser, args.reason);
        break;

      // Attendance
      case "get_attendance_summary":
        result = await attendanceService.getAttendanceSummary(args.userId, args.month, args.year);
        break;
      case "create_attendance_window":
        result = await attendanceService.createAttendanceWindow({ ...args, actorUser: context.actingUser });
        break;
      case "close_attendance_window":
        result = await attendanceService.closeAttendanceWindow(args.windowId, context.actingUser);
        break;

      // Payments
      case "get_payment_summary":
        result = await paymentsService.getPaymentSummary(args.month, args.year);
        break;
      case "list_payments":
        result = await paymentsService.listPayments(args.month, args.year, args.status, args.page, args.limit);
        break;
      case "verify_payment":
        result = await paymentsService.verifyPayment(args.paymentId, context.actingUser, args.notes);
        break;
      case "approve_payment":
        result = await paymentsService.approvePayment(args.paymentId, context.actingUser, args.notes);
        break;
      case "mark_payment_paid":
        result = await paymentsService.markPaymentPaid(
          args.paymentId,
          args.transactionReference,
          context.actingUser
        );
        break;

      // Documents
      case "generate_offer_letter":
        result = await documentsService.generateOfferLetter(args.userId, context.actingUser);
        break;
      case "preview_bulk_offer_letters":
        result = await documentsService.previewBulkOfferLetters(args.userIds);
        break;
      case "generate_bulk_offer_letters":
        result = await documentsService.generateBulkOfferLetters(args.userIds, context.actingUser);
        break;

      // Email
      case "preview_bulk_email":
        result = await emailService.previewBulkEmail(args);
        break;
      case "send_email":
        result = await emailService.sendEmail({ ...args, actorUser: context.actingUser });
        break;

      // Analytics & Settings
      case "get_company_overview":
        result = await analyticsService.getCompanyOverview();
        break;
      case "list_feature_flags":
        result = await featureFlagsService.listFeatureFlags();
        break;
      case "update_feature_flag":
        result = await featureFlagsService.updateFeatureFlag(args.flagKey, args.isEnabled, context.actingUser);
        break;

      // Search & Jobs
      case "search_codexa":
        result = await searchService.searchCodeXa(args.query, context.actingUser);
        break;
      case "get_job_status":
        result = await getMcpJobDetails(args.jobIdOrCode);
        if (!result) throw new Error(`Job '${args.jobIdOrCode}' not found.`);
        break;
      case "cancel_job":
        result = await cancelMcpJob(args.jobId, context.actingUser.id);
        break;

      default:
        throw new Error(`Execution handler not configured for '${tool.name}'.`);
    }

    const durationMs = Date.now() - startTime;
    await recordToolAudit({
      requestId,
      context,
      tool,
      status: "SUCCESS",
      durationMs,
      args,
      resultSummary: JSON.stringify(result).slice(0, 300),
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: false,
      structuredData: result,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await recordToolAudit({
      requestId,
      context,
      tool,
      status: "FAILED",
      durationMs,
      errorMessage: err.message,
      args,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            code: "EXECUTION_ERROR",
            error: err.message || "Failed to execute tool.",
            requestId,
          }),
        },
      ],
      isError: true,
    };
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calculateAffectedCount(args: any): number {
  if (Array.isArray(args.users)) return args.users.length;
  if (Array.isArray(args.recipients)) return args.recipients.length;
  if (Array.isArray(args.userIds)) return args.userIds.length;
  if (Array.isArray(args.records)) return args.records.length;
  return 1;
}

function summarizeArgs(args: any): string {
  if (args.users && Array.isArray(args.users)) return `${args.users.length} users`;
  if (args.recipients && Array.isArray(args.recipients)) return `${args.recipients.length} recipients`;
  if (args.title) return `'${args.title}'`;
  if (args.email) return `${args.email}`;
  if (args.identifier) return `${args.identifier}`;
  return JSON.stringify(args).slice(0, 80);
}

async function recordToolAudit(params: {
  requestId: string;
  context: McpAuthContext;
  tool: McpToolDefinition;
  status: string;
  durationMs: number;
  errorMessage?: string;
  approvalId?: string;
  args?: any;
  resultSummary?: string;
}) {
  const safeParams = JSON.parse(JSON.stringify(params.args || {}));
  if (safeParams.password) safeParams.password = "[REDACTED]";
  if (safeParams.temporaryPassword) safeParams.temporaryPassword = "[REDACTED]";

  try {
    await prisma.mcpToolCall.create({
      data: {
        requestId: params.requestId,
        clientId: params.context.clientId || null,
        actorId: params.context.actingUser.id,
        actorName: params.context.actingUser.fullName || params.context.actingUser.username,
        toolName: params.tool.name,
        category: params.tool.category,
        riskLevel: params.tool.riskLevel,
        status: params.status,
        durationMs: params.durationMs,
        approvalId: params.approvalId || null,
        errorMessage: params.errorMessage || null,
        safeParams,
        resultSummary: params.resultSummary || null,
      },
    });
  } catch (err) {
    // Audit failure must never crash execution
    console.error("[MCP_AUDIT] Failed to record tool call:", err);
  }
}
