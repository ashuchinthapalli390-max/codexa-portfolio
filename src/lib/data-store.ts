/**
 * Universal Data Store for CodeXa Agency
 * Seamlessly abstracts Supabase PostgreSQL and local storage.
 * Provides rich type-safe data access for Profiles, Projects, Social Feed, Chat, Inquiries, Notifications, Audit Logs & Auth OTPs.
 */

import crypto from "crypto";
import { supabaseQuery, supabaseInsert, supabaseUpdate, supabaseDelete, isSupabaseConfigured } from "./supabase";

// ─── ENTITY INTERFACES ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  userId?: string | null;
  username: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  role: "OWNER" | "ADMIN" | "TEAM_MEMBER";
  memberType: "LEADERSHIP" | "CORE_TEAM";
  leadershipPosition?: "FOUNDER" | "CO_FOUNDER" | "CEO" | null;
  headline?: string;
  bio?: string;
  skills: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
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
  isActive: boolean;
  isPublic: boolean;
  displayOrder: number;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
}

export interface MediaAsset {
  id: string;
  ownerUserId: string;
  mediaType: "AVATAR" | "PROJECT" | "POST";
  sourceType: "STATIC" | "SUPABASE_STORAGE" | "LEGACY";
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  originalFilename?: string | null;
  fileSize?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  overview: string;
  problem?: string;
  solution?: string;
  features: string[];
  techStack: string[];
  category: "AI" | "Web" | "Mobile" | "Automation" | "Cybersecurity" | "Discord Bot" | "Full Stack" | "API" | "Other";
  status: "In Progress" | "Live" | "Archived" | "Client Work";
  thumbnailUrl: string;
  screenshots: string[];
  repoUrl?: string;
  liveUrl?: string;
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
    role: string;
  };
  collaboratorIds?: string[];
  collaborators?: Array<{
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role: string;
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
    role: string;
  };
  media?: Array<{
    id: string;
    mediaUrl: string;
    mediaType: string;
  }>;
  project?: {
    id: string;
    title: string;
    slug: string;
  } | null;
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
    role: string;
  };
  replies?: PostComment[];
}

