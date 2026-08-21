"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Share2,
  User,
  Sparkles,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Bell
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { ActivityEvent, Post, Project, Profile } from "@/lib/data-store";

export default function DashboardOverviewPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          loadDashboardData(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const loadDashboardData = (user: any) => {
    setLoading(true);
    Promise.all([
      fetch("/api/activity").then((r) => r.json()).catch(() => ({ activities: [] })),
      fetch("/api/feed/posts").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch(`/api/projects?developerId=${user.id}`).then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch(`/api/profile/${user.username}`).then((r) => r.json()).catch(() => ({ profile: null })),
    ])
      .then(([actRes, feedRes, projRes, profRes]) => {
        if (actRes.activities) setActivities(actRes.activities);
        if (feedRes.posts) setLatestPosts(feedRes.posts.slice(0, 4));
        if (projRes.projects) setMyProjects(projRes.projects);
        if (profRes.profile) setProfile(profRes.profile);
      })
      .finally(() => setLoading(false));
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    if (!profile) return 60;
    let score = 30; // base account
    if (profile.mediaUrl) score += 20;
    if (profile.headline) score += 15;
    if (profile.bio && profile.bio.length > 20) score += 15;
    if (profile.skills && profile.skills.length >= 3) score += 10;
    if (profile.githubUrl || profile.portfolioUrl || profile.linkedinUrl) score += 10;
    return Math.min(100, score);
  };

  const completionPct = calculateProfileCompletion();

  return (
    <TeamCoreShell
      title={`Welcome back, ${profile?.displayName || currentUser?.displayName || "Engineer"}`}
      subtitle="CodeXa Team Core Workspace"
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            href={`/team/${currentUser?.username}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-deep-red/20 border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            <span>Public Profile</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-bright-red" />
          </Link>
          <Link
            href="/dashboard/projects"
            className="px-3.5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Build</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        
        {/* ─── QUICK METRICS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/projects"
            className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/50 transition-all group shadow-lg"
          >
            <span className="text-[10px] font-orbitron text-[#888] uppercase font-semibold">My Builds</span>
            <div className="text-3xl font-orbitron font-black text-white mt-1 group-hover:text-bright-red transition-colors">
              {myProjects.length}
            </div>
            <p className="text-[10px] font-mono text-emerald-400 mt-1">Active Projects</p>
          </Link>

          <Link
            href="/dashboard/feed"
            className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/50 transition-all group shadow-lg"
          >
            <span className="text-[10px] font-orbitron text-[#888] uppercase font-semibold">Team Feed</span>
            <div className="text-3xl font-orbitron font-black text-white mt-1 group-hover:text-bright-red transition-colors">
              {latestPosts.length}
            </div>
            <p className="text-[10px] font-mono text-bright-red mt-1">Published Updates</p>
          </Link>

          <Link
            href="/dashboard/profile"
            className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/50 transition-all group shadow-lg"
          >
            <span className="text-[10px] font-orbitron text-[#888] uppercase font-semibold">Profile Setup</span>
            <div className="text-3xl font-orbitron font-black text-emerald-400 mt-1 font-mono">
              {completionPct}%
            </div>
            <p className="text-[10px] font-mono text-[#AAA] mt-1">Digital Identity</p>
          </Link>

          <Link
            href="/team"
            className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/50 transition-all group shadow-lg"
          >
            <span className="text-[10px] font-orbitron text-[#888] uppercase font-semibold">Network</span>
            <div className="text-2xl font-orbitron font-black text-white mt-1 uppercase">
              ACTIVE
            </div>
            <p className="text-[10px] font-mono text-crimson mt-1">Team Directory &bull; Public</p>
          </Link>
        </div>

        {/* ─── MAIN TWO-COLUMN CONTENT AREA ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Recent Real Activity Events Feed */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-crimson/20">
              <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-bright-red" /> Recent Updates & Activity
              </h3>
            </div>

            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0A0A0A] border border-white/5 text-center text-xs text-[#777]">
                  No recent activities recorded yet.
                </div>
              ) : (
                activities.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-bright-red/40 transition-all flex items-start gap-3.5 shadow-md"
                  >
                    <CodeXaAvatar src={act.actorMediaUrl} alt={act.actorName} size="sm" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-orbitron font-bold text-xs text-white">{act.title}</h4>
                        <span className="text-[10px] font-mono text-[#666]">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {act.details && <p className="text-xs text-[#AAA] leading-relaxed">{act.details}</p>}
                      {act.link && (
                        <Link
                          href={act.link}
                          className="inline-flex items-center gap-1 text-[10px] font-orbitron text-bright-red uppercase font-semibold hover:underline pt-1"
                        >
                          View Detail <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Latest Team Posts & Profile Progress */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Latest Feed Posts Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-crimson/20">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
                  Latest Team Posts
                </h3>
                <Link
                  href="/dashboard/feed"
                  className="text-[10px] font-orbitron text-bright-red hover:underline uppercase font-bold"
                >
                  View Feed &rarr;
                </Link>
              </div>

              <div className="space-y-3">
                {latestPosts.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 text-center text-xs text-[#777]">
                    No posts shared yet. Be the first to share!
                  </div>
                ) : (
                  latestPosts.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-[#0A0A0A] border border-crimson/20 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <CodeXaAvatar src={p.author?.mediaUrl} alt={p.author?.displayName} size="xs" />
                        <div>
                          <p className="font-orbitron font-bold text-xs text-white leading-none">{p.author?.displayName}</p>
                          <span className="text-[9px] font-mono text-crimson">@{p.author?.username}</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#AAA] line-clamp-2 leading-relaxed">{p.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Profile Completion Checklist Card */}
            <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/25 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                  Identity Setup
                </h4>
                <span className="font-mono text-xs text-emerald-400 font-bold">{completionPct}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-crimson to-emerald-400 transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-[#888]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${profile?.mediaUrl ? "text-emerald-400" : "text-[#555]"}`} />
                  <span>Profile Picture studio avatar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${profile?.headline ? "text-emerald-400" : "text-[#555]"}`} />
                  <span>Professional headline & competency tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${profile?.bio ? "text-emerald-400" : "text-[#555]"}`} />
                  <span>Extended background bio</span>
                </div>
              </div>

              <Link
                href="/dashboard/profile"
                className="block text-center w-full py-2 rounded-xl bg-[#141414] hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors pt-2"
              >
                Edit My Profile
              </Link>
            </div>

          </div>

        </div>

      </div>
    </TeamCoreShell>
  );
}
