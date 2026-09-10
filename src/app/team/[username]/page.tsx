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
  Key,
  Terminal,
  Smartphone,
  Plus,
  Trash2
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { CodeXaMediaSelectorModal } from "@/components/ui/CodeXaMediaSelectorModal";
import { Profile, Project, Post } from "@/lib/data-store";
import { tabTransitionVariants, cardRevealVariants, buttonHoverVariants } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";

type TabType = "about" | "expertise" | "systems" | "projects" | "builds" | "posts";

export default function DedicatedTeamProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const { user: currentSessionUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ projectsCount: 0, postsCount: 0, collabCount: 0 });
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [collabProjects, setCollabProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("about");
  const [copied, setCopied] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Edit Profile Form State
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    primaryRole: "",
    headline: "",
    publicBio: "",
    bio: "",
    skillsStr: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    featuredProjects: [] as Array<{ name: string; category: string; url?: string | null }>,
  });
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCategory, setNewProjectCategory] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
            primaryRole: data.profile.primaryRole || "",
            headline: data.profile.headline || "",
            publicBio: data.profile.publicBio || "",
            bio: data.profile.bio || "",
            skillsStr: (data.profile.skills || []).join(", "),
            githubUrl: data.profile.githubUrl || "",
            linkedinUrl: data.profile.linkedinUrl || "",
            portfolioUrl: data.profile.portfolioUrl || "",
            featuredProjects: data.profile.featuredProjects || [],
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

  // Add a featured project item
  const handleAddFeaturedProject = () => {
    if (!newProjectName.trim()) return;
    setEditFormData({
      ...editFormData,
      featuredProjects: [
        ...editFormData.featuredProjects,
        {
          name: newProjectName.trim(),
          category: newProjectCategory.trim() || "System Build",
          url: null,
        },
      ],
    });
    setNewProjectName("");
    setNewProjectCategory("");
  };

  const handleRemoveFeaturedProject = (index: number) => {
    const updated = [...editFormData.featuredProjects];
    updated.splice(index, 1);
    setEditFormData({ ...editFormData, featuredProjects: updated });
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
          primaryRole: editFormData.primaryRole,
          headline: editFormData.headline,
          publicBio: editFormData.publicBio,
          bio: editFormData.bio,
          skills: editFormData.skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
          featuredProjects: editFormData.featuredProjects,
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
  const isFounder = profile.leadershipPosition === "FOUNDER" || profile.role === "OWNER" || profile.username.toLowerCase() === "ashu";

  const capabilityStrip = [
    "WEB DEVELOPMENT",
    "AI ENGINEERING",
    "CYBERSECURITY",
    "LINUX",
    "DESKTOP",
    "ANDROID",
    "iOS",
    "macOS",
    "FLUTTER",
    "SaaS",
    "CLOUD",
    "AUTOMATION",
    "DEVELOPER TOOLS",
  ];

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
                  FOUNDER DIGITAL PROFILE &bull; @{profile.username}
                </span>
                <p className="text-[10px] text-[#AAA] mt-0.5">
                  Founder & Principal Architect at CodeXa Agency.
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

        {/* ─── LEADERSHIP HEADER CARD ──────────────────────────────────── */}
        <div className="relative rounded-3xl bg-[#0A0A0A] border border-crimson/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(217,4,41,0.15)] overflow-hidden">
          
          {/* Cyber Corner Marks */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson pointer-events-none" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-crimson pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-crimson pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-10">
            
            {/* Avatar with Click-to-Change if Authorized */}
            <div className="relative group mx-auto md:mx-0 flex-shrink-0">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-crimson to-bright-red opacity-60 blur-md group-hover:opacity-100 transition-opacity" />
              <div className="relative rounded-3xl overflow-hidden border-2 border-bright-red bg-black">
                <CodeXaAvatar
                  src={
                    profile.mediaUrl ||
                    (profile.leadershipPosition === "FOUNDER" || profile.username === "ashu"
                      ? "/assets/images/founder.jpeg"
                      : profile.leadershipPosition === "CO_FOUNDER" || profile.username === "sanjay"
                      ? "/assets/images/co-founder.jpeg"
                      : profile.leadershipPosition === "CEO" || profile.username === "kishore"
                      ? "/assets/images/ceo.jpeg"
                      : null)
                  }
                  alt={profile.displayName}
                  size="2xl"
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl"
                  positionX={
                    profile.cropX ??
                    (profile.leadershipPosition === "FOUNDER" || profile.username === "ashu" ? 45 : 50)
                  }
                  positionY={
                    profile.cropY ??
                    (profile.leadershipPosition === "FOUNDER" || profile.username === "ashu"
                      ? 22
                      : profile.leadershipPosition === "CO_FOUNDER" || profile.username === "sanjay"
                      ? 25
                      : 20)
                  }
                  zoom={profile.cropZoom ?? 1.05}
                />
              </div>
              {canEdit && (
                <button
                  onClick={() => setMediaSelectorOpen(true)}
                  className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-orbitron font-bold uppercase z-10"
                  title="Change Profile Picture"
                >
                  <Camera className="w-5 h-5 mb-1 text-bright-red" />
                  Change
                </button>
              )}
            </div>

            {/* Profile Identity & Info */}
            <div className="flex-1 space-y-4 text-center md:text-left w-full">
              
              {/* Badge & Name */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-crimson/20 border border-bright-red/50 text-bright-red font-orbitron text-[10px] font-black uppercase tracking-widest">
                      {profile.leadershipPosition
                        ? `${profile.leadershipPosition} // CODEXA`
                        : `${profile.role.replace("_", " ")} // CODEXA`}
                    </span>
                  </div>

                  <h1 className="font-orbitron font-black text-3xl sm:text-4xl text-white uppercase tracking-wider mt-1">
                    {profile.displayName}
                  </h1>
                  
                  <p className="font-orbitron text-xs sm:text-sm font-bold text-crimson uppercase tracking-widest">
                    {profile.primaryRole || (isFounder ? "Founder & Full-Stack Developer" : "CodeXa Engineer")}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-center md:justify-end gap-2.5 pt-1 flex-wrap">
                  {!isSelf && (
                    <button
                      onClick={handleDirectMessage}
                      className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setEditModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#151515] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-bright-red" /> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Headline */}
              <p className="text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed max-w-2xl">
                {profile.headline || (isFounder ? "Full-Stack Developer • AI Engineer • Cybersecurity & Linux Specialist" : "")}
              </p>

              {/* Founder Capability Strip */}
              {isFounder && (
                <div className="flex flex-wrap gap-1.5 justify-center md:justify-start pt-1">
                  {capabilityStrip.map((cap, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] font-orbitron font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#121212] border border-crimson/20 text-[#DDD]"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}

              {/* Social & Professional Links (Only shown if added by Owner) */}
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

        {/* ─── 5 INTERACTIVE PROFILE TABS ───────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex justify-center border-b border-crimson/20 bg-[#0A0A0A] rounded-2xl p-1.5 gap-2 overflow-x-auto">
            {[
              { id: "about", label: "About", icon: UserCheck },
              { id: "expertise", label: "Expertise", icon: Cpu },
              { id: "systems", label: "Selected Systems", icon: Code2, count: (profile.featuredProjects || []).length || (isFounder ? 8 : undefined) },
              { id: "projects", label: "Builds", icon: FolderGit2, count: allProjects.length },
              { id: "posts", label: "Posts", icon: ImageIcon, count: posts.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-3 rounded-xl font-orbitron text-xs font-bold uppercase tracking-wider transition-all ${
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

          <AnimatePresence mode="wait">
            
            {/* ═══ TAB 1: ABOUT ════════════════════════════════════════════ */}
            {activeTab === "about" && (
              <motion.div
                key="about"
                variants={tabTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 sm:p-8 space-y-6 shadow-xl"
              >
                <div>
                  <h3 className="font-orbitron font-black text-sm text-bright-red uppercase tracking-wider mb-3">
                    Professional Biography
                  </h3>
                  <p className="text-xs sm:text-sm text-[#CCCCCC] whitespace-pre-line leading-relaxed">
                    {profile.bio || profile.publicBio || "No extended bio provided."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div>
                    <h4 className="font-orbitron font-bold text-xs text-[#888] uppercase mb-1.5">Leadership Identity</h4>
                    <p className="text-xs text-white font-orbitron font-semibold">
                      {profile.leadershipPosition || profile.role.replace("_", " ")}
                    </p>
                    <p className="text-[11px] text-[#777] mt-0.5">{profile.headline}</p>
                  </div>
                  <div>
                    <h4 className="font-orbitron font-bold text-xs text-[#888] uppercase mb-1.5">Role Classification</h4>
                    <p className="text-xs text-white font-mono">
                      {profile.primaryRole || (isFounder ? "Founder & Full-Stack Developer" : "Core Team Member")}
                    </p>
                  </div>
                </div>

                {profile.skills && profile.skills.length > 0 && (
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="font-orbitron font-bold text-xs text-[#888] uppercase mb-3">Primary Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-xl bg-[#141414] border border-crimson/25 text-xs font-orbitron text-white">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ TAB 2: GROUPED EXPERTISE MATRIX ══════════════════════════ */}
            {activeTab === "expertise" && (
              <motion.div
                key="expertise"
                variants={tabTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Categorized Matrix Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Category: Development Languages */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-bright-red" />
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                        Development Languages
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["HTML", "CSS", "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#"].map((lang, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-lg bg-[#141414] border border-white/5 font-mono text-xs text-[#DDD]">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Category: Full-Stack Engineering */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-bright-red" />
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                        Full-Stack Engineering
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Frontend Development",
                        "Backend Development",
                        "REST APIs",
                        "Database Architecture",
                        "Authentication Systems",
                        "Admin Dashboards",
                        "SaaS Platforms",
                        "Developer Platforms",
                        "Web Applications",
                        "Cloud Deployment",
                        "Automation",
                      ].map((item, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#141414] border border-white/5 font-orbitron text-[10px] text-[#DDD]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Category: AI Engineering */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-bright-red" />
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                        AI Engineering
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "AI Applications",
                        "AI Agents",
                        "AI Workflow Engineering",
                        "LLM Integration",
                        "Automation Systems",
                        "Intelligent Assistants",
                        "AI-Powered SaaS",
                        "Prompt Engineering",
                        "AI Tool Development",
                      ].map((item, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#141414] border border-white/5 font-orbitron text-[10px] text-[#DDD]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Category: Cybersecurity & Ethical Hacking */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-bright-red" />
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                        Cybersecurity & Defense
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Ethical Hacking",
                        "Security Testing",
                        "Secure App Development",
                        "Authentication Security",
                        "Web Security",
                        "Cybersecurity Tools",
                        "Security Automation",
                        "Linux Security",
                      ].map((item, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#141414] border border-white/5 font-orbitron text-[10px] text-[#DDD]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Category: Linux & Systems */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-bright-red" />
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                        Linux & Systems
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Linux Administration",
                        "Developer Environments",
                        "System Automation",
                        "Command-Line Workflows",
                        "Deployment Environments",
                        "Server Management",
                        "Security Tooling",
                      ].map((item, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#141414] border border-white/5 font-orbitron text-[10px] text-[#DDD]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Category: Application Engineering */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-bright-red" />
                      <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                        Application Platforms
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Web Applications",
                        "SaaS Applications",
                        "Desktop Applications",
                        "Android Applications",
                        "iOS Applications",
                        "macOS Applications",
                        "Cross-Platform Builds",
                        "Flutter Applications",
                        "Developer Tools",
                      ].map((item, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#141414] border border-white/5 font-orbitron text-[10px] text-[#DDD]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* ═══ TAB 3: SELECTED PROJECTS & SYSTEMS ════════════════════════ */}
            {activeTab === "systems" && (
              <motion.div
                key="systems"
                variants={tabTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-6 shadow-xl">
                  <div>
                    <h3 className="font-orbitron font-black text-sm text-bright-red uppercase tracking-wider">
                      Selected Projects & Systems Architecture
                    </h3>
                    <p className="text-xs text-[#888] font-light mt-1">
                      Display-only architectural highlights and software systems engineered within the CodeXa ecosystem.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(profile.featuredProjects && profile.featuredProjects.length > 0
                      ? profile.featuredProjects
                      : [
                          { name: "CodeXa IDE", category: "Developer Platform" },
                          { name: "Nexa AI", category: "Artificial Intelligence" },
                          { name: "EDITH AI Agent", category: "AI Agent" },
                          { name: "Cyber Kivi Max", category: "Cybersecurity" },
                          { name: "Vishnu Max", category: "Application" },
                          { name: "CloudWave", category: "Cloud / Platform" },
                          { name: "NodeWave", category: "Developer System" },
                          { name: "CodeXa OS", category: "System Platform" },
                        ]
                    ).map((proj, idx) => (
                      <div
                        key={idx}
                        className="group relative p-4 rounded-2xl bg-[#111111] border border-white/5 hover:border-crimson/60 hover:bg-[#141414] transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm"
                      >
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-crimson to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="space-y-1">
                          <h4 className="font-orbitron font-bold text-sm text-white uppercase group-hover:text-bright-red transition-colors truncate">
                            {proj.name}
                          </h4>
                          <p className="text-[10px] font-mono text-[#777] uppercase truncate">
                            {proj.category}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-[#555] font-mono">
                          <span>SYSTEM BUILD</span>
                          <span className="text-crimson font-bold">ACTIVE</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ TAB 4: BUILDS / PROJECTS ═════════════════════════════════ */}
            {activeTab === "projects" && (
              <motion.div
                key="projects"
                variants={tabTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {allProjects.length === 0 ? (
                  <div className="text-center py-16 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-2">
                    <FolderGit2 className="w-8 h-8 text-[#555] mx-auto" />
                    <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No project case studies published yet</h4>
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

            {/* ═══ TAB 5: POSTS ═════════════════════════════════════════════ */}
            {activeTab === "posts" && (
              <motion.div
                key="posts"
                variants={tabTransitionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
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

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
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
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Primary Role / Title</label>
                  <input
                    type="text"
                    value={editFormData.primaryRole}
                    onChange={(e) => setEditFormData({ ...editFormData, primaryRole: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="e.g. Founder & Full-Stack Developer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={editFormData.headline}
                    onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="e.g. Founder of CodeXa Agency • Full-Stack Developer • AI Engineer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Short Introduction</label>
                  <textarea
                    rows={2}
                    value={editFormData.publicBio}
                    onChange={(e) => setEditFormData({ ...editFormData, publicBio: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none resize-none"
                    placeholder="Short overview shown on spotlight cards..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Full Biography</label>
                  <textarea
                    rows={5}
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none resize-none"
                    placeholder="Comprehensive professional biography..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    value={editFormData.skillsStr}
                    onChange={(e) => setEditFormData({ ...editFormData, skillsStr: e.target.value })}
                    className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                    placeholder="Full-Stack, Python, AI, Cybersecurity"
                  />
                </div>

                {/* Featured Projects / Systems Editor */}
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-orbitron uppercase text-bright-red font-bold">
                      Selected Projects & Systems
                    </label>
                    <span className="text-[9px] font-mono text-[#666]">({editFormData.featuredProjects.length})</span>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-[#090909] rounded-xl border border-white/5">
                    {editFormData.featuredProjects.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#141414] text-xs">
                        <div className="truncate">
                          <span className="font-orbitron font-bold text-white block truncate">{p.name}</span>
                          <span className="text-[9px] font-mono text-[#888]">{p.category}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeaturedProject(idx)}
                          className="p-1 text-[#666] hover:text-bright-red transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Project Name (e.g. CodeXa IDE)"
                      className="flex-1 bg-[#111] border border-crimson/20 rounded-xl p-2 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      value={newProjectCategory}
                      onChange={(e) => setNewProjectCategory(e.target.value)}
                      placeholder="Category"
                      className="w-1/3 bg-[#111] border border-crimson/20 rounded-xl p-2 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeaturedProject}
                      className="px-3 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">GitHub URL (Optional)</label>
                    <input
                      type="url"
                      value={editFormData.githubUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, githubUrl: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">LinkedIn URL (Optional)</label>
                    <input
                      type="url"
                      value={editFormData.linkedinUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, linkedinUrl: e.target.value })}
                      className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
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
