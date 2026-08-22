/**
 * Universal Data Store for CodeXa Agency
 * Single Source of Truth: Supabase PostgreSQL via Prisma Client
 * Provides rich type-safe data access for Profiles, Projects, Social Feed, Chat, Inquiries, Notifications, Audit Logs, Auth OTPs, TOTP 2FA, and Backup Codes.
 */

import crypto from "crypto";
import { db } from "./db";
import { Prisma } from "@prisma/client";
import { encryptTotpSecret, decryptTotpSecret, verifyTotpToken, hashBackupCode } from "./totp";

// ─── ENTITY INTERFACES ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  userId?: string | null;
  username: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  role: "OWNER" | "ADMIN" | "TEAM_MEMBER" | string;
  memberType: "LEADERSHIP" | "CORE_TEAM" | string;
  leadershipPosition?: "FOUNDER" | "CO_FOUNDER" | "CEO" | "TEAM_LEAD" | string | null;
  primaryRole?: string | null;
  headline?: string | null;
  bio?: string | null;
  publicBio?: string | null;
  skills: string[];
  featuredProjects?: Array<{ name: string; category: string; url?: string | null }>;
  expertiseGroups?: Record<string, string[]>;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  socialLinks?: Record<string, string>;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  avatarSource?: "STATIC" | "SUPABASE_STORAGE" | "LEGACY";
  avatarPath?: string | null;
  avatarUrl?: string | null;
  avatarStoragePath?: string | null;
  avatarZoom?: number | null;
  avatarPositionX?: number | null;
  avatarPositionY?: number | null;
  avatarUpdatedAt?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  cropRotation?: number | null;
  zoom?: number | null;
  objectPosition?: string | null;
  isActive: boolean;
  isPublic: boolean;
  displayOrder: number;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
}

export interface MediaAsset {
  id: string;
  ownerUserId: string;
  mediaType: "AVATAR" | "PROJECT" | "POST" | string;
  sourceType: "STATIC" | "SUPABASE_STORAGE" | "LEGACY" | string;
  storageBucket?: string;
  storagePath?: string | null;
  publicUrl: string;
  mimeType?: string | null;
  originalFilename?: string | null;
  fileSize?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  zoom?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  overview: string;
  problem?: string | null;
  solution?: string | null;
  features: string[];
  techStack: string[];
  category: "AI" | "Web" | "Mobile" | "Automation" | "Cybersecurity" | "Discord Bot" | "Full Stack" | "API" | "Other" | string;
  status: "In Progress" | "Live" | "Archived" | "Client Work" | "PRODUCTION" | string;
  thumbnailUrl: string;
  screenshots: string[];
  repoUrl?: string | null;
  liveUrl?: string | null;
  demoUrl?: string | null;
  isDraft: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  isMainProject: boolean;
  isHomepageVisible?: boolean;
  showInTeamProjects?: boolean;
  displayOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
  };
  collaboratorIds?: string[];
  collaborators?: Array<{
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
    roleTitle?: string | null;
  }>;
  media?: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
    caption?: string | null;
    displayOrder: number;
  }>;
  links?: Array<{
    id: string;
    label: string;
    url: string;
  }>;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  projectId?: string | null;
  isAnnouncement: boolean;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
  };
  project?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  media?: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
    displayOrder: number;
  }>;
  links?: Array<{
    id: string;
    url: string;
    domain?: string | null;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  }>;
  likesCount: number;
  commentsCount: number;
  hasLiked?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  profileId: string;
  parentCommentId?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
  };
  replies?: PostComment[];
}

export interface Inquiry {
  id: string;
  referenceId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  projectType: string;
  budget: string;
  timeline?: string | null;
  message: string;
  attachmentUrl?: string | null;
  status: "NEW" | "CONTACTED" | "DISCUSSION" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED" | string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
  assignedTo?: string | null;
  replyNotes?: string | null;
  convertedProjectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string | null;
  user?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
    headline?: string | null;
  };
}

export interface ChatMessageAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface ChatMessageReaction {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  attachments?: ChatMessageAttachment[];
  fileUrl?: string | null;
  fileName?: string | null;
  isDeleted: boolean;
  replyToId?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
  };
  replyTo?: {
    id: string;
    message: string;
    senderName: string;
  } | null;
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
    userNames: string[];
  }>;
  userReactions?: Array<{
    userId: string;
    emoji: string;
  }>;
  clientId?: string;
  sendStatus?: "sending" | "sent" | "failed";
  isSeen?: boolean;
}

export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP" | "PROJECT" | string;
  title?: string | null;
  projectId?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  participantIds?: string[];
  members?: Array<{
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
    headline?: string | null;
  }>;
  otherMember?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
    headline?: string | null;
  } | null;
  lastMessage?: ChatMessage | null;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  hiddenForUserIds?: string[];
  isMutedForUserIds?: string[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: "POST_LIKE" | "POST_COMMENT" | "PROJECT_FEATURED" | "CHAT" | "SECURITY" | string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorMediaUrl?: string | null;
  actionType:
    | "PROFILE_UPDATED"
    | "POST_CREATED"
    | "PROJECT_CREATED"
    | "PROJECT_PUBLISHED"
    | "MAIN_PROJECT_APPROVED"
    | "COLLABORATOR_ADDED"
    | "MEMBER_JOINED"
    | string;
  targetType: "PROFILE" | "PROJECT" | "POST" | "MEMBER" | string;
  targetId?: string | null;
  title: string;
  details?: string | null;
  link?: string | null;
  createdAt: string;
}

