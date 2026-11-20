"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export type Crumb = { label: string; href?: string };

/**
 * Consistent page intro: breadcrumb → eyebrow → 3D-revealed title → subtitle → slot.
 * `title` words wrapped in *asterisks* render as the outlined accent.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  crumbs = [],
  children,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
  align?: "left" | "center";
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const rotX = useTransform(scrollYProgress, [0, 1], [0, 18]);

  const words = title.split(" ");
  const center = align === "center";

  return (
    <section ref={ref} className="relative pt-32 sm:pt-40 pb-12 sm:pb-16">
      <motion.div
        style={{ y, opacity, rotateX: rotX, transformPerspective: 1200, transformOrigin: "50% 0%" }}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${center ? "text-center" : ""}`}
      >
        {crumbs.length > 0 && (
          <motion.nav
            aria-label="Breadcrumb"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 mb-6 ${center ? "justify-center" : ""}`}
          >
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {c.href ? (
                  <Link href={c.href} className="hover:text-white transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-white/70">{c.label}</span>
                )}
                {i < crumbs.length - 1 && <ChevronRight className="w-3 h-3" />}
              </React.Fragment>
            ))}
          </motion.nav>
        )}

        <motion.div
          initial={{ opacity: 0, x: center ? 0 : -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
          className={`flex items-center gap-3 mb-5 ${center ? "justify-center" : ""}`}
        >
          <span className="h-px w-10 bg-bright-red" />
          <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-bright-red">{eyebrow}</span>
        </motion.div>

        <h1
          className="font-orbitron font-black uppercase text-white tracking-tight leading-[0.92] text-[11vw] sm:text-6xl lg:text-7xl"
          style={{ perspective: 900 }}
        >
          {words.map((w, i) => {
            const accent = w.startsWith("*") && w.endsWith("*");
            const text = accent ? w.slice(1, -1) : w;
            return (
              <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em] pb-1">
                <motion.span
                  className={`inline-block ${accent ? "text-transparent [-webkit-text-stroke:1.5px_#FF1E3C]" : ""}`}
                  initial={{ y: "110%", rotateX: -80, opacity: 0 }}
                  animate={{ y: "0%", rotateX: 0, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.07, ease: EASE }}
                  style={{ transformOrigin: "50% 100%" }}
                >
                  {text}
                </motion.span>
              </span>
            );
          })}
        </h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
            className={`mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-white/60 ${center ? "mx-auto" : ""}`}
          >
            {subtitle}
          </motion.p>
        )}

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
            className="mt-8"
          >
            {children}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}

/** Section title used inside pages. */
export function SectionLabel({ index, title, right }: { index?: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        {index && <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-bright-red mb-2">{index}</div>}
        <h2 className="font-orbitron font-black uppercase text-white text-xl sm:text-2xl tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/** Closing call-to-action band shared by inner pages. */
export function CtaBand({
  title = "Have an idea worth building?",
  text = "Tell us what you need — we scope it, design it and ship it to production.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <motion.div
        initial={{ opacity: 0, rotateX: 25, y: 60 }}
        whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1, ease: EASE }}
        style={{ transformPerspective: 1200 }}
        className="relative overflow-hidden rounded-[32px] border border-bright-red/30 bg-gradient-to-br from-crimson/25 via-[#0b0b0b] to-[#070707] p-8 sm:p-14"
      >
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-crimson/30 blur-[100px]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2 className="font-orbitron font-black uppercase text-white text-3xl sm:text-4xl tracking-tight">{title}</h2>
            <p className="mt-3 max-w-xl text-white/60">{text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/project-request"
              className="inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-bright-red px-7 py-3.5 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(217,4,41,0.45)] transition"
            >
              Start a Project
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white hover:border-white/50 transition"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
