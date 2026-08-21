"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  Linkedin,
  Globe,
  ArrowLeft,
  ExternalLink,
  ArrowUpRight,
  Code2,
  Sparkles,
  Layers,
  Shield,
  Mail,
  Share2,
  Check,
  Cpu,
  MessageSquare,
  Edit3,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  FolderGit2,
  UserCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  AlertCircle,
  Key
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { NeonButton } from "@/components/ui/NeonButton";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { CodeXaMediaSelectorModal } from "@/components/ui/CodeXaMediaSelectorModal";
import { Profile, Project, Post } from "@/lib/data-store";

type TabType = "posts" | "projects" | "about";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ projectsCount: 0, postsCount: 0, collabCount: 0 });
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [collabProjects, setCollabProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Active viewer session & role
  const [currentSessionUser, setCurrentSessionUser] = useState<any>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [copied, setCopied] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Edit Profile Form State
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    headline: "",
    bio: "",
    skillsStr: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 1. Fetch Session & Profile Data
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentSessionUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    fetch(`/api/profile/${username}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfile(data.profile);
          setStats(data.stats || { projectsCount: 0, postsCount: 0, collabCount: 0 });
          setCreatedProjects(data.createdProjects || []);
          setCollabProjects(data.collabProjects || []);
          setPosts(data.posts || []);

          setEditFormData({
            displayName: data.profile.displayName || "",
            headline: data.profile.headline || "",
            bio: data.profile.bio || "",
            skillsStr: (data.profile.skills || []).join(", "),
            githubUrl: data.profile.githubUrl || "",
            linkedinUrl: data.profile.linkedinUrl || "",
            portfolioUrl: data.profile.portfolioUrl || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  // Copy Profile Link
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Direct Message action
  const handleDirectMessage = () => {
    if (!profile) return;
    if (!currentSessionUser) {
      router.push(`/login?redirect=/dashboard/messages?user=${profile.id}`);
      return;
    }
    router.push(`/dashboard/messages?user=${profile.id}`);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/profile/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editFormData.displayName,
          headline: editFormData.headline,
          bio: editFormData.bio,
          skills: editFormData.skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
          githubUrl: editFormData.githubUrl,
          linkedinUrl: editFormData.linkedinUrl,
          portfolioUrl: editFormData.portfolioUrl,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProfile(data.profile);
        setEditModalOpen(false);
      } else {
        setEditError(data.error || "Failed to update profile.");
      }
    } catch {
      setEditError("Network error saving changes.");
    } finally {
      setEditSaving(false);
    }
  };

  // Permission checkers
  const isSelf = currentSessionUser?.id === profile?.id || currentSessionUser?.username?.toLowerCase() === username.toLowerCase();
  const isOwnerViewer = currentSessionUser?.role === "OWNER";
  const isCeoViewer = currentSessionUser?.role === "ADMIN";
  const isTargetOwner = profile?.role === "OWNER";
  const canEdit = isSelf || isOwnerViewer || (isCeoViewer && !isTargetOwner);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-bright-red border-t-transparent animate-spin" />
        <p className="font-orbitron text-xs text-[#888] tracking-widest uppercase">Loading Profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center text-white space-y-4 p-6 text-center">
        <Shield className="w-12 h-12 text-crimson mb-2" />
        <h1 className="font-orbitron font-black text-2xl uppercase">Member Not Found</h1>
        <p className="text-xs text-[#888] max-w-sm">The requested CodeXa team profile &quot;@{username}&quot; does not exist or is private.</p>
        <Link href="/team" className="mt-4 px-6 py-2.5 rounded-xl bg-crimson font-orbitron text-xs font-bold uppercase tracking-wider">
          Explore Team Directory
        </Link>
      </div>
    );
  }

  const allProjects = [...createdProjects, ...collabProjects];

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      <CyberWebOverlay />

      {/* ─── TOP NAVIGATION BAR ────────────────────────────────────────── */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/team"
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-white transition-colors flex items-center gap-1 text-xs font-orbitron uppercase"
          >
            <ChevronLeft className="w-4 h-4" /> Team
          </Link>
          <span className="font-orbitron font-black text-sm text-white tracking-[0.2em]">
            CODEXA <span className="text-crimson text-xs font-normal">PROFILE</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors text-xs flex items-center gap-1.5"
            title="Share Profile Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline font-orbitron text-[10px] uppercase">{copied ? "Copied" : "Share"}</span>
          </button>

          {currentSessionUser ? (
            <Link
              href={currentSessionUser.role === "OWNER" ? "/owner" : "/dashboard"}
              className="px-3 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all"
            >
              Member Login
            </Link>
          )}
        </div>
      </header>

      {/* ─── MAIN PROFILE CONTAINER ───────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 z-10">
        
        {/* ─── MANAGEMENT BANNER FOR OWNER / CEO ──────────────────────── */}
        {!isSelf && (isOwnerViewer || isCeoViewer) && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-deep-red/30 via-[#0F0A0A] to-black border border-crimson/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-crimson text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-orbitron font-black text-white uppercase tracking-wider block">
                  {isOwnerViewer ? "OWNER MANAGEMENT MODE" : "ADMIN MANAGEMENT MODE"} &bull; Managing @{profile.username}
                </span>
                <p className="text-[10px] text-[#AAA] mt-0.5">
                  You have authorized executive permissions to modify this profile, roles, and connected resources.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              {canEdit && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(217,4,41,0.3)] flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
              {isOwnerViewer && (
                <Link
                  href="/owner?tab=accounts"
                  className="px-3.5 py-1.5 rounded-xl bg-[#181818] hover:bg-deep-red/20 border border-crimson/30 text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Manage Account
                </Link>
              )}
              <button
                onClick={handleDirectMessage}
                className="px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#202020] text-[#CCC] hover:text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>
            </div>
          </div>
        )}

        {/* ─── OWNER SELF PROFILE BANNER ───────────────────────────────── */}
        {isSelf && isOwnerViewer && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-deep-red/30 via-[#0F0A0A] to-black border border-crimson/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-crimson text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-orbitron font-black text-white uppercase tracking-wider block">
                  OWNER DIGITAL PROFILE &bull; @{profile.username}
                </span>
                <p className="text-[10px] text-[#AAA] mt-0.5">
                  Founder & Principal Authority at CodeXa Agency.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
              <button
                onClick={() => setEditModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(217,4,41,0.3)] flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
              <button
                onClick={() => setMediaSelectorOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#181818] hover:bg-deep-red/20 border border-crimson/30 text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5 text-bright-red" /> Change PFP
              </button>
              <Link
                href="/owner"
                className="px-3.5 py-1.5 rounded-xl bg-[#141414] hover:bg-[#202020] text-[#CCC] hover:text-white font-orbitron text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                Command Center &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* ─── INSTAGRAM-STYLE PROFILE HEADER ─────────────────────────── */}
        <div className="rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 sm:p-8 shadow-[0_0_40px_rgba(217,4,41,0.12)]">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
            
            {/* Avatar with Click-to-Change if Authorized */}
            <div className="relative group mx-auto md:mx-0">
              <CodeXaAvatar
                src={profile.mediaUrl}
                alt={profile.displayName}
                size="2xl"
                showGlow
                className="w-28 h-28 sm:w-36 sm:h-36"
              />
              {canEdit && (
                <button
                  onClick={() => setMediaSelectorOpen(true)}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-orbitron font-bold uppercase"
                  title="Change Profile Picture"
                >
                  <Camera className="w-5 h-5 mb-1 text-bright-red" />
                  Change
                </button>
              )}
            </div>

            {/* Profile Identity & Stats */}
            <div className="flex-1 space-y-4 text-center md:text-left w-full">
              
              {/* Name, Username & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                    <h1 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase tracking-wide">
                      {profile.displayName}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-crimson/20 border border-crimson/40 text-bright-red font-orbitron text-[10px] font-bold uppercase tracking-wider">
                      {profile.leadershipPosition || profile.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-crimson mt-0.5">@{profile.username}</p>
                </div>

                {/* Action Buttons: Message / Edit */}
                <div className="flex items-center justify-center md:justify-end gap-2.5 pt-1 flex-wrap">
                  {!isSelf && (
                    <button
                      onClick={handleDirectMessage}
                      className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </button>
                  )}
                  {isSelf && (
                    <button
                      onClick={() => setEditModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-bright-red" /> Edit Profile
                    </button>
                  )}
                  {!isSelf && isOwnerViewer && (
                    <>
                      <button
                        onClick={() => setEditModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Member Profile
                      </button>
                      <Link
                        href="/owner"
                        className="px-4 py-2 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                      >
                        <Shield className="w-3.5 h-3.5 text-bright-red" /> Manage Account
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Row (Instagram Style) */}
              <div className="flex items-center justify-center md:justify-start gap-8 py-2 border-y border-white/5 font-orbitron">
                <div>
                  <span className="font-black text-lg text-white">{stats.postsCount}</span>
                  <span className="text-xs text-[#777] ml-1.5 uppercase">Posts</span>
                </div>
                <div>
                  <span className="font-black text-lg text-white">{stats.projectsCount}</span>
                  <span className="text-xs text-[#777] ml-1.5 uppercase">Projects</span>
                </div>
                <div>
                  <span className="font-black text-lg text-white">{stats.collabCount}</span>
                  <span className="text-xs text-[#777] ml-1.5 uppercase">Collabs</span>
                </div>
              </div>

              {/* Headline & Bio */}
              <div className="space-y-1.5">
                {profile.headline && (
                  <h3 className="font-orbitron font-bold text-xs sm:text-sm text-[#DDD]">
                    {profile.headline}
                  </h3>
                )}
                {profile.bio && (
                  <p className="text-xs text-[#AAA] whitespace-pre-line leading-relaxed max-w-2xl">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Skills Chips */}
              {profile.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start pt-1">
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.8 rounded-lg bg-[#141414] border border-crimson/20 text-[10px] font-orbitron text-[#CCC]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Social & Professional Links */}
              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                {profile.githubUrl && (
                  <a
                    href={profile.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-[#111] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors"
                    title="GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-[#111] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {profile.portfolioUrl && (
                  <a
                    href={profile.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-[#111] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors flex items-center gap-1 text-xs font-orbitron"
                    title="Portfolio / Website"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px] uppercase">Portfolio</span>
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ─── 3 PROFILE TABS (POSTS / PROJECTS / ABOUT) ──────────────── */}
        <div className="space-y-6">
          <div className="flex justify-center border-b border-crimson/20 bg-[#0A0A0A] rounded-2xl p-1.5 gap-2">
            {[
              { id: "posts", label: "Posts", icon: ImageIcon, count: posts.length },
              { id: "projects", label: "Projects", icon: FolderGit2, count: allProjects.length },
              { id: "about", label: "About", icon: UserCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-crimson text-white shadow-[0_0_15px_rgba(217,4,41,0.3)] border border-bright-red"
                      : "text-[#888] hover:text-white hover:bg-[#121212]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                      isActive ? "bg-white/20 text-white" : "bg-[#181818] text-[#666]"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: POSTS */}
          <AnimatePresence mode="wait">
            {activeTab === "posts" && (
              <motion.div
                key="posts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {posts.length === 0 ? (
                  <div className="text-center py-16 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-2">
                    <ImageIcon className="w-8 h-8 text-[#555] mx-auto" />
                    <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No posts published yet</h4>
                    <p className="text-xs text-[#666]">Posts created by @{profile.username} will appear in this feed gallery.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="cyber-card p-5 space-y-4 flex flex-col justify-between"
                      >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#666]">
                          <span className="font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.isAnnouncement && (
                            <span className="px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-bright-red text-[9px] font-orbitron font-bold uppercase">
                              ANNOUNCEMENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white leading-relaxed whitespace-pre-line">{post.content}</p>

                        {/* Post Media Images */}
                        {post.media && post.media.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {post.media.map((m, idx) => (
                              <div
                                key={idx}
                                onClick={() => setActiveLightboxImage(m.mediaUrl)}
                                className="relative rounded-xl overflow-hidden aspect-video border border-crimson/20 cursor-pointer group bg-[#050505]"
                              >
                                <img src={m.mediaUrl} alt="Post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Attached Project */}
                        {post.project && (
                          <Link
                            href={`/projects/${post.project.slug}`}
                            className="block p-3 rounded-xl bg-[#111] border border-crimson/30 hover:border-bright-red transition-all"
                          >
                            <span className="text-[9px] font-orbitron text-bright-red uppercase font-bold">Attached Project &bull; View Case Study</span>
                            <h4 className="font-orbitron font-bold text-xs text-white mt-0.5">{post.project.title}</h4>
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-[#777]">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-crimson" /> {post.likesCount}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: PROJECTS */}
            {activeTab === "projects" && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {allProjects.length === 0 ? (
                  <div className="text-center py-16 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-2">
                    <FolderGit2 className="w-8 h-8 text-[#555] mx-auto" />
                    <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No projects linked yet</h4>
                    <p className="text-xs text-[#666]">Projects created or collaborated by @{profile.username} will be featured here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {allProjects.map((proj) => {
                      const isCreator = proj.createdBy === profile.id || proj.creator?.username?.toLowerCase() === profile.username.toLowerCase();
                      return (
                        <div
                          key={proj.id}
                          className="cyber-card overflow-hidden flex flex-col justify-between group shadow-lg"
                        >
                          <div className="relative aspect-video bg-[#050505] overflow-hidden">
                            <img
                              src={proj.thumbnailUrl || "/assets/images/logo.jpeg"}
                              alt={proj.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2 flex gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-orbitron font-black uppercase ${
                                isCreator ? "bg-crimson text-white" : "bg-blue-600 text-white"
                              }`}>
                                {isCreator ? "CREATOR" : "COLLABORATOR"}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-black/70 text-emerald-400 text-[8px] font-orbitron font-bold uppercase">
                                {proj.status}
                              </span>
                            </div>
                          </div>

                          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <h3 className="font-orbitron font-bold text-sm text-white group-hover:text-bright-red transition-colors">
                                {proj.title}
                              </h3>
                              <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                                {proj.shortDesc || proj.overview}
                              </p>
                            </div>

                            <div className="space-y-3 pt-2">
                              <div className="flex flex-wrap gap-1">
                                {proj.techStack?.slice(0, 3).map((tech, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-[#151515] text-[9px] font-orbitron text-[#AAA]">
                                    {tech}
                                  </span>
                                ))}
                              </div>

                              <Link
                                href={`/projects/${proj.slug}`}
                                className="w-full py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                              >
                                View Case Study <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: ABOUT */}
            {activeTab === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 sm:p-8 space-y-6 shadow-xl"
              >
                <div>
                  <h3 className="font-orbitron font-black text-sm text-bright-red uppercase tracking-wider mb-2">
                    Professional Bio
                  </h3>
                  <p className="text-xs text-[#CCC] whitespace-pre-line leading-relaxed">
                    {profile.bio || "No extended bio provided."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div>
                    <h4 className="font-orbitron font-bold text-xs text-[#888] uppercase mb-2">Role & Title</h4>
                    <p className="text-xs text-white font-orbitron font-semibold">
                      {profile.leadershipPosition || profile.role.replace("_", " ")}
                    </p>
                    <p className="text-[11px] text-[#777] mt-0.5">{profile.headline}</p>
                  </div>
                  <div>
                    <h4 className="font-orbitron font-bold text-xs text-[#888] uppercase mb-2">Joined CodeXa</h4>
                    <p className="text-xs text-white font-mono">
                      {new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <h4 className="font-orbitron font-bold text-xs text-[#888] uppercase mb-2.5">Competencies & Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-xl bg-[#141414] border border-crimson/25 text-xs font-orbitron text-white">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── MEDIA SELECTOR MODAL ─────────────────────────────────────── */}
      <CodeXaMediaSelectorModal
        isOpen={mediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        currentAvatarUrl={profile.mediaUrl}
        onSuccess={(newAvatarUrl) => {
          setProfile((prev) => (prev ? { ...prev, mediaUrl: newAvatarUrl } : null));
        }}
      />

      {/* ─── EDIT PROFILE MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0D0D0D] border border-crimson/30 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase">Edit Profile &bull; @{profile.username}</h3>
                <button onClick={() => setEditModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-deep-red/20 border border-bright-red/50 text-xs text-bright-red flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.displayName}
                    onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={editFormData.headline}
                    onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="e.g. AI Developer &bull; Full Stack &bull; Cybersecurity"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Bio</label>
                  <textarea
                    rows={4}
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none resize-none"
                    placeholder="Write a clear professional summary..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    value={editFormData.skillsStr}
                    onChange={(e) => setEditFormData({ ...editFormData, skillsStr: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="Next.js, Python, AI, Cybersecurity"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={editFormData.githubUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, githubUrl: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={editFormData.linkedinUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, linkedinUrl: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Portfolio Website URL</label>
                  <input
                    type="url"
                    value={editFormData.portfolioUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, portfolioUrl: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                  >
                    {editSaving ? "Saving Changes..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LIGHTBOX MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {activeLightboxImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setActiveLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img src={activeLightboxImage} alt="Enlarged preview" className="w-full h-full object-contain rounded-xl" />
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
