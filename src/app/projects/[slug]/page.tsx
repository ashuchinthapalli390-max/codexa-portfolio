"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Github, Link2,
  Lock, Maximize2, PlayCircle, ShieldAlert, ShieldCheck, Sparkles, X, Check,
} from "lucide-react";
import type { Project } from "@/lib/data-store";
import { OFFICIAL_PROJECTS } from "@/config/officialProjects";
import { PageShell } from "@/components/site/PageShell";
import { CtaBand } from "@/components/site/PageHero";
import { ProjectCard } from "@/components/site/ProjectCard";
import { FALLBACK_THUMB, loadAllProjects, statusTone } from "@/components/site/projects";
import { scrollToId } from "@/lib/scroll-store";

const EASE = [0.16, 1, 0.3, 1] as const;

function findFallback(slug: string) {
  return OFFICIAL_PROJECTS.find((p) => p.slug.toLowerCase() === slug.toLowerCase() || p.id === slug) || null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";
  const fallback = slug ? findFallback(slug) : null;

  const [project, setProject] = useState<Project | null>(fallback);
  const [loading, setLoading] = useState(!fallback);
  const [related, setRelated] = useState<Project[]>([]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/projects/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.project) setProject(data.project);
        else if (findFallback(slug)) setProject(findFallback(slug));
      })
      .catch(() => {
        if (findFallback(slug)) setProject(findFallback(slug));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!project) return;
    loadAllProjects().then((all) => {
      const others = all.filter((p) => p.id !== project.id);
      const same = others.filter((p) => p.category === project.category);
      setRelated([...same, ...others.filter((p) => p.category !== project.category)].slice(0, 3));
    });
  }, [project]);

  if (loading) return <PageShell><DetailSkeleton /></PageShell>;
  if (!project) return <PageShell><NotFound slug={slug} /></PageShell>;
  return (
    <PageShell>
      <CaseStudy project={project} related={related} />
    </PageShell>
  );
}

/* ───────────────────────── Case study ───────────────────────── */

