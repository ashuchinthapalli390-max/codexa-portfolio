"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Github, Lock, Sparkles, Users } from "lucide-react";
import type { Project } from "@/lib/data-store";
import { TiltCard } from "@/components/scroll3d/TiltCard";
import { FALLBACK_THUMB, statusTone } from "./projects";

/** Standard project card (grid). */
export function ProjectCard({ project }: { project: Project }) {
  const href = `/projects/${project.slug}`;
  return (
    <TiltCard max={8} className="h-full rounded-[22px]">
      <article className="group h-full flex flex-col rounded-[22px] overflow-hidden border border-white/[0.08] bg-[#0b0b0b]/85 backdrop-blur-md hover:border-bright-red/50 transition-colors">
        <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-[#111]" aria-label={`Open ${project.title}`}>
          <img
            src={project.thumbnailUrl || FALLBACK_THUMB}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 font-mono text-[10px] uppercase tracking-widest text-white/85">
              {project.category}
            </span>
            {project.isMainProject && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-crimson font-mono text-[10px] uppercase tracking-widest text-white shadow-[0_0_14px_rgba(217,4,41,0.5)]">
                <Sparkles className="w-3 h-3" /> Flagship
              </span>
            )}
          </div>
        </Link>

        <div className="flex-1 flex flex-col p-5 sm:p-6" style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-orbitron font-bold text-lg text-white leading-snug">
              <Link href={href} className="hover:text-bright-red transition-colors">
                {project.title}
              </Link>
            </h3>
            {project.status && (
              <span className={`shrink-0 px-2 py-0.5 rounded-md border font-mono text-[10px] uppercase ${statusTone(project.status)}`}>
                {project.status}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-white/55 line-clamp-2">{project.shortDesc || project.overview}</p>

          {project.techStack?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.techStack.slice(0, 4).map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] font-mono text-[10px] text-white/60">
                  {t}
                </span>
              ))}
              {project.techStack.length > 4 && <span className="font-mono text-[10px] text-bright-red px-1 py-0.5">+{project.techStack.length - 4}</span>}
            </div>
          )}

          <div className="mt-auto pt-5">
            <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06]">
              <img
                src={project.creator?.mediaUrl || FALLBACK_THUMB}
                alt=""
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB)}
              />
              <span className="text-xs text-white/60 truncate">{project.creator?.displayName || "CodeXa Engineer"}</span>
              {!!project.collaborators?.length && (
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-white/40">
                  <Users className="w-3 h-3" /> +{project.collaborators.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Link
                href={href}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] group-hover:bg-crimson border border-white/[0.08] group-hover:border-bright-red px-3 py-2.5 font-orbitron text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors"
              >
                Case Study <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" title="Open live site" aria-label="Open live site" className="p-2.5 rounded-xl border border-white/[0.08] text-white/60 hover:text-white hover:border-bright-red transition">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {project.repoUrl ? (
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" title="Source code" aria-label="Source code" className="p-2.5 rounded-xl border border-white/[0.08] text-white/60 hover:text-white hover:border-bright-red transition">
                  <Github className="w-4 h-4" />
                </a>
              ) : (
                <span title="Source code is private" className="p-2.5 rounded-xl border border-white/[0.08] text-white/30">
                  <Lock className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}

/** Large horizontal spotlight card for the top featured project. */
export function SpotlightCard({ project }: { project: Project }) {
  const href = `/projects/${project.slug}`;
  return (
    <TiltCard max={5} className="rounded-[28px]">
      <article className="group grid lg:grid-cols-2 rounded-[28px] overflow-hidden border border-bright-red/30 bg-gradient-to-br from-crimson/15 via-[#0b0b0b]/90 to-[#080808]/90 backdrop-blur-md">
        <Link href={href} className="relative block aspect-[16/10] lg:aspect-auto lg:min-h-[380px] overflow-hidden" aria-label={`Open ${project.title}`}>
          <img
            src={project.thumbnailUrl || FALLBACK_THUMB}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0b0b0b]/80 hidden lg:block" />
        </Link>
        <div className="p-7 sm:p-10 flex flex-col justify-center" style={{ transform: "translateZ(30px)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-crimson font-mono text-[10px] uppercase tracking-widest text-white">
              <Sparkles className="w-3 h-3" /> Featured build
            </span>
            <span className="px-2.5 py-1 rounded-full border border-white/15 font-mono text-[10px] uppercase tracking-widest text-white/70">{project.category}</span>
            {project.status && <span className={`px-2 py-0.5 rounded-md border font-mono text-[10px] uppercase ${statusTone(project.status)}`}>{project.status}</span>}
          </div>
          <h3 className="mt-5 font-orbitron font-black uppercase text-white text-3xl sm:text-4xl tracking-tight">{project.title}</h3>
          <p className="mt-4 text-white/60 leading-relaxed line-clamp-4">{project.overview || project.shortDesc}</p>
          {project.techStack?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {project.techStack.slice(0, 6).map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] font-mono text-[11px] text-white/70">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
              Read case study <ArrowUpRight className="w-4 h-4" />
            </Link>
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition">
                Live site <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </article>
    </TiltCard>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-[22px] overflow-hidden border border-white/[0.06] bg-white/[0.02]">
      <div className="aspect-[16/10] bg-white/[0.04] animate-pulse" />
      <div className="p-6 space-y-3">
        <div className="h-5 w-2/3 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-3 w-full rounded bg-white/[0.04] animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-white/[0.04] animate-pulse" />
        <div className="h-9 w-full rounded-xl bg-white/[0.04] animate-pulse mt-6" />
      </div>
    </div>
  );
}
