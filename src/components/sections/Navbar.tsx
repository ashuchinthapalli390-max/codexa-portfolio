"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, ArrowRight, Cpu } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { NeonButton } from "../ui/NeonButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const isReduced = useReducedMotion();

  const navItems = [
    { name: "Home", id: "home" },
    { name: "About", id: "about" },
    { name: "Services", id: "services" },
    { name: "Team", id: "team" },
    { name: "Internship", id: "internship" },
    { name: "Process", id: "process" },
    { name: "Contact", id: "contact" }
  ];

  const itemIds = navItems.map((item) => item.id);
  const activeId = useScrollSpy(itemIds, { rootMargin: "-30% 0px -50% 0px" });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: isReduced ? "auto" : "smooth" });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "glass-panel-heavy py-3 border-b border-crimson/20 shadow-neon"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Logo Brand left */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("home");
            }}
            className="flex items-center gap-2 group focus:outline-none"
          >
            {!logoError ? (
              <img
                src="/assets/images/logo.jpeg"
                alt="CodeXa Agency logo"
                className="h-8 sm:h-9 w-auto object-contain rounded transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(217,4,41,0.5)] border border-transparent group-hover:border-crimson/30"
                onError={() => setLogoError(true)}
              />
            ) : (
              <>
                <div className="relative p-1.5 rounded bg-deep-red/30 border border-crimson/30 group-hover:border-bright-red/50 transition-all duration-300">
                  <Cpu className="w-5 h-5 text-bright-red" />
                </div>
                <span className="font-orbitron font-black text-sm sm:text-base tracking-[0.2em] text-white">
                  CODEXA <span className="text-crimson text-xs font-normal">AGENCY</span>
                </span>
              </>
            )}
          </a>

          {/* Desktop Navigation center */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.id);
                  }}
                  className={`relative font-orbitron text-xs font-semibold tracking-widest uppercase transition-colors py-1 ${
                    isActive ? "text-bright-red" : "text-secondary-text hover:text-white"
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <motion.span
                      layoutId="activeUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-crimson to-bright-red"
                      transition={isReduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Hire Us Button & Mobile Trigger right */}
          <div className="flex items-center gap-4">
            <NeonButton
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => handleNavClick("contact")}
            >
              Hire Us
              <ArrowRight className="w-3.5 h-3.5" />
            </NeonButton>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-secondary-text hover:text-white rounded border border-transparent hover:border-crimson/20 hover:bg-card/50 transition-all lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={isReduced ? { opacity: 1 } : { opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={isReduced ? { opacity: 0 } : { opacity: 0, y: "-100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-30 bg-[#070707]/95 backdrop-blur-2xl flex flex-col justify-between p-8 border-b border-crimson/20"
          >
            {/* Header placeholder spacer */}
            <div className="h-16" />

            {/* Menu Links list */}
            <nav className="flex flex-col gap-6 items-center justify-center flex-grow">
              {navItems.map((item, idx) => {
                const isActive = activeId === item.id;
                return (
                  <motion.a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.id);
                    }}
                    initial={isReduced ? { opacity: 1 } : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={`font-orbitron text-lg font-bold tracking-[0.2em] uppercase transition-colors py-2 border-b-2 ${
                      isActive ? "text-bright-red border-crimson" : "text-secondary-text border-transparent hover:text-white"
                    }`}
                  >
                    {item.name}
                  </motion.a>
                );
              })}
            </nav>

            {/* Bottom Actions footer */}
            <div className="flex flex-col gap-4 max-w-sm mx-auto w-full mb-8">
              <NeonButton
                variant="primary"
                onClick={() => handleNavClick("contact")}
                className="w-full justify-center"
              >
                Hire Us
              </NeonButton>
              <a
                href={siteConfig.internshipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-3 border border-crimson/30 hover:border-bright-red text-xs uppercase tracking-wider text-secondary-text hover:text-white rounded font-orbitron font-semibold bg-secondary-dark/50 transition-all duration-300"
              >
                Join Internship
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