export interface Inquiry {
  id: string;
  referenceId: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  projectType: string;
  budget: string;
  timeline?: string;
  message: string;
  attachmentUrl?: string;
  status: "NEW" | "CONTACTED" | "DISCUSSION" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedTo?: string | null;
  replyNotes?: string;
  convertedProjectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageAttachment {
  id: string;
  url: string;
  mimeType: string;
  name: string;
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

export interface ConversationMember {
  conversationId: string;
  userId: string;
  lastReadAt?: string;
  lastReadMessageId?: string;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  type: "DIRECT" | "GROUP" | "CHANNEL" | "PROJECT";
  title?: string;
  projectId?: string | null;
  createdBy?: string | null;
  participantIds?: string[];
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role: string;
    headline?: string;
  }>;
  otherMember?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role: string;
    headline?: string;
  } | null;
  lastMessage?: ChatMessage | null;
  lastMessageText?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  hiddenForUserIds?: string[];
  isMutedForUserIds?: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  attachments?: ChatMessageAttachment[];
  fileUrl?: string;
  fileName?: string;
  isDeleted: boolean;
  isEdited?: boolean;
  editedAt?: string;
  replyToId?: string | null;
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
  isSeen?: boolean;
  createdAt: string;
  updatedAt?: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    mediaUrl?: string | null;
    role?: string;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: "INQUIRY" | "CHAT" | "POST_LIKE" | "POST_COMMENT" | "PROJECT_FEATURED" | "PROJECT_ASSIGNED" | "SECURITY";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthOtpRecord {
  id: string;
  profileId: string;
  email: string;
  otpHash: string;
  purpose: "LOGIN" | "PASSWORD_RESET";
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

export interface AuditLogItem {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
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
    | "PROFILE_IMAGE_CHANGED" 
    | "POST_CREATED" 
    | "PROJECT_CREATED" 
    | "PROJECT_PUBLISHED" 
    | "MAIN_PROJECT_APPROVED" 
    | "COLLABORATOR_ADDED" 
    | "MEMBER_JOINED";
  targetType: "PROFILE" | "PROJECT" | "POST" | "MEMBER";
  targetId?: string;
  title: string;
  details?: string;
  link?: string;
  createdAt: string;
}

// ─── SEED DATA ───────────────────────────────────────────────────────────────

const g = globalThis as any;

let memoryProfiles: Profile[] = (g.__cxa_profiles = g.__cxa_profiles || [
  {
    id: "profile-ashu-001",
    username: process.env.INITIAL_OWNER_USERNAME || "ashu",
    email: process.env.INITIAL_OWNER_EMAIL || "ashuchinthapalli3900@gmail.com",
    displayName: process.env.INITIAL_OWNER_NAME || "Ashu",
    role: "OWNER",
    memberType: "LEADERSHIP",
    leadershipPosition: "FOUNDER",
    headline: "Founder & Lead Architect",
    bio: "Founding CodeXa Agency to engineer cinematic digital ecosystems, AI pipelines, and enterprise automation infrastructure.",
    skills: ["AI Pipelines", "Full Stack", "System Architecture", "Security", "Next.js", "Python"],
    githubUrl: "https://github.com/codexa-agency",
    linkedinUrl: "https://linkedin.com/company/codexa",
    portfolioUrl: "https://codexa.agency",
    mediaUrl: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
    isActive: true,
    isPublic: true,
    displayOrder: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    projectsCount: 2,
  },
  {
    id: "profile-deepak-002",
    username: "deepak",
    email: "deepak@codexa.agency",
    displayName: "Deepak",
    role: "ADMIN",
    memberType: "LEADERSHIP",
    leadershipPosition: "CO_FOUNDER",
    headline: "Co-Founder & UI/UX Director",
    bio: "Architecting interactive cyber interfaces, design systems, and modern full-stack web platforms.",
    skills: ["UI/UX Architecture", "React", "Framer Motion", "WebGL", "TypeScript", "TailwindCSS"],
    githubUrl: "https://github.com/codexa-agency",
    linkedinUrl: "https://linkedin.com/company/codexa",
    portfolioUrl: "https://codexa.agency",
    mediaUrl: "/assets/images/415b3c58f0cb648d08ca672322301c18.jpg",
    isActive: true,
    isPublic: true,
    displayOrder: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    projectsCount: 2,
  },
  {
    id: "profile-venu-003",
    username: "venu",
    email: "venu@codexa.agency",
    displayName: "Venu",
    role: "ADMIN",
    memberType: "LEADERSHIP",
    leadershipPosition: "CEO",
    headline: "Chief Executive Officer",
    bio: "Driving CodeXa's strategic expansion, engineering alliances, and client delivery operations.",
    skills: ["Executive Strategy", "Operations", "Product Management", "Client Relations"],
    githubUrl: "https://github.com/codexa-agency",
    linkedinUrl: "https://linkedin.com/company/codexa",
    mediaUrl: "/assets/images/2306fc1d8f6ea04d1ddd4ebfafd003f2.jpg",
    isActive: true,
    isPublic: true,
    displayOrder: 3,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    projectsCount: 1,
  },
  {
    id: "profile-aakash-004",
    username: "aakash",
    email: "aakash@codexa.agency",
    displayName: "Aakash Varma",
    role: "TEAM_MEMBER",
    memberType: "CORE_TEAM",
    headline: "Senior AI Systems Engineer",
    bio: "Specializing in Large Language Model fine-tuning, automated agents, and intelligent recruitment workflows.",
    skills: ["OpenAI", "FastAPI", "Python", "Vector Databases", "LangChain", "Next.js"],
    githubUrl: "https://github.com/aakashvarma",
    linkedinUrl: "https://linkedin.com/in/aakashvarma",
    mediaUrl: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
    isActive: true,
    isPublic: true,
    displayOrder: 4,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    projectsCount: 2,
  }
]);

let memoryProjects: Project[] = (g.__cxa_projects = g.__cxa_projects || [
  {
    id: "proj-hirelens-001",
    title: "HireLens AI",
    slug: "hirelens-ai",
    shortDesc: "Next-gen intelligent resume scoring, candidate evaluation and automated interview pipeline.",
    overview: "HireLens AI is an end-to-end recruitment intelligence platform designed to eliminate hiring bias and parse thousands of applicant resumes within milliseconds using fine-tuned LLM agents.",
    problem: "Traditional ATS systems rely on naive keyword matching, discarding top talent and creating significant screening bottlenecks.",
    solution: "Engineered a semantic parsing pipeline with multi-vector similarity scoring and automatic technical questionnaire generation.",
    features: [
      "Semantic resume parsing across 20+ file formats",
      "Automated coding challenge benchmark generation",
      "Real-time applicant ranking matrix",
      "Encrypted recruitment team collaboration rooms"
    ],
    techStack: ["Next.js", "FastAPI", "Python", "OpenAI", "PostgreSQL", "TailwindCSS"],
    category: "AI",
    status: "Live",
    thumbnailUrl: "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
    screenshots: [
      "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      "/assets/images/87e148db2c7ea1bfa1bf27976e107df4.jpg"
    ],
    repoUrl: "https://github.com/codexa-agency/hirelens-ai",
    liveUrl: "https://hirelens.codexa.agency",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    displayOrder: 1,
    createdBy: "profile-aakash-004",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "proj-nexus-cyber-002",
    title: "Nexus Cyber Sentinel",
    slug: "nexus-cyber-sentinel",
    shortDesc: "Autonomous cybersecurity vulnerability detection, real-time log ingestion, and penetration analysis.",
    overview: "Nexus Cyber Sentinel delivers 24/7 autonomous monitoring across cloud infrastructure, detecting unauthorized lateral movement and zero-day vulnerabilities.",
    problem: "Modern microservices produce millions of log events per second, overwhelming traditional security teams.",
    solution: "Implemented eBPF kernel event probes combined with anomaly detection models to isolate compromised containers automatically.",
    features: [
      "eBPF real-time kernel monitoring",
      "Automated IP isolation and firewall rule updates",
      "Interactive threat vector map",
      "Compliance audit report generator"
    ],
    techStack: ["Go", "eBPF", "React", "Rust", "TimescaleDB", "Docker"],
    category: "Cybersecurity",
    status: "Live",
    thumbnailUrl: "/assets/images/87e148db2c7ea1bfa1bf27976e107df4.jpg",
    screenshots: [
      "/assets/images/87e148db2c7ea1bfa1bf27976e107df4.jpg"
    ],
    repoUrl: "https://github.com/codexa-agency/nexus-cyber-sentinel",
    liveUrl: "https://nexus.codexa.agency",
    isDraft: false,
    isPublic: true,
    isFeatured: true,
    isMainProject: true,
    displayOrder: 2,
    createdBy: "profile-ashu-001",
    createdAt: "2026-02-05T00:00:00Z",
    updatedAt: "2026-02-05T00:00:00Z",
  }
]);

let memoryPosts: Post[] = (g.__cxa_posts = g.__cxa_posts || [
  {
    id: "post-001",
    authorId: "profile-ashu-001",
    content: "🚀 CodeXa Agency 2.0 is officially live! We've overhauled our entire client pipeline, deployed custom 2-stage verification, and upgraded our internal workspace. Let's build the future.",
    isAnnouncement: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    likesCount: 5,
    commentsCount: 2,
  },
  {
    id: "post-002",
    authorId: "profile-aakash-004",
    content: "Just finalized the new model evaluation metrics for HireLens AI. Reduced inference latency by 42% on complex multi-page PDF resumes! 🤖⚡",
    projectId: "proj-hirelens-001",
    isAnnouncement: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    likesCount: 3,
    commentsCount: 1,
  }
]);

let memoryLikes: Array<{ id: string; postId: string; profileId: string; createdAt: string }> = (g.__cxa_likes = g.__cxa_likes || [
  { id: "like-1", postId: "post-001", profileId: "profile-deepak-002", createdAt: "2026-02-21T10:00:00Z" },
  { id: "like-2", postId: "post-001", profileId: "profile-aakash-004", createdAt: "2026-02-21T10:05:00Z" },
]);

let memoryComments: PostComment[] = (g.__cxa_comments = g.__cxa_comments || [
  {
    id: "comm-001",
    postId: "post-001",
    profileId: "profile-deepak-002",
    content: "The cyber animations and lighting look incredible. Great job team!",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "comm-002",
    postId: "post-002",
    profileId: "profile-ashu-001",
    content: "Impressive latency improvements. Approved for production cluster deployment.",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  }
]);

let memoryInquiries: Inquiry[] = (g.__cxa_inquiries = g.__cxa_inquiries || [
  {
    id: "inq-001",
    referenceId: "CXA-2026-000101",
    fullName: "Elena Rostova",
    email: "elena@vortexfintech.io",
    phone: "+1 415 890 1234",
    company: "Vortex Financial",
    projectType: "fullstack",
    budget: "$15,000 - $30,000",
    timeline: "2 - 3 Months",
    message: "We need an algorithmic trading analytics console with sub-millisecond WebSocket data visualization, biometric authentication, and custom risk management models.",
    status: "NEW",
    priority: "HIGH",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
]);

let memoryConversations: Conversation[] = (g.__cxa_conversations = g.__cxa_conversations || [
  {
    id: "conv-general-001",
    type: "GROUP",
    title: "CodeXa General",
    participantIds: ["profile-ashu-001", "profile-deepak-002", "profile-venu-003", "profile-aakash-004", "profile-karan-005", "profile-sathwik-006"],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }
]);

let memoryMessages: ChatMessage[] = (g.__cxa_messages = g.__cxa_messages || [
  {
    id: "msg-001",
    conversationId: "conv-general-001",
    senderId: "profile-ashu-001",
    message: "Welcome to CodeXa Agency internal comms! All client inquiries, project reviews, and team discussions happen here.",
    isDeleted: false,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  }
]);

let memoryReactions: ChatMessageReaction[] = (g.__cxa_reactions = g.__cxa_reactions || []);
let memoryConversationMembers: ConversationMember[] = (g.__cxa_conversationMembers = g.__cxa_conversationMembers || []);

let memoryNotifications: NotificationItem[] = (g.__cxa_notifications = g.__cxa_notifications || [
  {
    id: "notif-001",
    userId: "profile-ashu-001",
    type: "INQUIRY",
    title: "New Client Application",
    message: "Elena Rostova submitted a $15k+ project inquiry [CXA-2026-000101].",
    link: "/owner",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
]);

let memoryAuthOtps: AuthOtpRecord[] = (g.__cxa_authOtps = g.__cxa_authOtps || []);
let memoryMediaAssets: MediaAsset[] = (g.__cxa_mediaAssets = g.__cxa_mediaAssets || []);

let memorySiteSettings: SiteSettings = (g.__cxa_siteSettings = g.__cxa_siteSettings || {
  mainProjectsHomeVisible: true,
  teamProjectsHomeVisible: true,
  updatedAt: new Date().toISOString(),
});

let memoryAuditLogs: AuditLogItem[] = (g.__cxa_auditLogs = g.__cxa_auditLogs || [
  {
    id: "log-001",
    actorId: "profile-ashu-001",
    actorName: "Ashu",
    action: "SYSTEM_INITIALIZED",
    details: "CodeXa multi-tier agency platform initialized with zero-dummy architecture.",
    ipAddress: "127.0.0.1",
    createdAt: "2026-01-01T00:00:00Z",
  }
]);

let memoryActivityEvents: ActivityEvent[] = (g.__cxa_activityEvents = g.__cxa_activityEvents || [
  {
    id: "act-001",
    actorId: "profile-ashu-001",
    actorName: "Ashu",
    actorUsername: "ashu",
    actorMediaUrl: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
    actionType: "PROJECT_PUBLISHED",
    targetType: "PROJECT",
    targetId: "proj-hirelens-001",
    title: "Ashu published HireLens AI",
    details: "Autonomous AI Interview & Technical Assessment Agent",
    link: "/projects/hirelens-ai",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "act-002",
    actorId: "profile-deepak-002",
    actorName: "Deepak",
    actorUsername: "deepak",
    actorMediaUrl: "/assets/images/415b3c58f0cb648d08ca672322301c18.jpg",
    actionType: "POST_CREATED",
    targetType: "POST",
    targetId: "post-001",
    title: "Deepak shared a development update",
    details: "Shipped the ultra-low latency WebSocket chat infrastructure.",
    link: "/dashboard",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "act-003",
    actorId: "profile-ashu-001",
    actorName: "Ashu",
    actorUsername: "ashu",
    actorMediaUrl: "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg",
    actionType: "PROFILE_UPDATED",
    targetType: "PROFILE",
    targetId: "profile-ashu-001",
    title: "Ashu updated his profile",
    details: "Added AI Pipelines & System Architecture competencies.",
    link: "/team/ashu",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "act-004",
    actorId: "profile-venu-003",
    actorName: "Venu",
    actorUsername: "venu",
    actorMediaUrl: "/assets/images/2306fc1d8f6ea04d1ddd4ebfafd003f2.jpg",
    actionType: "MAIN_PROJECT_APPROVED",
    targetType: "PROJECT",
    targetId: "proj-hirelens-001",
    title: "CEO added HireLens AI to Main Projects",
    details: "Approved for public portfolio spotlight.",
    link: "/projects/hirelens-ai",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
]);

// ─── DATA STORE METHODS ──────────────────────────────────────────────────────

export const dataStore = {
  // ── Profiles ───────────────────────────────────────────────────────────────
  async getProfiles(filter?: { role?: string; isPublic?: boolean }): Promise<Profile[]> {
    let list = memoryProfiles.filter((p) => p.isActive);
    if (filter?.role) list = list.filter((p) => p.role === filter.role);
    if (filter?.isPublic !== undefined) list = list.filter((p) => p.isPublic === filter.isPublic);

    return list.map((p) => ({
      ...p,
      projectsCount: memoryProjects.filter((proj) => proj.createdBy === p.id && !proj.isDraft).length,
    }));
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const p = memoryProfiles.find((x) => x.username.toLowerCase() === username.toLowerCase());
    if (!p) return null;
    return {
      ...p,
      projectsCount: memoryProjects.filter((proj) => proj.createdBy === p.id && !proj.isDraft).length,
    };
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const p = memoryProfiles.find((x) => x.id === id);
    if (!p) return null;
    return {
      ...p,
      projectsCount: memoryProjects.filter((proj) => proj.createdBy === p.id && !proj.isDraft).length,
    };
  },

  async getProfileByEmailOrUsername(identifier: string): Promise<Profile | null> {
    const clean = identifier.trim().toLowerCase();
    const p = memoryProfiles.find((x) =>
      x.email.toLowerCase() === clean ||
      x.username.toLowerCase() === clean ||
      (x.role === "OWNER" && (clean === "ashu" || clean === "ashu@codexa.agency" || clean === (process.env.INITIAL_OWNER_EMAIL || "").toLowerCase()))
    );
    return p || null;
  },

  async createProfile(data: Partial<Profile>): Promise<Profile> {
    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      username: data.username!.toLowerCase(),
      email: data.email!.toLowerCase(),
      displayName: data.displayName || data.username!,
      role: data.role || "TEAM_MEMBER",
      memberType: data.role === "OWNER" || data.role === "ADMIN" ? "LEADERSHIP" : "CORE_TEAM",
      headline: data.headline || "CodeXa Engineer",
      bio: data.bio || "",
      skills: data.skills || ["Full Stack", "TypeScript"],
      isActive: true,
      isPublic: true,
      displayOrder: memoryProfiles.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryProfiles.push(newProfile);
    return newProfile;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const idx = memoryProfiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    memoryProfiles[idx] = { ...memoryProfiles[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryProfiles[idx];
  },

  async deleteProfile(id: string): Promise<boolean> {
    const initialLen = memoryProfiles.length;
    memoryProfiles = memoryProfiles.filter((p) => p.id !== id);
    return memoryProfiles.length < initialLen;
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  async getProjects(filter?: { publicOnly?: boolean; isMain?: boolean; developerId?: string }): Promise<Project[]> {
    let list = [...memoryProjects];
    if (filter?.publicOnly) list = list.filter((p) => p.isPublic && !p.isDraft);
    if (filter?.isMain !== undefined) list = list.filter((p) => p.isMainProject === filter.isMain);
    if (filter?.developerId) list = list.filter((p) => p.createdBy === filter.developerId);

    return list.map((p) => {
      const creator = memoryProfiles.find((m) => m.id === p.createdBy);
      return {
        ...p,
        creator: creator ? { id: creator.id, username: creator.username, displayName: creator.displayName, mediaUrl: creator.mediaUrl, role: creator.role } : undefined,
      };
    });
  },

  async getProjectBySlug(slug: string): Promise<Project | null> {
    const p = memoryProjects.find((x) => x.slug === slug);
    if (!p) return null;
    const creator = memoryProfiles.find((m) => m.id === p.createdBy);
    return {
      ...p,
      creator: creator ? { id: creator.id, username: creator.username, displayName: creator.displayName, mediaUrl: creator.mediaUrl, role: creator.role } : undefined,
    };
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    const slug = data.slug || data.title!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const collaboratorIds = data.collaboratorIds || [];
    const collaborators = collaboratorIds.map((cid) => {
      const mem = memoryProfiles.find((p) => p.id === cid || p.username === cid);
      return mem ? { id: mem.id, username: mem.username, displayName: mem.displayName, mediaUrl: mem.mediaUrl, role: mem.role } : null;
    }).filter(Boolean) as any[];

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: data.title!,
      slug,
      shortDesc: data.shortDesc || "",
      overview: data.overview || data.shortDesc || "",
      problem: data.problem,
      solution: data.solution,
      features: data.features || [],
      techStack: data.techStack || [],
      category: data.category || "Web",
      status: data.status || "Live",
      thumbnailUrl: data.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg",
      screenshots: data.screenshots || [],
      repoUrl: data.repoUrl,
      liveUrl: data.liveUrl,
      isDraft: !!data.isDraft,
      isPublic: data.isPublic ?? !data.isDraft,
      isFeatured: !!data.isFeatured,
      isMainProject: !!data.isMainProject,
      isHomepageVisible: data.isHomepageVisible ?? true,
      showInTeamProjects: data.showInTeamProjects ?? true,
      displayOrder: memoryProjects.length + 1,
      createdBy: data.createdBy || "profile-ashu-001",
      collaboratorIds,
      collaborators,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryProjects.unshift(newProj);
    return newProj;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const idx = memoryProjects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    memoryProjects[idx] = { ...memoryProjects[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryProjects[idx];
  },

  async deleteProject(id: string): Promise<boolean> {
    const initialLen = memoryProjects.length;
    memoryProjects = memoryProjects.filter((p) => p.id !== id);
    return memoryProjects.length < initialLen;
  },

  // ── Social Feed (Posts, Likes, Comments) ──────────────────────────────────
  async getPosts(currentUserId?: string): Promise<Post[]> {
    return memoryPosts.map((post) => {
      const author = memoryProfiles.find((p) => p.id === post.authorId);
      const project = post.projectId ? memoryProjects.find((p) => p.id === post.projectId) : null;
      const likesCount = memoryLikes.filter((l) => l.postId === post.id).length;
      const commentsCount = memoryComments.filter((c) => c.postId === post.id).length;
      const hasLiked = currentUserId ? memoryLikes.some((l) => l.postId === post.id && l.profileId === currentUserId) : false;

      return {
        ...post,
        author: author ? { id: author.id, username: author.username, displayName: author.displayName, mediaUrl: author.mediaUrl, role: author.role } : undefined,
        project: project ? { id: project.id, title: project.title, slug: project.slug } : null,
        likesCount,
        commentsCount,
        hasLiked,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createPost(data: { authorId: string; content: string; projectId?: string; isAnnouncement?: boolean }): Promise<Post> {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: data.authorId,
      content: data.content,
      projectId: data.projectId,
      isAnnouncement: !!data.isAnnouncement,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      hasLiked: false,
    };
    memoryPosts.unshift(newPost);
    return newPost;
  },

  async deletePost(id: string, userId?: string): Promise<boolean> {
    const idx = memoryPosts.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    memoryPosts.splice(idx, 1);
    memoryLikes = memoryLikes.filter((l) => l.postId !== id);
    memoryComments = memoryComments.filter((c) => c.postId !== id);
    return true;
  },

  async togglePostLike(postId: string, profileId: string): Promise<{ liked: boolean; totalLikes: number }> {
    const existingIndex = memoryLikes.findIndex((l) => l.postId === postId && l.profileId === profileId);
    let liked = false;
    if (existingIndex > -1) {
      memoryLikes.splice(existingIndex, 1);
      liked = false;
    } else {
      memoryLikes.push({
        id: `like-${Date.now()}`,
        postId,
        profileId,
        createdAt: new Date().toISOString(),
      });
      liked = true;
    }
    const totalLikes = memoryLikes.filter((l) => l.postId === postId).length;
    return { liked, totalLikes };
  },

  async getPostComments(postId: string): Promise<PostComment[]> {
    const comments = memoryComments.filter((c) => c.postId === postId);
    return comments.map((c) => {
      const author = memoryProfiles.find((p) => p.id === c.profileId);
      return {
        ...c,
        author: author ? { id: author.id, username: author.username, displayName: author.displayName, mediaUrl: author.mediaUrl, role: author.role } : undefined,
      };
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async createPostComment(data: { postId: string; profileId: string; content: string; parentCommentId?: string }): Promise<PostComment> {
    const newComment: PostComment = {
      id: `comm-${Date.now()}`,
      postId: data.postId,
      profileId: data.profileId,
      parentCommentId: data.parentCommentId,
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryComments.push(newComment);
    const author = memoryProfiles.find((p) => p.id === data.profileId);
    return {
      ...newComment,
      author: author ? { id: author.id, username: author.username, displayName: author.displayName, mediaUrl: author.mediaUrl, role: author.role } : undefined,
    };
  },

  async deletePostComment(commentId: string, profileId: string): Promise<boolean> {
    const idx = memoryComments.findIndex((c) => c.id === commentId && (c.profileId === profileId || memoryProfiles.find((p) => p.id === profileId)?.role === "OWNER"));
    if (idx === -1) return false;
    memoryComments.splice(idx, 1);
    return true;
  },

  // ── 2-Stage OTP Verification ───────────────────────────────────────────────
  async createOtp(email: string, profileId: string, purpose: "LOGIN" | "PASSWORD_RESET" = "LOGIN"): Promise<string> {
    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins

    // Invalidate previous unused OTPs for this email/purpose
    memoryAuthOtps = memoryAuthOtps.filter((o) => !(o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose && !o.isUsed));

    memoryAuthOtps.push({
      id: `otp-${Date.now()}`,
      profileId,
      email: email.toLowerCase(),
      otpHash,
      purpose,
      attempts: 0,
      isUsed: false,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return otp;
  },

  async verifyOtp(email: string, otp: string, purpose: "LOGIN" | "PASSWORD_RESET" = "LOGIN"): Promise<{ valid: boolean; profile?: Profile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const otpHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    const record = memoryAuthOtps.find(
      (o) => o.email === cleanEmail && o.purpose === purpose && !o.isUsed
    );

    if (!record) {
      return { valid: false, error: "No active verification code found. Please request a new one." };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      record.isUsed = true;
      return { valid: false, error: "Verification code has expired. Please request a new code." };
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      record.isUsed = true;
      return { valid: false, error: "Too many failed attempts. Code invalidated." };
    }

    if (record.otpHash !== otpHash) {
      return { valid: false, error: "Invalid verification code. Please check and try again." };
    }

    // Success -> Mark used
    record.isUsed = true;
    const profile = memoryProfiles.find((p) => p.id === record.profileId);
    return { valid: true, profile };
  },

  // ── Site Settings ──────────────────────────────────────────────────────────
  async getSiteSettings(): Promise<SiteSettings> {
    return memorySiteSettings;
  },

  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    memorySiteSettings = {
      ...memorySiteSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    return memorySiteSettings;
  },

  // ── Inquiries ──────────────────────────────────────────────────────────────
  async getInquiries(filters?: { status?: string | null; priority?: string | null; search?: string | null }): Promise<Inquiry[]> {
    let list = [...memoryInquiries];
    if (filters?.status && filters.status !== "ALL") {
      list = list.filter((i) => i.status === filters.status);
    }
    if (filters?.priority && filters.priority !== "ALL") {
      list = list.filter((i) => i.priority === filters.priority);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((i) =>
        i.fullName.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.referenceId.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createInquiry(data: Partial<Inquiry>): Promise<Inquiry> {
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const referenceId = `CXA-${yearMonth}-${randomHex}`;

    const newInq: Inquiry = {
      id: `inq-${Date.now()}`,
      referenceId,
      fullName: data.fullName!,
      email: data.email!,
      phone: data.phone,
      company: data.company,
      projectType: data.projectType || "web-dev",
      budget: data.budget || "$1,000 - $5,000",
      timeline: data.timeline || "1 - 2 Months",
      message: data.message!,
      status: "NEW",
      priority: "MEDIUM",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryInquiries.unshift(newInq);
    return newInq;
  },

  async updateInquiry(id: string, updates: Partial<Inquiry>): Promise<Inquiry | null> {
    const idx = memoryInquiries.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    memoryInquiries[idx] = { ...memoryInquiries[idx], ...updates, updatedAt: new Date().toISOString() };
    return memoryInquiries[idx];
  },

  // ── Chat & Direct Messaging ────────────────────────────────────────────────
  async getConversations(userId?: string): Promise<Conversation[]> {
    const list = memoryConversations.filter((conv) => {
      if (userId && conv.hiddenForUserIds?.includes(userId)) return false;
      if (conv.type !== "DIRECT") return true;
      if (!userId) return true;
      return (
        conv.participantIds?.includes(userId) ||
        conv.members?.some((m) => m.id === userId || m.username === userId)
      );
    });

    return list
      .map((conv) => {
        const messages = memoryMessages.filter((m) => m.conversationId === conv.id);
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

        let otherMember = null;
        let title = conv.title || "Conversation";

        if (conv.type === "DIRECT" && userId) {
          const otherId = conv.participantIds?.find((id) => id !== userId);
          otherMember = otherId
            ? memoryProfiles.find((p) => p.id === otherId || p.username === otherId) || null
            : conv.members?.find((m) => m.id !== userId) || null;
          if (otherMember) {
            title = otherMember.displayName;
          }
        }

        // Calculate unread count for this user
        let unreadCount = 0;
        if (userId) {
          const memberRecord = memoryConversationMembers.find(
            (m) => m.conversationId === conv.id && m.userId === userId
          );
          const lastReadTime = memberRecord?.lastReadAt ? new Date(memberRecord.lastReadAt).getTime() : 0;
          unreadCount = messages.filter(
            (m) => !m.isDeleted && m.senderId !== userId && new Date(m.createdAt).getTime() > lastReadTime
          ).length;
        }

        return {
          ...conv,
          title,
          otherMember,
          unreadCount,
          lastMessage: lastMessage ? {
            ...lastMessage,
            sender: memoryProfiles.find((p) => p.id === lastMessage.senderId),
          } : null,
          lastMessageText: lastMessage?.isDeleted ? "Message unsent" : lastMessage?.message || (lastMessage?.attachments && lastMessage.attachments.length > 0 ? "📷 Photo" : undefined),
          lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
        };
      })
      .sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || a.updatedAt).getTime();
        const timeB = new Date(b.lastMessageAt || b.updatedAt).getTime();
        return timeB - timeA;
      });
  },

  async getConversationById(convId: string, userId?: string): Promise<Conversation | null> {
    const conv = memoryConversations.find((c) => c.id === convId);
    if (!conv) return null;

    let otherMember = null;
    let title = conv.title || "Conversation";

    if (conv.type === "DIRECT" && userId) {
      const otherId = conv.participantIds?.find((id) => id !== userId);
      otherMember = otherId
        ? memoryProfiles.find((p) => p.id === otherId || p.username === otherId) || null
        : conv.members?.find((m) => m.id !== userId) || null;
      if (otherMember) {
        title = otherMember.displayName;
      }
    }

    return {
      ...conv,
      title,
      otherMember,
    };
  },

  async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    const u1 = memoryProfiles.find((p) => p.id === user1Id || p.username === user1Id);
    const u2 = memoryProfiles.find((p) => p.id === user2Id || p.username === user2Id);

    const id1 = u1?.id || user1Id;
    const id2 = u2?.id || user2Id;

    // Check if direct conversation already exists between these 2 users (canonical key match)
    const existing = memoryConversations.find(
      (c) =>
        c.type === "DIRECT" &&
        c.participantIds &&
        c.participantIds.includes(id1) &&
        c.participantIds.includes(id2)
    );

    if (existing) {
      const other = id1 === user1Id ? u2 : u1;
      return {
        ...existing,
        title: other?.displayName || existing.title,
        otherMember: other ? { id: other.id, username: other.username, displayName: other.displayName, mediaUrl: other.mediaUrl, role: other.role, headline: other.headline } : null,
      };
    }

    const sortedIds = [id1, id2].sort();
    const newConv: Conversation = {
      id: `conv-direct-${sortedIds[0]}-${sortedIds[1]}`,
      type: "DIRECT",
      title: u2?.displayName || "Direct Message",
      participantIds: [id1, id2],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        u1 ? { id: u1.id, username: u1.username, displayName: u1.displayName, mediaUrl: u1.mediaUrl, role: u1.role, headline: u1.headline } : ({} as any),
        u2 ? { id: u2.id, username: u2.username, displayName: u2.displayName, mediaUrl: u2.mediaUrl, role: u2.role, headline: u2.headline } : ({} as any),
      ],
      otherMember: u2 ? { id: u2.id, username: u2.username, displayName: u2.displayName, mediaUrl: u2.mediaUrl, role: u2.role, headline: u2.headline } : null,
    };

    memoryConversations.unshift(newConv);
    return newConv;
  },

  async getMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    const msgs = memoryMessages.filter((m) => m.conversationId === conversationId);

    return msgs
      .map((m) => {
        const sender = memoryProfiles.find((p) => p.id === m.senderId);
        let replyTo = null;
        if (m.replyToId) {
          const orig = memoryMessages.find((origMsg) => origMsg.id === m.replyToId);
          if (orig) {
            const origSender = memoryProfiles.find((p) => p.id === orig.senderId);
            replyTo = {
              id: orig.id,
              message: orig.isDeleted ? "Message unsent" : orig.message,
              senderName: origSender?.displayName || "Member",
            };
          }
        }

        // Aggregate reactions
        const msgReactions = memoryReactions.filter((r) => r.messageId === m.id);
        const reactionMap = new Map<string, { count: number; userIds: string[]; userNames: string[] }>();
        msgReactions.forEach((r) => {
          if (!reactionMap.has(r.emoji)) {
            reactionMap.set(r.emoji, { count: 0, userIds: [], userNames: [] });
          }
          const item = reactionMap.get(r.emoji)!;
          item.count += 1;
          item.userIds.push(r.userId);
          item.userNames.push(r.userName);
        });

        const reactions = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          userIds: data.userIds,
          userNames: data.userNames,
        }));

        const userReactions = msgReactions
          .filter((r) => !userId || r.userId === userId)
          .map((r) => ({ userId: r.userId, emoji: r.emoji }));

        // Calculate read status (Seen)
        let isSeen = false;
        if (userId && m.senderId === userId) {
          const conv = memoryConversations.find((c) => c.id === conversationId);
          if (conv && conv.type === "DIRECT") {
            const otherParticipantId = conv.participantIds?.find((id) => id !== userId);
            if (otherParticipantId) {
              const otherMemberRecord = memoryConversationMembers.find(
                (rec) => rec.conversationId === conversationId && rec.userId === otherParticipantId
              );
              if (otherMemberRecord?.lastReadAt) {
                isSeen = new Date(otherMemberRecord.lastReadAt).getTime() >= new Date(m.createdAt).getTime();
              }
            }
          }
        }

        return {
          ...m,
          sender,
          replyTo,
          reactions,
          userReactions,
          isSeen,
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    message: string;
    attachments?: ChatMessageAttachment[];
    fileUrl?: string;
    fileName?: string;
    replyToId?: string | null;
  }): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: data.conversationId,
      senderId: data.senderId,
      message: data.message || "",
      attachments: data.attachments || (data.fileUrl ? [{ id: `att-${Date.now()}`, url: data.fileUrl, name: data.fileName || "Image", mimeType: "image/jpeg" }] : []),
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      replyToId: data.replyToId || null,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryMessages.push(newMsg);

    // Update conversation timestamp
    const convIdx = memoryConversations.findIndex((c) => c.id === data.conversationId);
    if (convIdx !== -1) {
      memoryConversations[convIdx].updatedAt = new Date().toISOString();
      memoryConversations[convIdx].lastMessageText = data.message || (newMsg.attachments && newMsg.attachments.length > 0 ? "📷 Photo" : "");
      memoryConversations[convIdx].lastMessageAt = newMsg.createdAt;
    }

    const sender = memoryProfiles.find((p) => p.id === data.senderId);

    // Create notification for other participant if direct conversation
    if (convIdx !== -1 && memoryConversations[convIdx].type === "DIRECT") {
      const recipientId = memoryConversations[convIdx].participantIds?.find((id) => id !== data.senderId);
      if (recipientId) {
        memoryNotifications.unshift({
          id: `notif-${Date.now()}`,
          userId: recipientId,
          type: "CHAT",
          title: `New message from ${sender?.displayName || "Teammate"}`,
          message: data.message ? (data.message.length > 60 ? `${data.message.slice(0, 60)}...` : data.message) : "Sent a photo",
          link: `/dashboard/messages?conversation=${data.conversationId}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return { ...newMsg, sender, reactions: [] };
  },

  async editMessage(messageId: string, senderId: string, newMessage: string): Promise<ChatMessage | null> {
    const msg = memoryMessages.find((m) => m.id === messageId);
    if (!msg || msg.isDeleted) return null;

    const sender = memoryProfiles.find((p) => p.id === senderId || p.username === senderId);
    const isSender = msg.senderId === senderId || (sender && msg.senderId === sender.id);
    if (!isSender) return null;

    msg.message = newMessage.trim();
    msg.isEdited = true;
    msg.editedAt = new Date().toISOString();
    msg.updatedAt = new Date().toISOString();

    const senderProfile = memoryProfiles.find((p) => p.id === msg.senderId);
    return { ...msg, sender: senderProfile };
  },

  async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    const msg = memoryMessages.find((m) => m.id === messageId);
    if (!msg) return false;

    const sender = memoryProfiles.find((p) => p.id === senderId || p.username === senderId);
    const isSender = msg.senderId === senderId || (sender && msg.senderId === sender.id);
    if (!isSender) return false;

    msg.isDeleted = true;
    msg.message = "";
    msg.updatedAt = new Date().toISOString();
    return true;
  },

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<{ reactions: Array<{ emoji: string; count: number; userIds: string[]; userNames: string[] }> }> {
    const user = memoryProfiles.find((p) => p.id === userId);
    const userName = user?.displayName || "Member";

    const existingIdx = memoryReactions.findIndex((r) => r.messageId === messageId && r.userId === userId);
    if (existingIdx !== -1) {
      if (memoryReactions[existingIdx].emoji === emoji) {
        // Remove reaction
        memoryReactions.splice(existingIdx, 1);
      } else {
        // Change reaction emoji
        memoryReactions[existingIdx].emoji = emoji;
        memoryReactions[existingIdx].userName = userName;
      }
    } else {
      // Add new reaction
      memoryReactions.push({
        id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        messageId,
        userId,
        userName,
        emoji,
        createdAt: new Date().toISOString(),
      });
    }

    // Return aggregated reactions for this message
    const msgReactions = memoryReactions.filter((r) => r.messageId === messageId);
    const reactionMap = new Map<string, { count: number; userIds: string[]; userNames: string[] }>();
    msgReactions.forEach((r) => {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, { count: 0, userIds: [], userNames: [] });
      }
      const item = reactionMap.get(r.emoji)!;
      item.count += 1;
      item.userIds.push(r.userId);
      item.userNames.push(r.userName);
    });

    const reactions = Array.from(reactionMap.entries()).map(([em, data]) => ({
      emoji: em,
      count: data.count,
      userIds: data.userIds,
      userNames: data.userNames,
    }));

    return { reactions };
  },

  async markConversationRead(conversationId: string, userId: string): Promise<boolean> {
    const existingIdx = memoryConversationMembers.findIndex(
      (m) => m.conversationId === conversationId && m.userId === userId
    );

    const now = new Date().toISOString();
    if (existingIdx !== -1) {
      memoryConversationMembers[existingIdx].lastReadAt = now;
    } else {
      memoryConversationMembers.push({
        conversationId,
        userId,
        lastReadAt: now,
        joinedAt: now,
      });
    }
    return true;
  },

  async hideConversation(conversationId: string, userId: string): Promise<boolean> {
    const conv = memoryConversations.find((c) => c.id === conversationId);
    if (!conv) return false;
    if (!conv.hiddenForUserIds) conv.hiddenForUserIds = [];
    if (!conv.hiddenForUserIds.includes(userId)) {
      conv.hiddenForUserIds.push(userId);
    }
    return true;
  },

  async toggleMuteConversation(conversationId: string, userId: string): Promise<{ isMuted: boolean }> {
    const conv = memoryConversations.find((c) => c.id === conversationId);
    if (!conv) return { isMuted: false };
    if (!conv.isMutedForUserIds) conv.isMutedForUserIds = [];
    const idx = conv.isMutedForUserIds.indexOf(userId);
    if (idx !== -1) {
      conv.isMutedForUserIds.splice(idx, 1);
      return { isMuted: false };
    } else {
      conv.isMutedForUserIds.push(userId);
      return { isMuted: true };
    }
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  async getNotifications(userId?: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const list = memoryNotifications.filter((n) => !userId || n.userId === userId);
    const unreadCount = list.filter((n) => !n.isRead).length;
    return { notifications: list, unreadCount };
  },

  async markNotificationRead(notificationId: string): Promise<boolean> {
    const idx = memoryNotifications.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      memoryNotifications[idx].isRead = true;
      return true;
    }
    return false;
  },

  async markNotificationsRead(userId?: string): Promise<boolean> {
    memoryNotifications = memoryNotifications.map((n) => (!userId || n.userId === userId ? { ...n, isRead: true } : n));
    return true;
  },

  async markAllNotificationsRead(userId?: string): Promise<boolean> {
    memoryNotifications = memoryNotifications.map((n) => (!userId || n.userId === userId ? { ...n, isRead: true } : n));
    return true;
  },

  // ── Media Assets & Gallery ────────────────────────────────────────────────
  async getMediaAssets(userId: string, mediaType: "AVATAR" | "PROJECT" | "POST" = "AVATAR"): Promise<MediaAsset[]> {
    if (isSupabaseConfigured()) {
      const { data } = await supabaseQuery<MediaAsset>(
        "media_assets",
        `owner_user_id=eq.${userId}&media_type=eq.${mediaType}&order=created_at.desc`
      );
      if (data && data.length > 0) return data;
    }
    return memoryMediaAssets
      .filter((m) => m.ownerUserId === userId && m.mediaType === mediaType)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createMediaAsset(data: Omit<MediaAsset, "id" | "createdAt" | "updatedAt">): Promise<MediaAsset> {
    const newAsset: MediaAsset = {
      id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data: inserted } = await supabaseInsert<MediaAsset>("media_assets", {
        owner_user_id: data.ownerUserId,
        media_type: data.mediaType,
        source_type: data.sourceType,
        storage_bucket: data.storageBucket,
        storage_path: data.storagePath,
        public_url: data.publicUrl,
        mime_type: data.mimeType,
        original_filename: data.originalFilename,
        file_size: data.fileSize,
      });
      if (inserted && inserted[0]) return inserted[0];
    }

    memoryMediaAssets.unshift(newAsset);
    return newAsset;
  },

  async deleteMediaAsset(id: string, userId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      await supabaseDelete("media_assets", `id=eq.${id}&owner_user_id=eq.${userId}`);
    }
    const initialLen = memoryMediaAssets.length;
    memoryMediaAssets = memoryMediaAssets.filter((m) => !(m.id === id && m.ownerUserId === userId));
    return memoryMediaAssets.length < initialLen;
  },

  async updateProfileAvatar(
    userId: string,
    avatarData: {
      avatarSource: "STATIC" | "SUPABASE_STORAGE" | "LEGACY";
      avatarPath: string;
      avatarUrl?: string;
      avatarStoragePath?: string;
      avatarMimeType?: string;
      avatarZoom?: number;
      avatarPositionX?: number;
      avatarPositionY?: number;
    }
  ): Promise<Profile | null> {
    const updatedAt = new Date().toISOString();
    const patchPayload = {
      mediaUrl: avatarData.avatarPath,
      avatarSource: avatarData.avatarSource,
      avatarPath: avatarData.avatarPath,
      avatarUrl: avatarData.avatarUrl || avatarData.avatarPath,
      avatarStoragePath: avatarData.avatarStoragePath || null,
      avatarMimeType: avatarData.avatarMimeType || "image/jpeg",
      avatarZoom: avatarData.avatarZoom ?? 1,
      avatarPositionX: avatarData.avatarPositionX ?? 50,
      avatarPositionY: avatarData.avatarPositionY ?? 50,
      cropZoom: avatarData.avatarZoom ?? 1,
      cropX: avatarData.avatarPositionX ?? 50,
      cropY: avatarData.avatarPositionY ?? 50,
      avatarUpdatedAt: updatedAt,
      updatedAt,
    };

    if (isSupabaseConfigured()) {
      const { data } = await supabaseUpdate<Profile>("profiles", `id=eq.${userId}`, patchPayload);
      if (data && data[0]) return data[0];
    }

    const index = memoryProfiles.findIndex((p) => p.id === userId || p.username === userId);
    if (index !== -1) {
      memoryProfiles[index] = {
        ...memoryProfiles[index],
        ...patchPayload,
      };
      return memoryProfiles[index];
    }
    return null;
  },

  // ── Activity Events ───────────────────────────────────────────────────────
  async getActivityEvents(limit: number = 20): Promise<ActivityEvent[]> {
    return [...memoryActivityEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async createActivityEvent(data: Omit<ActivityEvent, "id" | "createdAt">): Promise<ActivityEvent> {
    const newEvent: ActivityEvent = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    memoryActivityEvents.unshift(newEvent);
    return newEvent;
  },

  // ── Public Profile Data & Social Matrix ───────────────────────────────────
  async getPublicProfileWithData(username: string): Promise<{
    profile: Profile | null;
    stats: { projectsCount: number; postsCount: number; collabCount: number };
    createdProjects: Project[];
    collabProjects: Project[];
    posts: Post[];
  } | null> {
    const cleanUser = username.trim().toLowerCase();
    const profile = memoryProfiles.find((p) => p.username.toLowerCase() === cleanUser || p.id.toLowerCase() === cleanUser);
    if (!profile) return null;

    const createdProjects = memoryProjects.filter((p) => (p.createdBy === profile.id || p.creator?.username?.toLowerCase() === cleanUser) && !p.isDraft);
    const collabProjects = memoryProjects.filter((p) => p.collaborators?.some((c) => c.id === profile.id || c.username.toLowerCase() === cleanUser) && !p.isDraft);
    const posts = memoryPosts.filter((p) => p.authorId === profile.id).map((p) => ({
      ...p,
      author: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        mediaUrl: profile.mediaUrl,
        role: profile.role,
      }
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      profile,
      stats: {
        projectsCount: createdProjects.length,
        postsCount: posts.length,
        collabCount: collabProjects.length,
      },
      createdProjects,
      collabProjects,
      posts,
    };
  },

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  async getAuditLogs(): Promise<AuditLogItem[]> {
    return [...memoryAuditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async logAudit(
    actionOrData: string | { action: string; actorId?: string; actorName?: string; targetId?: string; details?: string; ipAddress?: string },
    actorId?: string,
    details?: string,
    ipAddress?: string
  ): Promise<AuditLogItem> {
    if (typeof actionOrData === "object") {
      const item: AuditLogItem = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actorId: actionOrData.actorId,
        actorName: actionOrData.actorName || (actionOrData.actorId ? memoryProfiles.find((p) => p.id === actionOrData.actorId)?.displayName : undefined) || "System",
        action: actionOrData.action,
        details: actionOrData.details,
        ipAddress: actionOrData.ipAddress || "127.0.0.1",
        createdAt: new Date().toISOString(),
      };
      memoryAuditLogs.unshift(item);
      return item;
    }

    const actor = actorId ? memoryProfiles.find((p) => p.id === actorId) : null;
    const item: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorId,
      actorName: actor?.displayName || "System",
      action: actionOrData,
      details,
      ipAddress: ipAddress || "127.0.0.1",
      createdAt: new Date().toISOString(),
    };
    memoryAuditLogs.unshift(item);
    return item;
  }
};
