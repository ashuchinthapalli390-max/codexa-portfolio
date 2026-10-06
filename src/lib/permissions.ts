/**
 * Centralized Role-Based Access Control (RBAC) & Permission Engine for CodeXa Agency
 *
 * ROLES SUPPORTED:
 * - FOUNDER / OWNER: Complete unrestricted CodeXa control.
 * - CO_FOUNDER: Identical operational permissions to Founder (full access).
 * - CEO: Executive visibility, profile management, approvals, analytics, payment summaries.
 * - CTO: Technical project pipeline, project approvals/rejections, intern & employee account creation, project assignments, technical email.
 * - HR: People management, intern & employee management, profile editing, payment verification, HR analytics, HR communication.
 * - COO: Operational read-only visibility, project/crew viewing, analytics, operational emails.
 * - EMPLOYEE / TEAM_MEMBER: Standard member workspace.
 * - INTERN: Restricted intern dashboard.
 */

import { NextResponse } from "next/server";

export const PERMANENT_FOUNDER_EMAIL = "ashuchinthapalli3900@gmail.com";
export const SECONDARY_FOUNDER_EMAIL = "darklevelinggaming@gmail.com";
export const CO_FOUNDER_EMAIL = "boddukurisanjay@gmail.com";

export function isPermanentFounder(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return e === PERMANENT_FOUNDER_EMAIL.toLowerCase() || e === SECONDARY_FOUNDER_EMAIL.toLowerCase();
}

// ─── 1. PERMISSIONS ENUM ──────────────────────────────────────────────────────
export enum Permission {
  // Navigation & Overview
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  VIEW_EXECUTIVE_CENTER = "VIEW_EXECUTIVE_CENTER",
  VIEW_OWNER_CONSOLE = "VIEW_OWNER_CONSOLE",

  // Users & Account Management
  VIEW_USERS = "VIEW_USERS",
  CREATE_USERS = "CREATE_USERS",
  EDIT_USERS = "EDIT_USERS",
  DISABLE_USERS = "DISABLE_USERS",
  DELETE_USERS = "DELETE_USERS",
  CHANGE_USER_ROLE = "CHANGE_USER_ROLE",

  // Crew & Staff Stages
  VIEW_CREW = "VIEW_CREW",
  MANAGE_CREW = "MANAGE_CREW",
  VIEW_EMPLOYEES = "VIEW_EMPLOYEES",
  MANAGE_EMPLOYEES = "MANAGE_EMPLOYEES",
  VIEW_INTERNS = "VIEW_INTERNS",
  MANAGE_INTERNS = "MANAGE_INTERNS",

  // Profiles
  VIEW_PROFILES = "VIEW_PROFILES",
  EDIT_PROFILES = "EDIT_PROFILES",
  EDIT_OWN_PROFILE = "EDIT_OWN_PROFILE",
  EDIT_OTHER_PROFILES = "EDIT_OTHER_PROFILES",
  APPROVE_PROFILES = "APPROVE_PROFILES",

  // Projects Pipeline
  VIEW_PROJECTS = "VIEW_PROJECTS",
  CREATE_PROJECTS = "CREATE_PROJECTS",
  EDIT_PROJECTS = "EDIT_PROJECTS",
  APPROVE_PROJECTS = "APPROVE_PROJECTS",
  REJECT_PROJECTS = "REJECT_PROJECTS",
  PUBLISH_PROJECTS = "PUBLISH_PROJECTS",
  ARCHIVE_PROJECTS = "ARCHIVE_PROJECTS",
  DELETE_PROJECTS = "DELETE_PROJECTS",
  ASSIGN_PROJECT_MEMBERS = "ASSIGN_PROJECT_MEMBERS",

  // Attendance
  VIEW_ATTENDANCE = "VIEW_ATTENDANCE",
  MANAGE_ATTENDANCE = "MANAGE_ATTENDANCE",
  OPEN_ATTENDANCE_WINDOW = "OPEN_ATTENDANCE_WINDOW",
  EDIT_ATTENDANCE = "EDIT_ATTENDANCE",

