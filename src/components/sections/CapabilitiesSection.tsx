"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, CheckCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "../ui/SectionHeading";
import { MediaAsset } from "../ui/MediaAsset";
import { GlassCard } from "../ui/GlassCard";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function CapabilitiesSection() {
  const isReduced = useReducedMotion();

  // Categorize capabilities to present them logically
  const categories = [
    {
      title: "Core Engineering",
      items: [
        "Premium Websites",
        "Business Websites",
        "Portfolio Websites",
        "E-Commerce",
        "Full Stack Applications"
      ]
    },
    {
      title: "Advanced Systems",
      items: [
        "Admin Dashboards",
        "Mobile Apps",
        "UI/UX Design",
        "API Development",
        "Database Systems"
      ]
    },
    {
      title: "Cloud & Automation",
      items: [
        "Cloud Hosting",
        "Deployment",
        "Discord Bots",
        "AI Automation",
        "Custom Tools"
      ]
    },
    {
      title: "Cyber Shield Core",
      items: [
        "Security Audits",
        "Firewall Systems",
        "IP Protection",
        "Access Control",
        "Monitoring"
      ],
      isSecurity: true
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <section id="capabilities" className="relative py-20 bg-[#070707] overflow-hidden">
      
      {/* Background neon layers */}
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-crimson/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        
        {/* Section Heading */}
        <SectionHeading
          badge="Product Capabilities"
          title="Built for Serious Digital Growth"
          subtitle="Discover the frameworks, deployment setups, and defense measures CodeXa deploys to establish secure scalable architectures."
          align="center"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-12">
          
          {/* Left Side: featured visual containing cybersecurity-pose.png (Grid: 5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Visual Box with Spidey Pose */}
            <div className="w-full relative p-4 rounded-xl border border-crimson/25 bg-gradient-to-b from-[#111111]/80 to-background shadow-2xl backdrop-blur overflow-hidden max-w-[400px]">
              
              {/* Corner tech indicators */}
              <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[9px] font-mono text-crimson">
                <Shield className="w-3.5 h-3.5 text-bright-red" />
                <span>SHIELD.PORTAL_ACTIVE</span>
              </div>
              <div className="absolute top-2 right-3 text-[9px] font-mono text-secondary-text">
                NODE_049
              </div>

              {/* Glowing character floor base */}
              <div 
                className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[180px] h-[40px] rounded-full border border-bright-red/35 bg-deep-red/10 shadow-neon opacity-50"
                style={{ transform: "rotateX(75deg)" }}
              />

              <div className="relative z-10 flex justify-center py-6 w-full">
                <MediaAsset
                  type="video"
                  src="/assets/media/raw/security-bg.gif"
                  videoSources={[
                    "/assets/media/security-bg.webm",
                    "/assets/media/security-bg.mp4"
                  ]}
                  poster="/assets/media/security-bg-poster.webp"
                  alt="CodeXa Cybersecurity Shield"
                  fallbackLabel="security-bg.gif"
                  className="w-48 h-auto filter brightness-95"
                  overlay={true}
                  glow={true}
                />
              </div>

              {/* Status information pane */}
              <div className="border-t border-crimson/15 pt-4 mt-2">
                <h4 className="font-orbitron font-bold text-xs uppercase tracking-widest text-white mb-2">
                  CYBERSECURITY ARCHITECTURE
                </h4>
                <p className="text-[11px] text-secondary-text leading-relaxed">
                  We integrate advanced defensive protocols directly into databases and deployment containers, guarding workflows against IP theft and unauthorized server access.
                </p>
              </div>

            </div>

          </div>

          {/* Right Side: layered card categories flow (Grid: 7 cols) */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-5%" }}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            {categories.map((cat, idx) => (
              <motion.div 
                key={idx} 
                variants={cardVariants}
                className={`relative p-5 rounded-lg border ${
                  cat.isSecurity 
                    ? "border-bright-red/30 bg-deep-red/10 hover:border-bright-red/50 shadow-neon" 
                    : "border-crimson/15 bg-card/40 hover:border-crimson/30"
                } transition-all duration-300`}
              >
                {/* Category label */}
                <h4 className="font-orbitron font-bold text-xs uppercase tracking-[0.2em] text-bright-red mb-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {cat.title}
                </h4>

                {/* Grid items lists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {cat.items.map((item, id) => (
                    <div 
                      key={id}
                      className="flex items-center gap-2 p-2 rounded bg-background/50 border border-crimson/5 hover:border-crimson/20 transition-all duration-200"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-bright-red shrink-0" />
                      <span className="text-[11px] sm:text-xs font-orbitron uppercase tracking-wider text-white">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>

      </div>
    </section>
  );
}