export interface AuthOtpRecord {
  id: string;
  profileId: string;
  email: string;
  otpHash: string;
  purpose: "LOGIN" | "PASSWORD_RESET" | string;
  attempts: number;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface SiteSettings {
  mainProjectsHomeVisible: boolean;
  teamProjectsHomeVisible: boolean;
  updatedAt?: string;
}

// ─── DATA MAPPING HELPERS ───────────────────────────────────────────────────

function mapUserToProfile(user: any): Profile {
  const profile = user.profile;
  const skills = Array.isArray(user.skills) ? user.skills.map((s: any) => s.skillName) : [];
  const projectsCount = user._count?.projectsCreated ?? 0;
  const twoFactorEnabled = !!user.twoFactorConfig?.enabled;

  return {
    id: user.id,
    userId: user.id,
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    displayName: profile?.displayName || user.fullName || user.username,
    role: user.role,
    memberType: profile?.memberType || (user.role === "OWNER" || user.role === "ADMIN" ? "LEADERSHIP" : "CORE_TEAM"),
    leadershipPosition: profile?.leadershipPosition || null,
    primaryRole: profile?.primaryRole || null,
    headline: profile?.headline || null,
    bio: profile?.bio || null,
    publicBio: profile?.publicBio || profile?.bio || null,
    skills,
    featuredProjects: Array.isArray(profile?.featuredProjects) ? profile.featuredProjects : undefined,
    expertiseGroups: profile?.expertiseGroups && typeof profile.expertiseGroups === "object" ? profile.expertiseGroups : undefined,
    githubUrl: profile?.githubUrl || null,
    linkedinUrl: profile?.linkedinUrl || null,
    portfolioUrl: profile?.portfolioUrl || null,
    mediaUrl: profile?.mediaUrl || user.profileMediaUrl || null,
    mediaMimeType: profile?.mediaMimeType || user.profileMediaMimeType || null,
    avatarSource: (profile?.mediaUrl ? "SUPABASE_STORAGE" : "STATIC") as any,
    avatarPath: profile?.mediaUrl || user.profileMediaUrl || null,
    avatarUrl: profile?.profileMediaUrl || profile?.mediaUrl || user.profileMediaUrl || null,
    avatarStoragePath: profile?.mediaUrl || null,
    avatarZoom: profile?.zoom ?? profile?.cropZoom ?? 1,
    avatarPositionX: profile?.cropX ?? 0,
    avatarPositionY: profile?.cropY ?? 0,
    cropX: profile?.cropX ?? user.cropX ?? 0,
    cropY: profile?.cropY ?? user.cropY ?? 0,
    cropW: profile?.cropW ?? null,
    cropH: profile?.cropH ?? null,
    cropZoom: profile?.cropZoom ?? profile?.zoom ?? user.zoom ?? 1,
    cropRotation: profile?.cropRotation ?? 0,
    zoom: profile?.zoom ?? user.zoom ?? 1,
    objectPosition: profile?.objectPosition ?? user.objectPosition ?? "center",
    isActive: user.isActive,
    isPublic: profile?.isPublic ?? true,
    displayOrder: profile?.displayOrder ?? 0,
    mustChangePassword: !!user.mustChangePassword,
    twoFactorEnabled,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
    projectsCount,
  };
}

function mapProjectToProject(p: any): Project {
  const creatorProfile = p.creator?.profile;
  const creator = p.creator
    ? {
        id: p.creator.id,
        username: p.creator.username,
        displayName: creatorProfile?.displayName || p.creator.fullName || p.creator.username,
        mediaUrl: creatorProfile?.mediaUrl || p.creator.profileMediaUrl || null,
        role: p.creator.role,
      }
    : undefined;

  const collaborators = Array.isArray(p.collaborators)
    ? p.collaborators.map((c: any) => {
        const uProfile = c.user?.profile;
        return {
          id: c.user?.id || c.userId,
          username: c.user?.username || "",
          displayName: uProfile?.displayName || c.user?.fullName || c.user?.username || "Collaborator",
          mediaUrl: uProfile?.mediaUrl || c.user?.profileMediaUrl || null,
          role: c.user?.role || "TEAM_MEMBER",
          roleTitle: c.roleTitle || "Collaborator",
        };
      })
    : [];

  const collaboratorIds = collaborators.map((c: any) => c.id);

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    shortDesc: p.shortDesc || "",
    overview: p.overview || p.shortDesc || "",
    problem: p.problem || null,
    solution: p.solution || null,
    features: Array.isArray(p.features) ? p.features : [],
    techStack: Array.isArray(p.techStack) ? p.techStack : [],
    category: p.category || "Web",
    status: p.status || "Live",
    thumbnailUrl: p.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: Array.isArray(p.media) ? p.media.map((m: any) => m.mediaUrl) : [],
    repoUrl: p.repoUrl || null,
    liveUrl: p.liveUrl || null,
    demoUrl: p.demoUrl || null,
    isDraft: !!p.isDraft,
    isPublic: !p.isDraft,
    isFeatured: !!p.isMainProject,
    isMainProject: !!p.isMainProject,
    isHomepageVisible: p.isHomepageVisible ?? true,
    showInTeamProjects: !p.isMainProject,
    displayOrder: p.homepageOrder || 0,
    createdBy: p.createdBy,
    createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    creator,
    collaboratorIds,
    collaborators,
    media: Array.isArray(p.media)
      ? p.media.map((m: any) => ({
          id: m.id,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          caption: m.caption,
          displayOrder: m.displayOrder,
        }))
      : [],
    links: Array.isArray(p.links)
      ? p.links.map((l: any) => ({
          id: l.id,
          label: l.label,
          url: l.url,
        }))
      : [],
  };
}

function mapPostToPost(p: any, currentUserId?: string): Post {
  const authorProfile = p.author?.profile;
  const author = p.author
    ? {
        id: p.author.id,
        username: p.author.username,
        displayName: authorProfile?.displayName || p.author.fullName || p.author.username,
        mediaUrl: authorProfile?.mediaUrl || p.author.profileMediaUrl || null,
        role: p.author.role,
      }
    : undefined;

  const likesCount = Array.isArray(p.likes) ? p.likes.length : p._count?.likes ?? 0;
  const commentsCount = Array.isArray(p.comments) ? p.comments.length : p._count?.comments ?? 0;
  const hasLiked = currentUserId && Array.isArray(p.likes)
    ? p.likes.some((l: any) => l.userId === currentUserId)
    : false;

  return {
    id: p.id,
    authorId: p.authorId,
    content: p.content,
    projectId: p.projectId || null,
    isAnnouncement: !!p.isAnnouncement,
    createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    author,
    project: p.project ? { id: p.project.id, title: p.project.title, slug: p.project.slug } : null,
    media: Array.isArray(p.media)
      ? p.media.map((m: any) => ({
          id: m.id,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          displayOrder: m.displayOrder,
        }))
      : [],
    links: Array.isArray(p.links)
      ? p.links.map((l: any) => ({
          id: l.id,
          url: l.url,
          domain: l.domain,
          title: l.title,
          description: l.description,
          imageUrl: l.imageUrl,
        }))
      : [],
    likesCount,
    commentsCount,
    hasLiked,
  };
}

// ─── DATA STORE METHODS (PRISMA POSTGRESQL) ───────────────────────────────────

