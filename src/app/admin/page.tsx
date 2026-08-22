"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  FolderGit2,
  Inbox,
  Share2,
  Check,
  X,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Eye,
  Trash2,
  Search,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Profile, Project, Inquiry, Post } from "@/lib/data-store";
import { useAuth } from "@/context/AuthContext";

type AdminTab = "overview" | "inquiries" | "projects" | "members" | "feed";

export default function AdminWorkspacePage() {
  const router = useRouter();
  const { user: currentUser, status } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);

  // Real Data
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // Member Creation State
  const [newMemberModalOpen, setNewMemberModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    fullName: "",
    username: "",
    password: "",
    displayName: "",
    email: "",
    role: "TEAM_MEMBER",
    headline: "CodeXa Developer",
  });
  const [savingMember, setSavingMember] = useState(false);
  const [memberFeedback, setMemberFeedback] = useState<string | null>(null);

  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?redirect=/admin");
      return;
    }
    if (status === "authenticated" && currentUser) {
      if (currentUser.role !== "ADMIN" && currentUser.role !== "OWNER") {
        router.replace("/dashboard");
        return;
      }
      loadAdminData();
    }
  }, [status, currentUser, router]);

  const loadAdminData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/team/public").then((r) => r.json()).catch(() => ({ profiles: [] })),
      fetch("/api/projects").then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch("/api/inquiries").then((r) => r.json()).catch(() => ({ inquiries: [] })),
      fetch("/api/feed/posts").then((r) => r.json()).catch(() => ({ posts: [] })),
    ])
      .then(([teamRes, projRes, inqRes, feedRes]) => {
        if (teamRes.profiles) setTeamMembers(teamRes.profiles);
        if (projRes.projects) setProjects(projRes.projects);
        if (inqRes.inquiries) setInquiries(inqRes.inquiries);
        if (feedRes.posts) setPosts(feedRes.posts);
      })
      .finally(() => setLoading(false));
  };

  // Toggle Main Project
  const handleToggleMainProject = async (projectId: string, currentVal: boolean) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, isMainProject: !currentVal }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, isMainProject: !currentVal } : p))
        );
      }
    } catch {}
  };

  // Toggle Homepage Visibility
  const handleToggleHomepage = async (projectId: string, currentVal: boolean) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, isHomepageVisible: !currentVal }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, isHomepageVisible: !currentVal } : p))
        );
      }
    } catch {}
  };

  // Update Inquiry Status
  const handleUpdateInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      const res = await fetch("/api/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inquiryId, status }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === inquiryId ? { ...inq, status: status as any } : inq))
        );
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: status as any } : null));
        }
      }
    } catch {}
  };

  // Create Team Member Account
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMember(true);
    setMemberFeedback(null);

    try {
      const res = await fetch("/api/team/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemberData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMemberFeedback("Account created successfully!");
        loadAdminData();
        setTimeout(() => {
          setNewMemberModalOpen(false);
          setMemberFeedback(null);
          setNewMemberData({
            fullName: "",
            username: "",
            displayName: "",
            email: "",
            password: "",
            role: "TEAM_MEMBER",
            headline: "CodeXa Developer",
          });
        }, 1500);
      } else {
        setMemberFeedback(data.error || "Failed to create account.");
      }
    } catch {
      setMemberFeedback("Network error creating account.");
    } finally {
      setSavingMember(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to remove this post?")) return;
    try {
      const res = await fetch(`/api/feed/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch {}
  };

  return (
    <TeamCoreShell
      title="Executive Command Workspace"
      subtitle={`${currentUser?.leadershipPosition || "CEO / CO-FOUNDER"} &bull; Management Panel`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewMemberModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Member</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-crimson/20 pb-3">
          {[
            { id: "overview", label: "Overview", icon: Shield, count: undefined },
            { id: "inquiries", label: "Inquiries & Leads", icon: Inbox, count: inquiries.filter((i) => i.status === "NEW").length },
            { id: "projects", label: "All Projects", icon: FolderGit2, count: projects.length },
            { id: "members", label: "Team Members", icon: Users, count: teamMembers.length },
            { id: "feed", label: "Feed Moderation", icon: Share2, count: posts.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-4 py-2 rounded-xl font-orbitron text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-crimson text-white border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                    : "bg-[#111] text-[#888] hover:text-white border border-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div onClick={() => setActiveTab("inquiries")} className="cyber-card p-5 cursor-pointer">
                <span className="text-[10px] font-orbitron text-[#888] uppercase">New Inquiries</span>
                <div className="text-3xl font-orbitron font-black text-white mt-1">
                  {inquiries.filter((i) => i.status === "NEW").length}
                </div>
                <p className="text-[10px] font-mono text-crimson mt-1">{inquiries.length} Total Leads</p>
              </div>

              <div onClick={() => setActiveTab("projects")} className="cyber-card p-5 cursor-pointer">
                <span className="text-[10px] font-orbitron text-[#888] uppercase">Live Projects</span>
                <div className="text-3xl font-orbitron font-black text-white mt-1">{projects.length}</div>
                <p className="text-[10px] font-mono text-emerald-400 mt-1">
                  {projects.filter((p) => p.isMainProject).length} Main Spotlights
                </p>
              </div>

              <div onClick={() => setActiveTab("members")} className="cyber-card p-5 cursor-pointer">
                <span className="text-[10px] font-orbitron text-[#888] uppercase">Active Engineers</span>
                <div className="text-3xl font-orbitron font-black text-white mt-1">{teamMembers.length}</div>
                <p className="text-[10px] font-mono text-bright-red mt-1">Core Roster</p>
              </div>

              <div onClick={() => setActiveTab("feed")} className="cyber-card p-5 cursor-pointer">
                <span className="text-[10px] font-orbitron text-[#888] uppercase">Social Posts</span>
                <div className="text-3xl font-orbitron font-black text-white mt-1">{posts.length}</div>
                <p className="text-[10px] font-mono text-[#AAA] mt-1">Team Stream</p>
              </div>
            </div>

            {/* Quick Inquiries Table */}
            <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
                  Recent Inquiries & Client Leads
                </h3>
                <button
                  onClick={() => setActiveTab("inquiries")}
                  className="text-xs font-orbitron text-bright-red hover:underline uppercase"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] font-orbitron uppercase text-[#777] border-b border-white/5">
                    <tr>
                      <th className="pb-2">Client / Ref</th>
                      <th className="pb-2">Project Type</th>
                      <th className="pb-2">Budget</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inquiries.slice(0, 4).map((inq) => (
                      <tr key={inq.id} className="hover:bg-[#111] transition-colors">
                        <td className="py-3 font-orbitron font-bold text-white">
                          {inq.fullName}
                          <span className="block font-mono text-[9px] text-[#666]">{inq.referenceId}</span>
                        </td>
                        <td className="py-3 text-[#AAA]">{inq.projectType}</td>
                        <td className="py-3 font-mono text-emerald-400">{inq.budget}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-crimson/20 border border-crimson/40 text-bright-red text-[9px] font-orbitron font-bold uppercase">
                            {inq.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INQUIRIES & LEADS */}
        {activeTab === "inquiries" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inquiries.map((inq) => (
                <div key={inq.id} className="cyber-card p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-bright-red">{inq.referenceId}</span>
                      <span className="px-2 py-0.5 rounded bg-crimson/20 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
                        {inq.status}
                      </span>
                    </div>

                    <h4 className="font-orbitron font-bold text-sm text-white">{inq.fullName}</h4>
                    <p className="text-xs text-[#888]">{inq.email} &bull; {inq.phone || "No phone"}</p>
                    <p className="text-xs text-[#CCC] line-clamp-3 leading-relaxed pt-1 bg-[#121212] p-2.5 rounded-xl border border-white/5">
                      &quot;{inq.message}&quot;
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-[10px] font-mono text-[#AAA]">
                      <span>Type: {inq.projectType}</span>
                      <span className="text-emerald-400 font-bold">{inq.budget}</span>
                    </div>

                    {/* Status updater */}
                    <div className="flex gap-1 pt-1">
                      {["CONTACTED", "DISCUSSION", "APPROVED", "COMPLETED"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateInquiryStatus(inq.id, st)}
                          className={`flex-1 py-1 rounded text-[8px] font-orbitron font-bold uppercase transition-colors ${
                            inq.status === st ? "bg-crimson text-white" : "bg-[#151515] text-[#888] hover:text-white"
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

        {/* TAB 3: ALL PROJECTS PIPELINE */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 shadow-xl">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-orbitron uppercase text-[#777] border-b border-white/5">
                  <tr>
                    <th className="pb-3">Project Title</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Creator</th>
                    <th className="pb-3">Main Project</th>
                    <th className="pb-3">Homepage</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-[#111] transition-colors">
                      <td className="py-3.5 font-orbitron font-bold text-white">
                        <Link href={`/projects/${proj.slug}`} className="hover:text-bright-red transition-colors flex items-center gap-1.5">
                          {proj.title} <ArrowUpRight className="w-3.5 h-3.5 text-bright-red" />
                        </Link>
                      </td>
                      <td className="py-3 text-[#AAA]">{proj.category}</td>
                      <td className="py-3 font-mono text-crimson">@{proj.creator?.username || "member"}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleMainProject(proj.id, proj.isMainProject)}
                          className={`px-3 py-1 rounded-xl text-[9px] font-orbitron font-bold uppercase transition-all ${
                            proj.isMainProject
                              ? "bg-crimson text-white border border-bright-red"
                              : "bg-[#151515] text-[#888] border border-white/5 hover:text-white"
                          }`}
                        >
                          {proj.isMainProject ? "YES (MAIN)" : "NO"}
                        </button>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleHomepage(proj.id, !!proj.isHomepageVisible)}
                          className={`px-3 py-1 rounded-xl text-[9px] font-orbitron font-bold uppercase transition-all ${
                            proj.isHomepageVisible
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-[#151515] text-[#666] border border-white/5 hover:text-white"
                          }`}
                        >
                          {proj.isHomepageVisible ? "VISIBLE" : "HIDDEN"}
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/projects/${proj.slug}`}
                          className="p-1.5 rounded bg-[#151515] hover:bg-crimson text-[#888] hover:text-white inline-block"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TEAM MEMBERS */}
        {activeTab === "members" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <div key={member.id} className="cyber-card p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-3.5">
                  <CodeXaAvatar src={member.mediaUrl} alt={member.displayName} size="md" showGlow />
                  <div>
                    <h4 className="font-orbitron font-bold text-sm text-white">{member.displayName}</h4>
                    <p className="text-[10px] font-mono text-crimson">@{member.username}</p>
                    <span className="text-[8px] font-orbitron text-bright-red uppercase">{member.role}</span>
                  </div>
                </div>

                <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                  {member.headline || "Specialized CodeXa developer."}
                </p>

                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <Link
                    href={`/team/${member.username}`}
                    className="flex-1 py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors text-center"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: FEED MODERATION */}
        {activeTab === "feed" && (
          <div className="space-y-4 max-w-3xl">
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
        )}

      </div>

      {/* ─── CREATE MEMBER MODAL ──────────────────────────────────────── */}
      {newMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase">Create Team Member</h3>
              <button onClick={() => setNewMemberModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {memberFeedback && (
              <div className="p-3 rounded-xl bg-deep-red/20 text-bright-red text-xs">{memberFeedback}</div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newMemberData.fullName}
                  onChange={(e) => setNewMemberData({ ...newMemberData, fullName: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newMemberData.username}
                  onChange={(e) => setNewMemberData({ ...newMemberData, username: e.target.value.toLowerCase() })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="rahul"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newMemberData.email}
                  onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="rahul@codxa-agency.online"
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newMemberData.password}
                  onChange={(e) => setNewMemberData({ ...newMemberData, password: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                  placeholder="At least 8 chars..."
                />
              </div>

              <div>
                <label className="text-[10px] font-orbitron uppercase text-[#888] font-bold block mb-1">Headline</label>
                <input
                  type="text"
                  value={newMemberData.headline}
                  onChange={(e) => setNewMemberData({ ...newMemberData, headline: e.target.value })}
                  className="w-full bg-[#111] border border-crimson/20 rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewMemberModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#141414] font-orbitron text-xs text-[#888] uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="flex-1 py-2.5 rounded-xl bg-crimson hover:bg-bright-red font-orbitron text-xs font-bold text-white uppercase shadow-[0_0_15px_rgba(217,4,41,0.3)] transition-all"
                >
                  {savingMember ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeamCoreShell>
  );
}
