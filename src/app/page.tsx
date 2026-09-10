"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import { motion } from "framer-motion";
import { CodexaCinematicIntro } from "@/components/intro/CodexaCinematicIntro";
import { Navbar } from "@/components/sections/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { TechDivider } from "@/components/sections/TechDivider";
import { MainProjectsSection } from "@/components/sections/MainProjectsSection";
import { TeamProjectsSection } from "@/components/sections/TeamProjectsSection";
import { PublicLeadershipSection } from "@/components/sections/PublicLeadershipSection";
import { InternshipSection } from "@/components/sections/InternshipSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { ProcessSection } from "@/components/sections/ProcessSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { EndingSection } from "@/components/sections/EndingSection";
import { Footer } from "@/components/sections/Footer";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [introActive, setIntroActive] = useState(true);
  const [siteSettings, setSiteSettings] = useState({
    mainProjectsHomeVisible: true,
    teamProjectsHomeVisible: true,
  });

  useEffect(() => {
    setMounted(true);

    // If intro was already watched this session and not forced, show homepage immediately
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const forceReplay =
        urlParams.get("replayIntro") === "1" || urlParams.get("intro") === "force";
      const seen1 = sessionStorage.getItem("codexa_intro_seen_v1");
      const seen2 = sessionStorage.getItem("codexa_intro_seen_v2");
      if ((seen1 === "1" || seen2 === "1") && !forceReplay) {
        setIntroActive(false);
      }
    } catch {
      // ignore
    }

    // Load site settings
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSiteSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);


  return (
    <div className="relative min-h-screen bg-[#070707] w-full overflow-x-hidden">
      {/* 1. Cinematic Code-Based Multilingual Intro Animation Overlay */}
      <CodexaCinematicIntro onComplete={() => setIntroActive(false)} />

      {/* 2. Homepage Content rendered behind intro and smoothly animated on reveal */}
      <motion.div
        key="homepage-content"
        initial={{ opacity: introActive ? 0.2 : 1, y: introActive ? 8 : 0 }}
        animate={{ opacity: introActive ? 0.2 : 1, y: introActive ? 8 : 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full relative"
      >
        {/* Cyber web overlay drawing strands in background */}
        <CyberWebOverlay />

        {/* Navigation Header */}
        <Navbar />

        {/* Main Content Layout Sections */}
        <main className="w-full relative">
          {/* 1. HERO */}
          <HeroSection />

          {/* 2. ABOUT */}
          <AboutSection />

          {/* 3. SERVICES */}
          <ServicesSection />

          <TechDivider />

          {/* 4. PROJECTS */}
          {siteSettings.mainProjectsHomeVisible && <MainProjectsSection />}
          {siteSettings.teamProjectsHomeVisible && <TeamProjectsSection />}

          {/* 5. CANONICAL CODEXA LEADERSHIP */}
          <PublicLeadershipSection />

          {/* 6. REMAINING SECTIONS */}
          <InternshipSection />
          <CapabilitiesSection />
          <ProcessSection />
          <FAQSection />
          <ContactSection />
          <EndingSection />
        </main>

        {/* Footer Area */}
        <Footer />
      </motion.div>
    </div>
  );
}
