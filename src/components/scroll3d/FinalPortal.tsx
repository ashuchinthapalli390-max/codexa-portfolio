"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useMotionTemplate, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { scrollToId } from "@/lib/scroll-store";
import { ScrollVideo } from "./ScrollVideo";

export function FinalPortal() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const r = useTransform(scrollYProgress, [0, 0.55], [6, 110]);
  const clip = useMotionTemplate`circle(${r}% at 50% 50%)`;
  const vidScale = useTransform(scrollYProgress, [0, 1], [1.6, 1]);
  const titleScale = useTransform(scrollYProgress, [0, 0.6], [2.6, 1]);
  const titleO = useTransform(scrollYProgress, [0.15, 0.45], [0, 1]);
  const ctaO = useTransform(scrollYProgress, [0.5, 0.7], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.5, 0.7], [40, 0]);
  const ringRot = useTransform(scrollYProgress, [0, 1], [0, 180]);

  return (
    <section ref={ref} className="relative h-[240vh]">
      <div className="sticky top-0 h-screen overflow-clip flex items-center justify-center">
        {/* rotating portal ring */}
        <motion.div
          style={{ rotate: ringRot }}
          className="absolute w-[70vmin] h-[70vmin] rounded-full border border-dashed border-bright-red/40"
        />
        <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
          <motion.div className="absolute inset-0" style={{ scale: vidScale }}>
            <ScrollVideo name="final-cta" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/85" />
        </motion.div>

        <div className="relative z-10 text-center px-4">
          <motion.div style={{ scale: titleScale, opacity: titleO }}>
            <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-bright-red mb-5">{siteConfig.brandPhrase.join(" · ")}</div>
            <h2 className="font-orbitron font-black uppercase text-white text-[12vw] sm:text-[8vw] leading-[0.88] tracking-tighter drop-shadow-[0_10px_50px_rgba(0,0,0,0.9)]">
              Let&apos;s build
              <br />
              <span className="text-bright-red text-neon-glow">what&apos;s next</span>
            </h2>
          </motion.div>
          <motion.div style={{ opacity: ctaO, y: ctaY }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/project-request"
              className="inline-flex items-center gap-2 rounded-full bg-crimson px-8 py-4 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_40px_rgba(217,4,41,0.55)] hover:shadow-[0_0_60px_rgba(255,30,60,0.8)] transition-shadow"
            >
              Start a Project <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a
              href={siteConfig.links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 backdrop-blur-md px-7 py-4 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-white hover:border-bright-red transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button
              onClick={() => scrollToId("contact")}
              className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/70 underline decoration-crimson underline-offset-8 hover:text-white px-3"
            >
              or send an inquiry
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
