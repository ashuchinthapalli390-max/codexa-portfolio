"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ArrowLeft, 
  ArrowUpRight, 
  Github, 
  ExternalLink, 
  Filter, 
  Code2, 
  Shield, 
  Sparkles, 
  User, 
  Layers 
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { Project } from "@/lib/data-store";

const CATEGORIES = ["All", "AI", "Web", "Mobile", "Cybersecurity", "Automation", "Full Stack", "Discord Bot", "API"];

export default function TeamProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects?public=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(q) || 
      p.shortDesc.toLowerCase().includes(q) || 
      p.techStack.some((t) => t.toLowerCase().includes(q)) ||
      (p.creator?.displayName && p.creator.displayName.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-[#070707] text-white overflow-hidden pb-24">
      {/* Background Cyber Web & Ambient Glow */}
      <CyberWebOverlay />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-crimson/5 rounded-full blur-[180px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-20 px-6 py-6 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded bg-deep-red/30 border border-crimson/30 group-hover:border-bright-red/50 transition-all duration-300">
            <Shield className="w-5 h-5 text-bright-red" />
          </div>
          <span className="font-orbitron font-black text-sm tracking-[0.2em] text-white">
            CODEXA <span className="text-crimson text-xs font-normal">PROJECTS</span>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-orbitron text-[#A5A5A5] hover:text-white transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Banner Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[10px] font-orbitron font-bold tracking-[0.3em] text-bright-red bg-deep-red/20 px-4 py-1.5 rounded-full border border-crimson/30 uppercase">
            ECOSYSTEM REPOSITORY
          </span>
          <h1 className="font-orbitron font-black text-3xl sm:text-5xl text-white tracking-wide uppercase mt-4 mb-3">
            CodeXa Team Projects
          </h1>
          <p className="text-xs sm:text-sm text-[#A5A5A5] font-light leading-relaxed">
            Discover cutting-edge AI pipelines, full-stack systems, mobile apps, bots, and cybersecurity tools engineered by our community.
          </p>
        </div>

        {/* Filter & Search Bar Console */}
        <div className="rounded-2xl bg-[#090909]/90 border border-crimson/25 p-5 md:p-6 backdrop-blur-xl mb-12 space-y-5 shadow-2xl">
          
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, developer, or tech stack (e.g. Next.js, Python, FastAPI)..."
              className="w-full bg-[#111] border border-crimson/20 focus:border-bright-red rounded-xl pl-11 pr-4 py-3.5 text-xs sm:text-sm text-white placeholder-[#555] outline-none transition-all focus:shadow-[0_0_20px_rgba(217,4,41,0.25)]"
            />
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-orbitron text-[#666] uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-crimson" /> Filter:
            </span>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-orbitron font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-300 border ${
                    isActive
                      ? "bg-crimson text-white border-bright-red shadow-[0_0_12px_rgba(217,4,41,0.4)]"
                      : "bg-[#111] text-[#888] hover:text-white border-white/5 hover:border-crimson/30"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

        </div>

        {/* Projects Grid List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-88 rounded-2xl bg-[#090909] border border-crimson/15 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-[#090909] border border-white/5 space-y-3">
            <Code2 className="w-12 h-12 mx-auto text-[#444]" />
            <h3 className="font-orbitron text-lg font-bold text-white uppercase">No Projects Found</h3>
            <p className="text-xs text-[#888] font-light max-w-sm mx-auto">
              No published projects match your search criteria or category filter.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#151515] border border-crimson/30 text-xs font-orbitron text-white uppercase hover:bg-crimson transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                whileHover={{ y: -6 }}
                className="rounded-2xl bg-[#090909] border border-crimson/20 hover:border-bright-red/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group shadow-lg hover:shadow-[0_0_30px_rgba(217,4,41,0.25)]"
              >
                {/* Thumbnail Banner */}
                <div className="relative h-48 w-full bg-[#111] overflow-hidden">
                  <img
                    src={project.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"}
                    alt={project.title}
                    className="w-full h-full object-cover filter saturate-80 group-hover:saturate-100 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded text-[9px] font-orbitron font-bold text-bright-red uppercase border border-crimson/30">
                    {project.category}
                  </div>
                  {project.isMainProject && (
                    <div className="absolute top-3 right-3 bg-crimson/90 backdrop-blur-md px-2.5 py-1 rounded text-[9px] font-orbitron font-bold text-white uppercase flex items-center gap-1 shadow-md">
                      <Sparkles className="w-3 h-3 text-white" />
                      MAIN BUILD
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-orbitron font-bold text-xl text-white group-hover:text-bright-red transition-colors mb-2">
                      {project.title}
                    </h3>

                    <p className="text-xs text-[#888] font-light line-clamp-2 leading-relaxed mb-4">
                      {project.shortDesc}
                    </p>

                    {/* Developer & Collaborators */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 py-2 px-3 rounded-lg bg-[#111] border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-crimson" />
                        <span className="text-[11px] font-orbitron text-[#A5A5A5]">
                          {project.creator?.displayName || "CodeXa Engineer"}
                        </span>
                      </div>
                      {project.collaborators && project.collaborators.length > 0 && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          +{project.collaborators.length} Collabs
                        </span>
                      )}
                    </div>

                    {/* Tech Stack Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {project.techStack.slice(0, 3).map((tech, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[9px] font-mono uppercase bg-[#141414] px-2.5 py-1 rounded border border-crimson/15 text-[#999]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-[#161616] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#777] hover:text-white transition-colors"
                          title="Live Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {project.repoUrl && (
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#777] hover:text-white transition-colors"
                          title="GitHub Repository"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <Link
                      href={`/projects/${project.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-orbitron font-bold text-bright-red hover:text-white transition-colors uppercase tracking-wider group-hover:translate-x-1 duration-300"
                    >
                      Case Study <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
