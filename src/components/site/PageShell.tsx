"use client";

import React, { useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { scrollStore } from "@/lib/scroll-store";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Lightweight "3D room" backdrop for inner pages: perspective floor grid,
 * gyroscope rings and glows that react to the pointer and scroll.
 * Pure CSS/DOM so reading-heavy pages stay fast.
 */
function Backdrop() {
  const rings = useRef<HTMLDivElement>(null);
  const floor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let px = 0,
      py = 0;
    const loop = () => {
      px += (scrollStore.pointerX - px) * 0.05;
      py += (scrollStore.pointerY - py) * 0.05;
      const s = scrollStore.scrollY;
      if (rings.current) {
        rings.current.style.transform = `translate3d(${px * 30}px, ${-py * 24 - s * 0.08}px, 0) rotateX(${62 + py * 6}deg) rotateZ(${s * 0.05}deg)`;
      }
      if (floor.current) {
        floor.current.style.backgroundPosition = `${px * 40}px ${s * 0.6}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute -top-40 right-[-10%] w-[60vw] h-[60vw] rounded-full bg-crimson/[0.12] blur-[140px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-deep-red/30 blur-[160px]" />

      {/* gyroscope rings */}
      <div className="absolute top-[8%] right-[-6%] w-[46vw] max-w-[640px] aspect-square" style={{ perspective: 1200 }}>
        <div ref={rings} className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: "rotateX(62deg)" }}>
          <div className="absolute inset-0 rounded-full border border-bright-red/25 shadow-[0_0_60px_rgba(217,4,41,0.15)]" />
          <div className="absolute inset-[12%] rounded-full border border-dashed border-white/10 animate-[spin_40s_linear_infinite]" />
          <div className="absolute inset-[26%] rounded-full border border-bright-red/20 animate-[spin_26s_linear_infinite_reverse]" />
          <div className="absolute inset-[44%] rounded-full bg-crimson/30 blur-2xl" />
        </div>
      </div>

      {/* perspective floor */}
      <div className="absolute inset-x-0 bottom-0 h-[55vh]" style={{ perspective: 600 }}>
        <div
          ref={floor}
          className="absolute inset-x-[-50%] bottom-0 h-[160%] origin-bottom"
          style={{
            transform: "rotateX(72deg)",
            backgroundImage:
              "linear-gradient(to right, rgba(255,30,60,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,30,60,0.16) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(to top, black 10%, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 75%)",
          }}
        />
      </div>

      {/* film grain */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });
  return (
    <motion.div
      className="fixed top-0 inset-x-0 h-[2px] z-[45] origin-left bg-gradient-to-r from-deep-red via-crimson to-bright-red"
      style={{ scaleX }}
    />
  );
}

/** Wraps every inner public page: smooth scroll, backdrop, header, footer. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#050505] text-white">
      <SmoothScroll />
      <Backdrop />
      <ProgressBar />
      <SiteHeader />
      {/* no z-index here: page modals (z-50+) must stack above the fixed header */}
      <main className="relative">{children}</main>
      <SiteFooter />
    </div>
  );
}
