/**
 * Centralized Permission Resolver for CodeXa Agency & Team Core
 * Enforces role & executive leadership authorization rules across the entire platform.
 * 
 * CORE HIERARCHY:
 * 1. OWNER (Founder @ashu): Absolute authority over all accounts, profiles, projects, security, audit logs, and settings.
 * 2. ADMIN / CEO / CO_FOUNDER: Authority to manage normal team members, review/approve projects, moderate feed, and manage client inquiries. Cannot modify Owner account/security.
 * 3. TEAM_MEMBER: Self-service profile editing, project creation, feed interaction, and messaging.
 */

export const PERMANENT_FOUNDER_EMAIL = "ashuchinthapalli3900@gmail.com";
export const SECONDARY_FOUNDER_EMAIL = "darklevelinggaming@gmail.com";

export interface UserPermissionContext {
  id?: string;
  userId?: string | null;
  email?: string | null;
  username?: string | null;
  role?: "OWNER" | "ADMIN" | "TEAM_MEMBER" | string;
  leadershipPosition?: "FOUNDER" | "CO_FOUNDER" | "CEO" | string | null;
}

export function isFounder(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  if (email === PERMANENT_FOUNDER_EMAIL.toLowerCase() || email === SECONDARY_FOUNDER_EMAIL.toLowerCase()) return true;
  if (user.username && user.username.toLowerCase() === "ashu") return true;
  return user.leadershipPosition === "FOUNDER";
}

export function isOwner(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return isFounder(user) || user.role === "OWNER";
}

export function isCeoOrAdmin(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return (
    isOwner(user) ||
    user.role === "ADMIN" ||
    user.leadershipPosition === "CEO" ||
    user.leadershipPosition === "CO_FOUNDER"
  );
}

export function isExecutive(user?: UserPermissionContext | null): boolean {
  return isCeoOrAdmin(user);
}

/**
 * Check if the actor is editing their own entity (compares both id and userId).
 */
export function isSelf(actor?: UserPermissionContext | null, target?: { id?: string; userId?: string | null } | null): boolean {
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
  if (isOwner(actor)) return true;
  if (isSelf(actor, target)) return true;
  if (isCeoOrAdmin(actor)) {
    // CEO/Admin cannot edit Owner's profile
    if (target && target.role === "OWNER") return false;
    return true;
  }
  return false;
}

export function canManageProfiles(actor?: UserPermissionContext | null, targetProfile?: { role?: string; id?: string; userId?: string | null } | null): boolean {
  return canEditProfile(actor, targetProfile);
}

export function canManageAccounts(actor?: UserPermissionContext | null, targetUser?: { role?: string; id?: string } | null): boolean {
  if (!actor) return false;
  if (isOwner(actor)) return true;
  if (isCeoOrAdmin(actor)) {
    if (targetUser && targetUser.role === "OWNER") return false;
    return true;
  }
  return false;
}

export function canCreateAccount(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor) || isCeoOrAdmin(actor);
}

export function canDisableAccount(actor?: UserPermissionContext | null, targetUser?: { role?: string; id?: string; email?: string | null; username?: string | null } | null): boolean {
  if (!actor) return false;
  if (targetUser && (isFounder(targetUser) || targetUser.role === "OWNER")) return false;
  return isOwner(actor) || isCeoOrAdmin(actor);
}

export function canChangeRole(actor?: UserPermissionContext | null, targetUser?: { role?: string; id?: string; email?: string | null; username?: string | null } | null, requestedRole?: string): boolean {
  if (!actor) return false;
  if (targetUser && (isFounder(targetUser) || targetUser.role === "OWNER")) return false;
  if (requestedRole === "OWNER") return isOwner(actor);
  return isOwner(actor) || isCeoOrAdmin(actor);
}

export function canResetPassword(actor?: UserPermissionContext | null, targetUser?: { role?: string; id?: string } | null): boolean {
  if (!actor) return false;
  if (isSelf(actor, targetUser)) return true;
  if (isOwner(actor)) return true;
  if (isCeoOrAdmin(actor)) {
    if (targetUser && targetUser.role === "OWNER") return false;
    return true;
  }
  return false;
}

export function canManageProjects(actor?: UserPermissionContext | null, project?: { createdBy?: string } | null): boolean {
  if (!actor) return false;
  if (isOwner(actor) || isCeoOrAdmin(actor)) return true;
  const actorId = actor.id || actor.userId;
  if (project && project.createdBy && actorId === project.createdBy) return true;
  return false;
}

export function canDeleteProject(actor?: UserPermissionContext | null, project?: { createdBy?: string } | null): boolean {
  return canManageProjects(actor, project);
}

export function canControlHomepage(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor) || isCeoOrAdmin(actor);
}

export function canModerateFeed(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor) || isCeoOrAdmin(actor);
}

export function canManageInquiries(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor) || isCeoOrAdmin(actor);
}

export function canViewAuditLogs(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor);
}

export function canManageOwnerAccount(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor);
}

export function canAccessOwnerCenter(actor?: UserPermissionContext | null): boolean {
  if (!actor) return false;
  return isOwner(actor);
}
