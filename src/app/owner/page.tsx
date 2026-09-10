"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Users,
  Inbox,
  FolderGit2,
  MessageSquare,
  Bell,
  Shield,
  Settings,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Key,
  UserCheck,
  UserX,
  LogOut,
  Send,
  Sparkles,
  ArrowUpRight,
  Filter,
  Check,
  X,
  Edit3,
  Eye,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Heart,
  MessageCircle,
  ToggleLeft,
  ToggleRight,
  Share2,
  ChevronRight,
  Globe,
  Github,
  Linkedin,
  Archive,
  RotateCcw,
  Camera,
  Menu
} from "lucide-react";
import { 
  Profile, 
  Project, 
  Inquiry, 
  ChatMessage, 
  Conversation, 
  NotificationItem, 
  AuditLogItem, 
  Post, 
  PostComment, 
  SiteSettings,
  ActivityEvent
} from "@/lib/data-store";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { CodeXaMediaSelectorModal } from "@/components/ui/CodeXaMediaSelectorModal";
import { MotionNumber } from "@/components/motion/MotionNumber";
import { useAuth } from "@/context/AuthContext";

type OwnerTab = 
  | "overview" 
  | "project-applications"
  | "my-profile"
  | "feed"
  | "team-profiles" 
  | "accounts" 
  | "all-projects" 
  | "main-projects"
  | "team-projects"
  | "hidden-projects"
  | "archived-projects"
  | "homepage" 
  | "messages" 
  | "notifications" 
  | "inquiries" 
  | "feed-moderation"
  | "activity" 
  | "audit" 
  | "settings";

function OwnerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get("tab") as OwnerTab | null;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<OwnerTab>(requestedTab || "overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real Database Data states (Zero Dummy Data)
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsSyncing, setAccountsSyncing] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [inquiriesError, setInquiriesError] = useState<string | null>(null);

  // Project Applications & Advance Bookings
  const [projectApplications, setProjectApplications] = useState<any[]>([]);
  const [projectAppMetrics, setProjectAppMetrics] = useState({
    totalCount: 0,
    paidLeadsCount: 0,
    pendingPaymentCount: 0,
    underReviewCount: 0,
    activeProjectsCount: 0,
    totalAdvanceReceived: 0,
  });
  const [projectAppLoading, setProjectAppLoading] = useState(true);
  const [projectAppError, setProjectAppError] = useState<string | null>(null);
  const [projectAppStatusFilter, setProjectAppStatusFilter] = useState("ALL");
  const [projectAppSearch, setProjectAppSearch] = useState("");
  const [selectedProjectApp, setSelectedProjectApp] = useState<any | null>(null);
  const [editingAppModal, setEditingAppModal] = useState<any | null>(null);
  const [editStatusValue, setEditStatusValue] = useState("");
  const [editQuoteValue, setEditQuoteValue] = useState("");
  const [editNotesValue, setEditNotesValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [notifsError, setNotifsError] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    mainProjectsHomeVisible: true,
    teamProjectsHomeVisible: true,
  });

  // Chat states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  // Social Feed state
  const [newPostContent, setNewPostContent] = useState("");
  const [isPostAnnouncement, setIsPostAnnouncement] = useState(false);

  // Modals
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [editSelfModalOpen, setEditSelfModalOpen] = useState(false);
  const [editMemberModalUser, setEditMemberModalUser] = useState<Profile | null>(null);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [editProjectModalData, setEditProjectModalData] = useState<Project | null>(null);

  // Search & Filter state
  const [globalSearch, setGlobalSearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("ALL");
  const [inquirySearch, setInquirySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("ALL");

  // Form: Create account
  const [accountFormData, setAccountFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    role: "TEAM_MEMBER",
    leadershipPosition: "",
    temporaryPassword: "",
    headline: "",
    bio: ""
  });
  const [accountFormState, setAccountFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [accountFormMsg, setAccountFormMsg] = useState("");

  // Form: Self profile
  const [selfFormData, setSelfFormData] = useState({
    displayName: "",
    headline: "",
    bio: "",
    skillsStr: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
  });
  const [selfFormSaving, setSelfFormSaving] = useState(false);
  const [selfFormFeedback, setSelfFormFeedback] = useState<string | null>(null);

  // Form: Edit team member
  const [memberFormData, setMemberFormData] = useState({
    displayName: "",
    headline: "",
    bio: "",
    skillsStr: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    role: "TEAM_MEMBER",
    leadershipPosition: "",
    memberType: "CORE_TEAM",
    isActive: true,
  });
  const [memberFormSaving, setMemberFormSaving] = useState(false);
  const [memberFormFeedback, setMemberFormFeedback] = useState<string | null>(null);

  // Form: New project
  const [newProjectData, setNewProjectData] = useState({
    title: "",
    category: "AI",
    creatorId: "",
    shortDesc: "",
    overview: "",
    techStackStr: "TypeScript, React, TailwindCSS",
    liveUrl: "",
    repoUrl: "",
    isMainProject: false,
    isHomepageVisible: true,
    status: "PRODUCTION",
  });
  const [projectSaving, setProjectSaving] = useState(false);

  const { user: authUser, status: authStatus, logout: authLogout } = useAuth();

  // Sync tab from URL query params
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  // Individual Granular Fetch Handlers
  const fetchAccounts = useCallback(async (isSync = false) => {
    if (isSync) setAccountsSyncing(true);
    else setAccountsLoading(true);

    try {
      const res = await fetch("/api/owner/accounts", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        setAccountsError(null);
      } else {
        setAccountsError(data.error || "Unable to load team accounts.");
      }
    } catch (err: any) {
      console.error("[fetchAccounts Error]", err);
      setAccountsError("Network error connecting to accounts service.");
    } finally {
      setAccountsLoading(false);
      setAccountsSyncing(false);
    }
  }, []);

  const fetchInquiries = useCallback(async () => {
    setInquiriesLoading(true);
    try {
      const res = await fetch("/api/inquiries", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.inquiries)) {
        setInquiries(data.inquiries);
        setInquiriesError(null);
      } else {
        setInquiriesError(data.error || "Failed to load inquiries.");
      }
    } catch {
      setInquiriesError("Network error loading inquiries.");
    } finally {
      setInquiriesLoading(false);
    }
  }, []);

  const fetchProjectApplications = useCallback(async () => {
    setProjectAppLoading(true);
    try {
      const res = await fetch("/api/owner/project-applications", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.applications)) {
        setProjectApplications(data.applications);
        if (data.metrics) {
          setProjectAppMetrics(data.metrics);
        }
        setProjectAppError(null);
      } else {
        setProjectAppError(data.error || "Failed to load project applications.");
      }
    } catch {
      setProjectAppError("Network error loading project applications.");
    } finally {
      setProjectAppLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
        setProjectsError(null);
      } else {
        setProjectsError(data.error || "Failed to load projects.");
      }
    } catch {
      setProjectsError("Network error loading projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await fetch("/api/feed/posts", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.posts)) {
        setPosts(data.posts);
        setPostsError(null);
      } else {
        setPostsError(data.error || "Failed to load posts.");
      }
    } catch {
      setPostsError("Network error loading posts.");
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadNotifsCount(data.unreadCount || 0);
        setNotifsError(null);
      } else {
        setNotifsError(data.error || "Failed to load notifications.");
      }
    } catch {
      setNotifsError("Network error loading notifications.");
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/audit-logs", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
        setAuditError(null);
      } else {
        setAuditError(data.error || "Failed to load audit logs.");
      }
    } catch {
      setAuditError("Network error loading audit logs.");
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const fetchActivityEvents = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch("/api/activity", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.activities)) {
        setActivityEvents(data.activities);
        setActivityError(null);
      }
    } catch {
      setActivityError("Network error loading activity.");
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const fetchSiteSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/site-settings", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        setSiteSettings(data.settings);
      }
    } catch {}
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConversationId) {
          setActiveConversationId(data.conversations[0].id);
        }
      }
    } catch {}
  }, [activeConversationId]);

  const fetchProfileDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        setCurrentUser(data.profile);
        setSelfFormData({
          displayName: data.profile.displayName || "",
          headline: data.profile.headline || "",
          bio: data.profile.bio || "",
          skillsStr: Array.isArray(data.profile.skills) ? data.profile.skills.join(", ") : "",
          githubUrl: data.profile.githubUrl || "",
          linkedinUrl: data.profile.linkedinUrl || "",
          portfolioUrl: data.profile.portfolioUrl || "",
        });
      }
    } catch {}
  }, []);

  const loadAllOwnerData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchAccounts(),
      fetchInquiries(),
      fetchProjectApplications(),
      fetchProjects(),
      fetchPosts(),
      fetchNotifications(),
      fetchAuditLogs(),
      fetchActivityEvents(),
      fetchSiteSettings(),
      fetchConversations(),
      fetchProfileDetails(),
    ]);
    setLoading(false);
  }, [
    fetchAccounts,
    fetchInquiries,
    fetchProjectApplications,
    fetchProjects,
    fetchPosts,
    fetchNotifications,
    fetchAuditLogs,
    fetchActivityEvents,
    fetchSiteSettings,
    fetchConversations,
    fetchProfileDetails,
  ]);

  useEffect(() => {
    if (authStatus === "authenticated" && authUser) {
      if (authUser.role !== "OWNER") {
        router.replace("/dashboard");
        return;
      }
      setCurrentUser(authUser);
      setSelfFormData({
        displayName: authUser.displayName || "",
        headline: (authUser as any).headline || "",
        bio: (authUser as any).bio || "",
        skillsStr: Array.isArray((authUser as any).skills) ? (authUser as any).skills.join(", ") : "",
        githubUrl: (authUser as any).githubUrl || "",
        linkedinUrl: (authUser as any).linkedinUrl || "",
        portfolioUrl: (authUser as any).portfolioUrl || "",
      });
      loadAllOwnerData();
    }
  }, [authStatus, authUser, router, loadAllOwnerData]);

  useEffect(() => {
    if (!activeConversationId) return;
    fetch(`/api/chat/messages?conversationId=${activeConversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.messages) {
          setChatMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [activeConversationId]);

  // ── Self Profile Save ───────────────────────────────────────────────────────
  const handleSaveSelfProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfFormSaving(true);
    setSelfFormFeedback(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: selfFormData.displayName,
          headline: selfFormData.headline,
          bio: selfFormData.bio,
          skills: selfFormData.skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
          githubUrl: selfFormData.githubUrl,
          linkedinUrl: selfFormData.linkedinUrl,
          portfolioUrl: selfFormData.portfolioUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelfFormFeedback("Profile saved successfully!");
        setCurrentUser(data.profile);
        setAccounts((prev) => prev.map((a) => a.id === data.profile.id ? { ...a, ...data.profile } : a));
        setTimeout(() => {
          setEditSelfModalOpen(false);
          setSelfFormFeedback(null);
        }, 1200);
      } else {
        setSelfFormFeedback(data.error || "Failed to update profile.");
      }
    } catch {
      setSelfFormFeedback("Network error saving profile.");
    } finally {
      setSelfFormSaving(false);
    }
  };

  // ── Member Profile Edit (Owner Overriding Member) ───────────────────────────
  const handleOpenEditMemberModal = (member: Profile) => {
    setEditMemberModalUser(member);
    setMemberFormData({
      displayName: member.displayName || "",
      headline: member.headline || "",
      bio: member.bio || "",
      skillsStr: Array.isArray(member.skills) ? member.skills.join(", ") : "",
      githubUrl: member.githubUrl || "",
      linkedinUrl: member.linkedinUrl || "",
      portfolioUrl: member.portfolioUrl || "",
      role: member.role || "TEAM_MEMBER",
      leadershipPosition: member.leadershipPosition || "",
      memberType: member.memberType || "CORE_TEAM",
      isActive: member.isActive ?? true,
    });
    setMemberFormFeedback(null);
  };

  const handleSaveMemberProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberModalUser) return;
    setMemberFormSaving(true);
    setMemberFormFeedback(null);

    try {
      const res = await fetch(`/api/profile/${editMemberModalUser.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: memberFormData.displayName,
          headline: memberFormData.headline,
          bio: memberFormData.bio,
          skills: memberFormData.skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
          githubUrl: memberFormData.githubUrl,
          linkedinUrl: memberFormData.linkedinUrl,
          portfolioUrl: memberFormData.portfolioUrl,
          role: memberFormData.role,
          isActive: memberFormData.isActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMemberFormFeedback("Member profile updated successfully!");
        setAccounts((prev) => prev.map((a) => a.id === editMemberModalUser.id ? { ...a, ...data.profile } : a));
        setTimeout(() => {
          setEditMemberModalUser(null);
          setMemberFormFeedback(null);
        }, 1200);
      } else {
        setMemberFormFeedback(data.error || "Failed to update member profile.");
      }
    } catch {
      setMemberFormFeedback("Network error updating member.");
    } finally {
      setMemberFormSaving(false);
    }
  };

  // ── Account Provisioning ────────────────────────────────────────────────────
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormState("loading");
    setAccountFormMsg("");

    try {
      const res = await fetch("/api/owner/accounts", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify(accountFormData),
      });
      const data = await res.json();

      if (res.ok && data.success && data.account) {
        setAccountFormState("success");
        setAccountFormMsg(data.message || "Account provisioned successfully in PostgreSQL.");
        setAccounts((prev) => [data.account, ...prev.filter((a) => a.id !== data.account.id)]);
        fetchAccounts(true);
        setTimeout(() => {
          setCreateAccountModalOpen(false);
          setAccountFormState("idle");
          setAccountFormMsg("");
          setAccountFormData({
            fullName: "",
            username: "",
            email: "",
            role: "TEAM_MEMBER",
            leadershipPosition: "",
            temporaryPassword: "",
            headline: "",
            bio: ""
          });
        }, 1200);
      } else {
        setAccountFormState("error");
        setAccountFormMsg(data.error || "Failed to create account.");
      }
    } catch {
      setAccountFormState("error");
      setAccountFormMsg("Network error communicating with server.");
    }
  };

  // ── Account Actions ────────────────────────────────────────────────────────
  const handleToggleAccountActive = async (account: Profile) => {
    const newStatus = !account.isActive;
    try {
      const res = await fetch(`/api/owner/accounts/${account.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, isActive: newStatus } : a));
        fetchAccounts(true);
      }
    } catch {}
  };

  const handleChangeRole = async (account: Profile, newRole: string) => {
    try {
      const res = await fetch(`/api/owner/accounts/${account.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, role: newRole as any } : a));
        fetchAccounts(true);
      }
    } catch {}
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModalUser || newPasswordInput.length < 6) return;
    try {
      const res = await fetch(`/api/owner/accounts/${resetPasswordModalUser.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      if (res.ok) {
        alert(`Password for @${resetPasswordModalUser.username} reset successfully.`);
        setResetPasswordModalUser(null);
        setNewPasswordInput("");
      }
    } catch {}
  };

  const handleDeleteAccount = async (account: Profile) => {
    if (!confirm(`Are you sure you want to permanently delete account @${account.username}? This action is irreversible.`)) return;
    try {
      const res = await fetch(`/api/owner/accounts/${account.id}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
        fetchAccounts(true);
      }
    } catch {}
  };

  // ── Inquiry Actions ────────────────────────────────────────────────────────
  const handleUpdateInquiryStatus = async (inquiryId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setInquiries((prev) => prev.map((i) => i.id === inquiryId ? { ...i, status: newStatus as any } : i));
        if (selectedInquiry && selectedInquiry.id === inquiryId) {
          setSelectedInquiry((prev) => prev ? { ...prev, status: newStatus as any } : null);
        }
      }
    } catch {}
  };

  // ── Project Applications / Paid Leads Actions ──────────────────────────────
  const handleUpdateProjectAppStatus = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/owner/project-applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProjectApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );
        if (selectedProjectApp && selectedProjectApp.id === appId) {
          setSelectedProjectApp((prev: any) => (prev ? { ...prev, status: newStatus } : null));
        }
        fetchProjectApplications();
      }
    } catch (err) {
      console.error("Error updating project app status:", err);
    }
  };

  const handleSaveEditingApp = async () => {
    if (!editingAppModal) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/owner/project-applications/${editingAppModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatusValue,
          finalQuoteAmount: editQuoteValue ? parseInt(editQuoteValue, 10) : null,
          adminNotes: editNotesValue,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProjectApplications((prev) =>
          prev.map((a) => (a.id === editingAppModal.id ? data.application : a))
        );
        if (selectedProjectApp && selectedProjectApp.id === editingAppModal.id) {
          setSelectedProjectApp(data.application);
        }
        setEditingAppModal(null);
        fetchProjectApplications();
      }
    } catch (err) {
      console.error("Error saving app edits:", err);
    } finally {
      setEditSaving(false);
    }
  };

  // ── Project Actions ────────────────────────────────────────────────────────
  const handleToggleMainProject = async (project: Project) => {
    const newState = !project.isMainProject;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMainProject: newState }),
      });
      if (res.ok) {
        setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, isMainProject: newState } : p));
      }
    } catch {}
  };

  const handleToggleHomepageVisibility = async (project: Project) => {
    const newState = !project.isHomepageVisible;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHomepageVisible: newState }),
      });
      if (res.ok) {
        setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, isHomepageVisible: newState } : p));
      }
    } catch {}
  };

  const handleArchiveProject = async (project: Project) => {
    const newState: "Live" | "Archived" = project.status === "Archived" ? "Live" : "Archived";
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newState }),
      });
      if (res.ok) {
        setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status: newState } : p));
      }
    } catch {}
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to permanently delete project "${project.title}"?`)) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
      }
    } catch {}
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProjectData,
          techStack: newProjectData.techStackStr.split(",").map((s) => s.trim()).filter(Boolean),
          createdBy: newProjectData.creatorId || currentUser?.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects((prev) => [data.project, ...prev]);
        setCreateProjectModalOpen(false);
        setNewProjectData({
          title: "",
          category: "AI",
          creatorId: "",
          shortDesc: "",
          overview: "",
          techStackStr: "TypeScript, React, TailwindCSS",
          liveUrl: "",
          repoUrl: "",
          isMainProject: false,
          isHomepageVisible: true,
          status: "PRODUCTION",
        });
      }
    } catch {} finally {
      setProjectSaving(false);
    }
  };

  // ── Homepage Controls ──────────────────────────────────────────────────────
  const handleToggleHomepageSection = async (section: "mainProjectsHomeVisible" | "teamProjectsHomeVisible") => {
    const newSettings = { ...siteSettings, [section]: !siteSettings[section] };
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSiteSettings(data.settings);
      }
    } catch {}
  };

  // ── Social Feed Actions ────────────────────────────────────────────────────
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      const res = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent.trim(),
          isAnnouncement: isPostAnnouncement,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) => [data.post, ...prev]);
        setNewPostContent("");
        setIsPostAnnouncement(false);
      }
    } catch {}
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to remove this post from the feed?")) return;
    try {
      const res = await fetch(`/api/feed/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch {}
  };

  // ── Chat Messaging ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConversationId) return;

    const msg = newMessageText.trim();
    const clientId = crypto.randomUUID();
    setNewMessageText("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: msg,
          clientId,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success && data.message) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    } catch {}
  };

  const handleStartDirectChat = async (recipientId: string) => {
    router.push(`/dashboard/messages?user=${recipientId}`);
  };

  // Filtered lists
  const filteredInquiries = inquiries.filter((inq) => {
    const matchStatus = inquiryStatusFilter === "ALL" || inq.status === inquiryStatusFilter;
    const q = inquirySearch.toLowerCase();
    const matchSearch = !inquirySearch || 
      inq.fullName.toLowerCase().includes(q) || 
      inq.referenceId.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const getFilteredProjects = () => {
    if (activeTab === "main-projects") return projects.filter((p) => p.isMainProject);
    if (activeTab === "team-projects") return projects.filter((p) => !p.isMainProject);
    if (activeTab === "hidden-projects") return projects.filter((p) => !p.isHomepageVisible);
    if (activeTab === "archived-projects") return projects.filter((p) => p.status === "Archived");
    return projects;
  };

  // Nav Groups definition
  const navSections = [
    {
      title: "CORE",
      items: [
        { id: "overview" as OwnerTab, label: "Overview", icon: LayoutDashboard },
        { id: "my-profile" as OwnerTab, label: "My Profile", icon: User },
        { id: "feed" as OwnerTab, label: "Team Core Feed", icon: Share2, badge: posts.length },
        { id: "team-profiles" as OwnerTab, label: "Team Directory", icon: Users, badge: accounts.length },
        { id: "messages" as OwnerTab, label: "Messages", icon: MessageSquare },
        { id: "notifications" as OwnerTab, label: "Notifications", icon: Bell, badge: unreadNotifsCount || undefined },
      ]
    },
    {
      title: "PEOPLE & ACCESS",
      items: [
        { id: "accounts" as OwnerTab, label: "Accounts & Security", icon: Key },
        { id: "team-profiles" as OwnerTab, label: "Team Profiles", icon: UserCheck },
      ]
    },
    {
      title: "PROJECTS & BUILDS",
      items: [
        { id: "all-projects" as OwnerTab, label: "All Projects", icon: FolderGit2, badge: projects.length },
        { id: "main-projects" as OwnerTab, label: "Main Projects", icon: Sparkles, badge: projects.filter((p) => p.isMainProject).length },
        { id: "team-projects" as OwnerTab, label: "Team Projects", icon: FolderGit2 },
        { id: "hidden-projects" as OwnerTab, label: "Hidden Builds", icon: Eye },
        { id: "archived-projects" as OwnerTab, label: "Archived Builds", icon: Archive },
      ]
    },
    {
      title: "CLIENT PIPELINE & ADVANCE",
      items: [
        {
          id: "project-applications" as OwnerTab,
          label: "Project Applications",
          icon: Sparkles,
          badge: projectAppMetrics.paidLeadsCount || projectApplications.filter((a) => ["QUALIFIED", "UNDER_REVIEW"].includes(a.status)).length || undefined,
        },
        {
          id: "inquiries" as OwnerTab,
          label: "General Inquiries",
          icon: Inbox,
          badge: inquiries.filter((i) => i.status === "NEW").length || undefined,
        },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { id: "homepage" as OwnerTab, label: "Homepage Control", icon: ToggleRight },
        { id: "feed-moderation" as OwnerTab, label: "Feed Moderation", icon: Shield },
        { id: "activity" as OwnerTab, label: "Recent Activity", icon: Clock },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { id: "audit" as OwnerTab, label: "Audit Logs", icon: Shield },
        { id: "settings" as OwnerTab, label: "System Config", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col selection:bg-crimson selection:text-white">
      
      {/* ─── TOP COMMAND BAR ──────────────────────────────────────────────── */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#141414] text-[#888] hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="p-1.5 rounded-lg bg-deep-red/30 border border-crimson/40">
            <Shield className="w-5 h-5 text-bright-red" />
          </div>
          <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white">
            CODEXA <span className="text-crimson text-xs font-normal">FOUNDER CORE</span>
          </span>
          <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
            OWNER
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center relative w-72">
          <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search members, builds, leads..."
            className="w-full bg-[#121212] border border-crimson/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#555] outline-none focus:border-bright-red transition-colors"
          />
        </div>

        {/* Actions & Profile Pill */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="hidden lg:flex items-center gap-1.5 text-xs font-orbitron text-[#888] hover:text-white transition-colors uppercase tracking-wider"
          >
            Public Site <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => setCreateAccountModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-[11px] font-orbitron font-bold uppercase transition-all shadow-[0_0_12px_rgba(217,4,41,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" /> New Account
          </button>

          {/* Notifications */}
          <button
            onClick={() => setActiveTab("notifications")}
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-crimson text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Owner Avatar Identity Pill */}
          <div
            onClick={() => setActiveTab("my-profile")}
            className="flex items-center gap-2 pl-2 cursor-pointer group"
            title="My Profile"
          >
            <CodeXaAvatar
              src={currentUser?.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
              alt="Ashu"
              size="sm"
              showGlow
            />
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-orbitron font-bold text-white group-hover:text-bright-red transition-colors">
                {currentUser?.displayName || "Ashu"}
              </span>
              <span className="block text-[9px] font-mono text-crimson">@ashu &bull; Founder</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE BODY ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-64 border-r border-crimson/15 bg-[#080808] flex-col justify-between p-4 flex-shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <span className="px-3 text-[9px] font-orbitron font-bold uppercase tracking-widest text-[#555] block mb-1">
                  {section.title}
                </span>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-orbitron text-xs font-semibold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-crimson text-white border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                          : "text-[#888] hover:text-white hover:bg-[#111] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          isActive ? "bg-white text-crimson" : "bg-deep-red/30 text-bright-red border border-crimson/30"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5 space-y-2 mt-4">
            <Link
              href={`/team/${currentUser?.username || "ashu"}`}
              className="w-full py-2 rounded-xl bg-[#121212] hover:bg-deep-red/20 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              Public Profile <ExternalLink className="w-3.5 h-3.5 text-bright-red" />
            </Link>
            <button
              onClick={() => authLogout()}
              className="w-full py-2 rounded-xl bg-[#121212] hover:bg-deep-red/40 text-[#AAA] hover:text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-crimson" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Slide-Out Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-72 bg-[#090909] border-r border-crimson/30 flex flex-col justify-between p-5 z-10 overflow-y-auto"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="font-orbitron font-black text-sm text-white uppercase">Menu</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded bg-[#151515] text-[#888]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {navSections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <span className="text-[9px] font-orbitron font-bold uppercase text-[#555] block mb-1">
                        {section.title}
                      </span>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-orbitron text-xs font-semibold uppercase ${
                              isActive ? "bg-crimson text-white" : "text-[#888] hover:bg-[#151515]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-3.5 h-3.5" />
                              <span>{item.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Dynamic Main Workspace Container */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 bg-[#070707] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6"
        >
          
          {/* ═══ TAB 1: OVERVIEW ════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    FOUNDER COMMAND CONSOLE
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    CodeXa Agency Overview
                  </h1>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveTab("my-profile")}
                    className="px-4 py-2 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-bright-red" /> Edit My Profile
                  </button>
                  <button
                    onClick={() => setCreateProjectModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                </div>
              </div>

              {/* Zero-dummy Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Active Members", value: accounts.filter((a) => a.isActive).length, sub: `${accounts.length} Total Registered`, icon: Users, color: "text-bright-red", action: () => setActiveTab("team-profiles") },
                  { label: "Client Inquiries", value: inquiries.filter((i) => i.status === "NEW").length, sub: `${inquiries.length} Total Leads`, icon: Inbox, color: "text-amber-400", action: () => setActiveTab("inquiries") },
                  { label: "Main Flagships", value: projects.filter((p) => p.isMainProject).length, sub: `${projects.length} Total Builds`, icon: Sparkles, color: "text-emerald-400", action: () => setActiveTab("main-projects") },
                  { label: "Feed Updates", value: posts.length, sub: "Community Stream", icon: Share2, color: "text-blue-400", action: () => setActiveTab("feed") },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={idx}
                      onClick={card.action}
                      className="cyber-card p-5 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-orbitron font-bold text-[#888] uppercase tracking-wider">{card.label}</span>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <div className="text-3xl font-orbitron font-black text-white">
                        <MotionNumber value={card.value} duration={1} />
                      </div>
                      <p className="text-[10px] font-mono text-[#777] mt-1">{card.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Founder Quick Actions */}
              <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/20 space-y-4">
                <h3 className="font-orbitron font-bold text-xs text-bright-red uppercase tracking-wider">
                  Founder Quick Action Center
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "My Profile", icon: User, action: () => setActiveTab("my-profile") },
                    { label: "Create Member", icon: Plus, action: () => setCreateAccountModalOpen(true) },
                    { label: "Add Project", icon: FolderGit2, action: () => setCreateProjectModalOpen(true) },
                    { label: "Homepage Control", icon: ToggleRight, action: () => setActiveTab("homepage") },
                    { label: "Client Inquiries", icon: Inbox, action: () => setActiveTab("inquiries") },
                    { label: "Audit Logs", icon: Shield, action: () => setActiveTab("audit") },
                  ].map((btn, i) => {
                    const Icon = btn.icon;
                    return (
                      <button
                        key={i}
                        onClick={btn.action}
                        className="p-3.5 rounded-2xl bg-[#121212] hover:bg-crimson/20 border border-white/5 hover:border-bright-red/50 transition-all flex flex-col items-center justify-center gap-2 group"
                      >
                        <Icon className="w-4 h-4 text-bright-red group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-orbitron font-bold text-white uppercase text-center">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Pulse & Inquiries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/20 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                      Realtime Activity Pulse
                    </h3>
                    <button onClick={() => setActiveTab("activity")} className="text-[10px] font-orbitron text-bright-red uppercase hover:underline">
                      View All &rarr;
                    </button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {activityEvents.length === 0 ? (
                      <p className="text-xs text-[#666] text-center py-8">No recent events recorded yet.</p>
                    ) : (
                      activityEvents.slice(0, 5).map((ev) => (
                        <div key={ev.id} className="p-3 rounded-2xl bg-[#111] border border-white/5 flex items-start gap-3">
                          <CodeXaAvatar src={ev.actorMediaUrl} size="xs" />
                          <div className="flex-1 text-xs">
                            <p className="text-white font-orbitron font-semibold">{ev.title}</p>
                            <p className="text-[#888] text-[11px] mt-0.5">{ev.details}</p>
                            <span className="text-[9px] font-mono text-[#555] block mt-1">
                              {new Date(ev.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/20 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                      Recent Client Inquiries
                    </h3>
                    <button onClick={() => setActiveTab("inquiries")} className="text-[10px] font-orbitron text-bright-red uppercase hover:underline">
                      Manage &rarr;
                    </button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {inquiries.length === 0 ? (
                      <p className="text-xs text-[#666] text-center py-8">No client inquiries yet.</p>
                    ) : (
                      inquiries.slice(0, 5).map((inq) => (
                        <div key={inq.id} className="p-3 rounded-2xl bg-[#111] border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-orbitron font-bold text-white">{inq.fullName}</p>
                            <p className="text-[10px] text-[#888]">{inq.projectType} &bull; <span className="text-emerald-400 font-mono">{inq.budget}</span></p>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
                            {inq.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ═══ TAB 2: MY PROFILE ══════════════════════════════════════════ */}
          {activeTab === "my-profile" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    DIGITAL IDENTITY STUDIO
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    Owner Digital Profile
                  </h1>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setEditSelfModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                  <Link
                    href={`/team/${currentUser?.username || "ashu"}`}
                    target="_blank"
                    className="px-4 py-2.5 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4 text-bright-red" /> View Public
                  </Link>
                </div>
              </div>

              {/* Profile Card Preview */}
              <div className="rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-8 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                  <div className="relative group">
                    <CodeXaAvatar
                      src={currentUser?.mediaUrl}
                      alt={currentUser?.displayName}
                      size="2xl"
                      showGlow
                    />
                    <button
                      onClick={() => setMediaSelectorOpen(true)}
                      className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-orbitron font-bold uppercase"
                    >
                      <Camera className="w-5 h-5 mb-1 text-bright-red" /> Change PFP
                    </button>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                      <h2 className="font-orbitron font-black text-2xl text-white uppercase">{currentUser?.displayName}</h2>
                      <span className="px-3 py-0.5 rounded-full bg-crimson text-white text-[9px] font-orbitron font-black uppercase tracking-wider">
                        {currentUser?.leadershipPosition || "FOUNDER"}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-crimson">@{currentUser?.username || "ashu"}</p>
                    <p className="text-xs font-orbitron text-[#BBB] pt-1">{currentUser?.headline || "CodeXa Founder & Lead Architect"}</p>
                    <p className="text-xs text-[#888] leading-relaxed max-w-2xl whitespace-pre-line pt-1">
                      {currentUser?.bio || "Architecting next-generation autonomous software and agency operations."}
                    </p>
                  </div>
                </div>

                {/* Skills */}
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-orbitron font-bold uppercase text-[#777] mb-2.5">Competencies & Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentUser?.skills?.map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-xl bg-[#141414] border border-crimson/20 text-xs font-orbitron text-white">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
                  {currentUser?.githubUrl && (
                    <a href={currentUser.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121212] border border-white/5 text-xs text-[#CCC] hover:text-white">
                      <Github className="w-3.5 h-3.5" /> GitHub
                    </a>
                  )}
                  {currentUser?.linkedinUrl && (
                    <a href={currentUser.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121212] border border-white/5 text-xs text-[#CCC] hover:text-white">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                  {currentUser?.portfolioUrl && (
                    <a href={currentUser.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121212] border border-white/5 text-xs text-[#CCC] hover:text-white">
                      <Globe className="w-3.5 h-3.5" /> Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 3: TEAM PROFILES (ROSTER) ══════════════════════════════ */}
          {activeTab === "team-profiles" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    CORE ROSTER
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    Team Members & Profiles
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAccounts(true)}
                    disabled={accountsSyncing}
                    className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-crimson/20 text-[#AAA] hover:text-white transition-all text-xs font-orbitron inline-flex items-center gap-1.5"
                    title="Sync from Database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${accountsSyncing ? "animate-spin text-bright-red" : ""}`} />
                    <span className="hidden sm:inline">{accountsSyncing ? "Syncing..." : "Sync DB"}</span>
                  </button>
                  <button
                    onClick={() => setCreateAccountModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Member
                  </button>
                </div>
              </div>

              {accountsError && (
                <div className="p-4 rounded-2xl bg-deep-red/30 border border-crimson/50 flex items-center justify-between gap-4 text-xs font-mono text-white shadow-[0_0_20px_rgba(217,4,41,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-bright-red shrink-0" />
                    <div>
                      <p className="font-orbitron font-bold text-white text-[11px] uppercase tracking-wider">TEAM CORE SYNC INTERRUPTED</p>
                      <p className="text-[10px] text-[#BBB]">We couldn&apos;t refresh team accounts from PostgreSQL. Your previously loaded data has been preserved.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchAccounts(false)}
                    className="px-3 py-1.5 rounded-lg bg-crimson hover:bg-bright-red text-white text-[10px] font-orbitron font-bold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {accountsLoading && accounts.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="cyber-card p-6 h-56 animate-pulse flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-32 bg-white/10 rounded" />
                          <div className="h-3 w-20 bg-white/5 rounded" />
                        </div>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded" />
                      <div className="h-8 w-full bg-white/5 rounded" />
                    </div>
                  ))}
                </div>
              ) : !accountsLoading && !accountsError && accounts.length === 0 ? (
                <div className="text-center py-16 bg-[#0A0A0A] rounded-3xl border border-crimson/15 space-y-3">
                  <Users className="w-10 h-10 text-crimson/50 mx-auto" />
                  <h3 className="font-orbitron font-bold text-white text-sm">No Team Members Found</h3>
                  <p className="text-xs font-mono text-[#666]">Use &quot;Create Member&quot; above to provision your first team account in PostgreSQL.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accounts.map((member) => (
                    <div
                      key={member.id}
                      className="cyber-card p-6 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3.5">
                          <CodeXaAvatar src={member.mediaUrl} alt={member.displayName} size="md" showGlow />
                          <div className="flex-1">
                            <h4 className="font-orbitron font-bold text-sm text-white">{member.displayName}</h4>
                            <p className="text-[10px] font-mono text-crimson">@{member.username}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-crimson/15 border border-crimson/30 text-[8px] font-orbitron font-bold text-bright-red uppercase">
                              {member.leadershipPosition || member.role.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                          {member.headline || member.bio || "CodeXa Agency member."}
                        </p>

                        {/* Skills */}
                        {member.skills && member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {member.skills.slice(0, 3).map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-[#141414] border border-white/5 text-[9px] font-orbitron text-[#AAA]">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Owner Management Controls */}
                      <div className="space-y-2 pt-3 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleOpenEditMemberModal(member)}
                            className="py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-bright-red" /> Edit Profile
                          </button>
                          <Link
                            href={`/team/${member.username}`}
                            target="_blank"
                            className="py-2 rounded-xl bg-[#141414] hover:bg-[#202020] text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-[#888]" /> View
                          </Link>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartDirectChat(member.id)}
                            className="flex-1 py-1.5 rounded-lg bg-[#111] hover:bg-deep-red/20 text-[#888] hover:text-white text-[9px] font-orbitron uppercase transition-colors flex items-center justify-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Message
                          </button>
                          {member.role !== "OWNER" && (
                            <button
                              onClick={() => handleToggleAccountActive(member)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-orbitron uppercase transition-colors ${
                                member.isActive ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              }`}
                            >
                              {member.isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 4: ACCOUNTS & SECURITY ═════════════════════════════════ */}
          {activeTab === "accounts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    SECURITY GOVERNANCE
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    Accounts Management
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAccounts(true)}
                    disabled={accountsSyncing}
                    className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-crimson/20 text-[#AAA] hover:text-white transition-all text-xs font-orbitron inline-flex items-center gap-1.5"
                    title="Sync from Database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${accountsSyncing ? "animate-spin text-bright-red" : ""}`} />
                    <span className="hidden sm:inline">{accountsSyncing ? "Syncing..." : "Sync DB"}</span>
                  </button>
                  <button
                    onClick={() => setCreateAccountModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Provision Account
                  </button>
                </div>
              </div>

              {accountsError && (
                <div className="p-4 rounded-2xl bg-deep-red/30 border border-crimson/50 flex items-center justify-between gap-4 text-xs font-mono text-white shadow-[0_0_20px_rgba(217,4,41,0.15)]">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-bright-red shrink-0" />
                    <div>
                      <p className="font-orbitron font-bold text-white text-[11px] uppercase tracking-wider">TEAM CORE SYNC INTERRUPTED</p>
                      <p className="text-[10px] text-[#BBB]">We couldn&apos;t refresh team accounts from PostgreSQL. Your previously loaded data has been preserved.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchAccounts(false)}
                    className="px-3 py-1.5 rounded-lg bg-crimson hover:bg-bright-red text-white text-[10px] font-orbitron font-bold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 shadow-xl">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-orbitron uppercase text-[#777] border-b border-white/5">
                    <tr>
                      <th className="pb-3">User</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Auth Source</th>
                      <th className="pb-3">2FA Security</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Created Date</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {accountsLoading && accounts.length === 0 ? (
                      [1, 2, 3].map((n) => (
                        <tr key={n} className="animate-pulse">
                          <td className="py-4"><div className="h-4 w-28 bg-white/10 rounded" /></td>
                          <td className="py-4"><div className="h-4 w-36 bg-white/5 rounded" /></td>
                          <td className="py-4"><div className="h-4 w-20 bg-white/5 rounded" /></td>
                          <td className="py-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                          <td className="py-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                          <td className="py-4"><div className="h-4 w-24 bg-white/5 rounded" /></td>
                          <td className="py-4 text-right"><div className="h-4 w-12 bg-white/5 rounded ml-auto" /></td>
                        </tr>
                      ))
                    ) : !accountsLoading && !accountsError && accounts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs font-mono text-[#666]">
                          No team member accounts registered yet. Click &quot;Provision Account&quot; to create one in PostgreSQL.
                        </td>
                      </tr>
                    ) : (
                      accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-[#111] transition-colors">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <CodeXaAvatar src={acc.mediaUrl} size="xs" />
                              <div>
                                <p className="font-orbitron font-bold text-white">{acc.displayName}</p>
                                <p className="text-[9px] font-mono text-crimson">@{acc.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-[#AAA] font-mono">{acc.email}</td>
                          <td className="py-3">
                            {acc.email?.toLowerCase() === "ashuchinthapalli3900@gmail.com" || acc.username === "ashu" || acc.role === "OWNER" ? (
                              <span className="px-2.5 py-1 rounded-full bg-crimson text-white font-orbitron text-[9px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(217,4,41,0.5)] border border-bright-red/50">
                                FOUNDER / OWNER
                              </span>
                            ) : (
                              <select
                                value={acc.role}
                                onChange={(e) => handleChangeRole(acc, e.target.value)}
                                className="bg-[#141414] border border-crimson/20 rounded-lg px-2 py-1 text-[9px] font-orbitron text-white outline-none"
                              >
                                <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                                <option value="CO_FOUNDER">CO_FOUNDER</option>
                                <option value="CEO">CEO</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            )}
                          </td>
                          <td className="py-3">
                            {acc.firebaseUid || acc.email?.toLowerCase() === "ashuchinthapalli3900@gmail.com" ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[9px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Google OAuth
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-[#777]">
                                Password
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-orbitron font-bold uppercase ${
                              acc.twoFactorEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-[#161616] text-[#777] border border-white/10"
                            }`}>
                              {acc.twoFactorEnabled ? "2FA ON" : "2FA OFF"}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-orbitron font-bold uppercase ${
                              acc.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                              {acc.isActive ? "ACTIVE" : "DISABLED"}
                            </span>
                          </td>
                          <td className="py-3 text-[#777] font-mono">
                            {new Date(acc.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setResetPasswordModalUser(acc);
                                  setNewPasswordInput("");
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-deep-red/20 text-[#888] hover:text-white transition-colors"
                                title="Reset Password"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-400" />
                              </button>
                              {acc.role !== "OWNER" && acc.email?.toLowerCase() !== "ashuchinthapalli3900@gmail.com" && acc.username !== "ashu" && (
                                <button
                                  onClick={() => handleDeleteAccount(acc)}
                                  className="p-1.5 rounded-lg bg-[#141414] hover:bg-crimson text-[#888] hover:text-white transition-colors"
                                  title="Delete Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-bright-red" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ TAB 5: PROJECTS (ALL / MAIN / TEAM / HIDDEN / ARCHIVED) ═════ */}
          {(activeTab === "all-projects" || activeTab === "main-projects" || activeTab === "team-projects" || activeTab === "hidden-projects" || activeTab === "archived-projects") && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    BUILD GOVERNANCE
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    {activeTab === "main-projects" ? "Main Flagship Projects" : activeTab === "team-projects" ? "Community Team Projects" : activeTab === "hidden-projects" ? "Hidden Builds" : activeTab === "archived-projects" ? "Archived Projects" : "All Projects Pipeline"}
                  </h1>
                </div>
                <button
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all-projects" as OwnerTab, label: "All Builds" },
                  { id: "main-projects" as OwnerTab, label: "Main Flagships" },
                  { id: "team-projects" as OwnerTab, label: "Team Projects" },
                  { id: "hidden-projects" as OwnerTab, label: "Hidden from Homepage" },
                  { id: "archived-projects" as OwnerTab, label: "Archived" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-orbitron font-bold uppercase transition-all ${
                      activeTab === tab.id ? "bg-crimson text-white shadow-md" : "bg-[#111] text-[#888] hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 shadow-xl">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-orbitron uppercase text-[#777] border-b border-white/5">
                    <tr>
                      <th className="pb-3">Title / Slug</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Creator</th>
                      <th className="pb-3">Main Project</th>
                      <th className="pb-3">Homepage</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {getFilteredProjects().map((proj) => (
                      <tr key={proj.id} className="hover:bg-[#111] transition-colors">
                        <td className="py-3.5">
                          <Link href={`/projects/${proj.slug}`} className="font-orbitron font-bold text-white hover:text-bright-red transition-colors flex items-center gap-1">
                            {proj.title} <ArrowUpRight className="w-3 h-3 text-bright-red" />
                          </Link>
                          <span className="text-[9px] font-mono text-[#666]">/projects/{proj.slug}</span>
                        </td>
                        <td className="py-3 text-[#AAA]">{proj.category}</td>
                        <td className="py-3 font-mono text-crimson">@{proj.creator?.username || "member"}</td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleMainProject(proj)}
                            className={`px-2.5 py-0.5 rounded-lg text-[9px] font-orbitron font-bold uppercase transition-all ${
                              proj.isMainProject ? "bg-crimson text-white" : "bg-[#141414] text-[#888] border border-white/5"
                            }`}
                          >
                            {proj.isMainProject ? "FLAGSHIP" : "NORMAL"}
                          </button>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleHomepageVisibility(proj)}
                            className={`px-2.5 py-0.5 rounded-lg text-[9px] font-orbitron font-bold uppercase transition-all ${
                              proj.isHomepageVisible ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-[#141414] text-[#666]"
                            }`}
                          >
                            {proj.isHomepageVisible ? "SHOW" : "HIDE"}
                          </button>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-black/60 text-[#AAA] text-[8px] font-orbitron uppercase">
                            {proj.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleArchiveProject(proj)}
                              className="p-1.5 rounded-lg bg-[#141414] hover:bg-deep-red/20 text-[#888] hover:text-white"
                              title={proj.status === "Archived" ? "Restore" : "Archive"}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(proj)}
                              className="p-1.5 rounded-lg bg-[#141414] hover:bg-crimson text-[#888] hover:text-white"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-bright-red" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ TAB 6: HOMEPAGE CONTROLS ═══════════════════════════════════ */}
          {activeTab === "homepage" && (
            <div className="space-y-6 max-w-4xl">
              <div className="pb-4 border-b border-crimson/20">
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  LANDING PAGE LAYOUT
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  Homepage Section Governance
                </h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-orbitron font-bold text-sm text-white">Main Projects Section</h3>
                      <p className="text-xs text-[#888] mt-0.5">Controls the Flagship Main Projects showcase on the landing page.</p>
                    </div>
                    <button
                      onClick={() => handleToggleHomepageSection("mainProjectsHomeVisible")}
                      className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                        siteSettings.mainProjectsHomeVisible ? "bg-crimson text-white" : "bg-[#141414] text-[#666]"
                      }`}
                    >
                      {siteSettings.mainProjectsHomeVisible ? "ON (ACTIVE)" : "OFF"}
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-orbitron font-bold text-sm text-white">Team Projects Section</h3>
                      <p className="text-xs text-[#888] mt-0.5">Controls the Community Team Projects repository grid on the landing page.</p>
                    </div>
                    <button
                      onClick={() => handleToggleHomepageSection("teamProjectsHomeVisible")}
                      className={`px-4 py-2 rounded-xl text-xs font-orbitron font-bold uppercase transition-all ${
                        siteSettings.teamProjectsHomeVisible ? "bg-crimson text-white" : "bg-[#141414] text-[#666]"
                      }`}
                    >
                      {siteSettings.teamProjectsHomeVisible ? "ON (ACTIVE)" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 7: SOCIAL FEED & MODERATION ════════════════════════════ */}
          {(activeTab === "feed" || activeTab === "feed-moderation") && (
            <div className="space-y-6 max-w-3xl">
              <div className="pb-4 border-b border-crimson/20">
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  {activeTab === "feed-moderation" ? "CONTENT MODERATION" : "TEAM STREAM"}
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  {activeTab === "feed-moderation" ? "Feed Moderation Console" : "Team Core Social Feed"}
                </h1>
              </div>

              {/* Composer */}
              <form onSubmit={handleCreatePost} className="p-5 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-3 shadow-xl">
                <textarea
                  rows={3}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Broadcast an update or announcement to the entire CodeXa Agency..."
                  className="w-full bg-[#121212] border border-crimson/20 rounded-2xl p-3 text-xs text-white outline-none focus:border-bright-red resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-orbitron text-[#AAA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPostAnnouncement}
                      onChange={(e) => setIsPostAnnouncement(e.target.checked)}
                      className="accent-crimson"
                    />
                    <span>Mark as Official Announcement</span>
                  </label>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Broadcast
                  </button>
                </div>
              </form>

              {/* Feed Stream */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="cyber-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/team/${post.author?.username}`} className="flex items-center gap-3">
                        <CodeXaAvatar src={post.author?.mediaUrl} size="sm" />
                        <div>
                          <p className="font-orbitron font-bold text-xs text-white">{post.author?.displayName}</p>
                          <span className="text-[9px] font-mono text-crimson">@{post.author?.username}</span>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="px-3 py-1.5 rounded-xl bg-deep-red/20 hover:bg-crimson text-bright-red hover:text-white text-[10px] font-orbitron font-bold uppercase transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Post
                      </button>
                    </div>
                    <p className="text-xs text-[#DDD] leading-relaxed whitespace-pre-line">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TAB 8: INTERNAL MESSAGES ═══════════════════════════════════ */}
          {activeTab === "messages" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-crimson/20">
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  ENCRYPTED CHANNELS
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  Internal Messages
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px] rounded-3xl bg-[#0A0A0A] border border-crimson/25 overflow-hidden shadow-2xl">
                
                {/* Conversation List */}
                <div className="border-r border-white/5 p-4 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-2">
                    <span className="text-[10px] font-orbitron font-bold uppercase text-[#777]">Direct Channels</span>
                    {conversations.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setActiveConversationId(c.id)}
                        className={`p-3 rounded-2xl cursor-pointer transition-colors ${
                          activeConversationId === c.id ? "bg-crimson text-white" : "bg-[#111] text-[#AAA] hover:bg-[#151515]"
                        }`}
                      >
                        <p className="font-orbitron font-bold text-xs">Direct Channel</p>
                        <p className="text-[10px] font-mono opacity-75">{new Date(c.updatedAt).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="md:col-span-2 p-5 flex flex-col justify-between h-full bg-[#070707]">
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-xs text-[#666] text-center py-20">Select a conversation or start a chat from Team Directory.</p>
                    ) : (
                      chatMessages.map((m) => (
                        <div key={m.id} className={`flex gap-3 ${m.senderId === currentUser?.id ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-md p-3.5 rounded-2xl text-xs ${
                            m.senderId === currentUser?.id ? "bg-crimson text-white" : "bg-[#141414] text-[#DDD] border border-white/5"
                          }`}>
                            <p className="font-bold text-[10px] font-orbitron mb-1">{m.sender?.displayName || "Member"}</p>
                            <p className="leading-relaxed">{m.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-white/5">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-[#111] border border-crimson/20 rounded-xl px-4 py-2 text-xs text-white outline-none"
                    />
                    <button type="submit" className="p-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TAB 9: NOTIFICATIONS ═══════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    SYSTEM SIGNALS
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    Notifications Console
                  </h1>
                </div>
                <button
                  onClick={() => {
                    fetch("/api/notifications", { method: "PATCH" }).then(() => {
                      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                      setUnreadNotifsCount(0);
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-xs font-orbitron font-bold uppercase transition-colors"
                >
                  Mark All Read
                </button>
              </div>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#666] text-center py-16">No notifications right now.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-4 rounded-2xl bg-[#0A0A0A] border border-crimson/20 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-orbitron font-bold text-xs text-bright-red">{n.title}</p>
                        <p className="text-xs text-[#AAA]">{n.message}</p>
                        <span className="text-[9px] font-mono text-[#666]">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB: PROJECT APPLICATIONS & QUALIFIED PAID LEADS ══════════ */}
          {activeTab === "project-applications" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    PRIORITY QUALIFIED LEADS
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    Project Applications & Bookings
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchProjectApplications()}
                    className="px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#202020] border border-white/10 text-xs font-orbitron font-bold uppercase text-[#CCC] hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${projectAppLoading ? "animate-spin text-bright-red" : ""}`} />
                    Refresh
                  </button>
                  <Link
                    href="/project-request"
                    target="_blank"
                    className="px-3.5 py-2 rounded-xl bg-crimson hover:bg-bright-red border border-bright-red text-xs font-orbitron font-bold uppercase text-white transition-all flex items-center gap-1.5 shadow-neon"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Open Client Portal
                  </Link>
                </div>
              </div>

              {/* Top KPI Metrics Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="cyber-card p-5 border-emerald-500/30">
                  <span className="text-[10px] font-orbitron text-[#888] uppercase block">NEW PAID LEADS</span>
                  <div className="text-3xl font-orbitron font-black text-emerald-400 mt-1">
                    <MotionNumber value={projectAppMetrics.paidLeadsCount} duration={1} />
                  </div>
                  <span className="text-[10px] text-[#666] font-mono mt-1 block">Verified Razorpay Advance</span>
                </div>

                <div className="cyber-card p-5 border-bright-red/30">
                  <span className="text-[10px] font-orbitron text-[#888] uppercase block">ADVANCE RECEIVED</span>
                  <div className="text-2xl sm:text-3xl font-orbitron font-black text-white mt-1">
                    ₹{projectAppMetrics.totalAdvanceReceived.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-bright-red font-mono mt-1 block">Booking Deposits Secured</span>
                </div>

                <div className="cyber-card p-5 border-amber-500/30">
                  <span className="text-[10px] font-orbitron text-[#888] uppercase block">UNDER REVIEW</span>
                  <div className="text-3xl font-orbitron font-black text-amber-400 mt-1">
                    <MotionNumber value={projectAppMetrics.underReviewCount} duration={1} />
                  </div>
                  <span className="text-[10px] text-[#666] font-mono mt-1 block">Scoping Architecture</span>
                </div>

                <div className="cyber-card p-5 border-blue-500/30">
                  <span className="text-[10px] font-orbitron text-[#888] uppercase block">ACTIVE PROJECTS</span>
                  <div className="text-3xl font-orbitron font-black text-blue-400 mt-1">
                    <MotionNumber value={projectAppMetrics.activeProjectsCount} duration={1} />
                  </div>
                  <span className="text-[10px] text-[#666] font-mono mt-1 block">In Development</span>
                </div>
              </div>

              {/* Status Filter Tabs & Search Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090909] border border-white/5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "ALL", label: "ALL" },
                    { id: "PAID", label: "PAID / QUALIFIED" },
                    { id: "PAYMENT_PENDING", label: "PENDING PAYMENT" },
                    { id: "UNDER_REVIEW", label: "UNDER REVIEW" },
                    { id: "ACCEPTED", label: "ACCEPTED" },
                    { id: "IN_PROGRESS", label: "IN PROGRESS" },
                    { id: "COMPLETED", label: "COMPLETED" },
                    { id: "DECLINED", label: "DECLINED" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setProjectAppStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold uppercase transition-all ${
                        projectAppStatusFilter === tab.id
                          ? "bg-crimson text-white shadow-neon"
                          : "bg-[#141414] text-[#888] hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-64">
                  <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectAppSearch}
                    onChange={(e) => setProjectAppSearch(e.target.value)}
                    placeholder="Search reference, client, email..."
                    className="w-full bg-[#111] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-crimson"
                  />
                </div>
              </div>

              {/* Leads Grid */}
              {projectApplications.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#0A0A0A] border border-white/5 text-center">
                  <Sparkles className="w-8 h-8 text-bright-red mx-auto mb-2 opacity-50" />
                  <h3 className="font-orbitron font-bold text-sm text-white uppercase">No Project Applications Yet</h3>
                  <p className="text-xs text-[#777] max-w-sm mx-auto mt-1">
                    When clients configure their build and submit their booking advance on /project-request, they will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projectApplications
                    .filter((app) => {
                      if (projectAppStatusFilter === "PAID" || projectAppStatusFilter === "QUALIFIED") {
                        return ["QUALIFIED", "UNDER_REVIEW"].includes(app.status) || app.payments?.some((p: any) => p.status === "PAID");
                      }
                      if (projectAppStatusFilter !== "ALL") {
                        return app.status === projectAppStatusFilter;
                      }
                      return true;
                    })
                    .filter((app) => {
                      if (!projectAppSearch) return true;
                      const q = projectAppSearch.toLowerCase();
                      return (
                        app.referenceId?.toLowerCase().includes(q) ||
                        app.fullName?.toLowerCase().includes(q) ||
                        app.email?.toLowerCase().includes(q) ||
                        app.phone?.toLowerCase().includes(q) ||
                        app.projectType?.toLowerCase().includes(q)
                      );
                    })
                    .map((app) => {
                      const isPaid = app.status === "QUALIFIED" || app.payments?.some((p: any) => p.status === "PAID");
                      return (
                        <div
                          key={app.id}
                          className={`cyber-card p-6 space-y-4 flex flex-col justify-between border ${
                            isPaid ? "border-emerald-500/40 bg-gradient-to-b from-[#0E1512] to-[#080808]" : "border-crimson/20"
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Top Badges */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-bright-red tracking-wider">
                                {app.referenceId}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isPaid ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-orbitron font-bold text-emerald-400 uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    ADVANCE PAID
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-orbitron font-bold text-amber-400 uppercase">
                                    {app.status}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Client Header */}
                            <div>
                              <h4 className="font-orbitron font-black text-base text-white">{app.fullName}</h4>
                              <p className="text-xs text-[#888] flex items-center gap-2 mt-0.5">
                                <span>{app.email}</span>
                                {app.company && <span className="text-crimson">&bull; {app.company}</span>}
                              </p>
                              {app.phone && <p className="text-[11px] font-mono text-[#AAA] mt-0.5">{app.phone}</p>}
                            </div>

                            {/* Key Highlights Bar */}
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#050505] border border-white/5 text-xs">
                              <div>
                                <span className="text-[9px] font-orbitron text-[#777] uppercase block">Project Type</span>
                                <span className="font-bold text-white text-xs">{app.projectType}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-orbitron text-[#777] uppercase block">Advance Booking</span>
                                <span className="font-mono font-bold text-emerald-400 text-xs">
                                  ₹{app.finalAdvance?.toLocaleString("en-IN") || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-orbitron text-[#777] uppercase block">Client Budget</span>
                                <span className="font-bold text-[#CCC] text-[11px]">{app.budgetRange}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-orbitron text-[#777] uppercase block">Timeline</span>
                                <span className="font-bold text-[#CCC] text-[11px]">{app.timeline}</span>
                              </div>
                            </div>

                            {/* Features Preview */}
                            {Array.isArray(app.features) && app.features.length > 0 && (
                              <div>
                                <span className="text-[9px] font-orbitron text-[#777] uppercase block mb-1">
                                  Configured Features:
                                </span>
                                <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                                  {app.features.slice(0, 5).map((f: string, i: number) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded bg-[#141414] border border-white/5 text-[9px] text-[#AAA]"
                                    >
                                      ✓ {f}
                                    </span>
                                  ))}
                                  {app.features.length > 5 && (
                                    <span className="px-2 py-0.5 rounded bg-deep-red/20 text-[9px] text-bright-red font-bold">
                                      +{app.features.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Description snippet */}
                            <p className="text-xs text-[#BBB] line-clamp-2 bg-[#080808] p-2.5 rounded-lg border border-white/5 italic">
                              &ldquo;{app.description}&rdquo;
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-[#666]">
                                {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-orbitron font-bold uppercase ${
                                  app.leadQuality === "HIGH"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-[#181818] text-[#888]"
                                }`}
                              >
                                Quality: {app.leadQuality || "HIGH"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setSelectedProjectApp(app)}
                                className="py-2 px-3 rounded-xl bg-[#151515] hover:bg-[#222] text-[10px] font-orbitron font-bold uppercase text-white border border-white/10 transition-colors"
                              >
                                View Specs
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAppModal(app);
                                  setEditStatusValue(app.status);
                                  setEditQuoteValue(app.finalQuoteAmount ? String(app.finalQuoteAmount) : "");
                                  setEditNotesValue(app.adminNotes || "");
                                }}
                                className="py-2 px-3 rounded-xl bg-crimson/20 hover:bg-crimson border border-crimson/40 text-[10px] font-orbitron font-bold uppercase text-bright-red hover:text-white transition-colors"
                              >
                                Manage / Quote
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 10: INQUIRIES CONSOLE ══════════════════════════════════ */}
          {activeTab === "inquiries" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-crimson/20">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    PIPELINE LEADS
                  </span>
                  <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                    Client Inquiries & Requests
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredInquiries.map((inq) => (
                  <div key={inq.id} className="cyber-card p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-bright-red">{inq.referenceId}</span>
                        <span className="px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
                          {inq.status}
                        </span>
                      </div>
                      <h4 className="font-orbitron font-bold text-sm text-white">{inq.fullName}</h4>
                      <p className="text-xs text-[#888]">{inq.email} &bull; {inq.phone || "No phone"}</p>
                      <p className="text-xs text-[#CCC] line-clamp-3 bg-[#111] p-3 rounded-xl border border-white/5 leading-relaxed">
                        &quot;{inq.message}&quot;
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex justify-between text-[10px] font-mono text-[#AAA]">
                        <span>{inq.projectType}</span>
                        <span className="text-emerald-400 font-bold">{inq.budget}</span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        {["CONTACTED", "DISCUSSION", "APPROVED", "COMPLETED"].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleUpdateInquiryStatus(inq.id, st)}
                            className={`flex-1 py-1 rounded text-[8px] font-orbitron font-bold uppercase transition-colors ${
                              inq.status === st ? "bg-crimson text-white" : "bg-[#141414] text-[#888] hover:text-white"
                            }`}
                          >
                            {st.slice(0, 4)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TAB 11: RECENT ACTIVITY ════════════════════════════════════ */}
          {activeTab === "activity" && (
            <div className="space-y-6 max-w-4xl">
              <div className="pb-4 border-b border-crimson/20">
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  SYSTEM LOGS
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  Recent Activity Stream
                </h1>
              </div>

              <div className="space-y-3">
                {activityEvents.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-2xl bg-[#0A0A0A] border border-crimson/20 flex items-start gap-4">
                    <CodeXaAvatar src={ev.actorMediaUrl} size="sm" />
                    <div className="flex-1 text-xs space-y-1">
                      <p className="font-orbitron font-bold text-white">{ev.title}</p>
                      <p className="text-[#AAA] leading-relaxed">{ev.details}</p>
                      <span className="font-mono text-[9px] text-[#666] block">
                        {new Date(ev.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TAB 12: AUDIT LOGS ═════════════════════════════════════════ */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-crimson/20">
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  FORENSIC TRACE
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  Owner Audit Trail
                </h1>
              </div>

              <div className="overflow-x-auto rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 shadow-xl">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-orbitron uppercase text-[#777] border-b border-white/5">
                    <tr>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Actor</th>
                      <th className="pb-3">Details</th>
                      <th className="pb-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#111] transition-colors">
                        <td className="py-3 font-orbitron font-bold text-bright-red">{log.action}</td>
                        <td className="py-3 font-mono text-[#AAA]">{log.actorName || log.actorId}</td>
                        <td className="py-3 text-[#DDD]">{log.details}</td>
                        <td className="py-3 font-mono text-[#666]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ TAB 13: SETTINGS ═══════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-3xl">
              <div className="pb-4 border-b border-crimson/20">
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  CONFIGURATION
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  System Settings
                </h1>
              </div>

              <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/20 space-y-4">
                <h3 className="font-orbitron font-bold text-xs text-white uppercase">Platform Information</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-orbitron text-[#777] uppercase block">Platform</span>
                    <span className="font-orbitron font-semibold text-white">CodeXa Agency Core v2.0</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-orbitron text-[#777] uppercase block">Database</span>
                    <span className="font-mono text-emerald-400">PostgreSQL (Supabase)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-orbitron text-[#777] uppercase block">Security Authority</span>
                    <span className="font-orbitron font-bold text-bright-red">OWNER // FOUNDER</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-orbitron text-[#777] uppercase block">Storage CDN</span>
                    <span className="font-mono text-white">Supabase Storage</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.main>
      </div>

      {/* ─── MODAL: EDIT SELF PROFILE ───────────────────────────────────── */}
      <AnimatePresence>
        {editSelfModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase">Edit My Founder Profile</h3>
                <button onClick={() => setEditSelfModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selfFormFeedback && (
                <div className="p-3 rounded-xl bg-deep-red/20 border border-bright-red/50 text-xs text-bright-red">
                  {selfFormFeedback}
                </div>
              )}

              <form onSubmit={handleSaveSelfProfile} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={selfFormData.displayName}
                    onChange={(e) => setSelfFormData({ ...selfFormData, displayName: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none focus:border-bright-red"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={selfFormData.headline}
                    onChange={(e) => setSelfFormData({ ...selfFormData, headline: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="e.g. Founder & Lead Architect &bull; Cybersecurity"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Bio</label>
                  <textarea
                    rows={4}
                    value={selfFormData.bio}
                    onChange={(e) => setSelfFormData({ ...selfFormData, bio: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none resize-none"
                    placeholder="Describe your role and expertise..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    value={selfFormData.skillsStr}
                    onChange={(e) => setSelfFormData({ ...selfFormData, skillsStr: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="Full Stack, Architecture, Next.js, AI"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={selfFormData.githubUrl}
                      onChange={(e) => setSelfFormData({ ...selfFormData, githubUrl: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={selfFormData.linkedinUrl}
                      onChange={(e) => setSelfFormData({ ...selfFormData, linkedinUrl: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditSelfModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selfFormSaving}
                    className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                  >
                    {selfFormSaving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: EDIT MEMBER PROFILE ─────────────────────────────────── */}
      <AnimatePresence>
        {editMemberModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase">
                  Edit Member &bull; @{editMemberModalUser.username}
                </h3>
                <button onClick={() => setEditMemberModalUser(null)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {memberFormFeedback && (
                <div className="p-3 rounded-xl bg-deep-red/20 border border-bright-red/50 text-xs text-bright-red">
                  {memberFormFeedback}
                </div>
              )}

              <form onSubmit={handleSaveMemberProfile} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={memberFormData.displayName}
                    onChange={(e) => setMemberFormData({ ...memberFormData, displayName: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Headline</label>
                  <input
                    type="text"
                    value={memberFormData.headline}
                    onChange={(e) => setMemberFormData({ ...memberFormData, headline: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={memberFormData.bio}
                    onChange={(e) => setMemberFormData({ ...memberFormData, bio: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    value={memberFormData.skillsStr}
                    onChange={(e) => setMemberFormData({ ...memberFormData, skillsStr: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Account Role</label>
                    <select
                      value={memberFormData.role}
                      onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                      <option value="CO_FOUNDER">CO_FOUNDER</option>
                      <option value="CEO">CEO</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Account Status</label>
                    <select
                      value={memberFormData.isActive ? "true" : "false"}
                      onChange={(e) => setMemberFormData({ ...memberFormData, isActive: e.target.value === "true" })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="true">ACTIVE</option>
                      <option value="false">DISABLED</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditMemberModalUser(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={memberFormSaving}
                    className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                  >
                    {memberFormSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CREATE ACCOUNT ──────────────────────────────────────── */}
      <AnimatePresence>
        {createAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase">Provision Team Account</h3>
                <button onClick={() => setCreateAccountModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {accountFormMsg && (
                <div className={`p-3 rounded-xl text-xs ${
                  accountFormState === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-deep-red/20 text-bright-red"
                }`}>
                  {accountFormMsg}
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={accountFormData.fullName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, fullName: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="e.g. Sarah Connor"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={accountFormData.username}
                    onChange={(e) => setAccountFormData({ ...accountFormData, username: e.target.value.toLowerCase() })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="sarah"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={accountFormData.email}
                    onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="sarah@codxa-agency.online"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={accountFormData.temporaryPassword}
                    onChange={(e) => setAccountFormData({ ...accountFormData, temporaryPassword: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="At least 8 chars..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Role</label>
                    <select
                      value={accountFormData.role}
                      onChange={(e) => setAccountFormData({ ...accountFormData, role: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                      <option value="CO_FOUNDER">CO_FOUNDER</option>
                      <option value="CEO">CEO</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Leadership Title</label>
                    <input
                      type="text"
                      value={accountFormData.leadershipPosition}
                      onChange={(e) => setAccountFormData({ ...accountFormData, leadershipPosition: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                      placeholder="e.g. Lead Engineer"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateAccountModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accountFormState === "loading"}
                    className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                  >
                    {accountFormState === "loading" ? "Provisioning..." : "Create Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CREATE PROJECT ──────────────────────────────────────── */}
      <AnimatePresence>
        {createProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase">Create New Build Project</h3>
                <button onClick={() => setCreateProjectModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    value={newProjectData.title}
                    onChange={(e) => setNewProjectData({ ...newProjectData, title: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="e.g. CyberGuard AI Engine"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Category</label>
                    <select
                      value={newProjectData.category}
                      onChange={(e) => setNewProjectData({ ...newProjectData, category: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="AI">AI</option>
                      <option value="WEB">WEB</option>
                      <option value="MOBILE">MOBILE</option>
                      <option value="CYBERSECURITY">CYBERSECURITY</option>
                      <option value="CLOUD">CLOUD</option>
                      <option value="AUTOMATION">AUTOMATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Assigned Creator</label>
                    <select
                      value={newProjectData.creatorId}
                      onChange={(e) => setNewProjectData({ ...newProjectData, creatorId: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="">Owner (Self)</option>
                      {accounts.filter((a) => a.id !== currentUser?.id).map((m) => (
                        <option key={m.id} value={m.id}>{m.displayName} (@{m.username})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Short Description</label>
                  <input
                    type="text"
                    required
                    value={newProjectData.shortDesc}
                    onChange={(e) => setNewProjectData({ ...newProjectData, shortDesc: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Tech Stack (Comma-separated)</label>
                  <input
                    type="text"
                    value={newProjectData.techStackStr}
                    onChange={(e) => setNewProjectData({ ...newProjectData, techStackStr: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-orbitron text-[#AAA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProjectData.isMainProject}
                      onChange={(e) => setNewProjectData({ ...newProjectData, isMainProject: e.target.checked })}
                      className="accent-crimson"
                    />
                    <span>Main Flagship Build</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-orbitron text-[#AAA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProjectData.isHomepageVisible}
                      onChange={(e) => setNewProjectData({ ...newProjectData, isHomepageVisible: e.target.checked })}
                      className="accent-crimson"
                    />
                    <span>Showcase on Homepage</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateProjectModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={projectSaving}
                    className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                  >
                    {projectSaving ? "Creating..." : "Save Project"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: RESET PASSWORD ──────────────────────────────────────── */}
      <AnimatePresence>
        {resetPasswordModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase">
                  Reset Password &bull; @{resetPasswordModalUser.username}
                </h3>
                <button onClick={() => setResetPasswordModalUser(null)} className="p-1 rounded bg-[#1A1A1A] text-[#888]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-[#888]">Enter a new temporary password for this member (minimum 6 characters):</p>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New temporary password..."
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setResetPasswordModalUser(null)}
                    className="flex-1 py-2 rounded-xl bg-[#141414] text-xs font-orbitron text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    className="flex-1 py-2 rounded-xl bg-crimson hover:bg-bright-red text-xs font-orbitron font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: PROJECT APPLICATION FULL SPECS ──────────────────────── */}
      <AnimatePresence>
        {selectedProjectApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-crimson/20">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-bright-red font-bold">
                      {selectedProjectApp.referenceId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
                      {selectedProjectApp.status}
                    </span>
                  </div>
                  <h3 className="font-orbitron font-black text-base text-white mt-1">
                    {selectedProjectApp.fullName} &bull; {selectedProjectApp.projectType}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedProjectApp(null)}
                  className="p-1.5 rounded-xl bg-[#1A1A1A] text-[#888] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Deposit Banner */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-orbitron font-bold text-emerald-400 uppercase tracking-wider block">
                    Advance Booking Deposit
                  </span>
                  <span className="font-mono text-xl font-bold text-white">
                    ₹{selectedProjectApp.finalAdvance?.toLocaleString("en-IN")} INR
                  </span>
                </div>
                <div className="text-right text-[11px] text-[#AAA]">
                  <span className="block">Budget: {selectedProjectApp.budgetRange}</span>
                  <span className="block">Timeline: {selectedProjectApp.timeline}</span>
                </div>
              </div>

              {/* Client & Communication */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#070707] border border-white/5 text-xs">
                <div>
                  <span className="text-[9px] font-orbitron text-[#777] uppercase block">Email</span>
                  <span className="text-white font-medium break-all">{selectedProjectApp.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-orbitron text-[#777] uppercase block">Phone / WhatsApp</span>
                  <span className="font-mono text-white">{selectedProjectApp.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-[9px] font-orbitron text-[#777] uppercase block">Preferred Channel</span>
                  <span className="text-white">{selectedProjectApp.preferredContact || "Email"}</span>
                </div>
                {selectedProjectApp.company && (
                  <div>
                    <span className="text-[9px] font-orbitron text-[#777] uppercase block">Company / Brand</span>
                    <span className="text-white">{selectedProjectApp.company}</span>
                  </div>
                )}
                {selectedProjectApp.city && (
                  <div>
                    <span className="text-[9px] font-orbitron text-[#777] uppercase block">City</span>
                    <span className="text-white">{selectedProjectApp.city}</span>
                  </div>
                )}
                <div>
                  <span className="text-[9px] font-orbitron text-[#777] uppercase block">Submitted At</span>
                  <span className="font-mono text-[#AAA]">
                    {new Date(selectedProjectApp.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Features & Architecture Matrix */}
              <div className="space-y-2 text-xs">
                <span className="font-orbitron font-bold text-[10px] uppercase text-[#888] tracking-wider block">
                  Configured Specifications
                </span>

                {Array.isArray(selectedProjectApp.purposes) && selectedProjectApp.purposes.length > 0 && (
                  <div>
                    <span className="text-[10px] text-[#777] block mb-1">Purposes:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedProjectApp.purposes.map((p: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-[#141414] text-[10px] text-[#CCC] border border-white/5">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(selectedProjectApp.features) && selectedProjectApp.features.length > 0 && (
                  <div>
                    <span className="text-[10px] text-[#777] block mb-1">Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedProjectApp.features.map((f: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-deep-red/15 text-[10px] text-bright-red border border-crimson/20">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded bg-[#070707] border border-white/5">
                    <span className="text-[9px] text-[#666] uppercase block">Auth:</span>
                    <span className="text-white">{selectedProjectApp.authOption || "No login"}</span>
                  </div>
                  <div className="p-2 rounded bg-[#070707] border border-white/5">
                    <span className="text-[9px] text-[#666] uppercase block">Dashboard:</span>
                    <span className="text-white">{selectedProjectApp.dashboardOption || "None"}</span>
                  </div>
                  <div className="p-2 rounded bg-[#070707] border border-white/5">
                    <span className="text-[9px] text-[#666] uppercase block">Database:</span>
                    <span className="text-white">{selectedProjectApp.databaseOption || "No"}</span>
                  </div>
                  <div className="p-2 rounded bg-[#070707] border border-white/5">
                    <span className="text-[9px] text-[#666] uppercase block">Animation:</span>
                    <span className="text-white">{selectedProjectApp.animationLevel || "Standard"}</span>
                  </div>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <span className="font-orbitron font-bold text-[10px] uppercase text-[#888] tracking-wider block mb-1">
                  Client Project Scope & Idea
                </span>
                <div className="p-3.5 rounded-xl bg-[#070707] border border-white/5 text-xs text-[#DDD] leading-relaxed whitespace-pre-line">
                  {selectedProjectApp.description}
                </div>
              </div>

              {/* Payment Details */}
              {selectedProjectApp.payments && selectedProjectApp.payments.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#080808] border border-white/5 text-xs space-y-1.5">
                  <span className="font-orbitron font-bold text-[10px] uppercase text-emerald-400 block">
                    Razorpay Payment Record
                  </span>
                  {selectedProjectApp.payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between font-mono text-[11px] text-[#AAA]">
                      <span>Order: {p.razorpayOrderId}</span>
                      <span className="text-emerald-400 font-bold">{p.status} (₹{p.amount})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    const app = selectedProjectApp;
                    setSelectedProjectApp(null);
                    setEditingAppModal(app);
                    setEditStatusValue(app.status);
                    setEditQuoteValue(app.finalQuoteAmount ? String(app.finalQuoteAmount) : "");
                    setEditNotesValue(app.adminNotes || "");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all shadow-neon"
                >
                  Manage Status & Quotation
                </button>
                <a
                  href={`https://wa.me/${selectedProjectApp.phone?.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(selectedProjectApp.fullName)}%2C%20CodeXa%20Founder%20Ashu%20here%20regarding%20your%20project%20application%20(${selectedProjectApp.referenceId})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-[#151515] hover:bg-[#202020] text-emerald-400 border border-emerald-500/30 text-xs font-orbitron font-bold uppercase transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: EDIT APPLICATION STATUS & QUOTE ─────────────────────── */}
      <AnimatePresence>
        {editingAppModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red uppercase font-bold">
                    {editingAppModal.referenceId}
                  </span>
                  <h3 className="font-orbitron font-bold text-sm text-white uppercase mt-0.5">
                    Manage Project Application
                  </h3>
                </div>
                <button
                  onClick={() => setEditingAppModal(null)}
                  className="p-1 rounded bg-[#1A1A1A] text-[#888]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">
                    Application Status
                  </label>
                  <select
                    value={editStatusValue}
                    onChange={(e) => setEditStatusValue(e.target.value)}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none focus:border-bright-red"
                  >
                    <option value="QUALIFIED">QUALIFIED (Deposit Verified)</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="NEEDS_CLARIFICATION">NEEDS CLARIFICATION</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="DECLINED">DECLINED</option>
                    <option value="PAYMENT_PENDING">PAYMENT PENDING</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">
                    Final Approved Quotation Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={editQuoteValue}
                    onChange={(e) => setEditQuoteValue(e.target.value)}
                    placeholder="e.g. 45000"
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none focus:border-bright-red font-mono"
                  />
                  <span className="text-[9px] text-[#666] mt-0.5 block">
                    Advance deposit of ₹{editingAppModal.finalAdvance} is deducted from this quote.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">
                    Internal Engineering Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editNotesValue}
                    onChange={(e) => setEditNotesValue(e.target.value)}
                    placeholder="Architectural notes, milestone timeline agreements, or client correspondence details..."
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none focus:border-bright-red resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingAppModal(null)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141414] text-xs font-orbitron text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditingApp}
                    disabled={editSaving}
                    className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-xs font-orbitron font-bold text-white uppercase shadow-neon"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: MEDIA SELECTOR ──────────────────────────────────────── */}
      <CodeXaMediaSelectorModal
        isOpen={mediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        currentAvatarUrl={currentUser?.mediaUrl}
        onSuccess={(newAvatarUrl) => {
          setCurrentUser((prev: any) => (prev ? { ...prev, mediaUrl: newAvatarUrl } : null));
          setAccounts((prev) => prev.map((a) => a.id === currentUser?.id ? { ...a, mediaUrl: newAvatarUrl } : a));
        }}
      />

    </div>
  );
}

export default function OwnerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070707] text-white flex items-center justify-center font-orbitron">Loading Founder Console...</div>}>
      <OwnerDashboardContent />
    </Suspense>
  );
}
