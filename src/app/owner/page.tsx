"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
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
  Edit,
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
  ChevronRight
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
  SiteSettings 
} from "@/lib/data-store";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { CodeXaMediaSelectorModal } from "@/components/ui/CodeXaMediaSelectorModal";

type TabType = "overview" | "accounts" | "inquiries" | "projects" | "feed" | "chat" | "notifications" | "audit" | "settings";

function OwnerDashboardContent() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);

  // Data states (Zero Dummy Data Guarantee)
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    mainProjectsHomeVisible: true,
    teamProjectsHomeVisible: true,
  });

  // Chat states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Social Feed state
  const [newPostContent, setNewPostContent] = useState("");
  const [isPostAnnouncement, setIsPostAnnouncement] = useState(false);
  const [selectedPostComments, setSelectedPostComments] = useState<{ [postId: string]: PostComment[] }>({});
  const [newCommentTexts, setNewCommentTexts] = useState<{ [postId: string]: string }>({});
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);

  // Modals & Drawers
  const [createAccountModalOpen, setCreateAccountModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);

  // Form states for creating account
  const [accountFormData, setAccountFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    role: "TEAM_MEMBER",
    temporaryPassword: "",
    headline: "",
    bio: ""
  });
  const [accountFormState, setAccountFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [accountFormMsg, setAccountFormMsg] = useState("");

  // Inquiries filter
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("ALL");
  const [inquirySearch, setInquirySearch] = useState("");

  // Fetch session & initial data
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated || !data.user) {
          router.replace("/login");
          return;
        }
        if (data.user.role !== "OWNER") {
          if (data.user.role === "ADMIN") router.replace("/admin");
          else router.replace("/dashboard");
          return;
        }
        setCurrentUser(data.user);
        loadAllData();
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/owner/accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
      fetch("/api/inquiries").then((r) => r.json()).catch(() => ({ inquiries: [] })),
      fetch("/api/projects").then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch("/api/feed/posts").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch("/api/site-settings").then((r) => r.json()).catch(() => ({ settings: { mainProjectsHomeVisible: true, teamProjectsHomeVisible: true } })),
      fetch("/api/notifications").then((r) => r.json()).catch(() => ({ notifications: [], unreadCount: 0 })),
      fetch("/api/audit-logs").then((r) => r.json()).catch(() => ({ logs: [] })),
      fetch("/api/chat/conversations").then((r) => r.json()).catch(() => ({ conversations: [] })),
    ])
      .then(([accRes, inqRes, projRes, feedRes, settRes, notifRes, auditRes, convRes]) => {
        if (accRes.accounts) setAccounts(accRes.accounts);
        if (inqRes.inquiries) setInquiries(inqRes.inquiries);
        if (projRes.projects) setProjects(projRes.projects);
        if (feedRes.posts) setPosts(feedRes.posts);
        if (settRes.settings) setSiteSettings(settRes.settings);
        if (notifRes.notifications) {
          setNotifications(notifRes.notifications);
          setUnreadNotifsCount(notifRes.unreadCount || 0);
        }
        if (auditRes.logs) setAuditLogs(auditRes.logs);
        if (convRes.conversations) {
          setConversations(convRes.conversations);
          if (convRes.conversations.length > 0 && !activeConversationId) {
            setActiveConversationId(convRes.conversations[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  // Load chat messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    fetch(`/api/chat/messages?conversationId=${activeConversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setChatMessages(data.messages);
      })
      .catch(() => {});
  }, [activeConversationId]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  };

  // ── Account Actions ────────────────────────────────────────────────────────
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormState("loading");
    setAccountFormMsg("");

    try {
      const res = await fetch("/api/owner/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountFormData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAccountFormState("success");
        setAccountFormMsg(data.message);
        setAccounts((prev) => [...prev, data.account]);
        setTimeout(() => {
          setCreateAccountModalOpen(false);
          setAccountFormState("idle");
          setAccountFormData({
            fullName: "",
            username: "",
            email: "",
            role: "TEAM_MEMBER",
            temporaryPassword: "",
            headline: "",
            bio: ""
          });
        }, 1200);
      } else {
        setAccountFormState("error");
        setAccountFormMsg(data.error || "Failed to provision account.");
      }
    } catch {
      setAccountFormState("error");
      setAccountFormMsg("Network error.");
    }
  };

  const handleToggleAccountActive = async (account: Profile) => {
    const newStatus = !account.isActive;
    try {
      const res = await fetch(`/api/owner/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, isActive: newStatus } : a));
      }
    } catch {}
  };

  const handleChangeRole = async (account: Profile, newRole: string) => {
    try {
      const res = await fetch(`/api/owner/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, role: newRole as any } : a));
      }
    } catch {}
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModalUser || newPasswordInput.length < 6) return;
    try {
      const res = await fetch(`/api/owner/accounts/${resetPasswordModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      if (res.ok) {
        alert(`Password for @${resetPasswordModalUser.username} updated successfully.`);
        setResetPasswordModalUser(null);
        setNewPasswordInput("");
      }
    } catch {}
  };

  const handleDeleteAccount = async (account: Profile) => {
    if (!confirm(`Are you sure you want to permanently delete account @${account.username}?`)) return;
    try {
      const res = await fetch(`/api/owner/accounts/${account.id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
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

  // ── Project Main Approval ──────────────────────────────────────────────────
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

  // ── Homepage Section Visibility Toggle ─────────────────────────────────────
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

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await fetch("/api/feed/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, hasLiked: data.liked, likesCount: data.totalLikes }
              : p
          )
        );
      }
    } catch {}
  };

  const handleLoadComments = async (postId: string) => {
    if (openCommentPostId === postId) {
      setOpenCommentPostId(null);
      return;
    }
    setOpenCommentPostId(postId);
    try {
      const res = await fetch(`/api/feed/comments?postId=${postId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedPostComments((prev) => ({ ...prev, [postId]: data.comments }));
      }
    } catch {}
  };

  const handleAddComment = async (postId: string) => {
    const text = newCommentTexts[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch("/api/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: text.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setNewCommentTexts((prev) => ({ ...prev, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
        );
      }
    } catch {}
  };

  // ── Chat Messaging ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConversationId) return;

    const msg = newMessageText.trim();
    setNewMessageText("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: msg,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    } catch {}
  };

  const handleStartDirectChat = async (recipientId: string) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (!conversations.some((c) => c.id === data.conversation.id)) {
          setConversations((prev) => [data.conversation, ...prev]);
        }
        setActiveConversationId(data.conversation.id);
      }
    } catch {}
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const matchStatus = inquiryStatusFilter === "ALL" || inq.status === inquiryStatusFilter;
    const q = inquirySearch.toLowerCase();
    const matchSearch = !inquirySearch || 
      inq.fullName.toLowerCase().includes(q) || 
      inq.referenceId.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col">
      {/* ─── TOP COMMAND BAR ──────────────────────────────────────────────── */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-deep-red/30 border border-crimson/40">
            <Shield className="w-5 h-5 text-bright-red" />
          </div>
          <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white">
            CODEXA <span className="text-crimson text-xs font-normal">COMMAND CENTER</span>
          </span>
          <span className="hidden sm:inline-block ml-3 px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
            OWNER ACCESS
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            className="hidden md:flex items-center gap-1.5 text-xs font-orbitron text-[#888] hover:text-white transition-colors uppercase tracking-wider"
          >
            Public Site <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Owner Profile */}
          <div
            onClick={() => setMediaSelectorOpen(true)}
            className="flex items-center gap-2 pl-3 border-l border-white/10 cursor-pointer group"
            title="Click to Change Profile Picture"
          >
            <CodeXaAvatar
              src={currentUser?.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
              alt="Ashu"
              size="sm"
              showGlow
              className="group-hover:border-bright-red transition-all"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-orbitron font-bold text-white group-hover:text-bright-red transition-colors leading-tight">Ashu</p>
              <p className="text-[9px] font-mono text-crimson">@ashu (Edit PFP)</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-[#111] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-bright-red transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── MAIN DASHBOARD BODY (Sidebar + Content) ──────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-crimson/15 bg-[#080808] flex flex-col justify-between p-4 flex-shrink-0">
          <nav className="space-y-1.5">
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "accounts", label: "Accounts & Team", icon: Users, badge: accounts.length },
              { id: "inquiries", label: "Inquiries Console", icon: Inbox, badge: inquiries.filter((i) => i.status === "NEW").length },
              { id: "projects", label: "Projects Pipeline", icon: FolderGit2, badge: projects.filter((p) => p.isMainProject).length },
              { id: "feed", label: "Social Feed", icon: Share2, badge: posts.length },
              { id: "chat", label: "Internal Chat", icon: MessageSquare },
              { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifsCount || undefined },
              { id: "audit", label: "Security & Audit", icon: Shield },
              { id: "settings", label: "System Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-orbitron text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-crimson text-white border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                      : "text-[#888] hover:text-white hover:bg-[#111] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
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
          </nav>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="flex-1 bg-[#070707] overflow-y-auto p-6 md:p-8">
          
          {/* ═══ OVERVIEW ════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div>
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  EXECUTIVE SUMMARY
                </span>
                <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase mt-1">
                  CodeXa Agency Metrics
                </h1>
              </div>

              {/* Zero-dummy Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Total Members", value: accounts.length, sub: "Owner & Core Team", icon: Users, color: "text-bright-red", action: () => setActiveTab("accounts") },
                  { label: "New Inquiries", value: inquiries.filter((i) => i.status === "NEW").length, sub: `${inquiries.length} Total Pipeline`, icon: Inbox, color: "text-amber-400", action: () => setActiveTab("inquiries") },
                  { label: "Main Projects", value: projects.filter((p) => p.isMainProject).length, sub: `${projects.length} Total Builds`, icon: Sparkles, color: "text-emerald-400", action: () => setActiveTab("projects") },
                  { label: "Feed Posts", value: posts.length, sub: "Community Updates", icon: Share2, color: "text-blue-400", action: () => setActiveTab("feed") },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={idx}
                      onClick={card.action}
                      className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/50 cursor-pointer transition-all duration-300 group shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-orbitron font-bold text-[#888] uppercase tracking-wider">{card.label}</span>
                        <Icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <div className="text-3xl font-orbitron font-black text-white group-hover:text-bright-red transition-colors">
                        {card.value}
                      </div>
                      <p className="text-[11px] text-[#666] mt-1 font-light">{card.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Recent Inquiries List */}
              <div className="rounded-2xl bg-[#090909] border border-crimson/20 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
                    Recent Inquiries
                  </h3>
                  <button onClick={() => setActiveTab("inquiries")} className="text-xs font-orbitron text-bright-red hover:underline flex items-center gap-1">
                    View Pipeline <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {inquiries.length === 0 ? (
                  <p className="text-xs text-[#666] text-center py-6">No inquiries yet.</p>
                ) : (
                  inquiries.slice(0, 4).map((inq) => (
                    <div
                      key={inq.id}
                      onClick={() => { setSelectedInquiry(inq); setActiveTab("inquiries"); }}
                      className="p-4 rounded-xl bg-[#111] hover:bg-[#161616] border border-white/5 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-white">{inq.fullName} &bull; <span className="text-crimson">{inq.referenceId}</span></span>
                        <p className="text-xs text-[#777] line-clamp-1 mt-0.5">{inq.message}</p>
                      </div>
                      <span className="text-[9px] font-orbitron font-bold px-2 py-0.5 rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">
                        {inq.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═══ SOCIAL FEED ══════════════════════════════════════════════════ */}
          {activeTab === "feed" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  INTERNAL NETWORK
                </span>
                <h1 className="font-orbitron font-black text-2xl text-white uppercase mt-1">
                  CodeXa Team Feed
                </h1>
              </div>

              {/* Create Post Composer */}
              <form onSubmit={handleCreatePost} className="p-5 rounded-2xl bg-[#090909] border border-crimson/25 space-y-4 shadow-xl">
                <textarea
                  rows={3}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share a development milestone, architecture insight, or announcement with CodeXa..."
                  className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl p-4 text-xs text-white placeholder-[#555] outline-none resize-none transition-all"
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-orbitron text-[#888] hover:text-white">
                    <input
                      type="checkbox"
                      checked={isPostAnnouncement}
                      onChange={(e) => setIsPostAnnouncement(e.target.checked)}
                      className="accent-crimson"
                    />
                    <span className="text-[10px] uppercase font-bold text-bright-red">Mark as Official Announcement</span>
                  </label>

                  <button
                    type="submit"
                    disabled={!newPostContent.trim()}
                    className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white text-xs font-orbitron font-bold uppercase transition-all shadow-md flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Publish Post
                  </button>
                </div>
              </form>

              {/* Feed Posts List */}
              {posts.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-[#090909] border border-white/5 space-y-2">
                  <Share2 className="w-8 h-8 text-[#555] mx-auto" />
                  <p className="text-xs text-[#777] font-orbitron uppercase">No posts yet.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-[#090909] border border-crimson/20 p-6 space-y-4 shadow-lg"
                  >
                    {/* Author Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-crimson/30 bg-[#111]">
                          <img src={post.author?.mediaUrl || "/assets/images/logo.jpeg"} alt={post.author?.displayName || "Author"} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron font-bold text-sm text-white">{post.author?.displayName || "CodeXa Member"}</span>
                            {post.isAnnouncement && (
                              <span className="bg-crimson text-white text-[8px] font-orbitron font-black px-2 py-0.5 rounded-full uppercase">
                                ANNOUNCEMENT
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#666]">
                            @{post.author?.username} &bull; {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <p className="text-xs sm:text-sm text-[#DDD] leading-relaxed whitespace-pre-line font-light">
                      {post.content}
                    </p>

                    {/* Project Link Attachment */}
                    {post.project && (
                      <Link
                        href={`/projects/${post.project.slug}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] border border-crimson/20 text-xs font-orbitron text-bright-red hover:text-white transition-colors"
                      >
                        <FolderGit2 className="w-3.5 h-3.5" /> Project: {post.project.title} &rarr;
                      </Link>
                    )}

                    {/* Like & Comment Action Buttons */}
                    <div className="flex items-center gap-6 pt-3 border-t border-white/5 text-xs font-orbitron">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-colors ${
                          post.hasLiked ? "text-bright-red font-bold" : "text-[#888] hover:text-white"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${post.hasLiked ? "fill-bright-red text-bright-red" : ""}`} />
                        <span>{post.likesCount} Likes</span>
                      </button>

                      <button
                        onClick={() => handleLoadComments(post.id)}
                        className="flex items-center gap-1.5 text-[#888] hover:text-white transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.commentsCount} Comments</span>
                      </button>
                    </div>

                    {/* Expandable Comment Drawer */}
                    {openCommentPostId === post.id && (
                      <div className="pt-3 space-y-3 border-t border-white/5">
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(selectedPostComments[post.id] || []).map((comm) => (
                            <div key={comm.id} className="p-3 rounded-xl bg-[#111] text-xs">
                              <span className="font-bold text-bright-red font-orbitron text-[11px] block">
                                {comm.author?.displayName || "Member"}
                              </span>
                              <p className="text-[#CCC] mt-0.5">{comm.content}</p>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCommentTexts[post.id] || ""}
                            onChange={(e) => setNewCommentTexts({ ...newCommentTexts, [post.id]: e.target.value })}
                            placeholder="Add a reply..."
                            className="flex-1 bg-[#111] border border-crimson/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-bright-red"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="px-4 py-2 rounded-lg bg-crimson text-white text-xs font-orbitron font-bold uppercase"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* ═══ ACCOUNTS & TEAM ══════════════════════════════════════════════ */}
          {activeTab === "accounts" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                    OWNER ACCESS ONLY
                  </span>
                  <h1 className="font-orbitron font-black text-2xl text-white uppercase mt-1">
                    Team & Account Management
                  </h1>
                </div>
                <button
                  onClick={() => setCreateAccountModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" /> Provision New Account
                </button>
              </div>

              {/* Accounts Table */}
              <div className="rounded-2xl bg-[#090909] border border-crimson/20 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111] border-b border-white/5 font-orbitron text-[10px] text-[#888] uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Member</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Projects</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-light">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-[#0E0E0E] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-crimson/30 bg-[#111] flex-shrink-0">
                              <img src={account.mediaUrl || "/assets/images/logo.jpeg"} alt={account.displayName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-orbitron font-bold text-white">{account.displayName}</p>
                              <p className="text-[11px] font-mono text-[#777]">@{account.username} &bull; {account.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={account.role}
                            onChange={(e) => handleChangeRole(account, e.target.value)}
                            disabled={account.id === currentUser?.id}
                            className="bg-[#141414] border border-crimson/20 rounded px-2.5 py-1 text-xs font-orbitron uppercase text-white outline-none focus:border-bright-red"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="TEAM_MEMBER">TEAM MEMBER</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAccountActive(account)}
                            disabled={account.id === currentUser?.id}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-orbitron font-bold uppercase border transition-all ${
                              account.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30"
                            }`}
                          >
                            {account.isActive ? "ACTIVE" : "DEACTIVATED"}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-white">
                          {account.projectsCount || 0} Builds
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/team/${account.username}`}
                              target="_blank"
                              className="p-1.5 rounded bg-[#141414] hover:bg-[#222] text-[#A5A5A5] hover:text-white"
                              title="View Public Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => { setResetPasswordModalUser(account); setNewPasswordInput(""); }}
                              className="p-1.5 rounded bg-[#141414] hover:bg-[#222] text-[#A5A5A5] hover:text-amber-400"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            {account.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteAccount(account)}
                                className="p-1.5 rounded bg-[#141414] hover:bg-red-900/30 text-[#A5A5A5] hover:text-red-400"
                                title="Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ INQUIRIES CONSOLE ════════════════════════════════════════════ */}
          {activeTab === "inquiries" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="font-orbitron font-black text-2xl text-white uppercase">Inquiries Pipeline ({filteredInquiries.length})</h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 space-y-3">
                  {filteredInquiries.length === 0 ? (
                    <p className="text-xs text-[#666] p-6 text-center bg-[#090909] rounded-2xl">No inquiries found.</p>
                  ) : (
                    filteredInquiries.map((inq) => (
                      <div
                        key={inq.id}
                        onClick={() => setSelectedInquiry(inq)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          selectedInquiry?.id === inq.id ? "bg-deep-red/15 border-bright-red" : "bg-[#090909] border-crimson/15"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-xs font-bold text-bright-red">{inq.referenceId}</span>
                          <span className="text-[9px] font-orbitron font-bold px-2 py-0.5 rounded uppercase border bg-amber-500/10 text-amber-400 border-amber-500/30">
                            {inq.status}
                          </span>
                        </div>
                        <h4 className="font-orbitron font-bold text-sm text-white">{inq.fullName}</h4>
                        <p className="text-xs text-[#777] line-clamp-1">{inq.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="lg:col-span-6">
                  {selectedInquiry ? (
                    <div className="rounded-2xl bg-[#090909] border border-crimson/25 p-6 space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <h3 className="font-orbitron font-bold text-base text-white">{selectedInquiry.fullName}</h3>
                        <button onClick={() => setSelectedInquiry(null)}><X className="w-4 h-4 text-[#888]" /></button>
                      </div>
                      <div className="space-y-2 text-xs bg-[#111] p-3.5 rounded-xl">
                        <div><span className="text-[#777]">Email:</span> <a href={`mailto:${selectedInquiry.email}`} className="text-bright-red">{selectedInquiry.email}</a></div>
                        <div><span className="text-[#777]">Budget:</span> <span className="text-emerald-400 font-bold">{selectedInquiry.budget}</span></div>
                      </div>
                      <div className="bg-[#050505] p-3.5 rounded-xl border border-white/5 text-xs text-[#CCC] whitespace-pre-line">
                        {selectedInquiry.message}
                      </div>
                      <div>
                        <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Update Status</label>
                        <select
                          value={selectedInquiry.status}
                          onChange={(e) => handleUpdateInquiryStatus(selectedInquiry.id, e.target.value)}
                          className="w-full bg-[#111] border border-crimson/30 rounded-lg p-2 text-xs font-orbitron text-white outline-none"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="DISCUSSION">DISCUSSION</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 rounded-2xl bg-[#090909] border border-white/5 flex items-center justify-center text-xs font-orbitron text-[#666]">
                      Select an inquiry to view details.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PROJECTS PIPELINE (Main Project Approvals) ═══════════════════ */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              <h1 className="font-orbitron font-black text-2xl text-white uppercase">Projects Pipeline</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((proj) => (
                  <div key={proj.id} className="rounded-2xl bg-[#090909] border border-crimson/20 p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="h-40 rounded-xl overflow-hidden bg-[#111] mb-3">
                        <img src={proj.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"} alt={proj.title} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="font-orbitron font-bold text-base text-white">{proj.title}</h4>
                      <p className="text-xs text-[#777] line-clamp-2 mt-1">{proj.shortDesc}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/5 text-xs font-orbitron">
                      <div className="flex items-center justify-between">
                        <span className="text-[#888]">Main Official Build:</span>
                        <button
                          onClick={() => handleToggleMainProject(proj)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border transition-all ${
                            proj.isMainProject
                              ? "bg-crimson text-white border-bright-red shadow-[0_0_10px_rgba(217,4,41,0.4)]"
                              : "bg-[#141414] text-[#666] border-white/10"
                          }`}
                        >
                          {proj.isMainProject ? "APPROVED" : "APPROVE"}
                        </button>
                      </div>
                      <div className="pt-2 text-right">
                        <Link href={`/projects/${proj.slug}`} target="_blank" className="text-[10px] text-bright-red uppercase flex items-center justify-end gap-1">
                          Case Study <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ INTERNAL CHAT ════════════════════════════════════════════════ */}
          {activeTab === "chat" && (
            <div className="h-[75vh] rounded-2xl bg-[#090909] border border-crimson/25 overflow-hidden flex shadow-2xl">
              {/* Channel list */}
              <div className="w-72 border-r border-crimson/15 bg-[#060606] flex flex-col">
                <div className="p-4 border-b border-white/5">
                  <span className="text-[10px] font-orbitron text-bright-red uppercase tracking-wider font-bold">CHANNELS</span>
                  <h3 className="font-orbitron font-bold text-sm text-white">Direct & Team Rooms</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        conv.id === activeConversationId ? "bg-deep-red/20 border border-crimson/40 text-white" : "hover:bg-[#111] text-[#888]"
                      }`}
                    >
                      <p className="font-orbitron font-bold text-xs truncate text-white">{conv.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 flex flex-col justify-between bg-[#080808]">
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-xl bg-[#141414] text-xs max-w-md">
                      <span className="font-bold text-bright-red text-[11px] block">{msg.sender?.displayName || "Member"}</span>
                      {msg.message}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#0A0A0A] flex gap-3">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type internal encrypted message..."
                    className="flex-1 bg-[#111] border border-crimson/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-crimson text-white text-xs font-orbitron font-bold">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ═══ SETTINGS (Homepage Section Visibility Toggles) ═══════════════ */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
                  INFRASTRUCTURE CONFIG
                </span>
                <h1 className="font-orbitron font-black text-2xl text-white uppercase mt-1">
                  Homepage Section Visibility & Controls
                </h1>
              </div>

              <div className="rounded-2xl bg-[#090909] border border-crimson/20 p-6 space-y-5">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider pb-3 border-b border-white/5">
                  Homepage Dynamic Sections
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#111] border border-white/5">
                    <div>
                      <p className="font-orbitron font-bold text-xs text-white">Main Projects Showcase</p>
                      <p className="text-[11px] text-[#666]">Renders official CodeXa flagship builds section on homepage</p>
                    </div>
                    <button
                      onClick={() => handleToggleHomepageSection("mainProjectsHomeVisible")}
                      className={`px-4 py-1.5 rounded-full text-xs font-orbitron font-bold uppercase transition-all border ${
                        siteSettings.mainProjectsHomeVisible
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-red-500/20 text-red-400 border-red-500/40"
                      }`}
                    >
                      {siteSettings.mainProjectsHomeVisible ? "VISIBLE ON HOMEPAGE" : "HIDDEN FROM HOMEPAGE"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#111] border border-white/5">
                    <div>
                      <p className="font-orbitron font-bold text-xs text-white">Team Projects Showcase</p>
                      <p className="text-[11px] text-[#666]">Renders category-filtered developer builds section on homepage</p>
                    </div>
                    <button
                      onClick={() => handleToggleHomepageSection("teamProjectsHomeVisible")}
                      className={`px-4 py-1.5 rounded-full text-xs font-orbitron font-bold uppercase transition-all border ${
                        siteSettings.teamProjectsHomeVisible
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-red-500/20 text-red-400 border-red-500/40"
                      }`}
                    >
                      {siteSettings.teamProjectsHomeVisible ? "VISIBLE ON HOMEPAGE" : "HIDDEN FROM HOMEPAGE"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ AUDIT LOGS ═══════════════════════════════════════════════════ */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <h1 className="font-orbitron font-black text-2xl text-white uppercase">Security Audit Logs</h1>
              <div className="rounded-2xl bg-[#090909] border border-crimson/20 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#111] border-b border-white/5 text-[10px] text-[#888] uppercase">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0E0E0E]">
                        <td className="p-4 text-[#777]">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-4 text-bright-red font-bold">{log.action}</td>
                        <td className="p-4 text-white">{log.actorName || "System"}</td>
                        <td className="p-4 text-[#AAA] font-sans">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ════════════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <h1 className="font-orbitron font-black text-2xl text-white uppercase">System Notifications</h1>
              {notifications.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-[#090909] border border-crimson/20 text-xs">
                  <p className="font-bold text-bright-red">{n.title}</p>
                  <p className="text-[#AAA] mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* ─── PROVISION ACCOUNT MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {createAccountModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setCreateAccountModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-crimson/30 rounded-2xl w-full max-w-lg p-6 md:p-8 relative shadow-2xl"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-5">
                <h3 className="font-orbitron font-black text-xl text-white uppercase">Provision Member Account</h3>
                <button onClick={() => setCreateAccountModalOpen(false)} className="text-[#888] hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {accountFormState === "error" && (
                <div className="p-3 rounded bg-deep-red/20 border border-bright-red text-xs text-bright-red mb-4">
                  {accountFormMsg}
                </div>
              )}
              {accountFormState === "success" && (
                <div className="p-3 rounded bg-emerald-500/20 border border-emerald-500 text-xs text-emerald-400 mb-4">
                  {accountFormMsg}
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={accountFormData.fullName}
                      onChange={(e) => setAccountFormData({ ...accountFormData, fullName: e.target.value })}
                      placeholder="e.g. Aakash Varma"
                      className="w-full bg-[#111] border border-crimson/20 rounded-lg p-2.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={accountFormData.username}
                      onChange={(e) => setAccountFormData({ ...accountFormData, username: e.target.value })}
                      placeholder="e.g. aakash"
                      className="w-full bg-[#111] border border-crimson/20 rounded-lg p-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={accountFormData.email}
                      onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                      placeholder="aakash@codexa.agency"
                      className="w-full bg-[#111] border border-crimson/20 rounded-lg p-2.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Role *</label>
                    <select
                      value={accountFormData.role}
                      onChange={(e) => setAccountFormData({ ...accountFormData, role: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-lg p-2.5 text-xs font-orbitron text-white outline-none"
                    >
                      <option value="TEAM_MEMBER">TEAM MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="OWNER">OWNER</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Temporary Password *</label>
                  <input
                    type="text"
                    required
                    value={accountFormData.temporaryPassword}
                    onChange={(e) => setAccountFormData({ ...accountFormData, temporaryPassword: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#111] border border-crimson/20 rounded-lg p-2.5 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateAccountModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-[#141414] text-xs font-orbitron text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accountFormState === "loading"}
                    className="flex-1 py-2.5 rounded-lg bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase"
                  >
                    {accountFormState === "loading" ? "PROVISIONING..." : "CREATE ACCOUNT"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── RESET PASSWORD MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {resetPasswordModalUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setResetPasswordModalUser(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-crimson/30 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <h3 className="font-orbitron font-bold text-lg text-white uppercase mb-1">Reset Password</h3>
              <p className="text-xs text-[#888] mb-4">Update credentials for <strong>@{resetPasswordModalUser.username}</strong>.</p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)..."
                  className="w-full bg-[#111] border border-crimson/20 rounded-lg p-3 text-xs text-white font-mono outline-none"
                />
                <div className="flex gap-3">
                  <button onClick={() => setResetPasswordModalUser(null)} className="flex-1 py-2.5 rounded-lg bg-[#141414] text-xs font-orbitron text-[#888] uppercase">Cancel</button>
                  <button onClick={handleResetPassword} disabled={newPasswordInput.length < 6} className="flex-1 py-2.5 rounded-lg bg-crimson text-white text-xs font-orbitron font-bold uppercase">Update Password</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MEDIA SELECTOR MODAL ─────────────────────────────────────── */}
      <CodeXaMediaSelectorModal
        isOpen={mediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        currentAvatarUrl={currentUser?.mediaUrl}
        onSuccess={(newAvatarUrl) => {
          if (currentUser) {
            setCurrentUser((prev: any) => ({ ...prev, mediaUrl: newAvatarUrl }));
          }
          setAccounts((prev) =>
            prev.map((a) => (a.id === currentUser?.id ? { ...a, mediaUrl: newAvatarUrl } : a))
          );
        }}
      />
    </div>
  );
}

export default function OwnerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070707]" />}>
      <OwnerDashboardContent />
    </Suspense>
  );
}
