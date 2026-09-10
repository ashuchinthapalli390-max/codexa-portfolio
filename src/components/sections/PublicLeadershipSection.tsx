/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Sparkles,
  Users,
  Terminal,
  Cpu,
  ArrowUpRight,
  Code2,
  ExternalLink,
  Quote,
  X,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface LeadershipProfileDto {
  id: string;
  userId?: string | null;
  username: string;
  slug?: string | null;
  displayName: string;
  name?: string;
  role: string;
  primaryRole?: string | null;
  memberType?: string;
  leadershipPosition?: "FOUNDER" | "CO_FOUNDER" | "CEO" | "TEAM_LEAD" | string | null;
  headline?: string | null;
  bio?: string | null;
  publicBio?: string | null;
  quote?: string | null;
  mediaUrl?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
  cropZoom?: number | null;
  cropRotation?: number | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  featuredProjects?: Array<{ name: string; category: string; url?: string | null }>;
  displayOrder?: number;
  isPublic?: boolean;
  updatedAt?: string | null;
}

// Resilient default profiles matching official company leadership during DB cold start
const DEFAULT_LEADERSHIP: LeadershipProfileDto[] = [
  {
    id: "lead-ashu",
    username: "ashu",
    displayName: "Ashu",
    name: "Ashu",
    role: "OWNER",
    primaryRole: "Founder & Full-Stack Developer",
    leadershipPosition: "FOUNDER",
    headline: "Full-Stack Developer • AI Engineer • Cybersecurity & Linux Specialist",
    publicBio: "Ashu is the Founder and technical architect behind CodeXa Agency, building full-stack platforms, AI systems, cybersecurity tools, developer products, SaaS applications, desktop software and cross-platform applications.",
    quote: "Vision creates companies. Execution builds them.",
    mediaUrl: "/assets/images/founder.jpeg",
    cropX: 45,
    cropY: 22,
    cropZoom: 1.05,
    skills: ["Full-Stack", "AI Engineering", "Cybersecurity", "Next.js", "Linux", "Cloud Architecture"],
    displayOrder: 1,
    isPublic: true,
  },
  {
    id: "lead-sanjay",
    username: "sanjay",
    displayName: "Sanjay",
    name: "Sanjay",
    role: "ADMIN",
    primaryRole: "Co-Founder & Operations Lead",
    leadershipPosition: "CO_FOUNDER",
    headline: "Co-Founder • Platform Growth & Operations",
    publicBio: "Sanjay drives operations, cross-platform product architecture, and ecosystem expansion at CodeXa Agency.",
    quote: "Precision execution turns bold ideas into reality.",
    mediaUrl: "/assets/images/co-founder.jpeg",
    cropX: 50,
    cropY: 25,
    cropZoom: 1.05,
    skills: ["Platform Architecture", "Operations", "Team Leadership", "Product Scaling"],
    displayOrder: 2,
    isPublic: true,
  },
  {
    id: "lead-kishore",
    username: "kishore",
    displayName: "Kishore",
    name: "Kishore",
    role: "ADMIN",
    primaryRole: "CEO & Executive Strategy",
    leadershipPosition: "CEO",
    headline: "CEO • Strategic Expansion & Global Deliveries",
    publicBio: "Kishore directs executive strategy, key enterprise partnerships, and technology innovation at CodeXa Agency.",
    quote: "Vision creates companies. Relentless engineering scales them.",
    mediaUrl: "/assets/images/ceo.jpeg",
    cropX: 50,
    cropY: 20,
    cropZoom: 1.05,
    skills: ["Executive Strategy", "Enterprise Delivery", "Business Growth", "Technology Innovation"],
    displayOrder: 3,
    isPublic: true,
  },
];

interface PublicLeadershipProps {
  initialProfiles?: LeadershipProfileDto[];
}

