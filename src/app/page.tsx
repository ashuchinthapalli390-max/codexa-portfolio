"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "./globals.css";
import { motion } from "framer-motion";
import { CodexaCinematicIntro } from "@/components/intro/CodexaCinematicIntro";
import { Navbar } from "@/components/sections/Navbar";
import { MainProjectsSection } from "@/components/sections/MainProjectsSection";
import { TeamProjectsSection } from "@/components/sections/TeamProjectsSection";
import { PublicLeadershipSection } from "@/components/sections/PublicLeadershipSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { ScrollHUD } from "@/components/scroll/ScrollHUD";
import { Hero3D } from "@/components/scroll3d/Hero3D";
import { Manifesto3D } from "@/components/scroll3d/Manifesto3D";
import { Services3D } from "@/components/scroll3d/Services3D";
import { CinematicReel } from "@/components/scroll3d/CinematicReel";
import { TeamIntro3D } from "@/components/scroll3d/TeamIntro3D";
import { Process3D } from "@/components/scroll3d/Process3D";
import { Internship3D } from "@/components/scroll3d/Internship3D";
import { CapabilitiesMarquee } from "@/components/scroll3d/CapabilitiesMarquee";
import { FinalPortal } from "@/components/scroll3d/FinalPortal";
import { Reveal3D, RevealFade } from "@/components/scroll3d/Reveal3D";

// WebGL scene is client-only and code-split so text paints first.
const CodexaScene = dynamic(() => import("@/components/three/CodexaScene"), { ssr: false });

export default function Home() {
  const [introActive, setIntroActive] = useState(true);
  const [siteSettings, setSiteSettings] = useState({
    mainProjectsHomeVisible: true,
    teamProjectsHomeVisible: true,
  });

  useEffect(() => {
    // If intro was already watched this session and not forced, show homepage immediately
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const forceReplay = urlParams.get("replayIntro") === "1" || urlParams.get("intro") === "force";
      const seen1 = sessionStorage.getItem("codexa_intro_seen_v1");
      const seen2 = sessionStorage.getItem("codexa_intro_seen_v2");
      if ((seen1 === "1" || seen2 === "1") && !forceReplay) {
        setIntroActive(false);
      }
    } catch {
      // ignore
    }

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
    <div className="relative min-h-screen bg-[#050505] w-full overflow-x-clip">
      {/* 1. Cinematic code-based multilingual intro overlay */}
      <CodexaCinematicIntro onComplete={() => setIntroActive(false)} />

      {/* 2. Fixed WebGL world — the camera flies through it as you scroll */}
      <CodexaScene />
      <SmoothScroll />

      {/* 3. Scroll-driven DOM layer */}
      <motion.div
        initial={{ opacity: introActive ? 0.2 : 1 }}
        animate={{ opacity: introActive ? 0.2 : 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full relative"
      >
        <Navbar />
        <ScrollHUD />

        <main className="w-full relative">
          <Hero3D ready={!introActive} />
          <Manifesto3D />
          <Services3D />
          <CinematicReel />

          {(siteSettings.mainProjectsHomeVisible || siteSettings.teamProjectsHomeVisible) && (
            <div className="scene-panel">
              {siteSettings.mainProjectsHomeVisible && (
                <Reveal3D>
                  <MainProjectsSection />
                </Reveal3D>
              )}
              {siteSettings.teamProjectsHomeVisible && (
                <Reveal3D>
                  <TeamProjectsSection />
                </Reveal3D>
              )}
            </div>
          )}

          <TeamIntro3D />
          {/* Leadership hosts fixed-position modals → opacity-only reveal */}
          <RevealFade className="scene-panel">
            <PublicLeadershipSection />
          </RevealFade>

          <Process3D />
          <Internship3D />
          <CapabilitiesMarquee />

          <div className="scene-panel">
            <Reveal3D>
              <FAQSection />
            </Reveal3D>
            <Reveal3D intensity={0.7}>
              <ContactSection />
            </Reveal3D>
          </div>

          <FinalPortal />
        </main>

        <SiteFooter />
      </motion.div>
    </div>
  );
}