  // Payroll & Payments
  VIEW_PAYMENTS = "VIEW_PAYMENTS",
  VIEW_PAYROLL = "VIEW_PAYROLL",
  MANAGE_PAYROLL = "MANAGE_PAYROLL",
  VERIFY_PAYMENTS = "VERIFY_PAYMENTS",
  APPROVE_PAYMENTS = "APPROVE_PAYMENTS",
  VIEW_PAYMENT_ANALYTICS = "VIEW_PAYMENT_ANALYTICS",

  // Manual UPI Payments & Verification Flow
  VIEW_OWN_PAYMENTS = "VIEW_OWN_PAYMENTS",
  VIEW_ALL_PAYMENTS = "VIEW_ALL_PAYMENTS",
  CREATE_PAYMENT_REQUEST = "CREATE_PAYMENT_REQUEST",
  SUBMIT_PAYMENT_PROOF = "SUBMIT_PAYMENT_PROOF",
  VERIFY_PAYMENT = "VERIFY_PAYMENT",
  APPROVE_PAYMENT = "APPROVE_PAYMENT",
  REJECT_PAYMENT = "REJECT_PAYMENT",
  EDIT_PAYMENT = "EDIT_PAYMENT",
  MANAGE_PAYMENT_SETTINGS = "MANAGE_PAYMENT_SETTINGS",

  // Documents & Letters
  VIEW_DOCUMENTS = "VIEW_DOCUMENTS",
  MANAGE_DOCUMENTS = "MANAGE_DOCUMENTS",
  GENERATE_OFFER_LETTERS = "GENERATE_OFFER_LETTERS",
  GENERATE_PAYSLIPS = "GENERATE_PAYSLIPS",

  // App Controls & Licensing
  MANAGE_MOBILE_FEATURES = "MANAGE_MOBILE_FEATURES",
  MANAGE_DESKTOP_ACCESS = "MANAGE_DESKTOP_ACCESS",
  MANAGE_LICENSES = "MANAGE_LICENSES",
  MANAGE_AI_ENTITLEMENTS = "MANAGE_AI_ENTITLEMENTS",

  // Reusable Approval System
  VIEW_APPROVALS = "VIEW_APPROVALS",
  DECIDE_APPROVALS = "DECIDE_APPROVALS",

  // Communications & Email (Resend)
  SEND_EMAIL = "SEND_EMAIL",

  // Analytics & Logs
  VIEW_ANALYTICS = "VIEW_ANALYTICS",
  VIEW_PROJECT_ANALYTICS = "VIEW_PROJECT_ANALYTICS",
  VIEW_HR_ANALYTICS = "VIEW_HR_ANALYTICS",
  VIEW_REPORTS = "VIEW_REPORTS",
  VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS",

  // Security & Infrastructure
  MANAGE_SECURITY = "MANAGE_SECURITY",
  MANAGE_PLATFORM_SETTINGS = "MANAGE_PLATFORM_SETTINGS",

  // AI & Model Context Protocol (MCP) Integration
  MANAGE_MCP_CONNECTIONS = "MANAGE_MCP_CONNECTIONS",
  VIEW_MCP_ACTIVITY = "VIEW_MCP_ACTIVITY",
  MANAGE_MCP_POLICIES = "MANAGE_MCP_POLICIES",
  APPROVE_MCP_ACTIONS = "APPROVE_MCP_ACTIONS",
  EXECUTE_MCP_JOBS = "EXECUTE_MCP_JOBS",
}

// ─── 2. ROLES TYPE ────────────────────────────────────────────────────────────
export type OrgRole =
  | "FOUNDER"
  | "CO_FOUNDER"
  | "CEO"
  | "CTO"
  | "HR"
  | "COO"
  | "EMPLOYEE"
  | "INTERN"
  // Legacy compatibility roles
  | "OWNER"
  | "ADMIN"
  | "TEAM_MEMBER";