export function PublicLeadershipSection({ initialProfiles }: PublicLeadershipProps) {
  const isReduced = useReducedMotion();

  const [profiles, setProfiles] = useState<LeadershipProfileDto[]>(
    initialProfiles && initialProfiles.length > 0 ? initialProfiles : []
  );
  const [coreTeamCount, setCoreTeamCount] = useState<number>(0);
  const [coreTeamMembers, setCoreTeamMembers] = useState<LeadershipProfileDto[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialProfiles || initialProfiles.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Modal inspection states
  const [selectedLeader, setSelectedLeader] = useState<LeadershipProfileDto | null>(null);
  const [coreTeamModalOpen, setCoreTeamModalOpen] = useState<boolean>(false);
  const [selectedCoreMember, setSelectedCoreMember] = useState<LeadershipProfileDto | null>(null);

  const fetchLeadershipData = () => {
    setLoading(true);
    setError(null);

    fetch("/api/team/public", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.profiles)) {
          const all: LeadershipProfileDto[] = data.profiles;

          // Filter executive leadership
          const leaders = all
            .filter((p) => p.memberType === "LEADERSHIP" || p.leadershipPosition || p.role === "OWNER")
            .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

          const core = all.filter(
            (p) => p.memberType !== "LEADERSHIP" && !p.leadershipPosition && p.role !== "OWNER"
          );

          if (leaders.length > 0) {
            setProfiles(leaders);
          } else {
            setProfiles(DEFAULT_LEADERSHIP);
          }
          setCoreTeamMembers(core);
          setCoreTeamCount(core.length);
        } else {
          setProfiles(DEFAULT_LEADERSHIP);
        }
      })
      .catch((err) => {
        console.warn("[PublicLeadershipSection] Fetch error, applying resilient defaults:", err);
        setError("Could not refresh live leadership records. Showing latest verified board.");
        setProfiles(DEFAULT_LEADERSHIP);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeadershipData();
  }, []);

  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedLeader(null);
        setCoreTeamModalOpen(false);
        setSelectedCoreMember(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getPositionBadge = (pos?: string | null, role?: string) => {
    if (pos === "FOUNDER" || role === "OWNER") {
      return { label: "FOUNDER", color: "bg-crimson/20 border-bright-red/60 text-bright-red" };
    }
    if (pos === "CO_FOUNDER") {
      return { label: "CO-FOUNDER", color: "bg-[#8B0000]/25 border-crimson/50 text-white" };
    }
    if (pos === "CEO") {
      return { label: "CHIEF EXECUTIVE OFFICER", color: "bg-[#1F0008] border-crimson/40 text-[#FF6B6B]" };
    }
    if (pos === "TEAM_LEAD") {
      return { label: "TEAM LEAD", color: "bg-white/10 border-white/20 text-[#DDD]" };
    }
    return { label: "CORE LEADERSHIP", color: "bg-white/5 border-white/10 text-[#AAA]" };
  };

  return (
    <section id="leadership" className="relative py-24 sm:py-32 overflow-hidden bg-[#070707] text-white">
      {/* Anchor for #team navigation */}
      <div id="team" className="absolute -top-10 pointer-events-none" />
      {/* Ambient Lighting Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-crimson/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[400px] bg-crimson/4 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ─── SECTION HEADER ──────────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-deep-red/30 border border-crimson/40 shadow-[0_0_15px_rgba(217,4,41,0.2)]">
            <Shield className="w-3.5 h-3.5 text-bright-red animate-pulse" />
            <span className="text-[10px] font-orbitron font-bold tracking-[0.25em] text-bright-red uppercase">
              LEADERSHIP CORE
            </span>
          </div>

          <h2 className="font-orbitron font-black text-3xl sm:text-4xl md:text-5xl text-white tracking-wider uppercase">
            CODEXA <span className="text-crimson">LEADERSHIP</span>
          </h2>

          <p className="text-sm sm:text-base text-[#A5A5A5] font-light leading-relaxed">
            The executive engineers, founders, and leaders architecting the CodeXa ecosystem.
          </p>

          {error && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-[#888] font-mono">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>{error}</span>
              <button
                onClick={fetchLeadershipData}
                className="text-crimson underline ml-1 hover:text-bright-red inline-flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            </div>
          )}
        </div>

        {/* ─── CANONICAL LEADERSHIP CARDS GRID ─────────────────────────────── */}
        {loading && profiles.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="cyber-card p-8 h-[420px] rounded-3xl border border-crimson/15 bg-[#0A0A0A] animate-pulse flex flex-col justify-between"
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 rounded-2xl bg-white/5" />
                  <div className="h-5 w-36 bg-white/10 rounded" />
                  <div className="h-3 w-48 bg-white/5 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-4/5 bg-white/5 rounded" />
                </div>
                <div className="h-10 w-full bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 bg-[#0A0A0A] rounded-3xl border border-crimson/15 max-w-xl mx-auto space-y-3">
            <Users className="w-10 h-10 text-crimson/50 mx-auto" />
            <h3 className="font-orbitron font-bold text-white text-base">Leadership Profiles Syncing</h3>
            <p className="text-xs text-[#888] font-light">
              Executive profiles are being loaded from the central data store. Please check back shortly.
            </p>
            <button
              onClick={fetchLeadershipData}
              className="mt-2 px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {profiles.map((leader, index) => {
              const badge = getPositionBadge(leader.leadershipPosition, leader.role);
              const isFounder = leader.leadershipPosition === "FOUNDER" || leader.role === "OWNER" || leader.username === "ashu";
              const isCoFounder = leader.leadershipPosition === "CO_FOUNDER" || leader.username === "sanjay";

              return (
                <motion.div
                  key={leader.id || leader.username || index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: isReduced ? 0 : index * 0.1 }}
                  className={`group relative rounded-3xl bg-[#090909] border ${
                    isFounder ? "border-crimson/50 hover:border-bright-red shadow-[0_0_35px_rgba(217,4,41,0.18)]" : "border-crimson/25 hover:border-crimson/60"
                  } p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_40px_rgba(217,4,41,0.25)] hover:-translate-y-1 overflow-hidden`}
                >
                  {/* Cyber Corner Highlights */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson pointer-events-none" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-crimson pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-crimson pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson pointer-events-none" />

                  {/* Ambient Glow */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-crimson/10 rounded-full blur-2xl group-hover:bg-crimson/20 transition-all pointer-events-none" />

                  <div className="space-y-6 relative z-10">
                    {/* Top Row: Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-orbitron font-bold tracking-[0.2em] px-3 py-1 rounded-full uppercase border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {isFounder && (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-bright-red tracking-wider">
                          <Sparkles className="w-3 h-3" /> Core Architect
                        </span>
                      )}
                    </div>

                    {/* Avatar & Identifiers */}
                    <div className="flex flex-col items-center text-center space-y-3 pt-2">
                      <div className="relative group/avatar cursor-pointer" onClick={() => setSelectedLeader(leader)}>
                        <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${isFounder ? "from-crimson to-bright-red opacity-80" : "from-deep-red to-crimson opacity-50"} blur-sm group-hover/avatar:opacity-100 transition-opacity`} />
                        <div className="relative rounded-2xl overflow-hidden border-2 border-crimson/40 group-hover/avatar:border-bright-red bg-black shadow-[0_0_20px_rgba(217,4,41,0.2)]">
                          <CodeXaAvatar
                            src={
                              leader.mediaUrl ||
                              (isFounder
                                ? "/assets/images/founder.jpeg"
                                : isCoFounder
                                ? "/assets/images/co-founder.jpeg"
                                : "/assets/images/ceo.jpeg")
                            }
                            alt={leader.displayName}
                            size="lg"
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl"
                            positionX={leader.cropX ?? (isFounder ? 45 : 50)}
                            positionY={leader.cropY ?? (isFounder ? 22 : isCoFounder ? 25 : 20)}
                            zoom={leader.cropZoom ?? 1.05}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-orbitron font-black text-xl text-white uppercase tracking-wider group-hover:text-bright-red transition-colors">
                          {leader.displayName}
                        </h3>
                        <p className="font-orbitron text-xs font-bold text-crimson uppercase tracking-wider">
                          {leader.primaryRole || leader.role}
                        </p>
                        {leader.headline && (
                          <p className="text-[11px] text-[#888] font-light max-w-xs mx-auto line-clamp-2">
                            {leader.headline}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quote Pill */}
                    {leader.quote && (
                      <div className="p-3 rounded-xl bg-[#111111]/90 border border-crimson/20 relative">
                        <Quote className="w-3 h-3 text-crimson absolute -top-1.5 -left-1.5 opacity-80" />
                        <p className="text-[11px] italic text-[#C0C0C0] text-center font-light leading-snug">
                          &ldquo;{leader.quote}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Bio Summary */}
                    <p className="text-xs text-[#999] font-light leading-relaxed line-clamp-3 text-center sm:text-left border-t border-white/5 pt-3">
                      {leader.publicBio || leader.bio || "Leading digital and technology operations at CodeXa Agency."}
                    </p>

                    {/* Skills Preview */}
                    {leader.skills && leader.skills.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                        {leader.skills.slice(0, 4).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2.5 py-0.5 rounded-full bg-[#141414] border border-crimson/20 text-[9px] font-orbitron font-semibold text-[#BBB]"
                          >
                            {skill}
                          </span>
                        ))}
                        {leader.skills.length > 4 && (
                          <span className="text-[9px] font-mono text-crimson">
                            +{leader.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between gap-3 relative z-10">
                    <button
                      onClick={() => setSelectedLeader(leader)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-crimson border border-crimson/30 hover:border-bright-red text-white text-[11px] font-orbitron font-bold uppercase tracking-wider transition-all duration-200 shadow-[0_0_15px_rgba(217,4,41,0.1)] hover:shadow-[0_0_20px_rgba(217,4,41,0.3)] inline-flex items-center justify-center gap-1.5"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {leader.username && (
                      <Link
                        href={`/team/${leader.username}`}
                        className="p-2.5 rounded-xl bg-[#121212] hover:bg-[#1C1C1C] border border-white/10 text-[#888] hover:text-white transition-colors"
                        title="Open Dedicated Page"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ─── CENTRED CORE TEAM HOLOGRAPHIC ACCESSOR ──────────────────────── */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={isReduced ? {} : { scale: 1.02 }}
            onClick={() => setCoreTeamModalOpen(true)}
            className="w-full max-w-md p-[1px] rounded-2xl cursor-pointer select-none"
            style={{
              background: "linear-gradient(135deg, rgba(217,4,41,0.4), rgba(7,7,7,0.8), rgba(217,4,41,0.2))",
              boxShadow: "0 10px 40px rgba(217,4,41,0.1)",
            }}
          >
            <div className="rounded-2xl p-6 bg-[#090909]/95 backdrop-blur-md border border-crimson/20 hover:border-bright-red/50 transition-all duration-300 flex items-center gap-5 relative overflow-hidden group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#111111] border border-crimson/30 group-hover:border-bright-red/60 shadow-[0_0_15px_rgba(217,4,41,0.2)]">
                <Users className="w-5 h-5 text-bright-red animate-pulse" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-orbitron font-bold text-base text-white uppercase group-hover:text-bright-red transition-colors">
                    Core Team Roster
                  </h3>
                  <span className="text-[9px] font-orbitron font-bold text-bright-red bg-crimson/15 px-2 py-0.5 rounded-full border border-crimson/30">
                    {coreTeamCount > 0 ? `${coreTeamCount} Members` : "Engineers"}
                  </span>
                </div>
                <p className="text-xs text-[#888] mt-0.5 font-light">
                  Talented full-stack engineers and specialists driving project execution.
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-[#888] group-hover:text-bright-red transition-colors" />
            </div>
          </motion.div>

          <Link
            href="/team"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#111111] hover:bg-crimson border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(217,4,41,0.15)] hover:shadow-[0_0_25px_rgba(217,4,41,0.4)]"
          >
            <span>Full Team Directory</span>
            <ExternalLink className="w-3.5 h-3.5 text-bright-red group-hover:text-white" />
          </Link>
        </div>

      </div>

      {/* ─── LEADER PROFILE DETAIL MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedLeader && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedLeader(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0A0A0A] border border-crimson/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6 sm:p-8 shadow-[0_0_60px_rgba(217,4,41,0.25)] space-y-6"
            >
              <button
                onClick={() => setSelectedLeader(null)}
                className="absolute right-4 top-4 z-20 p-2 rounded-full bg-[#161616] hover:bg-crimson text-[#888] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-white/5 pb-6 text-center sm:text-left">
                <div className="relative rounded-2xl overflow-hidden border-2 border-bright-red/70 bg-black flex-shrink-0 shadow-[0_0_25px_rgba(217,4,41,0.3)]">
                  <CodeXaAvatar
                    src={
                      selectedLeader.mediaUrl ||
                      (selectedLeader.leadershipPosition === "FOUNDER"
                        ? "/assets/images/founder.jpeg"
                        : selectedLeader.leadershipPosition === "CO_FOUNDER"
                        ? "/assets/images/co-founder.jpeg"
                        : "/assets/images/ceo.jpeg")
                    }
                    alt={selectedLeader.displayName}
                    size="xl"
                    className="w-28 h-28 rounded-2xl"
                    positionX={
                      selectedLeader.cropX ??
                      (selectedLeader.leadershipPosition === "FOUNDER" ? 45 : 50)
                    }
                    positionY={
                      selectedLeader.cropY ??
                      (selectedLeader.leadershipPosition === "FOUNDER"
                        ? 22
                        : selectedLeader.leadershipPosition === "CO_FOUNDER"
                        ? 25
                        : 20)
                    }
                    zoom={selectedLeader.cropZoom ?? 1.05}
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="inline-block px-3 py-0.5 rounded-full bg-crimson/20 border border-bright-red/40 text-[10px] font-orbitron font-bold text-bright-red uppercase">
                    {selectedLeader.leadershipPosition || selectedLeader.role}
                  </div>
                  <h3 className="font-orbitron font-black text-2xl sm:text-3xl text-white uppercase">
                    {selectedLeader.displayName}
                  </h3>
                  <p className="font-orbitron text-xs sm:text-sm text-crimson font-bold">
                    {selectedLeader.primaryRole}
                  </p>
                  {selectedLeader.headline && (
                    <p className="text-xs text-[#AAA] font-light leading-relaxed">
                      {selectedLeader.headline}
                    </p>
                  )}
                </div>
              </div>

              {/* Quote Block */}
              {selectedLeader.quote && (
                <div className="p-4 rounded-2xl bg-[#111111] border border-crimson/30 flex items-start gap-3">
                  <Quote className="w-5 h-5 text-bright-red shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm italic text-[#DDD] font-light leading-relaxed">
                    &ldquo;{selectedLeader.quote}&rdquo;
                  </p>
                </div>
              )}

              {/* Full Bio */}
              <div className="space-y-2">
                <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-crimson" /> Leadership Background
                </h4>
                <p className="text-xs text-[#999] leading-relaxed font-light border-l-2 border-crimson/50 pl-3.5">
                  {selectedLeader.bio || selectedLeader.publicBio || "Official executive leader at CodeXa Agency."}
                </p>
              </div>

              {/* Skills */}
              {selectedLeader.skills && selectedLeader.skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-crimson" /> Technical Competencies & Specializations
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLeader.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-[#141414] border border-crimson/25 text-[10px] font-orbitron font-bold text-[#DDD]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Modal Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => setSelectedLeader(null)}
                  className="px-5 py-2 rounded-xl bg-[#161616] hover:bg-[#222] text-xs font-orbitron text-[#888] hover:text-white transition-colors"
                >
                  Close
                </button>

                {selectedLeader.username && (
                  <Link
                    href={`/team/${selectedLeader.username}`}
                    className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(217,4,41,0.25)]"
                  >
                    <span>Full Profile & Systems</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CORE TEAM ROSTER MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {coreTeamModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCoreTeamModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-crimson/40 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative p-6 sm:p-8 shadow-[0_0_50px_rgba(217,4,41,0.2)] space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] font-orbitron text-bright-red tracking-[0.25em] uppercase font-bold">
                    ACTIVE ROSTER
                  </span>
                  <h3 className="font-orbitron font-black text-xl sm:text-2xl text-white uppercase mt-0.5">
                    Core Team Members
                  </h3>
                </div>
                <button
                  onClick={() => setCoreTeamModalOpen(false)}
                  className="p-2 rounded-full bg-[#161616] hover:bg-crimson text-[#888] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {coreTeamMembers.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Users className="w-8 h-8 text-crimson/40 mx-auto" />
                  <p className="text-xs text-[#888] font-light">
                    Core team members are registered in the main database. Visit the full directory for details.
                  </p>
                  <Link
                    href="/team"
                    className="inline-block px-4 py-2 rounded-xl bg-crimson text-white text-xs font-orbitron font-bold uppercase tracking-wider"
                  >
                    Open Directory
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {coreTeamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 rounded-2xl bg-[#111111] border border-white/5 hover:border-crimson/40 transition-all flex items-center gap-3.5 group"
                    >
                      <CodeXaAvatar src={member.mediaUrl} alt={member.displayName} size="md" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-orbitron font-bold text-sm text-white truncate group-hover:text-bright-red transition-colors">
                          {member.displayName}
                        </h4>
                        <p className="text-[10px] text-crimson font-mono truncate">
                          {member.primaryRole || "Core Developer"}
                        </p>
                        {member.headline && (
                          <p className="text-[10px] text-[#777] font-light truncate">
                            {member.headline}
                          </p>
                        )}
                      </div>
                      {member.username && (
                        <Link
                          href={`/team/${member.username}`}
                          className="p-2 rounded-lg bg-[#181818] text-[#888] hover:text-white hover:bg-crimson transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[11px] text-[#666] font-mono">
                  {coreTeamMembers.length} verified members registered
                </span>
                <Link
                  href="/team"
                  className="text-xs font-orbitron font-bold text-crimson hover:text-bright-red inline-flex items-center gap-1 uppercase tracking-wider"
                >
                  <span>Explore Full Directory</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