export const dataStore = {
  // ── Profiles ───────────────────────────────────────────────────────────────
  async getProfiles(filter?: { role?: string; isPublic?: boolean }): Promise<Profile[]> {
    const whereClause: Prisma.UserWhereInput = {
      isActive: true,
    };
    if (filter?.role) whereClause.role = filter.role;
    if (filter?.isPublic !== undefined) {
      whereClause.profile = { isPublic: filter.isPublic };
    }

    const users = await db.user.findMany({
      where: whereClause,
      include: {
        profile: true,
        twoFactorConfig: true,
        skills: { orderBy: { displayOrder: "asc" } },
        links: { orderBy: { displayOrder: "asc" } },
        _count: { select: { projectsCreated: true } },
      },
      orderBy: [
        { profile: { displayOrder: "asc" } },
        { createdAt: "asc" },
      ],
    });

    return users.map(mapUserToProfile);
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const clean = username.trim().toLowerCase();
    const user = await db.user.findFirst({
      where: {
        username: { equals: clean, mode: "insensitive" },
      },
      include: {
        profile: true,
        twoFactorConfig: true,
        skills: { orderBy: { displayOrder: "asc" } },
        links: { orderBy: { displayOrder: "asc" } },
        _count: { select: { projectsCreated: true } },
      },
    });

    if (!user) return null;
    return mapUserToProfile(user);
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const user = await db.user.findFirst({
      where: { id },
      include: {
        profile: true,
        twoFactorConfig: true,
        skills: { orderBy: { displayOrder: "asc" } },
        links: { orderBy: { displayOrder: "asc" } },
        _count: { select: { projectsCreated: true } },
      },
    });

    if (!user) return null;
    return mapUserToProfile(user);
  },

  async getProfileByEmailOrUsername(identifier: string): Promise<Profile | null> {
    const clean = identifier.trim().toLowerCase();
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: "insensitive" } },
          { username: { equals: clean, mode: "insensitive" } },
        ],
      },
      include: {
        profile: true,
        twoFactorConfig: true,
        skills: { orderBy: { displayOrder: "asc" } },
        links: { orderBy: { displayOrder: "asc" } },
        _count: { select: { projectsCreated: true } },
      },
    });

    if (!user) return null;
    return mapUserToProfile(user);
  },

  async createProfile(data: Partial<Profile> & { passwordHash?: string; temporaryPassword?: string }): Promise<Profile> {
    const username = data.username!.toLowerCase().trim();
    const email = data.email!.toLowerCase().trim();
    const passwordHash = data.passwordHash || (data.temporaryPassword ? crypto.createHash("sha256").update(data.temporaryPassword).digest("hex") : "");

    const createdUser = await db.user.create({
      data: {
        username,
        email,
        fullName: data.displayName || data.username!,
        passwordHash,
        role: data.role || "TEAM_MEMBER",
        isActive: true,
        mustChangePassword: data.mustChangePassword ?? false,
        profile: {
          create: {
            displayName: data.displayName || data.username!,
            memberType: data.role === "OWNER" || data.role === "ADMIN" ? "LEADERSHIP" : "CORE_TEAM",
            leadershipPosition: data.leadershipPosition || null,
            headline: data.headline || "CodeXa Engineer",
            bio: data.bio || "",
            mediaUrl: data.mediaUrl || null,
            githubUrl: data.githubUrl || null,
            linkedinUrl: data.linkedinUrl || null,
            portfolioUrl: data.portfolioUrl || null,
            isPublic: true,
          },
        },
      },
      include: {
        profile: true,
        twoFactorConfig: true,
        skills: true,
        links: true,
        _count: { select: { projectsCreated: true } },
      },
    });

    if (Array.isArray(data.skills) && data.skills.length > 0) {
      await db.userSkill.createMany({
        data: data.skills.map((skillName, idx) => ({
          userId: createdUser.id,
          skillName,
          displayOrder: idx,
        })),
        skipDuplicates: true,
      });
    }

    const reloaded = await this.getProfileById(createdUser.id);
    return reloaded!;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return null;

    const userUpdate: Prisma.UserUpdateInput = {};
    if (updates.displayName !== undefined) userUpdate.fullName = updates.displayName;
    if (updates.role !== undefined) userUpdate.role = updates.role;
    if (updates.isActive !== undefined) userUpdate.isActive = updates.isActive;
    if (updates.passwordHash !== undefined) userUpdate.passwordHash = updates.passwordHash;
    if (updates.mustChangePassword !== undefined) userUpdate.mustChangePassword = updates.mustChangePassword;
    if (updates.lastLoginAt !== undefined) userUpdate.lastLoginAt = updates.lastLoginAt ? new Date(updates.lastLoginAt) : null;
    if (updates.mediaUrl !== undefined) userUpdate.profileMediaUrl = updates.mediaUrl;
    if (updates.cropX !== undefined) userUpdate.cropX = updates.cropX;
    if (updates.cropY !== undefined) userUpdate.cropY = updates.cropY;
    if (updates.zoom !== undefined) userUpdate.zoom = updates.zoom;

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({
        where: { id },
        data: userUpdate,
      });
    }

    // Upsert TeamProfile
    const profileUpdate: Prisma.TeamProfileUpsertArgs["update"] = {};
    if (updates.displayName !== undefined) profileUpdate.displayName = updates.displayName;
    if (updates.headline !== undefined) profileUpdate.headline = updates.headline;
    if (updates.bio !== undefined) profileUpdate.bio = updates.bio;
    if (updates.publicBio !== undefined) profileUpdate.publicBio = updates.publicBio;
    if (updates.memberType !== undefined) profileUpdate.memberType = updates.memberType;
    if (updates.leadershipPosition !== undefined) profileUpdate.leadershipPosition = updates.leadershipPosition;
    if (updates.primaryRole !== undefined) profileUpdate.primaryRole = updates.primaryRole;
    if (updates.featuredProjects !== undefined) profileUpdate.featuredProjects = updates.featuredProjects as any;
    if (updates.expertiseGroups !== undefined) profileUpdate.expertiseGroups = updates.expertiseGroups as any;
    if (updates.githubUrl !== undefined) profileUpdate.githubUrl = updates.githubUrl;
    if (updates.linkedinUrl !== undefined) profileUpdate.linkedinUrl = updates.linkedinUrl;
    if (updates.portfolioUrl !== undefined) profileUpdate.portfolioUrl = updates.portfolioUrl;
    if (updates.mediaUrl !== undefined) profileUpdate.mediaUrl = updates.mediaUrl;
    if (updates.mediaMimeType !== undefined) profileUpdate.mediaMimeType = updates.mediaMimeType;
    if (updates.cropX !== undefined) profileUpdate.cropX = updates.cropX;
    if (updates.cropY !== undefined) profileUpdate.cropY = updates.cropY;
    if (updates.cropW !== undefined) profileUpdate.cropW = updates.cropW;
    if (updates.cropH !== undefined) profileUpdate.cropH = updates.cropH;
    if (updates.cropZoom !== undefined) profileUpdate.cropZoom = updates.cropZoom;
    if (updates.cropRotation !== undefined) profileUpdate.cropRotation = updates.cropRotation;
    if (updates.zoom !== undefined) profileUpdate.zoom = updates.zoom;
    if (updates.objectPosition !== undefined) profileUpdate.objectPosition = updates.objectPosition;
    if (updates.isPublic !== undefined) profileUpdate.isPublic = updates.isPublic;
    if (updates.displayOrder !== undefined) profileUpdate.displayOrder = updates.displayOrder;

    await db.teamProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        displayName: updates.displayName || user.fullName || user.username,
        headline: updates.headline || null,
        bio: updates.bio || null,
        publicBio: updates.publicBio || null,
        memberType: updates.memberType || "CORE_TEAM",
        leadershipPosition: updates.leadershipPosition || null,
        primaryRole: updates.primaryRole || null,
        featuredProjects: (updates.featuredProjects as any) || undefined,
        expertiseGroups: (updates.expertiseGroups as any) || undefined,
        githubUrl: updates.githubUrl || null,
        linkedinUrl: updates.linkedinUrl || null,
        portfolioUrl: updates.portfolioUrl || null,
        mediaUrl: updates.mediaUrl || null,
        isPublic: updates.isPublic ?? true,
      },
      update: profileUpdate,
    });

    // Update Skills if provided
    if (Array.isArray(updates.skills)) {
      await db.userSkill.deleteMany({ where: { userId: id } });
      if (updates.skills.length > 0) {
        await db.userSkill.createMany({
          data: updates.skills.map((skillName, idx) => ({
            userId: id,
            skillName,
            displayOrder: idx,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.getProfileById(id);
  },

  async deleteProfile(id: string): Promise<boolean> {
    try {
      await db.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Two-Factor Authentication & Pre-Auth Challenges ────────────────────────
  async getUserTwoFactorConfig(userId: string): Promise<{ enabled: boolean; verifiedAt: string | null; remainingBackupCodes: number }> {
    const config = await db.twoFactorConfig.findUnique({ where: { userId } });
    const remainingBackupCodes = await db.backupCode.count({
      where: { userId, usedAt: null },
    });
    return {
      enabled: !!config?.enabled,
      verifiedAt: config?.verifiedAt ? config.verifiedAt.toISOString() : null,
      remainingBackupCodes,
    };
  },

  async createPreAuthChallenge(userId: string, purpose: string = "LOGIN_2FA"): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.preAuthChallenge.deleteMany({ where: { userId } }).catch(() => {});

    await db.preAuthChallenge.create({
      data: {
        userId,
        tokenHash,
        purpose,
        expiresAt,
      },
    });

    return token;
  },

  async verifyPreAuthChallenge(token: string, purpose: string = "LOGIN_2FA"): Promise<{ valid: boolean; userId?: string; error?: string }> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const challenge = await db.preAuthChallenge.findUnique({ where: { tokenHash } });

    if (!challenge || challenge.purpose !== purpose) {
      return { valid: false, error: "Invalid or expired authorization challenge." };
    }

    if (new Date() > challenge.expiresAt) {
      await db.preAuthChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
      return { valid: false, error: "Authorization challenge expired. Please re-enter your credentials." };
    }

    return { valid: true, userId: challenge.userId };
  },

  async consumePreAuthChallenge(token: string): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.preAuthChallenge.deleteMany({ where: { tokenHash } }).catch(() => {});
  },

  async enableTwoFactor(userId: string, secret: string, hashedBackupCodes: string[]): Promise<boolean> {
    const secretEncrypted = encryptTotpSecret(secret);

    await db.twoFactorConfig.upsert({
      where: { userId },
      create: {
        userId,
        enabled: true,
        secretEncrypted,
        verifiedAt: new Date(),
      },
      update: {
        enabled: true,
        secretEncrypted,
        verifiedAt: new Date(),
      },
    });

    // Delete old backup codes and create new
    await db.backupCode.deleteMany({ where: { userId } });
    if (hashedBackupCodes.length > 0) {
      await db.backupCode.createMany({
        data: hashedBackupCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
      });
    }

    return true;
  },

  async disableTwoFactor(userId: string): Promise<boolean> {
    await db.twoFactorConfig.deleteMany({ where: { userId } });
    await db.backupCode.deleteMany({ where: { userId } });
    return true;
  },

  async verifyTwoFactorTotp(userId: string, token: string): Promise<boolean> {
    const config = await db.twoFactorConfig.findUnique({ where: { userId } });
    if (!config || !config.enabled) return false;

    const secret = decryptTotpSecret(config.secretEncrypted);
    return verifyTotpToken(token, secret);
  },

  async verifyAndConsumeBackupCode(userId: string, rawCode: string): Promise<{ valid: boolean; remainingCount: number }> {
    const codeHash = hashBackupCode(rawCode);
    const record = await db.backupCode.findFirst({
      where: {
        userId,
        codeHash,
        usedAt: null,
      },
    });

    if (!record) {
      const remaining = await db.backupCode.count({ where: { userId, usedAt: null } });
      return { valid: false, remainingCount: remaining };
    }

    await db.backupCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const remainingCount = await db.backupCode.count({ where: { userId, usedAt: null } });
    return { valid: true, remainingCount };
  },

  async regenerateBackupCodes(userId: string, hashedCodes: string[]): Promise<boolean> {
    await db.backupCode.deleteMany({ where: { userId } });
    await db.backupCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        userId,
        codeHash,
      })),
    });
    return true;
  },

  // ── Notification Preferences ───────────────────────────────────────────────
  async getNotificationPreferences(userId: string) {
    const pref = await db.notificationPreference.findUnique({ where: { userId } });
    if (pref) return pref;
    return {
      userId,
      directMessages: true,
      projectUpdates: true,
      mentions: true,
      feedActivity: true,
      announcements: true,
    };
  },

  async updateNotificationPreferences(userId: string, prefs: any) {
    return db.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        directMessages: prefs.directMessages ?? true,
        projectUpdates: prefs.projectUpdates ?? true,
        mentions: prefs.mentions ?? true,
        feedActivity: prefs.feedActivity ?? true,
        announcements: prefs.announcements ?? true,
      },
      update: prefs,
    });
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  async getProjects(filter?: { publicOnly?: boolean; isMain?: boolean; developerId?: string }): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = {
      isArchived: false,
    };
    if (filter?.publicOnly) where.isDraft = false;
    if (filter?.isMain !== undefined) where.isMainProject = filter.isMain;
    if (filter?.developerId) where.createdBy = filter.developerId;

    const list = await db.project.findMany({
      where,
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: { orderBy: { displayOrder: "asc" } },
        links: true,
      },
      orderBy: [
        { homepageOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return list.map(mapProjectToProject);
  },

  async getProjectBySlug(slug: string): Promise<Project | null> {
    const p = await db.project.findUnique({
      where: { slug },
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: { orderBy: { displayOrder: "asc" } },
        links: true,
      },
    });

    if (!p) return null;
    return mapProjectToProject(p);
  },

  async getProjectById(id: string): Promise<Project | null> {
    const p = await db.project.findUnique({
      where: { id },
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: { orderBy: { displayOrder: "asc" } },
        links: true,
      },
    });

    if (!p) return null;
    return mapProjectToProject(p);
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const slug = (data.slug || data.title!.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
    const collaboratorIds = data.collaboratorIds || [];

    const created = await db.project.create({
      data: {
        title: data.title!,
        slug,
        shortDesc: data.shortDesc || "",
        overview: data.overview || data.shortDesc || "",
        problem: data.problem || null,
        solution: data.solution || null,
        features: data.features || [],
        techStack: data.techStack || [],
        category: data.category || "Web",
        status: data.status || "Live",
        thumbnailUrl: data.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
        repoUrl: data.repoUrl || null,
        liveUrl: data.liveUrl || null,
        demoUrl: data.demoUrl || null,
        isDraft: !!data.isDraft,
        isMainProject: !!data.isMainProject,
        isHomepageVisible: data.isHomepageVisible ?? true,
        isArchived: false,
        createdBy: data.createdBy!,
        collaborators: {
          create: collaboratorIds.map((userId) => ({
            userId,
            roleTitle: "Collaborator",
          })),
        },
      },
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: true,
        links: true,
      },
    });

    return mapProjectToProject(created);
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const projectUpdate: Prisma.ProjectUpdateInput = {};
    if (updates.title !== undefined) projectUpdate.title = updates.title;
    if (updates.slug !== undefined) projectUpdate.slug = updates.slug;
    if (updates.shortDesc !== undefined) projectUpdate.shortDesc = updates.shortDesc;
    if (updates.overview !== undefined) projectUpdate.overview = updates.overview;
    if (updates.problem !== undefined) projectUpdate.problem = updates.problem;
    if (updates.solution !== undefined) projectUpdate.solution = updates.solution;
    if (updates.features !== undefined) projectUpdate.features = updates.features;
    if (updates.techStack !== undefined) projectUpdate.techStack = updates.techStack;
    if (updates.category !== undefined) projectUpdate.category = updates.category;
    if (updates.status !== undefined) projectUpdate.status = updates.status;
    if (updates.thumbnailUrl !== undefined) projectUpdate.thumbnailUrl = updates.thumbnailUrl;
    if (updates.repoUrl !== undefined) projectUpdate.repoUrl = updates.repoUrl;
    if (updates.liveUrl !== undefined) projectUpdate.liveUrl = updates.liveUrl;
    if (updates.demoUrl !== undefined) projectUpdate.demoUrl = updates.demoUrl;
    if (updates.isDraft !== undefined) projectUpdate.isDraft = updates.isDraft;
    if (updates.isMainProject !== undefined) projectUpdate.isMainProject = updates.isMainProject;
    if (updates.isHomepageVisible !== undefined) projectUpdate.isHomepageVisible = updates.isHomepageVisible;
    if (updates.displayOrder !== undefined) projectUpdate.homepageOrder = updates.displayOrder;

    const updated = await db.project.update({
      where: { id },
      data: projectUpdate,
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: true,
        links: true,
      },
    });

    return mapProjectToProject(updated);
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      await db.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Social Feed ─────────────────────────────────────────────────────────────
  async getPosts(currentUserId?: string): Promise<Post[]> {
    const list = await db.post.findMany({
      where: { isDeleted: false },
      include: {
        author: { include: { profile: true } },
        project: true,
        media: { orderBy: { displayOrder: "asc" } },
        links: true,
        likes: true,
        comments: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: "desc" },
    });

    return list.map((p) => mapPostToPost(p, currentUserId));
  },

  async createPost(data: { authorId: string; content: string; projectId?: string; isAnnouncement?: boolean }): Promise<Post> {
    const post = await db.post.create({
      data: {
        authorId: data.authorId,
        content: data.content,
        projectId: data.projectId || null,
        isAnnouncement: !!data.isAnnouncement,
      },
      include: {
        author: { include: { profile: true } },
        project: true,
        media: true,
        links: true,
        likes: true,
        comments: true,
      },
    });

    return mapPostToPost(post);
  },

  async deletePost(id: string, userId?: string): Promise<boolean> {
    try {
      await db.post.update({
        where: { id },
        data: { isDeleted: true },
      });
      return true;
    } catch {
      return false;
    }
  },

  async togglePostLike(postId: string, profileId: string): Promise<{ liked: boolean; totalLikes: number }> {
    const existing = await db.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: profileId,
        },
      },
    });

    let liked = false;
    if (existing) {
      await db.postLike.delete({
        where: { id: existing.id },
      });
      liked = false;
    } else {
      await db.postLike.create({
        data: {
          postId,
          userId: profileId,
        },
      });
      liked = true;
    }

    const totalLikes = await db.postLike.count({ where: { postId } });
    return { liked, totalLikes };
  },

  async getPostComments(postId: string): Promise<PostComment[]> {
    const comments = await db.comment.findMany({
      where: { postId, isDeleted: false },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      profileId: c.userId,
      parentCommentId: c.parentCommentId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: c.user
        ? {
            id: c.user.id,
            username: c.user.username,
            displayName: c.user.profile?.displayName || c.user.fullName || c.user.username,
            mediaUrl: c.user.profile?.mediaUrl || c.user.profileMediaUrl || null,
            role: c.user.role,
          }
        : undefined,
    }));
  },

  async createPostComment(data: { postId: string; profileId: string; content: string; parentCommentId?: string }): Promise<PostComment> {
    const comment = await db.comment.create({
      data: {
        postId: data.postId,
        userId: data.profileId,
        content: data.content,
        parentCommentId: data.parentCommentId || null,
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return {
      id: comment.id,
      postId: comment.postId,
      profileId: comment.userId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.user
        ? {
            id: comment.user.id,
            username: comment.user.username,
            displayName: comment.user.profile?.displayName || comment.user.fullName || comment.user.username,
            mediaUrl: comment.user.profile?.mediaUrl || comment.user.profileMediaUrl || null,
            role: comment.user.role,
          }
        : undefined,
    };
  },

  async deletePostComment(commentId: string, profileId: string): Promise<boolean> {
    try {
      await db.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
      return true;
    } catch {
      return false;
    }
  },

  // ── Recovery Email OTP Verification ─────────────────────────────────────────
  async createOtp(email: string, profileId: string, purpose: "LOGIN" | "PASSWORD_RESET" | string = "PASSWORD_RESET"): Promise<string> {
    const cleanEmail = email.toLowerCase().trim();
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.authOtp.updateMany({
      where: {
        email: cleanEmail,
        purpose,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    await db.authOtp.create({
      data: {
        userId: profileId,
        email: cleanEmail,
        otpHash,
        purpose,
        attempts: 0,
        isUsed: false,
        expiresAt,
      },
    });

    return otp;
  },

  async verifyOtp(email: string, otp: string, purpose: "LOGIN" | "PASSWORD_RESET" | string = "PASSWORD_RESET"): Promise<{ valid: boolean; profile?: Profile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const record = await db.authOtp.findFirst({
      where: {
        email: cleanEmail,
        purpose,
        isUsed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { valid: false, error: "No active verification code found. Please request a new one." };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await db.authOtp.update({ where: { id: record.id }, data: { isUsed: true } });
      return { valid: false, error: "Verification code has expired. Please request a new code." };
    }

    if (record.attempts >= 5) {
      await db.authOtp.update({ where: { id: record.id }, data: { isUsed: true } });
      return { valid: false, error: "Too many failed attempts. Code invalidated." };
    }

    if (record.otpHash !== otpHash) {
      await db.authOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      return { valid: false, error: "Invalid verification code. Please check and try again." };
    }

    await db.authOtp.update({ where: { id: record.id }, data: { isUsed: true } });
    const profile = await this.getProfileById(record.userId);
    return { valid: true, profile: profile || undefined };
  },

  // ── Site Settings ──────────────────────────────────────────────────────────
  async getSiteSettings(): Promise<SiteSettings> {
    try {
      const setting = await db.siteSetting.findUnique({ where: { key: "homepage_visibility" } });
      if (setting) {
        return JSON.parse(setting.value);
      }
    } catch {}

    return {
      mainProjectsHomeVisible: true,
      teamProjectsHomeVisible: true,
      updatedAt: new Date().toISOString(),
    };
  },

  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSiteSettings();
    const updated: SiteSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.siteSetting.upsert({
        where: { key: "homepage_visibility" },
        create: {
          key: "homepage_visibility",
          value: JSON.stringify(updated),
        },
        update: {
          value: JSON.stringify(updated),
        },
      });
    } catch {}

    return updated;
  },

  // ── Inquiries ──────────────────────────────────────────────────────────────
  async getInquiries(filters?: { status?: string | null; priority?: string | null; search?: string | null }): Promise<Inquiry[]> {
    const where: Prisma.InquiryWhereInput = {};
    if (filters?.status && filters.status !== "ALL") where.status = filters.status;
    if (filters?.priority && filters.priority !== "ALL") where.priority = filters.priority;
    if (filters?.search) {
      const q = filters.search;
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { referenceId: { contains: q, mode: "insensitive" } },
      ];
    }

    const list = await db.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return list.map((i) => ({
      id: i.id,
      referenceId: i.referenceId,
      fullName: i.fullName,
      email: i.email,
      phone: i.phone,
      company: i.company,
      projectType: i.projectType,
      budget: i.budget,
      timeline: i.timeline,
      message: i.message,
      attachmentUrl: i.attachmentUrl,
      status: i.status,
      priority: i.priority,
      assignedTo: i.assignedTo,
      replyNotes: i.replyNotes,
      convertedProjectId: i.convertedProjectId,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
  },

  async createInquiry(data: Partial<Inquiry>): Promise<Inquiry> {
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const referenceId = `CXA-${yearMonth}-${randomHex}`;

    const created = await db.inquiry.create({
      data: {
        referenceId,
        fullName: data.fullName!,
        email: data.email!,
        phone: data.phone || null,
        company: data.company || null,
        projectType: data.projectType || "web-dev",
        budget: data.budget || "$1,000 - $5,000",
        timeline: data.timeline || "1 - 2 Months",
        message: data.message!,
        attachmentUrl: data.attachmentUrl || null,
        status: "NEW",
        priority: "MEDIUM",
      },
    });

    return {
      id: created.id,
      referenceId: created.referenceId,
      fullName: created.fullName,
      email: created.email,
      phone: created.phone,
      company: created.company,
      projectType: created.projectType,
      budget: created.budget,
      timeline: created.timeline,
      message: created.message,
      attachmentUrl: created.attachmentUrl,
      status: created.status,
      priority: created.priority,
      assignedTo: created.assignedTo,
      replyNotes: created.replyNotes,
      convertedProjectId: created.convertedProjectId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  },

  async updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry | null> {
    const updatePayload: Prisma.InquiryUpdateInput = {};
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.priority !== undefined) updatePayload.priority = updates.priority;
    if (updates.assignedTo !== undefined) updatePayload.assignedTo = updates.assignedTo;
    if (updates.replyNotes !== undefined) updatePayload.replyNotes = updates.replyNotes;

    const updated = await db.inquiry.update({
      where: { id },
      data: updatePayload,
    });

    return {
      id: updated.id,
      referenceId: updated.referenceId,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      company: updated.company,
      projectType: updated.projectType,
      budget: updated.budget,
      timeline: updated.timeline,
      message: updated.message,
      attachmentUrl: updated.attachmentUrl,
      status: updated.status,
      priority: updated.priority,
      assignedTo: updated.assignedTo,
      replyNotes: updated.replyNotes,
      convertedProjectId: updated.convertedProjectId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // ── Chat & Direct Messaging ────────────────────────────────────────────────
  async getConversations(userId?: string): Promise<Conversation[]> {
    const where: Prisma.ConversationWhereInput = {};
    if (userId) {
      where.members = {
        some: { userId },
      };
    }

    const list = await db.conversation.findMany({
      where,
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { include: { profile: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return list.map((conv) => {
      const lastMsg = conv.messages[0];
      let otherMember = null;
      let title = conv.title || "Conversation";

      const membersList = conv.members.map((m) => {
        const uProf = m.user.profile;
        return {
          id: m.user.id,
          username: m.user.username,
          displayName: uProf?.displayName || m.user.fullName || m.user.username,
          mediaUrl: uProf?.mediaUrl || m.user.profileMediaUrl || null,
          role: m.user.role,
          headline: uProf?.headline || null,
        };
      });

      if (conv.type === "DIRECT" && userId) {
        const other = membersList.find((m) => m.id !== userId);
        if (other) {
          otherMember = other;
          title = other.displayName;
        }
      }

      return {
        id: conv.id,
        type: conv.type,
        title,
        projectId: conv.projectId,
        createdBy: conv.createdBy,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        participantIds: conv.members.map((m) => m.userId),
        members: membersList,
        otherMember,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              conversationId: lastMsg.conversationId,
              senderId: lastMsg.senderId,
              message: lastMsg.message,
              fileUrl: lastMsg.fileUrl,
              fileName: lastMsg.fileName,
              isDeleted: lastMsg.isDeleted,
              createdAt: lastMsg.createdAt.toISOString(),
              updatedAt: lastMsg.updatedAt.toISOString(),
            }
          : null,
        lastMessageText: lastMsg ? (lastMsg.fileUrl ? "📷 Photo" : lastMsg.message) : "",
        lastMessageAt: lastMsg ? lastMsg.createdAt.toISOString() : conv.updatedAt.toISOString(),
        unreadCount: 0,
      };
    });
  },

  async getConversationById(convId: string, userId?: string): Promise<Conversation | null> {
    const conv = await db.conversation.findUnique({
      where: { id: convId },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!conv) return null;

    let otherMember = null;
    let title = conv.title || "Conversation";

    const membersList = conv.members.map((m) => {
      const uProf = m.user.profile;
      return {
        id: m.user.id,
        username: m.user.username,
        displayName: uProf?.displayName || m.user.fullName || m.user.username,
        mediaUrl: uProf?.mediaUrl || m.user.profileMediaUrl || null,
        role: m.user.role,
        headline: uProf?.headline || null,
      };
    });

    if (conv.type === "DIRECT" && userId) {
      const other = membersList.find((m) => m.id !== userId);
      if (other) {
        otherMember = other;
        title = other.displayName;
      }
    }

    return {
      id: conv.id,
      type: conv.type,
      title,
      projectId: conv.projectId,
      createdBy: conv.createdBy,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      participantIds: conv.members.map((m) => m.userId),
      members: membersList,
      otherMember,
    };
  },

  async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    const existing = await db.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: user1Id } } },
          { members: { some: { userId: user2Id } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (existing) {
      return this.getConversationById(existing.id, user1Id) as Promise<Conversation>;
    }

    const created = await db.conversation.create({
      data: {
        type: "DIRECT",
        members: {
          create: [
            { userId: user1Id },
            { userId: user2Id },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    return this.getConversationById(created.id, user1Id) as Promise<Conversation>;
  },

  async isConversationMember(conversationId: string, userId: string): Promise<boolean> {
    const member = await db.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: { id: true },
    });
    return !!member;
  },

  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string; after?: string }
  ): Promise<ChatMessage[]> {
    const limit = Math.min(Math.max(options?.limit || 50, 1), 100);
    const where: Prisma.MessageWhereInput = { conversationId };

    if (options?.after) {
      const afterDate = new Date(options.after);
      if (!isNaN(afterDate.getTime())) {
        where.createdAt = { gt: afterDate };
      }
    } else if (options?.before) {
      const beforeDate = new Date(options.before);
      if (!isNaN(beforeDate.getTime())) {
        where.createdAt = { lt: beforeDate };
      }
    }

    const list = await db.message.findMany({
      where,
      include: {
        sender: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
      take: options?.before ? limit : undefined,
    });

    return list.map((m) => {
      const senderProfile = m.sender.profile;
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        clientId: m.clientId || undefined,
        message: m.isDeleted ? "Message unsent" : m.message,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        isDeleted: m.isDeleted,
        replyToId: m.replyToId,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        sender: {
          id: m.sender.id,
          username: m.sender.username,
          displayName: senderProfile?.displayName || m.sender.fullName || m.sender.username,
          mediaUrl: senderProfile?.mediaUrl || m.sender.profileMediaUrl || null,
          role: m.sender.role,
        },
        reactions: [],
      };
    });
  },

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    message: string;
    clientId?: string;
    attachments?: ChatMessageAttachment[];
    fileUrl?: string;
    fileName?: string;
    replyToId?: string | null;
  }): Promise<ChatMessage> {
    // Idempotency check: If clientId was provided and already exists for this sender, return the existing message
    if (data.clientId) {
      const existing = await db.message.findFirst({
        where: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          clientId: data.clientId,
        },
        include: {
          sender: { include: { profile: true } },
        },
      });

      if (existing) {
        const senderProfile = existing.sender.profile;
        return {
          id: existing.id,
          conversationId: existing.conversationId,
          senderId: existing.senderId,
          clientId: existing.clientId || undefined,
          message: existing.message,
          fileUrl: existing.fileUrl,
          fileName: existing.fileName,
          isDeleted: existing.isDeleted,
          replyToId: existing.replyToId,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
          sender: {
            id: existing.sender.id,
            username: existing.sender.username,
            displayName: senderProfile?.displayName || existing.sender.fullName || existing.sender.username,
            mediaUrl: senderProfile?.mediaUrl || existing.sender.profileMediaUrl || null,
            role: existing.sender.role,
          },
          reactions: [],
        };
      }
    }

    const created = await db.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        clientId: data.clientId || null,
        message: data.message || "",
        fileUrl: data.fileUrl || (data.attachments && data.attachments[0] ? data.attachments[0].url : null),
        fileName: data.fileName || (data.attachments && data.attachments[0] ? data.attachments[0].name : null),
        replyToId: data.replyToId || null,
      },
      include: {
        sender: { include: { profile: true } },
      },
    });

    // Update conversation timestamp non-blockingly
    db.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    const senderProfile = created.sender.profile;
    return {
      id: created.id,
      conversationId: created.conversationId,
      senderId: created.senderId,
      clientId: created.clientId || undefined,
      message: created.message,
      fileUrl: created.fileUrl,
      fileName: created.fileName,
      isDeleted: created.isDeleted,
      replyToId: created.replyToId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      sender: {
        id: created.sender.id,
        username: created.sender.username,
        displayName: senderProfile?.displayName || created.sender.fullName || created.sender.username,
        mediaUrl: senderProfile?.mediaUrl || created.sender.profileMediaUrl || null,
        role: created.sender.role,
      },
      reactions: [],
    };
  },

  async editMessage(messageId: string, senderId: string, newMessage: string): Promise<ChatMessage | null> {
    const msg = await db.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== senderId || msg.isDeleted) return null;

    const updated = await db.message.update({
      where: { id: messageId },
      data: { message: newMessage.trim() },
      include: { sender: { include: { profile: true } } },
    });

    const senderProfile = updated.sender.profile;
    return {
      id: updated.id,
      conversationId: updated.conversationId,
      senderId: updated.senderId,
      message: updated.message,
      fileUrl: updated.fileUrl,
      fileName: updated.fileName,
      isDeleted: updated.isDeleted,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      sender: {
        id: updated.sender.id,
        username: updated.sender.username,
        displayName: senderProfile?.displayName || updated.sender.fullName || updated.sender.username,
        mediaUrl: senderProfile?.mediaUrl || updated.sender.profileMediaUrl || null,
        role: updated.sender.role,
      },
    };
  },

  async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    const msg = await db.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== senderId) return false;

    await db.message.update({
      where: { id: messageId },
      data: { isDeleted: true, message: "" },
    });
    return true;
  },

  async markConversationRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      await db.conversationMember.updateMany({
        where: { conversationId, userId },
        data: { lastReadAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  },

  async hideConversation(conversationId: string, userId: string): Promise<boolean> {
    return true;
  },

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<{ reactions: Array<{ emoji: string; count: number; userIds: string[]; userNames: string[] }> }> {
    return { reactions: [] };
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  async getNotifications(userId?: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const where: Prisma.NotificationWhereInput = {};
    if (userId) where.userId = userId;

    const list = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = list.filter((n) => !n.isRead).length;

    return {
      notifications: list.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  },

  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return true;
    } catch {
      return false;
    }
  },

  async markAllNotificationsRead(userId?: string): Promise<boolean> {
    try {
      const where: Prisma.NotificationWhereInput = {};
      if (userId) where.userId = userId;
      await db.notification.updateMany({
        where,
        data: { isRead: true },
      });
      return true;
    } catch {
      return false;
    }
  },

  // ── Media Assets & Gallery ────────────────────────────────────────────────
  async getMediaAssets(userId: string, mediaType: "AVATAR" | "PROJECT" | "POST" | string = "AVATAR"): Promise<MediaAsset[]> {
    const list = await db.mediaAsset.findMany({
      where: {
        userId,
        mediaType,
      },
      orderBy: { createdAt: "desc" },
    });

    return list.map((m) => ({
      id: m.id,
      ownerUserId: m.userId,
      mediaType: m.mediaType,
      sourceType: "SUPABASE_STORAGE",
      storagePath: m.storagePath,
      publicUrl: m.publicUrl,
      mimeType: m.mimeType,
      originalFilename: m.fileName,
      fileSize: m.fileSize,
      cropX: m.cropX,
      cropY: m.cropY,
      zoom: m.zoom,
      createdAt: m.createdAt.toISOString(),
    }));
  },

  async createMediaAsset(data: {
    ownerUserId: string;
    mediaType?: string;
    storageBucket?: string;
    sourceType?: string;
    storagePath?: string | null;
    publicUrl: string;
    mimeType?: string | null;
    originalFilename?: string | null;
    fileSize?: number | null;
    cropX?: number | null;
    cropY?: number | null;
    zoom?: number | null;
  }): Promise<MediaAsset> {
    const created = await db.mediaAsset.create({
      data: {
        userId: data.ownerUserId,
        mediaType: data.mediaType || "AVATAR",
        storagePath: data.storagePath || null,
        publicUrl: data.publicUrl,
        mimeType: data.mimeType || null,
        fileName: data.originalFilename || null,
        fileSize: data.fileSize || null,
        cropX: data.cropX ?? 0,
        cropY: data.cropY ?? 0,
        zoom: data.zoom ?? 1,
      },
    });

    return {
      id: created.id,
      ownerUserId: created.userId,
      mediaType: created.mediaType,
      sourceType: "SUPABASE_STORAGE",
      storagePath: created.storagePath,
      publicUrl: created.publicUrl,
      mimeType: created.mimeType,
      originalFilename: created.fileName,
      fileSize: created.fileSize,
      cropX: created.cropX,
      cropY: created.cropY,
      zoom: created.zoom,
      createdAt: created.createdAt.toISOString(),
    };
  },

  async deleteMediaAsset(id: string, userId: string): Promise<boolean> {
    try {
      await db.mediaAsset.deleteMany({
        where: { id, userId },
      });
      return true;
    } catch {
      return false;
    }
  },

  async updateProfileAvatar(
    userId: string,
    avatarData: {
      avatarSource?: string;
      avatarPath: string;
      avatarUrl?: string;
      avatarStoragePath?: string;
      avatarMimeType?: string;
      avatarZoom?: number;
      avatarPositionX?: number;
      avatarPositionY?: number;
    }
  ): Promise<Profile | null> {
    await db.user.update({
      where: { id: userId },
      data: {
        profileMediaUrl: avatarData.avatarPath,
        cropX: avatarData.avatarPositionX ?? 0,
        cropY: avatarData.avatarPositionY ?? 0,
        zoom: avatarData.avatarZoom ?? 1,
      },
    });

    await db.teamProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: "User",
        mediaUrl: avatarData.avatarPath,
        cropX: avatarData.avatarPositionX ?? 0,
        cropY: avatarData.avatarPositionY ?? 0,
        zoom: avatarData.avatarZoom ?? 1,
      },
      update: {
        mediaUrl: avatarData.avatarPath,
        cropX: avatarData.avatarPositionX ?? 0,
        cropY: avatarData.avatarPositionY ?? 0,
        zoom: avatarData.avatarZoom ?? 1,
      },
    });

    return this.getProfileById(userId);
  },

  // ── Activity Events ─────────────────────────────────────────────────────────
  async getActivityEvents(limit: number = 20): Promise<ActivityEvent[]> {
    const list = await db.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return list.map((ev) => ({
      id: ev.id,
      actorId: ev.actorId,
      actorName: ev.actorName,
      actorUsername: ev.actorUsername,
      actorMediaUrl: ev.actorMediaUrl,
      actionType: ev.actionType,
      targetType: ev.targetType,
      targetId: ev.targetId,
      title: ev.title,
      details: ev.details,
      link: ev.link,
      createdAt: ev.createdAt.toISOString(),
    }));
  },

  async createActivityEvent(data: Omit<ActivityEvent, "id" | "createdAt">): Promise<ActivityEvent> {
    const created = await db.activityEvent.create({
      data: {
        actorId: data.actorId,
        actorName: data.actorName,
        actorUsername: data.actorUsername,
        actorMediaUrl: data.actorMediaUrl || null,
        actionType: data.actionType,
        targetType: data.targetType,
        targetId: data.targetId || null,
        title: data.title,
        details: data.details || null,
        link: data.link || null,
      },
    });

    return {
      id: created.id,
      actorId: created.actorId,
      actorName: created.actorName,
      actorUsername: created.actorUsername,
      actorMediaUrl: created.actorMediaUrl,
      actionType: created.actionType,
      targetType: created.targetType,
      targetId: created.targetId,
      title: created.title,
      details: created.details,
      link: created.link,
      createdAt: created.createdAt.toISOString(),
    };
  },

  // ── Public Profile Data & Social Matrix ─────────────────────────────────────
  async getPublicProfileWithData(username: string): Promise<{
    profile: Profile | null;
    stats: { projectsCount: number; postsCount: number; collabCount: number };
    createdProjects: Project[];
    collabProjects: Project[];
    posts: Post[];
  } | null> {
    const profile = await this.getProfileByUsername(username);
    if (!profile) return null;

    const createdProjects = await db.project.findMany({
      where: { createdBy: profile.id, isDraft: false, isArchived: false },
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: true,
        links: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const collabProjects = await db.project.findMany({
      where: {
        collaborators: { some: { userId: profile.id } },
        isDraft: false,
        isArchived: false,
      },
      include: {
        creator: { include: { profile: true } },
        collaborators: { include: { user: { include: { profile: true } } } },
        media: true,
        links: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const posts = await db.post.findMany({
      where: { authorId: profile.id, isDeleted: false },
      include: {
        author: { include: { profile: true } },
        project: true,
        media: true,
        links: true,
        likes: true,
        comments: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      profile,
      stats: {
        projectsCount: createdProjects.length,
        postsCount: posts.length,
        collabCount: collabProjects.length,
      },
      createdProjects: createdProjects.map(mapProjectToProject),
      collabProjects: collabProjects.map(mapProjectToProject),
      posts: posts.map((p) => mapPostToPost(p)),
    };
  },

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  async getAuditLogs(): Promise<AuditLogItem[]> {
    const list = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return list.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      actorName: l.actorName,
      targetId: l.targetId,
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    }));
  },

  async logAudit(
    actionOrData: string | { action: string; actorId?: string; actorName?: string; targetId?: string; details?: string; ipAddress?: string; userAgent?: string },
    actorId?: string,
    details?: string,
    ipAddress?: string
  ): Promise<AuditLogItem> {
    if (typeof actionOrData === "object") {
      const created = await db.auditLog.create({
        data: {
          action: actionOrData.action,
          actorId: actionOrData.actorId || null,
          actorName: actionOrData.actorName || null,
          targetId: actionOrData.targetId || null,
          details: actionOrData.details || null,
          ipAddress: actionOrData.ipAddress || null,
          userAgent: actionOrData.userAgent || null,
        },
      });
      return {
        id: created.id,
        actorId: created.actorId,
        actorName: created.actorName,
        targetId: created.targetId,
        action: created.action,
        details: created.details,
        ipAddress: created.ipAddress,
        userAgent: created.userAgent,
        createdAt: created.createdAt.toISOString(),
      };
    }

    const created = await db.auditLog.create({
      data: {
        action: actionOrData,
        actorId: actorId || null,
        details: details || null,
        ipAddress: ipAddress || null,
      },
    });

    return {
      id: created.id,
      actorId: created.actorId,
      actorName: created.actorName,
      targetId: created.targetId,
      action: created.action,
      details: created.details,
      ipAddress: created.ipAddress,
      userAgent: created.userAgent,
      createdAt: created.createdAt.toISOString(),
    };
  },
};