export interface UserPermissionContext {
  id?: string;
  userId?: string | null;
  email?: string | null;
  username?: string | null;
  role?: string | null;
  orgRole?: string | null;
  leadershipPosition?: string | null;
  mustChangePassword?: boolean;
}

// ─── 3. CANONICAL ROLE RESOLUTION ─────────────────────────────────────────────
/**
 * Resolves the canonical operational role of a user from their account fields.
 */
export function getEffectiveRole(user?: UserPermissionContext | null): OrgRole {
  if (!user) return "EMPLOYEE";

  const email = (user.email || "").toLowerCase().trim();
  const username = (user.username || "").toLowerCase().trim();

  // Permanent Founder check
  if (
    email === PERMANENT_FOUNDER_EMAIL.toLowerCase() ||
    email === SECONDARY_FOUNDER_EMAIL.toLowerCase() ||
    username === "ashu"
  ) {
    return "FOUNDER";
  }

  // Co-Founder check
  if (email === CO_FOUNDER_EMAIL.toLowerCase() || username === "sanjay") {
    return "CO_FOUNDER";
  }

  const rawRole = (user.orgRole || user.role || user.leadershipPosition || "").toUpperCase().trim();

  switch (rawRole) {
    case "FOUNDER":
    case "OWNER":
      return "FOUNDER";
    case "CO_FOUNDER":
      return "CO_FOUNDER";
    case "CEO":
      return "CEO";
    case "CTO":
      return "CTO";
    case "HR":
      return "HR";
    case "COO":
      return "COO";
    case "EMPLOYEE":
    case "TEAM_MEMBER":
      return "EMPLOYEE";
    case "INTERN":
      return "INTERN";
    case "ADMIN":
      return "ADMIN";
    default:
      return "EMPLOYEE";
  }
}

/**
 * Human-readable organizational title for display.
 */
export function getRoleDisplayName(role: OrgRole | string | null | undefined): string {
  switch ((role || "").toUpperCase()) {
    case "FOUNDER":
    case "OWNER":
      return "Founder";
    case "CO_FOUNDER":
      return "Co-Founder";
    case "CEO":
      return "Chief Executive Officer (CEO)";
    case "CTO":
      return "Chief Technology Officer (CTO)";
    case "HR":
      return "Human Resources (HR)";
    case "COO":
      return "Chief Operating Officer (COO)";
    case "EMPLOYEE":
    case "TEAM_MEMBER":
      return "Core Engineer";
    case "INTERN":
      return "Engineering Intern";
    case "ADMIN":
      return "Administrator";
    default:
      return "Team Member";
  }
}

// ─── 4. ROLE PERMISSIONS MATRIX ───────────────────────────────────────────────
const ALL_PERMISSIONS = new Set<Permission>(Object.values(Permission));

