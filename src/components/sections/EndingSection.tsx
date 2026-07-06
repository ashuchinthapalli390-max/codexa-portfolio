"use client";

import React from "react";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/site";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NeonButton } from "../ui/NeonButton";
import { MediaAsset } from "../ui/MediaAsset";

export function EndingSection() {
  const isReduced = useReducedMotion();

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: isReduced ? "auto" : "smooth" });
    }
  };

  return (
    <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-[#070707] flex items-center justify-center border-t border-crimson/25">
      {/* Background Graphic zoom container */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.02 }}
          whileInView={{ scale: isReduced ? 1.02 : 1.1 }}
          viewport={{ once: false }}
          transition={{ duration: 12, ease: "linear" }}
          className="w-full h-full relative"
        >
          {/* Dark Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/70 to-[#070707] z-10" />
          
          <MediaAsset
            type="video"
            src="/assets/media/raw/final-cta.gif"
            videoSources={[
              "/assets/media/final-cta.webm",
              "/assets/media/final-cta.mp4"
            ]}
            poster="/assets/media/final-cta-poster.webp"
            alt="CodeXa Cinematic Ending Swing"
            fallbackLabel="final-cta.gif"
            className="w-full h-full filter saturate-[0.2] brightness-[0.2]"
            objectFit="cover"
            overlay={true}
          />
        </motion.div>
      </div>

      {/* Subtle web-trail svg overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-10">
        <svg width="100%" height="100%">
          <path d="M 0 450 C 300 300, 600 500, 1000 350 S 1400 200, 1920 400" fill="none" stroke="#D90429" strokeWidth="0.8" strokeDasharray="3 6" />
        </svg>
      </div>

      {/* Content Frame */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <span className="text-[10px] sm:text-xs font-orbitron font-black text-bright-red tracking-[0.4em] uppercase mb-4">
            CODEXA AGENCY
          </span>

          <h2 className="text-3xl sm:text-5xl font-black font-orbitron text-white uppercase tracking-wider mb-2 select-none">
            {siteConfig.brandPhrase.join(" • ")}
          </h2>

          <p className="text-xs sm:text-sm font-orbitron text-secondary-text tracking-widest uppercase mb-8">
            Your next digital system starts here.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <NeonButton variant="primary" onClick={() => handleScrollTo("contact")}>
              Start a Project
            </NeonButton>
            <NeonButton variant="secondary" onClick={() => handleScrollTo("services")}>
              Explore Services
            </NeonButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