function CaseStudy({ project, related }: { project: Project; related: Project[] }) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.3]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const titleO = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // gallery = screenshots + image/video media (deduped)
  const gallery = useMemo(() => {
    const items: { url: string; type: "image" | "video"; caption?: string | null }[] = [];
    const seen = new Set<string>();
    (project.screenshots || []).forEach((u) => {
      if (u && !seen.has(u)) {
        seen.add(u);
        items.push({ url: u, type: "image" });
      }
    });
    [...(project.media || [])]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((m) => {
        if (m.mediaUrl && !seen.has(m.mediaUrl)) {
          seen.add(m.mediaUrl);
          items.push({ url: m.mediaUrl, type: m.mediaType?.toLowerCase().includes("video") ? "video" : "image", caption: m.caption });
        }
      });
    return items;
  }, [project]);

  const sections = [
    { id: "overview", label: "Overview", show: !!project.overview },
    { id: "challenge", label: "Challenge & Solution", show: !!(project.problem || project.solution) },
    { id: "features", label: "Key Features", show: !!project.features?.length },
    { id: "stack", label: "Tech Stack", show: !!project.techStack?.length },
    { id: "gallery", label: "Gallery", show: gallery.length > 0 },
  ].filter((s) => s.show);

  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const extraLinks = project.links || [];
  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  return (
    <>
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative h-[86vh] min-h-[560px] overflow-clip">
        <motion.div className="absolute inset-0" style={{ scale: imgScale, y: imgY }}>
          <img
            src={project.thumbnailUrl || FALLBACK_THUMB}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB)}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-[#050505]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent" />

        <motion.div style={{ y: titleY, opacity: titleO }} className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-14">
          <Link href="/projects" className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> All work
          </Link>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="flex flex-wrap items-center gap-2 mb-5">
            <span className="px-3 py-1 rounded-full border border-white/20 bg-black/40 backdrop-blur-md font-mono text-[10px] uppercase tracking-widest text-white/85">{project.category}</span>
            {project.status && <span className={`px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-widest ${statusTone(project.status)}`}>{project.status}</span>}
            {project.isMainProject && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-crimson font-mono text-[10px] uppercase tracking-widest text-white">
                <Sparkles className="w-3 h-3" /> Flagship
              </span>
            )}
          </motion.div>
          <h1 className="font-orbitron font-black uppercase text-white tracking-tight leading-[0.9] text-[12vw] sm:text-7xl lg:text-8xl max-w-5xl" style={{ perspective: 900 }}>
            <motion.span className="inline-block" initial={{ opacity: 0, rotateX: -70, y: 50 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ duration: 1.1, delay: 0.1, ease: EASE }} style={{ transformOrigin: "50% 100%" }}>
              {project.title}
            </motion.span>
          </h1>
          {project.shortDesc && (
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }} className="mt-5 max-w-2xl text-lg text-white/70 leading-relaxed">
              {project.shortDesc}
            </motion.p>
          )}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.45, ease: EASE }} className="mt-8 flex flex-wrap gap-3">
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(217,4,41,0.45)] transition">
                Visit live site <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {project.demoUrl && (
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 backdrop-blur-md px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/60 transition">
                <PlayCircle className="w-4 h-4" /> Watch demo
              </a>
            )}
            {project.repoUrl ? (
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 backdrop-blur-md px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/60 transition">
                <Github className="w-4 h-4" /> Source
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-white/50">
                <Lock className="w-4 h-4" /> Private source
              </span>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Body ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-12 gap-10 lg:gap-14">
        {/* sidebar */}
        <aside className="lg:col-span-4 order-2 lg:order-1">
          <div className="lg:sticky lg:top-24 space-y-5">
            {sections.length > 1 && (
              <nav aria-label="On this page" className="hidden lg:block rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">On this page</div>
                <ol className="space-y-1">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <button onClick={() => scrollToId(s.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition ${active === s.id ? "bg-crimson/15 text-white" : "text-white/55 hover:text-white hover:bg-white/[0.04]"}`}>
                        <span className={`font-mono text-[10px] ${active === s.id ? "text-bright-red" : "text-white/30"}`}>{String(i + 1).padStart(2, "0")}</span>
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-md p-6 space-y-6">
              <InfoRow label="Lead developer">
                <PersonChip name={project.creator?.displayName || "CodeXa Engineer"} img={project.creator?.mediaUrl} username={project.creator?.username} />
              </InfoRow>
              {!!project.collaborators?.length && (
                <InfoRow label={`Contributors (${project.collaborators.length})`}>
                  <div className="flex flex-col gap-2">
                    {project.collaborators.map((c) => (
                      <PersonChip key={c.id} name={c.displayName} img={c.mediaUrl} username={c.username} role={c.roleTitle || undefined} />
                    ))}
                  </div>
                </InfoRow>
              )}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Category"><span className="text-sm text-white">{project.category}</span></InfoRow>
                <InfoRow label="Status"><span className="text-sm text-white">{project.status || "—"}</span></InfoRow>
                {project.createdAt && (
                  <InfoRow label="Published">
                    <span className="text-sm text-white">{new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                  </InfoRow>
                )}
                <InfoRow label="Source"><span className="text-sm text-white">{project.repoUrl ? "Open" : "Private"}</span></InfoRow>
              </div>
              {extraLinks.length > 0 && (
                <InfoRow label="Links">
                  <div className="flex flex-col gap-1.5">
                    {extraLinks.map((l) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-bright-red">
                        <Link2 className="w-3.5 h-3.5" /> {l.label}
                      </a>
                    ))}
                  </div>
                </InfoRow>
              )}
              <button onClick={share} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 hover:border-bright-red px-4 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                {copied ? "Link copied" : "Share project"}
              </button>
            </div>
          </div>
        </aside>

        {/* main content */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-20">
          {project.overview && (
            <Block id="overview" index={num()} title="Overview">
              <p className="text-lg leading-relaxed text-white/70 whitespace-pre-line">{project.overview}</p>
            </Block>
          )}

          {(project.problem || project.solution) && (
            <Block id="challenge" index={num()} title="Challenge & Solution">
              <div className="grid md:grid-cols-2 gap-5" style={{ perspective: 1200 }}>
                {project.problem && (
                  <FlipIn>
                    <div className="h-full rounded-3xl border border-bright-red/25 bg-gradient-to-b from-crimson/10 to-transparent p-7">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-bright-red"><ShieldAlert className="w-4 h-4" /> The challenge</div>
                      <p className="mt-4 text-white/70 leading-relaxed">{project.problem}</p>
                    </div>
                  </FlipIn>
                )}
                {project.solution && (
                  <FlipIn delay={0.12}>
                    <div className="h-full rounded-3xl border border-emerald-400/25 bg-gradient-to-b from-emerald-500/10 to-transparent p-7">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-emerald-300"><ShieldCheck className="w-4 h-4" /> Our solution</div>
                      <p className="mt-4 text-white/70 leading-relaxed">{project.solution}</p>
                    </div>
                  </FlipIn>
                )}
              </div>
            </Block>
          )}

          {!!project.features?.length && (
            <Block id="features" index={num()} title="Key Features">
              <ul className="grid sm:grid-cols-2 gap-3">
                {project.features.map((f, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: (i % 6) * 0.06 }}
                    className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                  >
                    <CheckCircle2 className="w-5 h-5 text-bright-red shrink-0 mt-0.5" />
                    <span className="text-sm text-white/75 leading-relaxed">{f}</span>
                  </motion.li>
                ))}
              </ul>
            </Block>
          )}

          {!!project.techStack?.length && (
            <Block id="stack" index={num()} title="Tech Stack">
              <div className="flex flex-wrap gap-2.5" style={{ perspective: 800 }}>
                {project.techStack.map((t, i) => (
                  <motion.span
                    key={t}
                    initial={{ opacity: 0, rotateX: -90 }}
                    whileInView={{ opacity: 1, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.04 }}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] font-mono text-sm text-white/80 hover:border-bright-red hover:text-white transition-colors"
                  >
                    {t}
                  </motion.span>
                ))}
              </div>
            </Block>
          )}

          {gallery.length > 0 && (
            <Block id="gallery" index={num()} title="Gallery">
              <div className="grid sm:grid-cols-2 gap-4">
                {gallery.map((g, i) => (
                  <button
                    key={g.url}
                    onClick={() => setLightbox(i)}
                    className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111] text-left ${i === 0 && gallery.length % 2 === 1 ? "sm:col-span-2 aspect-[16/8]" : "aspect-[16/10]"}`}
                    aria-label={`Open media ${i + 1}`}
                  >
                    {g.type === "video" ? (
                      <video src={g.url} muted playsInline loop className="w-full h-full object-cover" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
                    ) : (
                      <img src={g.url} alt={g.caption || ""} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    {g.caption && <span className="absolute bottom-3 left-3 right-3 text-xs text-white/85 truncate">{g.caption}</span>}
                  </button>
                ))}
              </div>
            </Block>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-bright-red mb-2">Keep exploring</div>
              <h2 className="font-orbitron font-black uppercase text-white text-2xl sm:text-3xl tracking-tight">More projects</h2>
            </div>
            <Link href="/projects" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      <CtaBand title="Want something like this?" text="We can build a product like this for you — share your requirements and get a scoped plan." />

      <Lightbox items={gallery} index={lightbox} onChange={setLightbox} />
    </>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function Block({ id, index, title, children }: { id: string; index: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 50, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.9, ease: EASE }}
      style={{ transformPerspective: 1200, transformOrigin: "50% 0%" }}
      className="scroll-mt-28"
    >
      <div className="flex items-center gap-4 mb-6">
        <span className="font-mono text-xs text-bright-red">{index}</span>
        <h2 className="font-orbitron font-black uppercase text-white text-2xl sm:text-3xl tracking-tight">{title}</h2>
        <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
      </div>
      {children}
    </motion.section>
  );
}

function FlipIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, rotateY: -35 }} whileInView={{ opacity: 1, rotateY: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">{label}</div>
      {children}
    </div>
  );
}