export const ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  // Founder: Unrestricted access
  FOUNDER: ALL_PERMISSIONS,
  OWNER: ALL_PERMISSIONS,

  // Co-Founder: Equal operational platform control to Founder
  CO_FOUNDER: ALL_PERMISSIONS,

  // CEO: High-level executive visibility, profiles, approvals, analytics, payments summary
  CEO: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_EXECUTIVE_CENTER,
    Permission.VIEW_USERS,
    Permission.VIEW_CREW,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_INTERNS,
    Permission.VIEW_PROFILES,
    Permission.EDIT_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.APPROVE_PROFILES,
    Permission.VIEW_PROJECTS,
    Permission.APPROVE_PROJECTS,
    Permission.REJECT_PROJECTS,
    Permission.VIEW_APPROVALS,
    Permission.DECIDE_APPROVALS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_PAYROLL,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.VIEW_ALL_PAYMENTS,
    Permission.VIEW_PAYMENT_ANALYTICS,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_EMAIL,
    Permission.VIEW_PAYMENT_ANALYTICS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_PROJECT_ANALYTICS,
    Permission.VIEW_HR_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_MCP_ACTIVITY,
  ]),

  // CTO: Technical & project authority, intern/employee account creation, desktop/AI licensing
  CTO: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_EXECUTIVE_CENTER,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS, // Restricted to INTERN / EMPLOYEE via canCreateRole
    Permission.VIEW_CREW,
    Permission.VIEW_EMPLOYEES,
    Permission.MANAGE_EMPLOYEES,
    Permission.VIEW_INTERNS,
    Permission.MANAGE_INTERNS,
    Permission.VIEW_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    Permission.APPROVE_PROJECTS,
    Permission.REJECT_PROJECTS,
    Permission.PUBLISH_PROJECTS,
    Permission.ARCHIVE_PROJECTS,
    Permission.DELETE_PROJECTS,
    Permission.ASSIGN_PROJECT_MEMBERS,
    Permission.VIEW_APPROVALS,
    Permission.DECIDE_APPROVALS,
    Permission.VIEW_ATTENDANCE,
    Permission.OPEN_ATTENDANCE_WINDOW,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.MANAGE_DESKTOP_ACCESS,
    Permission.MANAGE_LICENSES,
    Permission.MANAGE_AI_ENTITLEMENTS,
    Permission.SEND_EMAIL,
    Permission.VIEW_PROJECT_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.MANAGE_MCP_CONNECTIONS,
    Permission.VIEW_MCP_ACTIVITY,
    Permission.APPROVE_MCP_ACTIONS,
    Permission.EXECUTE_MCP_JOBS,
  ]),

  // HR: People & staff operations, intern/employee accounts, attendance, payroll & offer letters
  HR: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_EXECUTIVE_CENTER,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS, // Restricted to INTERN / EMPLOYEE via canCreateRole
    Permission.EDIT_USERS,
    Permission.VIEW_CREW,
    Permission.MANAGE_CREW,
    Permission.VIEW_EMPLOYEES,
    Permission.MANAGE_EMPLOYEES,
    Permission.VIEW_INTERNS,
    Permission.MANAGE_INTERNS,
    Permission.VIEW_PROFILES,
    Permission.EDIT_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.VIEW_APPROVALS,
    Permission.DECIDE_APPROVALS,
    Permission.VIEW_ATTENDANCE,
    Permission.MANAGE_ATTENDANCE,
    Permission.OPEN_ATTENDANCE_WINDOW,
    Permission.EDIT_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_PAYROLL,
    Permission.MANAGE_PAYROLL,
    Permission.VERIFY_PAYMENTS,
    Permission.APPROVE_PAYMENTS,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.VIEW_ALL_PAYMENTS,
    Permission.CREATE_PAYMENT_REQUEST,
    Permission.VERIFY_PAYMENT,
    Permission.APPROVE_PAYMENT,
    Permission.REJECT_PAYMENT,
    Permission.EDIT_PAYMENT,
    Permission.VIEW_PAYMENT_ANALYTICS,
    Permission.VIEW_DOCUMENTS,
    Permission.MANAGE_DOCUMENTS,
    Permission.GENERATE_OFFER_LETTERS,
    Permission.GENERATE_PAYSLIPS,
    Permission.SEND_EMAIL,
    Permission.VIEW_HR_ANALYTICS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_MCP_ACTIVITY,
    Permission.APPROVE_MCP_ACTIONS,
  ]),

  // COO: Broad read-only operational visibility, operational email (No analytics)
  COO: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_EXECUTIVE_CENTER,
    Permission.VIEW_USERS,
    Permission.VIEW_CREW,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_INTERNS,
    Permission.VIEW_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.VIEW_APPROVALS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_PAYROLL,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.VIEW_ALL_PAYMENTS,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_EMAIL,
    Permission.VIEW_REPORTS,
    Permission.VIEW_MCP_ACTIVITY,
  ]),

  // Admin: Legacy elevated permissions
  ADMIN: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_EXECUTIVE_CENTER,
    Permission.VIEW_USERS,
    Permission.VIEW_CREW,
    Permission.VIEW_EMPLOYEES,
    Permission.VIEW_INTERNS,
    Permission.VIEW_PROFILES,
    Permission.EDIT_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.APPROVE_PROJECTS,
    Permission.REJECT_PROJECTS,
    Permission.VIEW_APPROVALS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.VIEW_ALL_PAYMENTS,
    Permission.CREATE_PAYMENT_REQUEST,
    Permission.VERIFY_PAYMENT,
    Permission.APPROVE_PAYMENT,
    Permission.REJECT_PAYMENT,
    Permission.EDIT_PAYMENT,
    Permission.VIEW_PAYMENT_ANALYTICS,
    Permission.VIEW_DOCUMENTS,
    Permission.SEND_EMAIL,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_REPORTS,
  ]),

  // Employee: Standard staff access
  EMPLOYEE: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.SUBMIT_PAYMENT_PROOF,
    Permission.VIEW_DOCUMENTS,
  ]),
  TEAM_MEMBER: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.SUBMIT_PAYMENT_PROOF,
    Permission.VIEW_DOCUMENTS,
  ]),

  // Intern: Restricted intern access
  INTERN: new Set<Permission>([
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_PROFILES,
    Permission.EDIT_OWN_PROFILE,
    Permission.VIEW_PROJECTS,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_PAYMENTS,
    Permission.VIEW_OWN_PAYMENTS,
    Permission.SUBMIT_PAYMENT_PROOF,
    Permission.VIEW_DOCUMENTS,
  ]),
};

