"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingScreen } from "@/components/sections/LoadingScreen";
import { Navbar } from "@/components/sections/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { LeadershipSpotlightSection } from "@/components/sections/LeadershipSpotlightSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { TechDivider } from "@/components/sections/TechDivider";
import { MainProjectsSection } from "@/components/sections/MainProjectsSection";
import { TeamProjectsSection } from "@/components/sections/TeamProjectsSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { InternshipSection } from "@/components/sections/InternshipSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { ProcessSection } from "@/components/sections/ProcessSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { EndingSection } from "@/components/sections/EndingSection";
import { Footer } from "@/components/sections/Footer";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { Profile } from "@/lib/data-store";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [siteSettings, setSiteSettings] = useState({
    mainProjectsHomeVisible: true,
    teamProjectsHomeVisible: true,
  });

  useEffect(() => {
    setMounted(true);
    
    // Load site settings
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSiteSettings(data.settings);
        }
      })
      .catch(() => {});

    // Load official leadership profiles
    fetch("/api/team/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
        }
      })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#070707] w-full" />;
  }

  return (
    <div className="relative min-h-screen bg-[#070707] w-full">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingScreen key="loading" onComplete={() => setIsLoading(false)} />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
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
              
              {/* 2. CODEXA LEADERSHIP SPOTLIGHT */}
              <LeadershipSpotlightSection profiles={profiles} />
              
              {/* 3. ABOUT */}
              <AboutSection />
              
              {/* 4. SERVICES */}
              <ServicesSection />
              
              <TechDivider />
              
              {/* 5. PROJECTS */}
              {siteSettings.mainProjectsHomeVisible && <MainProjectsSection />}
              {siteSettings.teamProjectsHomeVisible && <TeamProjectsSection />}
              
              {/* 6. FULL TEAM */}
              <TeamSection />
              
              {/* 7. REMAINING SECTIONS */}
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
        )}
      </AnimatePresence>
    </div>
  );
}
