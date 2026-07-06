"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Globe, 
  Smartphone, 
  Layers, 
  ShieldAlert, 
  Cloud, 
  Zap, 
  MessageSquare, 
  Terminal 
} from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { GlassCard } from "../ui/GlassCard";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Lucide icon helper mapping
const iconMap = {
  Cpu: Cpu,
  Globe: Globe,
  Smartphone: Smartphone,
  Layers: Layers,
  ShieldAlert: ShieldAlert,
  Cloud: Cloud,
  Zap: Zap,
  MessageSquare: MessageSquare,
  Terminal: Terminal
};

export function AboutSection() {
  const isReduced = useReducedMotion();

  const capabilities = [
    {
      title: "AI Products",
      icon: "Cpu",
      description: "Agents, custom neural pipelines, and automation flows."
    },
    {
      title: "Web Applications",
      icon: "Globe",
      description: "High-performance, cinematic, and responsive frontends."
    },
    {
      title: "Mobile Apps",
      icon: "Smartphone",
      description: "Fluid cross-platform interfaces for iOS & Android."
    },
    {
      title: "Full Stack Development",
      icon: "Layers",
      description: "Scalable APIs integrated with clean relational databases."
    },
    {
      title: "Cybersecurity",
      icon: "ShieldAlert",
      description: "Rigorous penetration audits, vulnerability checks, and access controls."
    },
    {
      title: "Cloud & Hosting",
      icon: "Cloud",
      description: "Optimized server configs, CDN, edge routing, and cloud tools."
    },
    {
      title: "Automation",
      icon: "Zap",
      description: "Custom scripts, scraper pipelines, and system automation tools."
    },
    {
      title: "Discord Systems",
      icon: "MessageSquare",
      description: "Intelligent moderation bots, chat nodes, and subscriptions."
    },
    {
      title: "Developer Tools",
      icon: "Terminal",
      description: "Custom IDE addons, packages, CLI utilities, and helper logs."
    }
  ];

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: isReduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 15 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <section id="about" className="relative py-20 bg-[#070707] overflow-hidden">
      
      {/* Cyber web lines linking in background */}
      <div className="absolute inset-0 pointer-events-none opacity-10 z-0">
        <svg width="100%" height="100%" className="hidden lg:block">
          <path d="M 100 200 L 400 300 L 300 600 L 800 450" fill="none" stroke="#D90429" strokeWidth="1" strokeDasharray="3 6" />
          <path d="M 600 100 L 900 350 L 1200 200" fill="none" stroke="#FF1E3C" strokeWidth="1" strokeDasharray="5 10" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Large Text Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-start">
          <SectionHeading
            badge="About Agency"
            title="We Don’t Just Build Websites."
            subtitle="We engineer digital ecosystems for creators, businesses, communities, and the next generation of developers."
            align="left"
            className="mb-6"
          />
          <div className="border-t border-crimson/20 pt-6 mt-2">
            <p className="text-secondary-text text-sm leading-relaxed mb-4">
              At CodeXa, we build custom solutions suited for heavy production loads. We focus on low latency, responsive UX design, security safeguards, and custom toolsets that lift brand capability.
            </p>
            <p className="text-secondary-text text-sm leading-relaxed">
              Whether you are automating workflows with AI agents, securing your databases, or presenting a premium client dashboard, our code base is optimized for growth.
            </p>
          </div>
        </div>

        {/* Right Side: 3D Floating Feature-Card Cluster (7 cols) */}
        <motion.div 
          variants={listVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {capabilities.map((item, index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] || Terminal;
            return (
              <motion.div key={index} variants={itemVariants}>
                <GlassCard className="h-full flex flex-col justify-between group border-neon-glow border border-crimson/15 hover:border-bright-red/40 bg-card/40 transition-all duration-300">
                  <div>
                    {/* Glowing Accent Ring for Icon */}
                    <div className="p-2 w-10 h-10 rounded bg-deep-red/35 flex items-center justify-center border border-crimson/30 group-hover:border-bright-red/50 group-hover:bg-deep-red/60 transition-all duration-300 mb-4">
                      <Icon className="w-5 h-5 text-bright-red" />
                    </div>
                    <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white mb-2 uppercase tracking-wider">
                      {item.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-secondary-text leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
