"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Sparkles,
  ArrowRight,
  Terminal,
  Cpu,
  Lock,
  Globe,
  Layers,
  Smartphone,
  ChevronRight,
  Code2,
  Users,
  Briefcase,
  GitBranch
} from "lucide-react";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import {
  sectionRevealVariants,
  staggerContainerVariants,
  staggerItemVariants,
  cardRevealVariants,
  buttonHoverVariants,
  chipHoverVariants,
} from "@/lib/motion";
import { Profile } from "@/lib/data-store";

interface LeadershipSpotlightProps {
  profiles?: Profile[];
}

export function LeadershipSpotlightSection({ profiles = [] }: LeadershipSpotlightProps) {
  // Extract leadership profiles by position or role
  const founder = profiles.find(
    (p) =>
      p.leadershipPosition === "FOUNDER" ||
      p.role === "OWNER" ||
      p.username.toLowerCase() === "ashu"
  );

  const ceo = profiles.find(
    (p) =>
      p.leadershipPosition === "CEO" ||
      p.username.toLowerCase() === "venu"
  );

  const coFounder = profiles.find(
    (p) =>
      p.leadershipPosition === "CO_FOUNDER" ||
      p.username.toLowerCase() === "deepak"
  );

  const teamLead = profiles.find(
    (p) =>
      p.leadershipPosition === "TEAM_LEAD" ||
      p.username.toLowerCase() === "teamlead"
  );

  // Fallback / initial project systems if not yet loaded from DB
  const founderProjects = founder?.featuredProjects && founder.featuredProjects.length > 0
    ? founder.featuredProjects
    : [
        { name: "CodeXa IDE", category: "Developer Platform" },
        { name: "Nexa AI", category: "Artificial Intelligence" },
        { name: "EDITH AI Agent", category: "AI Agent" },
        { name: "Cyber Kivi Max", category: "Cybersecurity" },
        { name: "Vishnu Max", category: "Application" },
        { name: "CloudWave", category: "Cloud / Platform" },
        { name: "NodeWave", category: "Developer System" },
        { name: "CodeXa OS", category: "System Platform" },
      ];

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
    <section id="leadership" className="relative py-24 sm:py-32 overflow-hidden bg-[#070707] text-white">
      {/* Background Ambient Cyber Lighting */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-crimson/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[400px] bg-crimson/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ─── SECTION HEADER ──────────────────────────────────────────────── */}
        <motion.div
          variants={sectionRevealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4"
        >
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
            The people building, leading and scaling the CodeXa ecosystem.
          </p>
        </motion.div>

        {/* ─── LEADERSHIP GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ─── 1. FOUNDER FEATURE CARD (60–65% WIDTH) ────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.div
            variants={cardRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="lg:col-span-7 xl:col-span-8 group relative rounded-3xl bg-[#0A0A0A] border border-crimson/40 p-6 sm:p-10 backdrop-blur-xl transition-all duration-500 hover:border-bright-red hover:shadow-[0_0_50px_rgba(217,4,41,0.25)] flex flex-col justify-between overflow-hidden"
          >
            {/* Cyber Corner Marks */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-crimson pointer-events-none" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-crimson pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-crimson pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-crimson pointer-events-none" />

            {/* Ambient Background Gradient Accent */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-crimson/10 rounded-full blur-3xl group-hover:bg-crimson/20 transition-all duration-700 pointer-events-none" />

            <div className="space-y-8 relative z-10">
              
              {/* Top Row: Founder Badge & Authority Tag */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson/20 border border-bright-red/50 shadow-[0_0_12px_rgba(217,4,41,0.3)]">
                  <Sparkles className="w-3.5 h-3.5 text-bright-red" />
                  <span className="text-[10px] font-orbitron font-black tracking-[0.25em] text-white uppercase">
                    FOUNDER // CODEXA
                  </span>
                </div>

                <span className="text-[10px] font-mono font-bold tracking-widest text-[#888] uppercase bg-[#121212] px-3 py-1 rounded border border-white/5">
                  CORE ARCHITECT
                </span>
              </div>

              {/* Profile Main Header (Avatar + Name + Role + Headline) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative group/avatar flex-shrink-0">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-crimson to-bright-red opacity-70 blur-sm group-hover/avatar:opacity-100 transition-opacity" />
                  <div className="relative rounded-2xl overflow-hidden border-2 border-bright-red bg-black">
                    <CodeXaAvatar
                      src={founder?.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
                      alt={founder?.displayName || "Ashu"}
                      size="xl"
                      className="w-24 h-24 sm:w-28 sm:h-28"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-orbitron font-black text-2xl sm:text-3xl lg:text-4xl text-white uppercase tracking-wider group-hover:text-bright-red transition-colors">
                    {founder?.displayName || "Ashu"}
                  </h3>
                  <p className="font-orbitron text-xs sm:text-sm font-bold text-crimson uppercase tracking-widest">
                    {founder?.primaryRole || "Founder & Full-Stack Developer"}
                  </p>
                  <p className="text-xs sm:text-sm text-[#CCCCCC] font-light leading-relaxed max-w-xl">
                    {founder?.headline || "Full-Stack Developer • AI Engineer • Cybersecurity & Linux Specialist"}
                  </p>
                </div>
              </div>

              {/* Short Bio */}
              <p className="text-xs sm:text-sm text-[#999999] font-light leading-relaxed border-l-2 border-crimson/50 pl-4">
                {founder?.publicBio ||
                  "Ashu is the Founder and technical architect behind CodeXa Agency, building full-stack platforms, AI systems, cybersecurity tools, developer products, SaaS applications, desktop software and cross-platform applications."}
              </p>

              {/* Capability Strip */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-bright-red" />
                  <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.2em] text-[#888]">
                    ENGINEERING CAPABILITIES
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {capabilityStrip.map((cap, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] sm:text-[10px] font-orbitron font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#121212] border border-crimson/20 text-[#D0D0D0] hover:border-bright-red hover:text-white transition-all"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selected Projects & Systems Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-bright-red" />
                    <span className="text-[10px] font-orbitron font-bold uppercase tracking-[0.2em] text-[#888]">
                      SELECTED PROJECTS & SYSTEMS
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#666]">DISPLAY-ONLY</span>
                </div>

                <motion.div
                  variants={staggerContainerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
                >
                  {founderProjects.map((proj, idx) => (
                    <motion.div
                      key={idx}
                      variants={staggerItemVariants}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="group/chip relative p-3 rounded-xl bg-[#111111] border border-white/5 hover:border-crimson/60 hover:bg-[#141414] transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm"
                    >
                      {/* Subtle Laser Scan Effect */}
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-crimson to-transparent opacity-0 group-hover/chip:opacity-100 transition-opacity" />
                      
                      <div className="font-orbitron font-bold text-xs text-white uppercase group-hover/chip:text-bright-red transition-colors truncate">
                        {proj.name}
                      </div>
                      <div className="text-[9px] font-mono text-[#777] uppercase truncate mt-1">
                        {proj.category}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

            </div>

            {/* Founder Footer Link Button */}
            <div className="mt-8 pt-6 border-t border-crimson/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-[#777] font-mono">
                Full-Stack &bull; AI Systems &bull; Cybersecurity &bull; Linux &bull; Flutter
              </span>

              <motion.div variants={buttonHoverVariants} whileHover="hover" whileTap="tap">
                <Link
                  href={`/team/${founder?.username || "ashu"}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,4,41,0.35)]"
                >
                  VIEW FULL PROFILE <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ─── 2. EXECUTIVE SUPPORTING STACK (35–40% WIDTH) ──────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            {/* ── CARD A: CEO (Venu) ── */}
            <motion.div
              variants={cardRevealVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="group relative rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 backdrop-blur-xl hover:border-bright-red/70 hover:shadow-[0_0_30px_rgba(217,4,41,0.15)] transition-all duration-300 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-orbitron font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 uppercase tracking-widest">
                  CEO // STRATEGY & OPERATIONS
                </span>
                <span className="text-[9px] font-mono text-[#666] uppercase">EXECUTIVE</span>
              </div>

              <div className="flex items-center gap-4">
                <CodeXaAvatar
                  src={ceo?.mediaUrl || "/assets/images/2306fc1d8f6ea04d1ddd4ebfafd003f2.jpg"}
                  alt={ceo?.displayName || "Venu"}
                  size="md"
                  className="border border-amber-500/40 flex-shrink-0"
                />
                <div>
                  <h4 className="font-orbitron font-black text-lg text-white uppercase group-hover:text-amber-400 transition-colors">
                    {ceo?.displayName || "Venu"}
                  </h4>
                  <p className="text-[10px] font-orbitron font-bold text-[#AAA] uppercase tracking-wider">
                    {ceo?.primaryRole || "Chief Executive Officer"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#888] font-light leading-relaxed line-clamp-3">
                {ceo?.publicBio ||
                  "The CEO helps lead CodeXa's strategy, execution, client operations, team direction and business growth while continuing to expand technical expertise across modern development and digital systems."}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Business Strategy", "Project Direction", "Client Operations", "Team Leadership"].map((s, i) => (
                  <span key={i} className="text-[9px] font-mono text-[#AAA] bg-[#141414] px-2 py-0.5 rounded border border-white/5">
                    {s}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-orbitron text-amber-400 font-bold uppercase tracking-widest">
                  EXPERIENCED &bull; CONTINUOUS LEARNING
                </span>
                <Link
                  href={`/team/${ceo?.username || "venu"}`}
                  className="text-xs font-orbitron text-bright-red hover:underline uppercase inline-flex items-center gap-1 font-bold"
                >
                  Profile <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* ── CARD B: CO-FOUNDER (Deepak) ── */}
            <motion.div
              variants={cardRevealVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="group relative rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 backdrop-blur-xl hover:border-bright-red/70 hover:shadow-[0_0_30px_rgba(217,4,41,0.15)] transition-all duration-300 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-orbitron font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/30 uppercase tracking-widest">
                  CO-FOUNDER // COMMUNITY & GROWTH
                </span>
                <span className="text-[9px] font-mono text-[#666] uppercase">COMMUNITY</span>
              </div>

              <div className="flex items-center gap-4">
                <CodeXaAvatar
                  src={coFounder?.mediaUrl || "/assets/images/2299fdd2a1d01339a71af61a2c7e9cac.jpg"}
                  alt={coFounder?.displayName || "Deepak"}
                  size="md"
                  className="border border-sky-500/40 flex-shrink-0"
                />
                <div>
                  <h4 className="font-orbitron font-black text-lg text-white uppercase group-hover:text-sky-400 transition-colors">
                    {coFounder?.displayName || "Deepak"}
                  </h4>
                  <p className="text-[10px] font-orbitron font-bold text-[#AAA] uppercase tracking-wider">
                    {coFounder?.primaryRole || "Co-Founder & Community Director"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#888] font-light leading-relaxed line-clamp-3">
                {coFounder?.publicBio ||
                  "The Co-Founder supports CodeXa's growth, team collaboration, developer community and internal operations while continuously expanding technical knowledge and development experience."}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Team Collaboration", "Community Support", "Project Coordination", "Developer Learning"].map((s, i) => (
                  <span key={i} className="text-[9px] font-mono text-[#AAA] bg-[#141414] px-2 py-0.5 rounded border border-white/5">
                    {s}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-orbitron text-sky-400 font-bold uppercase tracking-widest">
                  BUILDING &bull; LEARNING &bull; SUPPORTING
                </span>
                <Link
                  href={`/team/${coFounder?.username || "deepak"}`}
                  className="text-xs font-orbitron text-bright-red hover:underline uppercase inline-flex items-center gap-1 font-bold"
                >
                  Profile <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* ── CARD C: TEAM LEAD ── */}
            <motion.div
              variants={cardRevealVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className="group relative rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 backdrop-blur-xl hover:border-bright-red/70 hover:shadow-[0_0_30px_rgba(217,4,41,0.15)] transition-all duration-300 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-orbitron font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-widest">
                  TEAM LEAD // COORDINATION EXPERT
                </span>
                <span className="text-[9px] font-mono text-[#666] uppercase">COORDINATION</span>
              </div>

              <div className="flex items-center gap-4">
                <CodeXaAvatar
                  src={teamLead?.mediaUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"}
                  alt={teamLead?.displayName || "Team Lead"}
                  size="md"
                  className="border border-emerald-500/40 flex-shrink-0"
                />
                <div>
                  <h4 className="font-orbitron font-black text-lg text-white uppercase group-hover:text-emerald-400 transition-colors">
                    {teamLead?.displayName || "Team Lead"}
                  </h4>
                  <p className="text-[10px] font-orbitron font-bold text-[#AAA] uppercase tracking-wider">
                    {teamLead?.primaryRole || "Team Lead & Coordination Expert"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#888] font-light leading-relaxed line-clamp-3">
                {teamLead?.publicBio ||
                  "The Team Lead manages day-to-day coordination between CodeXa members, tracks team execution, helps organize project responsibilities and supports smooth communication between leadership and developers."}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Team Coordination", "Task Management", "Execution Tracking", "Member Sync"].map((s, i) => (
                  <span key={i} className="text-[9px] font-mono text-[#AAA] bg-[#141414] px-2 py-0.5 rounded border border-white/5">
                    {s}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-orbitron text-emerald-400 font-bold uppercase tracking-widest">
                  COORDINATION &bull; EXECUTION
                </span>
                <Link
                  href={`/team/${teamLead?.username || "teamlead"}`}
                  className="text-xs font-orbitron text-bright-red hover:underline uppercase inline-flex items-center gap-1 font-bold"
                >
                  Profile <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

          </div>

        </div>

      </div>
    </section>
  );
}
