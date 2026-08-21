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
  Filter
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Profile } from "@/lib/data-store";

const FILTER_TAGS = [
  "ALL",
  "LEADERSHIP",
  "AI",
  "CYBERSECURITY",
  "FULL STACK",
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

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.displayName.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.headline && p.headline.toLowerCase().includes(q)) ||
      (p.skills && p.skills.some((s) => s.toLowerCase().includes(q)));

    if (!matchesSearch) return false;

    if (selectedTag === "ALL") return true;
    if (selectedTag === "LEADERSHIP") return p.memberType === "LEADERSHIP" || p.role === "OWNER" || p.role === "ADMIN";

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
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 z-10">
        
        {/* Title & Description */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-[10px] font-orbitron text-bright-red tracking-[0.3em] uppercase font-bold">
            INTERNAL & PUBLIC DIRECTORY
          </span>
          <h1 className="font-orbitron font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            The CodeXa Engineers
          </h1>
          <p className="text-xs text-[#888] leading-relaxed">
            Explore the developers, architects, and cybersecurity specialists engineering the next generation of digital infrastructure.
          </p>
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
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-64 rounded-3xl bg-[#0C0C0C] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-2">
            <Users className="w-8 h-8 text-[#555] mx-auto" />
            <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No members found</h4>
            <p className="text-xs text-[#666]">Try adjusting your search criteria or tag filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((member) => (
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

                  {/* Skills tags */}
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
      </main>
    </div>
  );
}
