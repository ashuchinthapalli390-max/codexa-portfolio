"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  ArrowLeft,
  ArrowUpRight,
  Shield,
  Sparkles,
  ExternalLink,
  Code2,
  Filter,
  Terminal,
  Cpu,
  ChevronRight
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Profile } from "@/lib/data-store";

const FILTER_TAGS = [
  "ALL",
  "LEADERSHIP",
  "FULL STACK",
  "AI",
  "CYBERSECURITY",
  "LINUX",
  "FRONTEND",
  "BACKEND",
];

export default function TeamDirectoryPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfiles(data.profiles || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const leadershipProfiles = profiles
    .filter((p) => p.memberType === "LEADERSHIP" || p.role === "OWNER" || p.leadershipPosition)
    .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

  const coreTeamProfiles = profiles.filter(
    (p) => p.memberType !== "LEADERSHIP" && p.role !== "OWNER" && !p.leadershipPosition
  );

  const filteredCoreTeam = coreTeamProfiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.displayName.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.headline && p.headline.toLowerCase().includes(q)) ||
      (p.skills && p.skills.some((s) => s.toLowerCase().includes(q)));

    if (!matchesSearch) return false;
    if (selectedTag === "ALL") return true;

    const tagClean = selectedTag.toLowerCase();
    return (
      (p.headline && p.headline.toLowerCase().includes(tagClean)) ||
      (p.skills && p.skills.some((s) => s.toLowerCase().includes(tagClean)))
    );
  });

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      <CyberWebOverlay />

      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-white transition-colors flex items-center gap-1 text-xs font-orbitron uppercase"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <span className="font-orbitron font-black text-sm text-white tracking-[0.2em]">
            CODEXA <span className="text-crimson text-xs font-normal">TEAM DIRECTORY</span>
          </span>
        </div>

        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)]"
        >
          Team Core
        </Link>
      </header>

      {/* ─── MAIN DIRECTORY BODY ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-16 z-10">
        
        {/* Title & Description */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
            OFFICIAL TEAM DIRECTORY
          </span>
          <h1 className="font-orbitron font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            The CodeXa Engineers
          </h1>
          <p className="text-xs text-[#888] leading-relaxed">
            Explore the developers, architects, and technical leaders building the next generation of digital infrastructure.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ─── SECTION 1: LEADERSHIP DIRECTORY ─────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-crimson/20 pb-3">
            <Shield className="w-4 h-4 text-bright-red" />
            <h2 className="font-orbitron font-black text-lg text-white uppercase tracking-wider">
              Leadership & Executive Direction
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leadershipProfiles.map((leader) => {
              const isFounder = leader.leadershipPosition === "FOUNDER" || leader.role === "OWNER" || leader.username.toLowerCase() === "ashu";
              return (
                <div
                  key={leader.id}
                  className={`group relative rounded-3xl p-6 sm:p-8 bg-[#0A0A0A] border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl ${
                    isFounder
                      ? "border-crimson/50 hover:border-bright-red hover:shadow-[0_0_40px_rgba(217,4,41,0.25)] md:col-span-2"
                      : "border-crimson/25 hover:border-bright-red/70 hover:shadow-[0_0_30px_rgba(217,4,41,0.15)]"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-crimson/20 border border-bright-red/50 text-bright-red font-orbitron text-[9px] font-black uppercase tracking-widest">
                        {`${leader.leadershipPosition || leader.role.replace("_", " ")} // CODEXA`}
                      </span>
                      <span className="text-[9px] font-mono text-[#666] uppercase">EXECUTIVE</span>
                    </div>

                    <div className="flex items-start sm:items-center gap-5">
                      <CodeXaAvatar
                        src={leader.mediaUrl}
                        alt={leader.displayName}
                        size={isFounder ? "xl" : "lg"}
                        showGlow={isFounder}
                        className="flex-shrink-0"
                      />
                      <div className="space-y-1">
                        <h3 className="font-orbitron font-black text-xl sm:text-2xl text-white uppercase group-hover:text-bright-red transition-colors">
                          {leader.displayName}
                        </h3>
                        <p className="font-orbitron text-xs font-bold text-crimson uppercase tracking-wider">
                          {leader.primaryRole || (isFounder ? "Founder & Full-Stack Developer" : "CodeXa Executive")}
                        </p>
                        <p className="text-xs text-[#AAA] font-light leading-relaxed">
                          {leader.headline}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#888] font-light leading-relaxed">
                      {leader.publicBio || leader.bio}
                    </p>

                    {/* Primary skills */}
                    {leader.skills && leader.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {leader.skills.slice(0, isFounder ? 8 : 4).map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-lg bg-[#141414] border border-white/5 text-[9px] font-orbitron text-[#BBB]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#666]">
                      @{leader.username}
                    </span>
                    <Link
                      href={`/team/${leader.username}`}
                      className="px-4 py-2 rounded-xl bg-[#141414] group-hover:bg-crimson text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                    >
                      View Full Profile <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ─── SECTION 2: CORE TEAM & DEVELOPERS ───────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between border-b border-crimson/20 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-bright-red" />
              <h2 className="font-orbitron font-black text-lg text-white uppercase tracking-wider">
                Core Team Engineers & Members
              </h2>
            </div>
            <span className="text-xs font-mono text-[#777]">({coreTeamProfiles.length} Members)</span>
          </div>

          {/* Search & Filter Controls */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members by name, role, or technology..."
                className="w-full bg-[#0D0D0D] border border-crimson/25 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555] outline-none focus:border-bright-red transition-colors shadow-lg"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {FILTER_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all ${
                      isSelected
                        ? "bg-crimson text-white border border-bright-red shadow-[0_0_10px_rgba(217,4,41,0.3)]"
                        : "bg-[#111] text-[#888] hover:text-white border border-white/5"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Member Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-64 rounded-3xl bg-[#0C0C0C] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : filteredCoreTeam.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-2">
              <Users className="w-8 h-8 text-[#555] mx-auto" />
              <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No additional core team members found</h4>
              <p className="text-xs text-[#666]">New team members provisioned by the Owner will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCoreTeam.map((member) => (
                <div
                  key={member.id}
                  className="cyber-card p-6 flex flex-col justify-between space-y-5 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <CodeXaAvatar
                        src={member.mediaUrl}
                        alt={member.displayName}
                        size="lg"
                        showGlow
                        className="group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <h3 className="font-orbitron font-black text-base text-white group-hover:text-bright-red transition-colors">
                          {member.displayName}
                        </h3>
                        <p className="text-xs font-mono text-crimson">@{member.username}</p>
                        <span className="inline-block mt-1 px-2 py-0.2 rounded-full bg-crimson/15 border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase">
                          {member.leadershipPosition || member.role.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#AAA] line-clamp-2 leading-relaxed">
                      {member.headline || member.bio || "Specialized developer contributing to the CodeXa Agency ecosystem."}
                    </p>

                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {member.skills.slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[#141414] border border-white/5 text-[9px] font-orbitron text-[#BBB]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/team/${member.username}`}
                    className="w-full py-2.5 rounded-xl bg-[#141414] hover:bg-crimson group-hover:bg-crimson text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-md"
                  >
                    View Profile <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
