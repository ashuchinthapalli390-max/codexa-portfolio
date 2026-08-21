"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  ArrowUpRight,
  Github,
  Globe,
  Filter,
  Code2,
  Shield,
  Sparkles,
  User,
  Layers,
  FolderGit2
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Project } from "@/lib/data-store";

const CATEGORIES = ["ALL", "AI", "WEB", "MOBILE", "CYBERSECURITY", "CLOUD", "AUTOMATION"];

export default function ProjectsShowcasePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects?public=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.projects) {
          setProjects(data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesCategory =
      selectedCategory === "ALL" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(q) ||
      (p.shortDesc && p.shortDesc.toLowerCase().includes(q)) ||
      (p.overview && p.overview.toLowerCase().includes(q)) ||
      (p.techStack && p.techStack.some((t) => t.toLowerCase().includes(q))) ||
      (p.creator?.displayName && p.creator.displayName.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-[#070707] text-white overflow-hidden pb-24">
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
            CODEXA <span className="text-crimson text-xs font-normal">PROJECT SHOWCASE</span>
          </span>
        </div>

        <Link
          href="/dashboard/projects"
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)]"
        >
          My Builds
        </Link>
      </header>

      {/* ─── MAIN CONTAINER ──────────────────────────────────────────────── */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-10">
        
        {/* Banner Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-[10px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-4 py-1.5 rounded-full border border-crimson/30 uppercase">
            PUBLIC & TEAM BUILDS
          </span>
          <h1 className="font-orbitron font-black text-3xl sm:text-5xl text-white tracking-wide uppercase">
            Engineered Systems & Products
          </h1>
          <p className="text-xs sm:text-sm text-[#A5A5A5] leading-relaxed">
            Explore production applications, autonomous AI agents, cybersecurity tools, and developer platforms built by CodeXa engineers.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-3xl bg-[#090909]/90 border border-crimson/25 p-5 md:p-6 backdrop-blur-xl space-y-5 shadow-2xl">
          <div className="relative">
            <Search className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by title, stack, or creator..."
              className="w-full bg-[#121212] border border-crimson/20 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-[#555] outline-none focus:border-bright-red transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all ${
                    isSelected
                      ? "bg-crimson text-white border border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.3)]"
                      : "bg-[#121212] text-[#888] hover:text-white border border-white/5"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-72 rounded-3xl bg-[#0A0A0A] animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-[#0A0A0A] border border-white/5 space-y-2">
            <FolderGit2 className="w-10 h-10 text-[#555] mx-auto" />
            <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No projects match your filter</h4>
            <p className="text-xs text-[#666]">Try adjusting your search terms or category selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="cyber-card overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                <div className="relative aspect-video bg-[#050505] overflow-hidden">
                  <img
                    src={proj.thumbnailUrl || "/assets/images/logo.jpeg"}
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-crimson text-white text-[8px] font-orbitron font-black uppercase tracking-wider">
                      {proj.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-black/80 text-emerald-400 text-[8px] font-orbitron font-bold uppercase">
                      {proj.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-orbitron font-bold text-base text-white group-hover:text-bright-red transition-colors">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                      {proj.shortDesc || proj.overview}
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Tech Stack Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {proj.techStack?.slice(0, 3).map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.8 rounded-lg bg-[#141414] border border-white/5 text-[9px] font-orbitron text-[#BBB]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Action Link to Case Study */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <Link
                        href={`/projects/${proj.slug}`}
                        className="flex-1 py-2.5 rounded-xl bg-[#141414] hover:bg-crimson group-hover:bg-crimson text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md"
                      >
                        View Case Study <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      {proj.liveUrl && (
                        <a
                          href={proj.liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-white transition-colors"
                          title="Live Demo"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {proj.repoUrl && (
                        <a
                          href={proj.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-white transition-colors"
                          title="GitHub Repo"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
