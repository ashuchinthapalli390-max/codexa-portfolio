"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Lightbulb, 
  Paintbrush, 
  Terminal, 
  Activity, 
  Send, 
  LifeBuoy,
  Sparkles
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "../ui/SectionHeading";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MediaAsset } from "../ui/MediaAsset";

// Lucide icon helper mapping
const iconMap = {
  Lightbulb: Lightbulb,
  Paintbrush: Paintbrush,
  Terminal: Terminal,
  Activity: Activity,
  Send: Send,
  LifeBuoy: LifeBuoy
};

export function ProcessSection() {
  const isReduced = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const stepVariants = {
    hidden: isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <section id="process" className="relative py-20 bg-[#070707] overflow-hidden">
      
      {/* Background decoration lines & Video background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <MediaAsset
          type="video"
          src="/assets/media/raw/process-bg.gif"
          videoSources={[
            "/assets/media/process-bg.webm",
            "/assets/media/process-bg.mp4"
          ]}
          poster="/assets/media/process-bg-poster.webp"
          alt="CodeXa Process Timeline Background"
          fallbackLabel="process-bg"
          objectFit="cover"
          overlay={true}
          className="absolute inset-0 w-full h-full opacity-10"
        />
        {/* Subtle red tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070707] via-transparent to-[#070707] opacity-80" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Section Heading */}
        <SectionHeading
          badge="Product Roadmap"
          title="From Idea to Launch"
          subtitle="Our engineering process takes complex concepts and structures them into launch-ready deployable systems."
          align="center"
        />

        {/* Timeline Container */}
        <div className="relative mt-16">
          
          {/* Desktop horizontal line */}
          <div className="hidden lg:block absolute top-[44px] left-[5%] right-[5%] h-[2px] bg-gradient-to-r from-deep-red via-crimson to-deep-red z-0" />

          {/* Mobile vertical line */}
          <div className="lg:hidden absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-deep-red via-crimson to-deep-red z-0" />

          {/* Steps Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10%" }}
            className="grid grid-cols-1 lg:grid-cols-6 gap-8 lg:gap-4 relative z-10"
          >
            {siteConfig.process.map((stepItem, idx) => {
              const IconComponent = iconMap[stepItem.icon as keyof typeof iconMap] || Sparkles;
              return (
                <motion.div 
                  key={stepItem.step}
                  variants={stepVariants}
                  className="flex lg:flex-col gap-4 lg:gap-0 lg:items-center relative"
                >
                  
                  {/* Glowing Node Button / Container */}
                  <div className="relative z-10 shrink-0 lg:mb-6">
                    <div className="absolute -inset-1 rounded-full bg-bright-red/30 blur-sm animate-pulse-slow" />
                    
                    {/* Circle wrapper */}
                    <div className="relative w-14 h-14 rounded-full bg-card border border-crimson flex items-center justify-center shadow-neon hover:border-bright-red hover:shadow-neon-hover transition-all duration-300">
                      <IconComponent className="w-6 h-6 text-bright-red" />
                    </div>

                    {/* Step label index marker */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#070707] border border-crimson/50 flex items-center justify-center text-[9px] font-orbitron font-black text-white">
                      {stepItem.step}
                    </div>
                  </div>

                  {/* Text Details Box */}
                  <div className="flex flex-col lg:items-center lg:text-center mt-1 lg:mt-0">
                    <h3 className="font-orbitron font-bold text-sm sm:text-base text-white uppercase tracking-wider mb-2">
                      {stepItem.title}
                    </h3>
                    <p className="text-xs text-secondary-text leading-relaxed max-w-xs">
                      {stepItem.description}
                    </p>
                  </div>

                </motion.div>
              );
            })}
          </motion.div>

        </div>

      </div>
    </section>
  );
}
