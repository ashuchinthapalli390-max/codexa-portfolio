"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Github, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  Users, 
  Code2, 
  X, 
  Maximize2,
  Lock
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { NeonButton } from "@/components/ui/NeonButton";
import { Project } from "@/lib/data-store";
import { OFFICIAL_PROJECTS } from "@/config/officialProjects";

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const initialFallback = slug
    ? OFFICIAL_PROJECTS.find(
        (p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id === slug
      ) || null
    : null;

  const [project, setProject] = useState<Project | null>(initialFallback);
  const [loading, setLoading] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/projects/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.project) {
          setProject(data.project);
        } else {
          const fallback = OFFICIAL_PROJECTS.find(
            (p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id === slug
          );
          if (fallback) setProject(fallback);
        }
      })
      .catch(() => {
        const fallback = OFFICIAL_PROJECTS.find(
          (p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id === slug
        );
        if (fallback) setProject(fallback);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A5A5A5]">
          <Cpu className="w-6 h-6 animate-spin text-bright-red" />
          <span className="font-orbitron text-sm tracking-widest uppercase">Loading Case Study...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Code2 className="w-16 h-16 text-crimson animate-pulse" />
        <h1 className="font-orbitron text-2xl font-black uppercase">Project Not Found</h1>
        <p className="text-xs text-[#888] max-w-md font-light">
          The requested project case study could not be located or may have been drafted.
        </p>
        <Link href="/team-projects">
          <NeonButton variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </NeonButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070707] text-white overflow-hidden pb-24">
      {/* Background Cyber Overlay & Ambient Lighting */}
      <CyberWebOverlay />
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-crimson/5 rounded-full blur-[180px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-20 px-6 py-6 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded bg-deep-red/30 border border-crimson/30 group-hover:border-bright-red/50 transition-all duration-300">
            <Sparkles className="w-5 h-5 text-bright-red" />
          </div>
          <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white">
            CODEXA <span className="text-crimson text-xs font-normal">BUILDS</span>
          </span>
        </Link>

        <Link
          href="/team-projects"
          className="flex items-center gap-1.5 text-xs font-orbitron text-[#A5A5A5] hover:text-white transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Projects
        </Link>
      </header>

      {/* Main Case Study Content */}
      <main className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-12">
        
        {/* Project Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-crimson/25 bg-[#090909] shadow-2xl">
          {/* Main Media Preview */}
          <div className="relative h-[320px] sm:h-[420px] w-full bg-[#111] overflow-hidden">
            <img
              src={project.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"}
              alt={project.title}
              className="w-full h-full object-cover filter saturate-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/40 to-transparent" />
            
            {/* Top Badges */}
            <div className="absolute top-6 left-6 flex items-center gap-2">
              <span className="bg-black/80 backdrop-blur-md px-3.5 py-1 rounded-full text-[10px] font-orbitron font-bold text-bright-red uppercase border border-crimson/30">
                {project.category}
              </span>
              {project.isMainProject && (
                <span className="bg-crimson/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-orbitron font-bold text-white uppercase border border-bright-red/40 flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3 h-3 text-white" />
                  OFFICIAL MAIN BUILD
                </span>
              )}
            </div>

            {/* Bottom Title & Action Bar overlapping hero */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  STATUS: {project.status}
                </span>
                <h1 className="font-orbitron font-black text-3xl sm:text-5xl text-white tracking-wide uppercase mt-2">
                  {project.title}
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                    <NeonButton variant="primary" size="sm" className="text-xs py-2.5 px-4">
                      Live Preview <ExternalLink className="w-3.5 h-3.5" />
                    </NeonButton>
                  </a>
                )}
                {project.repoUrl ? (
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111]/90 hover:bg-[#1A1A1A] border border-crimson/30 hover:border-bright-red text-xs font-orbitron font-bold uppercase tracking-wider text-white transition-all">
                      <Github className="w-4 h-4" /> Repo
                    </button>
                  </a>
                ) : (
                  <div
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-orbitron font-bold uppercase tracking-wider select-none"
                    title="Proprietary / Closed-Source Repository"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Code is Private
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Developer & Collaborators Card */}
        <div className="rounded-2xl bg-[#090909]/90 border border-crimson/20 p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          
          {/* Creator Credit */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-crimson/40 bg-[#111] flex-shrink-0">
              <img
                src={project.creator?.mediaUrl || "/assets/images/logo.jpeg"}
                alt={project.creator?.displayName || "Developer"}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-orbitron text-bright-red uppercase font-bold tracking-widest">
                Lead Architect / Developer
              </span>
              <h3 className="font-orbitron font-bold text-lg text-white">
                {project.creator?.displayName || "CodeXa Engineer"}
              </h3>
              {project.creator?.username && (
                <Link
                  href={`/team/${project.creator.username}`}
                  className="text-xs font-orbitron text-[#888] hover:text-bright-red transition-colors flex items-center gap-1"
                >
                  View Profile @{project.creator.username} &rarr;
                </Link>
              )}
            </div>
          </div>

          {/* Collaborators List */}
          {project.collaborators && project.collaborators.length > 0 && (
            <div className="border-t md:border-t-0 md:border-l border-[#1A1A1A] pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
              <span className="text-[10px] font-orbitron text-[#666] uppercase font-bold tracking-widest block mb-2">
                Co-Engineers & Contributors
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {project.collaborators.map((c) => (
                  <Link
                    key={c.id}
                    href={`/team/${c.username}`}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-[#111] hover:bg-[#1A1A1A] border border-white/5 hover:border-crimson/30 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-[#222]">
                      <img src={c.mediaUrl || "/assets/images/logo.jpeg"} alt={c.displayName} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-orbitron text-white">{c.displayName}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Project Overview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-crimson rounded-full" />
            <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-white">
              System Architecture & Overview
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#A5A5A5] font-light leading-relaxed whitespace-pre-line bg-[#090909] border border-crimson/15 rounded-2xl p-6 md:p-8">
            {project.overview}
          </p>
        </div>

        {/* Problem vs Solution Grid */}
        {(project.problem || project.solution) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {project.problem && (
              <div className="rounded-2xl bg-[#090909] border border-deep-red/30 p-6 md:p-8 space-y-3">
                <div className="flex items-center gap-2 text-bright-red font-orbitron font-bold text-sm tracking-wider uppercase">
                  <ShieldAlert className="w-4 h-4" />
                  The Problem
                </div>
                <p className="text-xs sm:text-sm text-[#A5A5A5] font-light leading-relaxed">
                  {project.problem}
                </p>
              </div>
            )}

            {project.solution && (
              <div className="rounded-2xl bg-[#090909] border border-emerald-500/30 p-6 md:p-8 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-orbitron font-bold text-sm tracking-wider uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  The Engineered Solution
                </div>
                <p className="text-xs sm:text-sm text-[#A5A5A5] font-light leading-relaxed">
                  {project.solution}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Key Features Breakdown */}
        {project.features && project.features.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-crimson rounded-full" />
              <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-white">
                Core Engineering Features
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.features.map((feature, fIdx) => (
                <div
                  key={fIdx}
                  className="rounded-xl bg-[#090909] border border-crimson/15 p-5 flex items-start gap-3.5 hover:border-bright-red/40 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5 text-bright-red flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-[#CCCCCC] font-light leading-snug">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack Cloud */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-crimson rounded-full" />
            <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-white">
              Technology Stack
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech, tIdx) => (
              <span
                key={tIdx}
                className="text-xs font-mono uppercase bg-[#090909] px-4 py-2 rounded-lg border border-crimson/25 text-[#C0C0C0] hover:border-bright-red/50 hover:text-white transition-colors"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Screenshots Gallery */}
        {project.screenshots && project.screenshots.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-crimson rounded-full" />
              <h2 className="font-orbitron font-bold text-xl uppercase tracking-wider text-white">
                Interface Preview & Screenshots
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.screenshots.map((shot, sIdx) => (
                <div
                  key={sIdx}
                  onClick={() => setActiveScreenshot(shot)}
                  className="relative rounded-xl overflow-hidden border border-crimson/20 bg-[#111] cursor-pointer group h-56"
                >
                  <img
                    src={shot}
                    alt={`Screenshot ${sIdx + 1}`}
                    className="w-full h-full object-cover filter saturate-80 group-hover:saturate-100 group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeScreenshot && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setActiveScreenshot(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden border border-crimson/30 bg-black"
            >
              <button
                onClick={() => setActiveScreenshot(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-crimson transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={activeScreenshot} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
