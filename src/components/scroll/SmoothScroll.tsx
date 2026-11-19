"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { scrollStore } from "@/lib/scroll-store";

/**
 * Inertia smooth scrolling (Lenis) + global scroll/pointer store feed.
 * Falls back to native scrolling for reduced-motion users.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollStore.scrollY = window.scrollY;
      scrollStore.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const onPointer = (e: PointerEvent) => {
      scrollStore.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollStore.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    if (reduced) {
      update();
      window.addEventListener("scroll", update, { passive: true });
      return () => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("pointermove", onPointer);
      };
    }

    document.documentElement.classList.remove("scroll-smooth");

    const lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
    });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    lenis.on("scroll", (l: Lenis) => {
      update();
      scrollStore.velocity += (l.velocity - scrollStore.velocity) * 0.2;
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      // decay velocity when idle
      scrollStore.velocity *= 0.94;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    update();

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.classList.add("scroll-smooth");
    };
  }, []);

  return null;
}
