"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUpRight, Github, ExternalLink, Code2, Users, Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "../ui/SectionHeading";
import { NeonButton } from "../ui/NeonButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Project } from "@/lib/data-store";
import { OFFICIAL_PROJECTS } from "@/config/officialProjects";

const CATEGORIES = ["All", "AI", "Web", "Mobile", "Cybersecurity", "Automation", "Full Stack"];

export function TeamProjectsSection() {
  const isReduced = useReducedMotion();
  const [projects, setProjects] = useState<Project[]>(OFFICIAL_PROJECTS);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects?public=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects(data.projects);
        } else {
          setProjects(OFFICIAL_PROJECTS);
        }
      })
      .catch(() => {
        setProjects(OFFICIAL_PROJECTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = selectedCategory === "All"
    ? projects
    : projects.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <section id="team-projects" className="relative py-20 bg-[#070707] overflow-hidden border-t border-crimson/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Section Heading */}
        <SectionHeading
          badge="From Our Developers"
          title="Team & Community Builds"
          subtitle="Explore the latest open-source tools, client applications, and experiments engineered by CodeXa members."
          align="center"
        />

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10 mb-12">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-orbitron text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 border ${
                  isActive
                    ? "bg-crimson text-white border-bright-red shadow-[0_0_15px_rgba(217,4,41,0.4)]"
                    : "bg-[#0E0E0E] text-[#888] hover:text-white border-crimson/20 hover:border-crimson/40"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-xl bg-card/40 border border-crimson/15 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  whileHover={isReduced ? {} : { y: -6 }}
                  className="rounded-xl bg-[#090909] border border-crimson/20 hover:border-bright-red/50 transition-all duration-300 flex flex-col justify-between overflow-hidden group shadow-md hover:shadow-[0_0_25px_rgba(217,4,41,0.2)]"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative h-44 w-full bg-[#111] overflow-hidden">
                    <img
                      src={project.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"}
                      alt={project.title}
                      className="w-full h-full object-cover filter saturate-75 group-hover:saturate-100 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[9px] font-orbitron font-bold text-bright-red uppercase border border-crimson/30">
                      {project.category}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-orbitron font-bold text-lg text-white group-hover:text-bright-red transition-colors mb-1.5">
                        {project.title}
                      </h4>
                      
                      <p className="text-xs text-[#888] font-light line-clamp-2 leading-relaxed mb-3.5">
                        {project.shortDesc}
                      </p>

                      {/* Developer Credit Tag */}
                      <div className="flex items-center gap-2 mb-3.5 py-1.5 px-2.5 rounded bg-[#0E0E0E] border border-white/5">
                        <span className="text-[10px] text-[#666] font-orbitron uppercase">Built by</span>
                        <span className="text-xs font-orbitron font-bold text-white group-hover:text-bright-red transition-colors">
                          {project.creator?.displayName || "CodeXa Engineer"}
                        </span>
                      </div>

                      {/* Tech Stack Pills */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {project.techStack.slice(0, 3).map((tech, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono uppercase bg-[#111] px-2 py-0.5 rounded border border-crimson/15 text-[#999]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Action Links */}
                    <div className="pt-3 border-t border-[#141414] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {project.liveUrl && (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-crimson/15 hover:bg-crimson text-bright-red hover:text-white border border-crimson/30 hover:border-bright-red transition-all text-[10px] font-orbitron font-bold uppercase tracking-wider"
                            title="Open Website"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Live
                          </a>
                        )}

                        {project.repoUrl ? (
                          <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#777] hover:text-white transition-colors p-1"
                            title="GitHub Repository"
                          >
                            <Github className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 border border-crimson/30 text-[9px] font-mono text-crimson"
                            title="Source Code is Private"
                          >
                            <Lock className="w-2.5 h-2.5 text-crimson" />
                            Private
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-orbitron font-bold text-bright-red hover:text-white transition-colors uppercase tracking-wider"
                      >
                        View Project <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* View All Projects CTA Button */}
        <div className="mt-14 text-center">
          <Link href="/team-projects">
            <NeonButton variant="outline" size="md">
              View All Developer Projects
              <ArrowRight className="w-4 h-4" />
            </NeonButton>
          </Link>
        </div>

      </div>
    </section>
  );
}
