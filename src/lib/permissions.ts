/**
 * Centralized Permission Resolver for CodeXa Agency
 * Enforces role & executive leadership authorization rules.
 */

export interface UserPermissionContext {
  id: string;
  role: "OWNER" | "ADMIN" | "TEAM_MEMBER" | string;
  leadershipPosition?: "FOUNDER" | "CO_FOUNDER" | "CEO" | null;
}

export function isOwner(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return user.role === "OWNER" || user.leadershipPosition === "FOUNDER";
}

export function isCeoOrAdmin(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return isOwner(user) || user.role === "ADMIN" || user.leadershipPosition === "CEO" || user.leadershipPosition === "CO_FOUNDER";
}

export function canManageProfiles(user?: UserPermissionContext | null, targetProfile?: { role?: string; id?: string } | null): boolean {
  if (!user) return false;
  if (isOwner(user)) return true;
  if (targetProfile && targetProfile.id === user.id) return true; // Can edit own profile
  if (isCeoOrAdmin(user)) {
    // CEO/Admin cannot edit Owner's profile
    if (targetProfile && targetProfile.role === "OWNER") return false;
    return true;
  }
  return false;
}

export function canManageAccounts(user?: UserPermissionContext | null, targetUser?: { role?: string; id?: string } | null): boolean {
  if (!user) return false;
  if (isOwner(user)) return true;
  if (isCeoOrAdmin(user)) {
    // CEO can manage normal team members, but never Owner account
    if (targetUser && targetUser.role === "OWNER") return false;
    return true;
  }
  return false;
}

export function canManageProjects(user?: UserPermissionContext | null, project?: { createdBy?: string } | null): boolean {
  if (!user) return false;
  if (isOwner(user) || isCeoOrAdmin(user)) return true; // Owner and CEO can manage any project
  if (project && project.createdBy === user.id) return true; // Member can manage own project
  return false;
}

export function canModerateFeed(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return isOwner(user) || isCeoOrAdmin(user);
}

export function canControlHomepage(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return isOwner(user) || isCeoOrAdmin(user);
}

export function canAccessOwnerCenter(user?: UserPermissionContext | null): boolean {
  if (!user) return false;
  return isOwner(user);
}