function PersonChip({ name, img, username, role }: { name: string; img?: string | null; username?: string; role?: string }) {
  const inner = (
    <span className="flex items-center gap-3">
      <img src={img || FALLBACK_THUMB} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" onError={(e) => ((e.currentTarget as HTMLImageElement).src = FALLBACK_THUMB)} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white truncate">{name}</span>
        <span className="block font-mono text-[10px] text-white/40 truncate">{role || (username ? `@${username}` : "CodeXa")}</span>
      </span>
    </span>
  );
  return username ? (
    <Link href={`/team/${username}`} className="block rounded-2xl p-1.5 -m-1.5 hover:bg-white/[0.04] transition">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Lightbox({
  items,
  index,
  onChange,
}: {
  items: { url: string; type: "image" | "video"; caption?: string | null }[];
  index: number | null;
  onChange: (i: number | null) => void;
}) {
  const go = useCallback(
    (d: number) => {
      if (index === null || !items.length) return;
      onChange((index + d + items.length) % items.length);
    },
    [index, items.length, onChange]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChange(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onChange]);

  const item = index !== null ? items[index] : null;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/92 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => onChange(null)}
          role="dialog"
          aria-modal="true"
          data-lenis-prevent
        >
          <button onClick={() => onChange(null)} aria-label="Close" className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-crimson text-white transition">
            <X className="w-5 h-5" />
          </button>
          {items.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous" className="absolute left-3 sm:left-6 p-3 rounded-full bg-white/10 hover:bg-crimson text-white transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next" className="absolute right-3 sm:right-6 p-3 rounded-full bg-white/10 hover:bg-crimson text-white transition">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <motion.div
            key={item.url}
            initial={{ opacity: 0, scale: 0.94, rotateY: 12 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{ transformPerspective: 1200 }}
            className="max-w-6xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {item.type === "video" ? (
              <video src={item.url} controls autoPlay className="max-w-full max-h-[85vh]" />
            ) : (
              <img src={item.url} alt={item.caption || ""} className="max-w-full max-h-[85vh] object-contain" />
            )}
          </motion.div>
          <div className="absolute bottom-5 inset-x-0 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
            {(index ?? 0) + 1} / {items.length}
            {item.caption ? ` · ${item.caption}` : ""}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-20">
      <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse" />
      <div className="mt-6 h-16 w-3/4 rounded-xl bg-white/[0.06] animate-pulse" />
      <div className="mt-4 h-5 w-1/2 rounded bg-white/[0.04] animate-pulse" />
      <div className="mt-12 aspect-[16/7] rounded-3xl bg-white/[0.04] animate-pulse" />
    </div>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-44 pb-24 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">Error 404</div>
      <h1 className="mt-4 font-orbitron font-black uppercase text-white text-4xl sm:text-6xl tracking-tight">Project not found</h1>
      <p className="mt-5 text-white/55">
        We couldn&apos;t find a published project at <span className="font-mono text-white/80">/{slug}</span>. It may be a draft or the link may have changed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/projects" className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white transition">
          <ArrowLeft className="w-4 h-4" /> Browse all work
        </Link>
        <Link href="/project-request" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-orbitron text-[11px] font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition">
          Start a project
        </Link>
      </div>
    </div>
  );
}
