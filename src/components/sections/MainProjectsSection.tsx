"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Github, ExternalLink, Sparkles, Layers, Cpu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "../ui/SectionHeading";
import { NeonButton } from "../ui/NeonButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Project } from "@/lib/data-store";

export function MainProjectsSection() {
  const isReduced = useReducedMotion();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects?main=true")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.projects);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="main-projects" className="relative py-24 bg-[#070707] overflow-hidden">
      {/* Background cyber ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-crimson/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <SectionHeading
          badge="Featured Builds"
          title="Main Official Projects"
          subtitle="Enterprise-grade AI systems, developer ecosystems, and cybersecurity frameworks engineered and verified by CodeXa."
          align="center"
        />

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-14">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-card/40 border border-crimson/15 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-14">
            {projects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                whileHover={isReduced ? {} : { y: -8 }}
                className="group relative rounded-2xl bg-[#0A0A0A]/90 border border-crimson/25 hover:border-bright-red/60 transition-all duration-300 flex flex-col overflow-hidden shadow-lg hover:shadow-[0_0_35px_rgba(217,4,41,0.25)]"
              >
                {/* Top Corner Badge */}
                <div className="absolute top-3 left-4 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-crimson/30 text-[9px] font-orbitron font-bold text-bright-red uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-bright-red animate-pulse" />
                  FLAGSHIP // {project.category}
                </div>

                {/* Media Image Banner */}
                <div className="relative h-56 w-full overflow-hidden bg-[#111]">
                  <img
                    src={project.thumbnailUrl || "/assets/images/4e56a053e3ee0019b13c19c5b3f614fe.jpg"}
                    alt={project.title}
                    className="w-full h-full object-cover filter saturate-90 group-hover:saturate-110 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-90 pointer-events-none" />
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-orbitron font-black text-xl text-white tracking-wide group-hover:text-bright-red transition-colors">
                        {project.title}
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
                        {project.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#A5A5A5] font-light line-clamp-3 leading-relaxed mb-4">
                      {project.shortDesc}
                    </p>

                    {/* Tech Stack Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {project.techStack.slice(0, 4).map((tech, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[9px] font-mono uppercase bg-[#111111] px-2 py-0.5 rounded border border-crimson/15 text-[#999] group-hover:border-bright-red/30 transition-colors"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.techStack.length > 4 && (
                        <span className="text-[9px] font-mono text-crimson px-1">
                          +{project.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Action Links */}
                  <div className="pt-4 border-t border-[#161616] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {project.liveUrl && (
                        <a
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#A5A5A5] hover:text-white transition-colors"
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
                          className="text-[#A5A5A5] hover:text-white transition-colors"
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

        {/* View All Main Projects CTA */}
        <div className="mt-14 text-center">
          <Link href="/projects">
            <NeonButton variant="outline" size="md">
              View All Flagship Projects
              <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </NeonButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
