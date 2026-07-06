"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NeonButton } from "../ui/NeonButton";
import { MediaAsset } from "../ui/MediaAsset";

export function HeroSection() {
  const isReduced = useReducedMotion();
  const [heroError, setHeroError] = React.useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: isReduced ? "auto" : "smooth" });
    }
  };

  return (
    <section 
      id="home" 
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#070707] pt-24 pb-16 lg:py-0"
    >
      {/* Background Layer: City Parallax Simulation */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Background Video */}
        <MediaAsset
          type="video"
          src="/assets/media/raw/hero-main.gif"
          videoSources={[
            "/assets/media/hero-main.webm",
            "/assets/media/hero-main.mp4"
          ]}
          poster="/assets/media/hero-main-poster.webp"
          mobileSrc="/assets/media/raw/hero-alt.gif"
          alt="CodeXa Hero Background"
          fallbackLabel="hero-main"
          className="absolute inset-0 w-full h-full opacity-25"
          objectFit="cover"
          overlay={true}
        />
        {/* Soft grid floor perspective */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[40vh] bg-cyber-grid opacity-20"
          style={{
            transform: "perspective(500px) rotateX(60deg)",
            transformOrigin: "bottom center"
          }}
        />
        {/* Fog layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070707] via-[#070707]/90 to-crimson/10 mix-blend-multiply opacity-90" />
        <div className="absolute inset-0 bg-[#070707]/45 pointer-events-none" />
        
        {/* Glow circles simulating neon skyline */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-crimson/5 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-deep-red/10 blur-[150px] animate-pulse-slow" />
      </div>

      {/* Grid container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Brand & Call to Action (Grid: 5 cols) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-6 flex flex-col items-start text-left"
        >
          {/* Identity Tag */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-deep-red/25 border border-crimson/30 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-bright-red animate-ping" />
            <span className="text-[10px] sm:text-xs font-orbitron font-bold uppercase tracking-widest text-bright-red">
              {siteConfig.coreIdentity.join(" • ")}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-black font-orbitron uppercase tracking-tight text-white mb-4 leading-none"
          >
            CODEXA <span className="text-crimson text-neon-glow">AGENCY</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg text-secondary-text font-medium tracking-wide max-w-xl mb-6"
          >
            {siteConfig.tagline}
          </motion.p>

          {/* Brand Phrase */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-4 gap-2 border-l-2 border-crimson pl-4 mb-8"
          >
            {siteConfig.brandPhrase.map((word, index) => (
              <div key={index} className="flex flex-col">
                <span className="text-xl sm:text-2xl font-orbitron font-black text-white">{word}.</span>
                <span className="text-[9px] uppercase tracking-wider text-secondary-text">Phase 0{index + 1}</span>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8"
          >
            <NeonButton 
              variant="primary" 
              onClick={() => handleScrollTo("about")}
              className="group"
            >
              Explore Agency
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </NeonButton>
            
            <NeonButton 
              variant="secondary" 
              onClick={() => handleScrollTo("contact")}
            >
              Hire Us
            </NeonButton>

            <div className="flex flex-col">
              <a
                href={siteConfig.internshipUrl}
                className="inline-flex items-center justify-center font-orbitron font-semibold uppercase tracking-wider transition-all duration-300 rounded px-6 py-3 text-sm bg-transparent text-white border border-crimson hover:bg-crimson/10 text-center"
              >
                Join Internship
              </a>
              <span className="text-[10px] text-secondary-text/80 mt-1 max-w-[200px] text-center sm:text-left leading-tight">
                {siteConfig.internshipHelperText}
              </span>
            </div>
          </motion.div>

          {/* Status Card */}
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-3 px-4 py-2.5 rounded bg-card/60 border border-crimson/20 shadow-inner backdrop-blur"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-orbitron font-bold tracking-widest text-white">
                ● CODEXA SYSTEM STATUS
              </span>
              <span className="text-[9px] text-secondary-text">
                Online & Available for Project Request
              </span>
            </div>
          </motion.div>

        </motion.div>

        {/* Right Side: Center character 3D visual wrapper (Grid: 7 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative w-full min-h-[380px] lg:min-h-[520px]">
          
          {/* Subtle red neon glow background */}
          <div className="absolute w-[280px] h-[280px] rounded-full bg-crimson/15 blur-[70px] pointer-events-none" />

          {/* Connected faint web strands behind the hero */}
          <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50%" cy="42%" r="70" stroke="#FF1E3C" strokeWidth="0.5" fill="none" strokeDasharray="3 4" />
            <circle cx="50%" cy="42%" r="120" stroke="#FF1E3C" strokeWidth="0.5" fill="none" strokeDasharray="3 4" />
            <circle cx="50%" cy="42%" r="180" stroke="#FF1E3C" strokeWidth="0.5" fill="none" strokeDasharray="3 4" />
            <line x1="50%" y1="42%" x2="10%" y2="0" stroke="#FF1E3C" strokeWidth="0.5" strokeDasharray="2 3" />
            <line x1="50%" y1="42%" x2="90%" y2="0" stroke="#FF1E3C" strokeWidth="0.5" strokeDasharray="2 3" />
            <line x1="50%" y1="42%" x2="0" y2="42%" stroke="#FF1E3C" strokeWidth="0.5" strokeDasharray="2 3" />
            <line x1="50%" y1="42%" x2="100%" y2="42%" stroke="#FF1E3C" strokeWidth="0.5" strokeDasharray="2 3" />
            <line x1="50%" y1="42%" x2="20%" y2="100%" stroke="#FF1E3C" strokeWidth="0.5" strokeDasharray="2 3" />
            <line x1="50%" y1="42%" x2="80%" y2="100%" stroke="#FF1E3C" strokeWidth="0.5" strokeDasharray="2 3" />
          </svg>

          {/* 3D Platform/Ring beneath character */}
          <div 
            className="absolute bottom-4 w-[240px] sm:w-[340px] h-[64px] rounded-full border border-bright-red/40 bg-deep-red/10 shadow-neon opacity-75"
            style={{
              transform: "rotateX(75deg) translateY(20px)",
              boxShadow: "0 0 35px rgba(255,30,60,0.35), inset 0 0 25px rgba(255,30,60,0.2)"
            }}
          />

          {/* Web-thread strand hanging down */}
          <div className="absolute top-0 bottom-[55%] w-[3px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            {/* Edge glow thread lines */}
            <div className="w-full h-full bg-gradient-to-b from-bright-red via-crimson to-bright-red blur-[1px] animate-pulse" />
            <div className="absolute inset-y-0 left-[1px] w-[1px] bg-white opacity-90" />
          </div>

          {/* Spidey Character Visual */}
          <motion.div
            initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={isReduced ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -10, 0] }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 6,
                ease: "easeInOut"
              },
              opacity: { duration: 1.2 }
            }}
            className="relative z-10 w-full max-w-[260px] sm:max-w-[340px] aspect-[13/16] rounded-2xl p-[1.5px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(255,30,60,0.4), rgba(7,7,7,0.8), rgba(255,30,60,0.2))",
              boxShadow: "0 15px 45px rgba(0,0,0,0.8), 0 0 30px rgba(255,30,60,0.15)",
              transformStyle: "preserve-3d",
              perspective: "1000px"
            }}
          >
            {/* Inner holographic lit border frame */}
            <div className="w-full h-full rounded-2xl bg-[#090909]/95 overflow-hidden relative flex items-center justify-center border border-bright-red/20 group">
              
              {/* Soft dark vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10 pointer-events-none" />
              
              {/* Subtle cyber-web pattern overlay inside the card */}
              <div 
                className="absolute inset-0 opacity-[0.08] z-10 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle at center, #FF1E3C 1px, transparent 1.5px)",
                  backgroundSize: "16px 16px"
                }}
              />

              <img
                src={heroError ? siteConfig.images.heroCenter : siteConfig.images.heroMain}
                alt="CodeXa Spider-Man Visual"
                className="w-full h-full object-cover filter brightness-105 saturate-110 transition-transform duration-500 hover:scale-105"
                onError={() => setHeroError(true)}
              />
            </div>
          </motion.div>
          
        </div>

      </div>
    </section>
  );
}
