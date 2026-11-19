"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { scrollToId } from "@/lib/scroll-store";

export const HUD_SECTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "reel", label: "Showreel" },
  { id: "leadership", label: "Team" },
  { id: "process", label: "Process" },
  { id: "internship", label: "Internship" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

/** Top progress bar, side chapter rail and a desktop-only magnetic cursor. */
export function ScrollHUD() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });
  const [active, setActive] = useState("home");
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => setPct(Math.round(v * 100)));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    HUD_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => {
      unsub();
      io.disconnect();
    };
  }, [scrollYProgress]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[45] origin-left bg-gradient-to-r from-deep-red via-crimson to-bright-red shadow-[0_0_12px_rgba(255,30,60,0.8)]"
        style={{ scaleX }}
      />

      <nav
        aria-label="Page chapters"
        className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-[35] flex-col items-end gap-3"
      >
        {HUD_SECTIONS.map((s, i) => {
          const on = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => scrollToId(s.id)}
              className="group flex items-center gap-3"
              aria-label={`Go to ${s.label}`}
            >
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.25em] transition-all duration-300 ${
                  on ? "text-white opacity-100 translate-x-0" : "text-secondary-text opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                }`}
              >
                {String(i + 1).padStart(2, "0")} {s.label}
              </span>
              <span
                className={`block rounded-full transition-all duration-300 ${
                  on ? "w-6 h-[3px] bg-bright-red shadow-[0_0_10px_#FF1E3C]" : "w-3 h-[2px] bg-white/30 group-hover:bg-white/70"
                }`}
              />
            </button>
          );
        })}
        <span className="mt-3 font-mono text-[10px] text-bright-red tracking-widest">{String(pct).padStart(3, "0")}%</span>
      </nav>

      <MagneticCursor />
    </>
  );
}

function MagneticCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    let x = window.innerWidth / 2,
      y = window.innerHeight / 2,
      rx = x,
      ry = y,
      hover = false,
      raf = 0;

    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      hover = !!t?.closest("a, button, [role='button'], input, textarea, select, label");
    };
    const loop = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${hover ? 1.8 : 1})`;
        ring.current.style.borderColor = hover ? "rgba(255,30,60,0.9)" : "rgba(255,255,255,0.35)";
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className="fixed top-0 left-0 z-[100000] pointer-events-none w-9 h-9 rounded-full border transition-[border-color,scale] duration-200 mix-blend-difference" />
      <div ref={dot} className="fixed top-0 left-0 z-[100000] pointer-events-none w-1.5 h-1.5 rounded-full bg-bright-red shadow-[0_0_10px_#FF1E3C]" />
    </>
  );
}
