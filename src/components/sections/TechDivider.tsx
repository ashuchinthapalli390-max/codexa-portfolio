"use client";

import React from "react";
import { motion } from "framer-motion";
import { siteConfig } from "@/config/site";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MediaAsset } from "../ui/MediaAsset";

export function TechDivider() {
  const isReduced = useReducedMotion();

  return (
    <section className="relative w-full h-[320px] md:h-[450px] overflow-hidden bg-[#070707] flex items-center justify-center border-y border-crimson/25 shadow-neon">
      {/* Background Cinematic image container with zoom */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.05 }}
          whileInView={{ scale: isReduced ? 1.05 : 1.15 }}
          viewport={{ once: false }}
          transition={{ duration: 15, ease: "linear" }}
          className="w-full h-full relative"
        >
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-[#070707]/75 z-10" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-10" />
          
          <MediaAsset
            type="video"
            src="/assets/media/raw/about-divider.gif"
            videoSources={[
              "/assets/media/about-divider.webm",
              "/assets/media/about-divider.mp4"
            ]}
            poster="/assets/media/about-divider-poster.webp"
            alt="CodeXa Tech Divider Background"
            fallbackLabel="about-divider.gif"
            className="w-full h-full filter saturate-[0.15] brightness-[0.25]"
            objectFit="cover"
            overlay={true}
          />
        </motion.div>
      </div>

      {/* Borders glow effect */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-bright-red/50 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-bright-red/50 to-transparent" />

      {/* Corner digital web decorations */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-crimson/40 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-crimson/40 pointer-events-none" />

      {/* Core holographic text panel content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Holographic Plate tag */}
        <div className="inline-block px-4 py-1.5 rounded-full bg-deep-red/20 border border-crimson/30 backdrop-blur shadow-neon mb-6">
          <span className="text-[10px] sm:text-xs font-orbitron font-bold tracking-[0.25em] text-bright-red uppercase">
            CODEXA / DIGITAL FUTURES
          </span>
        </div>

        <h3 className="text-xl sm:text-3xl lg:text-4xl font-black font-orbitron tracking-tight text-white mb-4 uppercase leading-tight select-none">
          “Technology is not just code.<br />
          It is the power to build what comes next.”
        </h3>

        <div className="w-16 h-0.5 bg-crimson mx-auto mt-6" />
      </div>
    </section>
  );
}
