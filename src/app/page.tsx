"use client";

import React, { useState } from "react";
import "./globals.css";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingScreen } from "@/components/sections/LoadingScreen";
import { Navbar } from "@/components/sections/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { TechDivider } from "@/components/sections/TechDivider";
import { TeamSection } from "@/components/sections/TeamSection";
import { InternshipSection } from "@/components/sections/InternshipSection";
import { CapabilitiesSection } from "@/components/sections/CapabilitiesSection";
import { ProcessSection } from "@/components/sections/ProcessSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { EndingSection } from "@/components/sections/EndingSection";
import { Footer } from "@/components/sections/Footer";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    setMounted(true);
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
              <HeroSection />
              <AboutSection />
              <ServicesSection />
              <TechDivider />
              <TeamSection />
              <InternshipSection />
              <CapabilitiesSection />
              <ProcessSection />
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
