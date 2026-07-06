"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckSquare, ArrowUpRight, GraduationCap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { SectionHeading } from "../ui/SectionHeading";
import { MediaAsset } from "../ui/MediaAsset";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function InternshipSection() {
  const isReduced = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: isReduced ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <section id="internship" className="relative py-20 bg-[#070707] overflow-hidden">
      
      {/* Background neon elements */}
      <div className="absolute top-1/4 left-10 w-80 h-80 bg-crimson/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Character Pose Visual (Grid: 5 cols) */}
        <div className="lg:col-span-5 flex justify-center items-center relative">
          
          {/* Glowing ring/base for the character asset */}
          <div 
            className="absolute bottom-2 w-[220px] sm:w-[300px] h-[50px] rounded-full border border-bright-red/35 bg-deep-red/10 shadow-neon opacity-60"
            style={{
              transform: "rotateX(75deg) translateY(10px)",
              boxShadow: "0 0 25px rgba(217,4,41,0.25)"
            }}
          />

          <motion.div
            initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 15 }}
            whileInView={isReduced ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -6, 0] }}
            viewport={{ once: true }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 5,
                ease: "easeInOut"
              },
              opacity: { duration: 0.8 }
            }}
            className="relative z-10 w-full max-w-[280px] sm:max-w-[360px] flex items-center justify-center p-2"
          >
            <MediaAsset
              type="video"
              src="/assets/media/raw/internship-bg.gif"
              videoSources={[
                "/assets/media/internship-bg.webm",
                "/assets/media/internship-bg.mp4"
              ]}
              poster="/assets/media/internship-bg-poster.webp"
              alt="CodeXa Internship Character Pose"
              fallbackLabel="internship-bg.gif"
              className="w-full h-auto filter brightness-105"
              overlay={true}
              glow={true}
            />
          </motion.div>
        </div>

        {/* Right Side: Description & Roadmap Grid (Grid: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <SectionHeading
            badge="Empowering Future Developers"
            title="Free Developer Internship"
            subtitle="Learn real development skills, build production-grade projects, collaborate in structured teams, and build a premium portfolio."
            align="left"
            className="mb-6 w-full"
          />

          <p className="text-secondary-text text-sm leading-relaxed mb-8 border-l border-crimson/40 pl-4">
            Our internship is a 100% remote self-paced structure. You will gain hands-on experience by completing core curriculum tasks, learning standard git workflows, and getting reviewed on actual project code templates.
          </p>

          {/* Roadmap Nodes Grid with Web Connections */}
          <div className="relative w-full mb-8">
            {/* SVG Background Connections */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
              <svg width="100%" height="100%" className="min-h-[250px]">
                <path d="M 50 40 Q 200 80, 100 160 T 300 220" fill="none" stroke="#FF1E3C" strokeWidth="1" strokeDasharray="3 6" />
                <path d="M 250 30 Q 350 120, 150 180 T 400 240" fill="none" stroke="#D90429" strokeWidth="0.8" strokeDasharray="4 8" />
              </svg>
            </div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
            >
              {siteConfig.roadmap.map((node, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={isReduced ? {} : { scale: 1.03, y: -2 }}
                  className="flex items-center gap-2 p-2.5 rounded bg-card/60 border border-crimson/15 hover:border-bright-red/40 hover:bg-deep-red/10 shadow-inner backdrop-blur transition-all duration-200"
                >
                  <div className="w-2 h-2 rounded-full bg-bright-red shrink-0" />
                  <span className="text-xs font-orbitron font-semibold uppercase tracking-wider text-white select-none">
                    {node}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Action and Redirect portals */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href={siteConfig.internshipUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center font-orbitron font-bold uppercase tracking-widest transition-all duration-300 rounded px-8 py-4 text-sm bg-crimson text-white border border-bright-red hover:bg-bright-red hover:shadow-neon text-center"
            >
              Apply for Internship
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </a>
            <span className="text-xs text-secondary-text text-center sm:text-left max-w-[280px] leading-tight">
              {siteConfig.internshipHelperText}
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