// ─── 5. CORE PERMISSION CHECKERS ──────────────────────────────────────────────
/**
 * Central RBAC check: verifies if an actor possesses a specific permission.
 */
export function hasPermission(
  user: UserPermissionContext | OrgRole | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  const role = typeof user === "string" ? (user as OrgRole) : getEffectiveRole(user);
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

/**
 * Server-side API guard: returns 401 or 403 response if actor lacks permission.
 */
export async function requirePermission(
  actor: UserPermissionContext | null | undefined,
  permission: Permission
): Promise<{ authorized: true } | { authorized: false; response: NextResponse }> {
  if (!actor) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized. Valid session required." },
        { status: 401 }
      ),
    };
  }

  if (!hasPermission(actor, permission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Forbidden. You do not possess the required permission.",
          requiredPermission: permission,
          userRole: getEffectiveRole(actor),
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

// ─── 6. ACCOUNT CREATION ROLE MATRIX ──────────────────────────────────────────
/**
 * Returns which roles an actor is authorized to create.
 */
export function getAllowedRolesToCreate(actor?: UserPermissionContext | null): OrgRole[] {
  if (!actor) return [];
  const role = getEffectiveRole(actor);

  if (role === "FOUNDER" || role === "CO_FOUNDER") {
    return ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "EMPLOYEE", "INTERN"];
  }

  if (role === "CTO" || role === "HR") {
    // CTO and HR can ONLY create approved staff roles (EMPLOYEE, INTERN)
    return ["EMPLOYEE", "INTERN"];
  }

  return [];
}

/**
 * Validates if the actor is allowed to create an account with requestedRole.
 */
export function canCreateRole(actor: UserPermissionContext | null | undefined, requestedRole: string): boolean {
  if (!actor) return false;
  const allowed = getAllowedRolesToCreate(actor);
  return allowed.includes(requestedRole.toUpperCase() as OrgRole);
}

// ─── 7. HIGH-LEVEL ACCOUNT PROTECTION ─────────────────────────────────────────
/**
 * Identifies permanently protected executive accounts (Founder & Co-Founder).
 */
export function isProtectedAccount(
  user?: { email?: string | null; username?: string | null; role?: string | null; leadershipPosition?: string | null } | null
): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  const username = (user.username || "").toLowerCase().trim();

  if (
    email === PERMANENT_FOUNDER_EMAIL.toLowerCase() ||
    email === SECONDARY_FOUNDER_EMAIL.toLowerCase() ||
    email === CO_FOUNDER_EMAIL.toLowerCase()
  ) {
    return true;
  }

  if (username === "ashu" || username === "sanjay") return true;

  const role = (user.role || "").toUpperCase();
  const pos = (user.leadershipPosition || "").toUpperCase();
  return role === "OWNER" || role === "FOUNDER" || role === "CO_FOUNDER" || pos === "FOUNDER" || pos === "CO_FOUNDER";
}

