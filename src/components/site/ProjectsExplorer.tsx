"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, SlidersHorizontal, FolderGit2, RotateCcw, Sparkles } from "lucide-react";
import type { Project } from "@/lib/data-store";
import { PageShell } from "./PageShell";
import { PageHero, CtaBand } from "./PageHero";
import { ProjectCard, ProjectCardSkeleton, SpotlightCard } from "./ProjectCard";
import { loadAllProjects, matchesQuery } from "./projects";

export type ExplorerTab = "all" | "flagship" | "team";
type SortKey = "featured" | "newest" | "az";

const TABS: { key: ExplorerTab; label: string; hint: string }[] = [
  { key: "all", label: "All work", hint: "Everything published" },
  { key: "flagship", label: "Flagship", hint: "Official CodeXa builds" },
  { key: "team", label: "Team builds", hint: "Made by our developers" },
];

const BASE_CATEGORIES = ["AI", "Web", "Mobile", "Full Stack", "Cybersecurity", "Automation"];

function readUrl() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const p = new URLSearchParams(window.location.search);
  return { tab: p.get("tab") || "", cat: p.get("cat") || "", q: p.get("q") || "", sort: p.get("sort") || "" };
}

/** Full portfolio browser shared by /projects and /team-projects. */
export function ProjectsExplorer({ initialTab = "all" }: { initialTab?: ExplorerTab }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ExplorerTab>(initialTab);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  // restore filters from the URL once
  useEffect(() => {
    const u = readUrl();
    if (u.tab === "all" || u.tab === "flagship" || u.tab === "team") setTab(u.tab);
    if (u.cat) setCategory(u.cat);
    if (u.q) setQuery(u.q);
    if (u.sort === "newest" || u.sort === "az" || u.sort === "featured") setSort(u.sort);
    hydrated.current = true;
    loadAllProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  // keep the URL shareable
  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    if (tab !== initialTab) p.set("tab", tab);
    if (category !== "All") p.set("cat", category);
    if (query) p.set("q", query);
    if (sort !== "featured") p.set("sort", sort);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [tab, category, query, sort, initialTab]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(
    () => ({
      all: projects.length,
      flagship: projects.filter((p) => p.isMainProject).length,
      team: projects.filter((p) => !p.isMainProject).length,
    }),
    [projects]
  );

  const inTab = useMemo(
    () => projects.filter((p) => (tab === "all" ? true : tab === "flagship" ? p.isMainProject : !p.isMainProject)),
    [projects, tab]
  );

  const categories = useMemo(() => {
    const set = new Set(BASE_CATEGORIES);
    projects.forEach((p) => p.category && set.add(p.category));
    return ["All", ...Array.from(set)];
  }, [projects]);

  const categoryCount = (c: string) => (c === "All" ? inTab.length : inTab.filter((p) => p.category?.toLowerCase() === c.toLowerCase()).length);

  const filtered = useMemo(() => {
    const list = inTab.filter(
      (p) => (category === "All" || p.category?.toLowerCase() === category.toLowerCase()) && matchesQuery(p, query)
    );
    const sorted = [...list];
    if (sort === "az") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "newest") sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else
      sorted.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(b.isMainProject) - Number(a.isMainProject) ||
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
    return sorted;
  }, [inTab, category, query, sort]);

  const filtersActive = category !== "All" || !!query || sort !== "featured";
  const spotlight = !filtersActive && tab !== "team" ? filtered.find((p) => p.isFeatured || p.isMainProject) : undefined;
  const grid = spotlight ? filtered.filter((p) => p.id !== spotlight.id) : filtered;

  const reset = () => {
    setCategory("All");
    setQuery("");
    setSort("featured");
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Portfolio"
        title="Work we've *engineered*"
        subtitle="Production products, AI agents, security tools and developer platforms — built by CodeXa and the developers we train."
        crumbs={[{ label: "Home", href: "/" }, { label: "Work" }]}
      >
        <div className="flex flex-wrap gap-3">
          {[
            { n: counts.all, l: "Published projects" },
            { n: counts.flagship, l: "Flagship builds" },
            { n: counts.team, l: "Team builds" },
          ].map((s) => (
            <div key={s.l} className="px-5 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md">
              <div className="font-orbitron font-black text-2xl text-white tabular-nums">{loading ? "—" : String(s.n).padStart(2, "0")}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{s.l}</div>
            </div>
          ))}
        </div>
      </PageHero>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Control bar ── */}
        <div className="md:sticky md:top-[68px] z-30 -mx-2 px-2 py-3 mb-8">
          <div className="rounded-3xl border border-white/[0.08] bg-[#090909]/85 backdrop-blur-xl p-3 sm:p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              {/* tabs */}
              <div role="tablist" aria-label="Project groups" className="flex rounded-2xl bg-white/[0.04] p-1 shrink-0 overflow-x-auto [scrollbar-width:none]">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={tab === t.key}
                    title={t.hint}
                    onClick={() => setTab(t.key)}
                    className={`relative flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl font-orbitron text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors ${
                      tab === t.key ? "text-white" : "text-white/50 hover:text-white"
                    }`}
                  >
                    {tab === t.key && <motion.span layoutId="explorer-tab" className="absolute inset-0 rounded-xl bg-crimson" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                    <span className="relative whitespace-nowrap">
                      <span className="hidden sm:inline">{t.label}</span>
                      <span className="sm:hidden">{t.label.split(" ")[0]}</span> <span className="opacity-60 tabular-nums">{loading ? "" : counts[t.key]}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/35 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, tech or developer…"
                  aria-label="Search projects"
                  className="w-full rounded-2xl bg-white/[0.04] border border-white/[0.08] focus:border-bright-red pl-11 pr-20 py-2.5 text-sm text-white placeholder-white/30 outline-none transition"
                />
                {query ? (
                  <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/50 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md border border-white/10 font-mono text-[10px] text-white/40">/</kbd>
                )}
              </div>

              {/* sort */}
              <label className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-white/40" />
                <span className="sr-only">Sort projects</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white outline-none focus:border-bright-red"
                >
                  <option value="featured" className="bg-[#111]">Featured first</option>
                  <option value="newest" className="bg-[#111]">Newest</option>
                  <option value="az" className="bg-[#111]">A → Z</option>
                </select>
              </label>
            </div>

            {/* categories */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {categories.map((c) => {
                const n = categoryCount(c);
                const on = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    disabled={!on && n === 0 && !loading}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full border font-mono text-[11px] uppercase tracking-wider transition ${
                      on
                        ? "bg-white text-black border-white"
                        : "border-white/[0.1] text-white/60 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:hover:text-white/60 disabled:cursor-not-allowed"
                    }`}
                  >
                    {c} <span className="opacity-50 tabular-nums">{loading ? "" : n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45" aria-live="polite">
            {loading ? "Loading projects…" : `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}`}
          </p>
          {filtersActive && (
            <button onClick={reset} className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bright-red hover:text-white">
              <RotateCcw className="w-3.5 h-3.5" /> Reset filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="Our portfolio is being curated"
            text="New case studies are on the way. Meanwhile, tell us about your project and we'll share relevant work directly."
            action={
              <Link href="/project-request" className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
                <Sparkles className="w-4 h-4" /> Start a project
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No projects match"
            text="Try a different keyword or category."
            action={
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition">
                <RotateCcw className="w-4 h-4" /> Reset filters
              </button>
            }
          />
        ) : (
          <>
            {spotlight && (
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                <SpotlightCard project={spotlight} />
              </motion.div>
            )}
            <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1400 }}>
              <AnimatePresence mode="popLayout">
                {grid.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, rotateX: 35, y: 60 }}
                    animate={{ opacity: 1, rotateX: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.6, delay: Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ProjectCard project={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </section>

      <CtaBand />
    </PageShell>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-20 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
        <FolderGit2 className="w-6 h-6 text-bright-red" />
      </div>
      <h3 className="mt-5 font-orbitron font-bold uppercase text-white text-lg">{title}</h3>
      <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
