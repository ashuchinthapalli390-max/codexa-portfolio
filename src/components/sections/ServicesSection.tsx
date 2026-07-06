"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Globe, 
  Smartphone, 
  Layers, 
  LayoutDashboard, 
  Palette, 
  Code2, 
  Database, 
  Zap, 
  MessageSquareText, 
  Cloud, 
  ShieldAlert, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "../ui/SectionHeading";
import { GlassCard } from "../ui/GlassCard";
import { MediaAsset } from "../ui/MediaAsset";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Lucide icon helper mapping
const iconMap = {
  Cpu: Cpu,
  Globe: Globe,
  Smartphone: Smartphone,
  Layers: Layers,
  LayoutDashboard: LayoutDashboard,
  Palette: Palette,
  Code2: Code2,
  Database: Database,
  Zap: Zap,
  MessageSquareText: MessageSquareText,
  Cloud: Cloud,
  ShieldAlert: ShieldAlert
};

export function ServicesSection() {
  const isReduced = useReducedMotion();

  const handleScrollToContact = () => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: isReduced ? "auto" : "smooth" });
    }
  };

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section id="services" className="relative py-20 bg-[#070707] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Section Heading */}
        <SectionHeading
          badge="Our Core Capabilities"
          title="What We Build"
          subtitle="From first idea to deployment, CodeXa creates systems built to perform."
          align="center"
        />

        {/* 12 Service Cards Grid */}
        <motion.div 
          variants={listVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-5%" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {siteConfig.services.map((service) => {
            const IconComponent = iconMap[service.icon as keyof typeof iconMap] || Sparkles;
            return (
              <motion.div key={service.id} variants={itemVariants}>
                <GlassCard className="h-full flex flex-col justify-between p-6 bg-card/50 border border-crimson/10 hover:border-bright-red/30 transition-all duration-300 group">
                  <div>
                    {/* Icon container */}
                    <div className="p-3 w-12 h-12 rounded bg-deep-red/20 border border-crimson/25 flex items-center justify-center group-hover:border-bright-red/50 group-hover:bg-deep-red/40 transition-all duration-300 mb-4">
                      <IconComponent className="w-6 h-6 text-bright-red" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-orbitron font-bold text-sm sm:text-base text-white mb-2 uppercase tracking-wider group-hover:text-bright-red transition-colors">
                      {service.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs text-secondary-text leading-relaxed mb-6">
                      {service.description}
                    </p>
                  </div>

                  {/* Learn More Button */}
                  <button
                    onClick={handleScrollToContact}
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase font-orbitron font-bold tracking-widest text-bright-red hover:text-white transition-colors mt-auto w-fit group/btn"
                  >
                    Learn More
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Cinematic Visual Divider */}
        <div className="relative mt-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-card/20 rounded-xl p-8 lg:p-12 border border-crimson/15 shadow-neon">
          {/* Cyberweb connecting strands behind image */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <svg width="100%" height="100%">
              <path d="M 100 200 Q 300 50, 600 250 T 1100 150" fill="none" stroke="#D90429" strokeWidth="0.8" strokeDasharray="4 8" />
            </svg>
          </div>

          {/* Left Text */}
          <div className="lg:col-span-6 z-10">
            <h4 className="text-xl sm:text-2xl font-black font-orbitron uppercase text-white mb-4 tracking-wider leading-snug">
              Every digital idea deserves a system built to scale.
            </h4>
            <p className="text-sm text-secondary-text leading-relaxed mb-6">
              Our dev workflows ensure that security, high performance speed, and responsive frontends are not add-ons, but foundational components of what we create. We develop code suited to your targets.
            </p>
            <button
              onClick={handleScrollToContact}
              className="inline-flex items-center justify-center font-orbitron font-semibold uppercase tracking-wider transition-all duration-300 rounded px-6 py-3 text-xs bg-crimson text-white border border-bright-red hover:bg-bright-red"
            >
              Start Your Project
            </button>
          </div>

          {/* Right Image visual */}
          <div className="lg:col-span-6 flex justify-center items-center relative z-10">
            <div className="relative w-full max-w-[380px] p-2 bg-gradient-to-tr from-deep-red/10 to-crimson/5 border border-crimson/20 rounded-lg overflow-hidden shadow-2xl">
              {/* Overlay grid and colors */}
              <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
              <MediaAsset
                type="video"
                src="/assets/media/raw/services-bg.gif"
                videoSources={[
                  "/assets/media/services-bg.webm",
                  "/assets/media/services-bg.mp4"
                ]}
                poster="/assets/media/services-bg-poster.webp"
                alt="CodeXa Services Character"
                fallbackLabel="services-bg.gif"
                className="w-full h-auto rounded shadow-lg filter brightness-90 hover:brightness-100 transition-all duration-300"
                overlay={true}
                glow={true}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