/**
 * Enforces protective boundaries when editing, demoting, deactivating, or deleting users.
 */
export function canModifyTargetUser(
  actor?: UserPermissionContext | null,
  target?: { id?: string; email?: string | null; username?: string | null; role?: string | null; leadershipPosition?: string | null } | null,
  action?: "ROLE_CHANGE" | "DEACTIVATE" | "DELETE" | "PASSWORD_RESET" | "EDIT"
): { allowed: boolean; reason?: string } {
  if (!actor) return { allowed: false, reason: "Unauthenticated." };

  const actorRole = getEffectiveRole(actor);
  const isActorTop = actorRole === "FOUNDER" || actorRole === "CO_FOUNDER";

  // Check target protection
  if (isProtectedAccount(target)) {
    if (!isActorTop) {
      return {
        allowed: false,
        reason: "Founder and Co-Founder accounts are protected and cannot be modified by your role.",
      };
    }

    const targetEmail = (target?.email || "").toLowerCase().trim();
    const isTargetFounder =
      targetEmail === PERMANENT_FOUNDER_EMAIL.toLowerCase() ||
      target?.username?.toLowerCase() === "ashu";

    if (isTargetFounder && (action === "DELETE" || action === "ROLE_CHANGE" || action === "DEACTIVATE")) {
      return {
        allowed: false,
        reason: "The permanent Founder account (ashuchinthapalli3900@gmail.com) cannot be deleted, demoted, or deactivated.",
      };
    }
  }

  // Prevent self-promotion: actor cannot change their own role unless Founder
  if (action === "ROLE_CHANGE" && isSelf(actor, target) && !isActorTop) {
    return { allowed: false, reason: "Self-promotion is strictly forbidden." };
  }

  return { allowed: true };
}

// ─── 8. BACKWARDS-COMPATIBLE CONVENIENCE HELPERS ──────────────────────────────
export function isFounder(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return getEffectiveRole(user) === "FOUNDER";
}

export function isCoFounder(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return getEffectiveRole(user) === "CO_FOUNDER";
}

export function isOwner(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return role === "FOUNDER" || role === "CO_FOUNDER";
}

export function isCeo(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return getEffectiveRole(user) === "CEO";
}

export function isCto(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return getEffectiveRole(user) === "CTO";
}

export function isHr(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return getEffectiveRole(user) === "HR";
}

export function isCoo(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return getEffectiveRole(user) === "COO";
}

export function isCeoOrAdmin(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return role === "FOUNDER" || role === "CO_FOUNDER" || role === "CEO" || role === "ADMIN";
}

export function isExecutive(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  const role = getEffectiveRole(user);
  return ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "ADMIN"].includes(role);
}

export function isSelf(
  actor?: UserPermissionContext | null,
  target?: { id?: string; userId?: string | null } | null
): boolean {
  if (!actor || !target) return false;
  const actorId = actor.id || actor.userId;
  const targetId = target.id || target.userId;
  return Boolean(actorId && (actorId === target.id || actorId === target.userId || (targetId && actorId === targetId)));
}

export function canEditOwnProfile(actor?: UserPermissionContext | null, target?: { id?: string; userId?: string | null } | null): boolean {
  return isSelf(actor, target);
}

export function canEditProfile(actor?: UserPermissionContext | null, target?: { role?: string; id?: string; userId?: string | null } | null): boolean {
  if (!actor) return false;
  if (isSelf(actor, target)) return true;
  return hasPermission(actor, Permission.EDIT_PROFILES);
}

export function canManageProfiles(actor?: UserPermissionContext | null, targetProfile?: { role?: string; id?: string; userId?: string | null } | null): boolean {
  return canEditProfile(actor, targetProfile);
}

export function canManageAccounts(actor?: UserPermissionContext | null, targetUser?: { role?: string; id?: string } | null): boolean {
  if (!actor) return false;
  if (!hasPermission(actor, Permission.CREATE_USERS) && !hasPermission(actor, Permission.EDIT_USERS)) return false;
  return canModifyTargetUser(actor, targetUser, "EDIT").allowed;
}

export function canCreateAccount(actor?: UserPermissionContext | null): boolean {
  return hasPermission(actor, Permission.CREATE_USERS);
}

export function canDisableAccount(
  actor?: UserPermissionContext | null,
  targetUser?: { role?: string; id?: string; email?: string | null; username?: string | null } | null
): boolean {
  if (!actor) return false;
  if (!hasPermission(actor, Permission.EDIT_USERS)) return false;
  return canModifyTargetUser(actor, targetUser, "DEACTIVATE").allowed;
}

export function canChangeRole(
  actor?: UserPermissionContext | null,
  targetUser?: { role?: string; id?: string; email?: string | null; username?: string | null } | null,
  requestedRole?: string
): boolean {
  if (!actor) return false;
  if (!hasPermission(actor, Permission.CHANGE_USER_ROLE)) return false;
  if (requestedRole && !canCreateRole(actor, requestedRole)) return false;
  return canModifyTargetUser(actor, targetUser, "ROLE_CHANGE").allowed;
}

export function canResetPassword(actor?: UserPermissionContext | null, targetUser?: { role?: string; id?: string } | null): boolean {
  if (!actor) return false;
  if (isSelf(actor, targetUser)) return true;
  if (!hasPermission(actor, Permission.EDIT_USERS)) return false;
  return canModifyTargetUser(actor, targetUser, "PASSWORD_RESET").allowed;
}

export function canManageProjects(actor?: UserPermissionContext | null, project?: { createdBy?: string } | null): boolean {
  if (!actor) return false;
  if (hasPermission(actor, Permission.EDIT_PROJECTS)) return true;
  const actorId = actor.id || actor.userId;
  return Boolean(project && project.createdBy && actorId === project.createdBy);
}

export function canDeleteProject(actor?: UserPermissionContext | null, project?: { createdBy?: string } | null): boolean {
  if (!actor) return false;
  if (hasPermission(actor, Permission.DELETE_PROJECTS)) return true;
  const actorId = actor.id || actor.userId;
  return Boolean(project && project.createdBy && actorId === project.createdBy);
}

export function canApproveProjects(actor?: UserPermissionContext | null): boolean {
  return hasPermission(actor, Permission.APPROVE_PROJECTS);
}

export function canControlHomepage(actor?: UserPermissionContext | null): boolean {
  return hasPermission(actor, Permission.MANAGE_PLATFORM_SETTINGS);
}

export function canModerateFeed(actor?: UserPermissionContext | null): boolean {
  return hasPermission(actor, Permission.EDIT_PROFILES) || isExecutive(actor);
}

export function canManageInquiries(actor?: UserPermissionContext | null): boolean {
  return isExecutive(actor);
}

export function canViewAuditLogs(actor?: UserPermissionContext | null): boolean {
  return hasPermission(actor, Permission.VIEW_AUDIT_LOGS);
}

export function canManageOwnerAccount(actor?: UserPermissionContext | null): boolean {
  return isFounder(actor);
}

export function canAccessOwnerCenter(actor?: UserPermissionContext | null): boolean {
  return isOwner(actor);
}
